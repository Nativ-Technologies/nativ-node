/**
 * Error hierarchy for the Nativ SDK.
 *
 * All errors extend {@link NativError} which carries the HTTP status code
 * and raw response body for programmatic inspection.
 */

export class NativError extends Error {
  readonly statusCode?: number;
  readonly body?: Record<string, unknown>;

  constructor(
    message: string,
    options?: { statusCode?: number; body?: Record<string, unknown> },
  ) {
    super(message);
    this.name = "NativError";
    this.statusCode = options?.statusCode;
    this.body = options?.body;
  }
}

/** Invalid or missing API key (HTTP 401). */
export class AuthenticationError extends NativError {
  constructor(
    message: string,
    options?: { statusCode?: number; body?: Record<string, unknown> },
  ) {
    super(message, options);
    this.name = "AuthenticationError";
  }
}

/** Not enough credits (HTTP 402). Top up at dashboard.usenativ.com. */
export class InsufficientCreditsError extends NativError {
  constructor(
    message: string,
    options?: { statusCode?: number; body?: Record<string, unknown> },
  ) {
    super(message, options);
    this.name = "InsufficientCreditsError";
  }
}

/** Invalid request parameters (HTTP 400 / 422). */
export class ValidationError extends NativError {
  constructor(
    message: string,
    options?: { statusCode?: number; body?: Record<string, unknown> },
  ) {
    super(message, options);
    this.name = "ValidationError";
  }
}

/** Resource not found (HTTP 404). */
export class NotFoundError extends NativError {
  constructor(
    message: string,
    options?: { statusCode?: number; body?: Record<string, unknown> },
  ) {
    super(message, options);
    this.name = "NotFoundError";
  }
}

/** Too many requests (HTTP 429). */
export class RateLimitError extends NativError {
  constructor(
    message: string,
    options?: { statusCode?: number; body?: Record<string, unknown> },
  ) {
    super(message, options);
    this.name = "RateLimitError";
  }
}

/** Nativ API returned a server-side error (HTTP 5xx). */
export class ServerError extends NativError {
  constructor(
    message: string,
    options?: { statusCode?: number; body?: Record<string, unknown> },
  ) {
    super(message, options);
    this.name = "ServerError";
  }
}
