import { RateLimitError, NetworkError } from '../errors';

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableStatusCodes?: number[];
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error;
  let delay = opts.initialDelay;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === opts.maxRetries) {
        break;
      }

      if (error instanceof RateLimitError) {
        const retryDelay = error.retryAfter ? error.retryAfter * 1000 : delay;
        await sleep(Math.min(retryDelay, opts.maxDelay));
        delay *= opts.backoffMultiplier;
        continue;
      }

      if (
        error instanceof NetworkError ||
        (error && typeof error === 'object' && 'status' in error &&
          opts.retryableStatusCodes.includes((error as any).status))
      ) {
        await sleep(Math.min(delay, opts.maxDelay));
        delay *= opts.backoffMultiplier;
        continue;
      }

      throw error;
    }
  }

  throw lastError!;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
