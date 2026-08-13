import type { FastifyInstance } from "fastify";
import type { AuthTokens, AuthUser } from "@alarm/contracts";
import { loginRequestSchema, refreshRequestSchema } from "@alarm/contracts";
import { hashPassword, verifyPassword } from "../auth/password.js";
import {
  issueRefreshToken,
  lookupRefreshToken,
  revokeRefreshToken,
  rotateRefreshToken,
} from "../auth/tokens.js";
import type { Db } from "../db/prisma.js";
import { AppError, ok } from "../lib/errors.js";

/**
 * A dummy verification target. When an email does not exist we still run one
 * password verification so that "unknown account" and "wrong password" take
 * comparable time and cannot be told apart by timing.
 */
let dummyHashPromise: Promise<string> | null = null;
function getDummyHash(): Promise<string> {
  dummyHashPromise ??= hashPassword("nonexistent-account-placeholder");
  return dummyHashPromise;
}

export async function registerAuthRoutes(app: FastifyInstance, db: Db) {
  app.post("/v1/auth/login", {
    config: {
      rateLimit: { max: 10, timeWindow: "1 minute" },
    },
    handler: async (request, reply) => {
      const body = loginRequestSchema.parse(request.body);
      const email = body.email.trim().toLowerCase();

      const user = await db.user.findUnique({ where: { email } });

      if (!user || !user.active) {
        await verifyPassword(await getDummyHash(), body.password);
        throw AppError.unauthorized("Incorrect email or password");
      }

      const valid = await verifyPassword(user.passwordHash, body.password);
      if (!valid) {
        throw AppError.unauthorized("Incorrect email or password");
      }

      const authUser: AuthUser = {
        id: user.id,
        email: user.email,
        role: user.role as AuthUser["role"],
      };

      const tokens: AuthTokens = {
        accessToken: app.jwt.sign({ sub: user.id, role: user.role }),
        refreshToken: await issueRefreshToken(db, user.id),
        user: authUser,
      };

      request.log.info({ userId: user.id }, "user_logged_in");
      reply.send(ok(tokens));
    },
  });

  app.post("/v1/auth/refresh", {
    config: {
      rateLimit: { max: 30, timeWindow: "1 minute" },
    },
    handler: async (request, reply) => {
      const body = refreshRequestSchema.parse(request.body);
      const lookup = await lookupRefreshToken(db, body.refreshToken);

      if (!lookup.ok) {
        throw AppError.unauthorized("Refresh token is not valid");
      }

      const user = await db.user.findUnique({ where: { id: lookup.userId } });
      if (!user || !user.active) {
        throw AppError.unauthorized("Account is not active");
      }

      const tokens: AuthTokens = {
        accessToken: app.jwt.sign({ sub: user.id, role: user.role }),
        refreshToken: await rotateRefreshToken(db, body.refreshToken, user.id),
        user: { id: user.id, email: user.email, role: user.role as AuthUser["role"] },
      };

      reply.send(ok(tokens));
    },
  });

  app.post("/v1/auth/logout", {
    handler: async (request, reply) => {
      const body = refreshRequestSchema.parse(request.body);
      // Idempotent: logging out with an already-revoked or unknown token is a
      // success, not an error. The client's goal - "this token is dead" - holds.
      await revokeRefreshToken(db, body.refreshToken);
      reply.send(ok({ ok: true as const }));
    },
  });
}
