import jwt from "@fastify/jwt";
import type { FastifyInstance, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import type { AuthUser } from "@alarm/contracts";
import { config } from "../config.js";
import type { Db } from "../db/prisma.js";
import { AppError } from "../lib/errors.js";

declare module "fastify" {
  interface FastifyRequest {
    currentUser?: AuthUser;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; role: string };
    user: { sub: string; role: string };
  }
}

export type AuthPluginOptions = { db: Db };

async function authPlugin(app: FastifyInstance, options: AuthPluginOptions) {
  await app.register(jwt, {
    secret: config.JWT_SECRET,
    sign: { expiresIn: config.JWT_ACCESS_TTL },
  });

  /**
   * Authorisation is always derived from the verified JWT, never from a userId
   * supplied in the request body (README.md §12.2).
   */
  app.decorate("authenticate", async (request: FastifyRequest) => {
    try {
      await request.jwtVerify();
    } catch {
      throw AppError.unauthorized("Missing or invalid access token");
    }

    const userId = request.user.sub;
    const user = await options.db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, active: true },
    });

    if (!user || !user.active) {
      // A deactivated account must lose access immediately, even while it still
      // holds an unexpired access token.
      throw AppError.unauthorized("Account is not active");
    }

    request.currentUser = { id: user.id, email: user.email, role: user.role as AuthUser["role"] };
  });
}

export default fp(authPlugin, { name: "auth" });

export function requireUser(request: FastifyRequest): AuthUser {
  if (!request.currentUser) {
    throw AppError.unauthorized();
  }
  return request.currentUser;
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest) => Promise<void>;
  }
}
