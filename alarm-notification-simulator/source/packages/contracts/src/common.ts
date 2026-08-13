/**
 * Every API response uses this envelope, per the specification in README.md §7.
 */
export type ApiSuccess<T> = { data: T; error: null };

export type ApiErrorBody = {
  code: string;
  message: string;
  requestId: string;
};

export type ApiFailure = { data: null; error: ApiErrorBody };

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export const ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  INVALID_SIGNATURE: "INVALID_SIGNATURE",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export const INTERNAL_WEBHOOK_SIGNATURE_HEADER = "x-internal-webhook-signature";
