import { z } from "zod";
import { userRoleSchema } from "./enums.js";

export const loginRequestSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(200),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const authUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: userRoleSchema,
});

export type AuthUser = z.infer<typeof authUserSchema>;

export const authTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: authUserSchema,
});

export type AuthTokens = z.infer<typeof authTokensSchema>;

export const refreshRequestSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RefreshRequest = z.infer<typeof refreshRequestSchema>;
