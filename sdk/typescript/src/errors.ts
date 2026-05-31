export class StellarSwipeError extends Error {
  public readonly status?: number;
  public readonly code?: string;
  public readonly details?: any;

  constructor(message: string, status?: number, code?: string, details?: any) {
    super(message);
    this.name = 'StellarSwipeError';
    this.status = status;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, StellarSwipeError.prototype);
  }
}

export class APIError extends StellarSwipeError {
  constructor(message: string, status: number, details?: any) {
    super(message, status, 'API_ERROR', details);
    this.name = 'APIError';
  }
}

export class AuthenticationError extends StellarSwipeError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends StellarSwipeError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends StellarSwipeError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with ID ${id} not found` : `${resource} not found`;
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends StellarSwipeError {
  public readonly retryAfter?: number;

  constructor(message: string = 'Rate limit exceeded', retryAfter?: number) {
    super(message, 429, 'RATE_LIMIT_ERROR');
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class NetworkError extends StellarSwipeError {
  constructor(message: string = 'Network request failed') {
    super(message, undefined, 'NETWORK_ERROR');
    this.name = 'NetworkError';
  }
}
