import type { ApiFailure, ApiSuccess, ErrorCode } from "@alarm/contracts";

export class AppError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }

  static badRequest(message: string, details?: unknown) {
    return new AppError(400, "VALIDATION_ERROR", message, details);
  }

  static unauthorized(message = "Authentication required") {
    return new AppError(401, "UNAUTHORIZED", message);
  }

  static invalidSignature(message = "Webhook signature verification failed") {
    return new AppError(401, "INVALID_SIGNATURE", message);
  }

  static forbidden(message = "Not permitted") {
    return new AppError(403, "FORBIDDEN", message);
  }

  /**
   * Used for both "does not exist" and "exists but is not yours", so the API
   * never reveals the existence of another user's alarm (README.md §7.3).
   */
  static notFound(message = "Not found") {
    return new AppError(404, "NOT_FOUND", message);
  }
}

export function ok<T>(data: T): ApiSuccess<T> {
  return { data, error: null };
}

export function fail(code: ErrorCode, message: string, requestId: string): ApiFailure {
  return { data: null, error: { code, message, requestId } };
}
