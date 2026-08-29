export interface RateLimiterOptions {
  /** Maximum number of tokens a bucket can hold (i.e. the allowed burst size). */
  capacity: number;
  /** Tokens added back to a bucket per second. */
  refillPerSecond: number;
}

interface Bucket {
  tokens: number;
  lastRefill: number;
}

/**
 * Minimal in-memory token-bucket rate limiter, keyed by an arbitrary string
 * (e.g. a socket id). No external dependency — tokens are refilled lazily,
 * based on elapsed wall-clock time, whenever `consume()` is called.
 *
 * Used to bound how many signaling/chat envelopes a single socket connection
 * may relay per second, independent of (and in addition to) the per-message
 * size check in the socket listeners.
 */
export class RateLimiter {
  private buckets: Map<string, Bucket> = new Map();

  constructor(private options: RateLimiterOptions) {}

  /** Attempts to consume `cost` tokens from `key`'s bucket. Returns whether it was allowed. */
  public consume(key: string, cost = 1): boolean {
    const now = Date.now();
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = { tokens: this.options.capacity, lastRefill: now };
      this.buckets.set(key, bucket);
    }

    const elapsedSeconds = Math.max(0, now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(this.options.capacity, bucket.tokens + elapsedSeconds * this.options.refillPerSecond);
    bucket.lastRefill = now;

    if (bucket.tokens < cost) {
      return false;
    }
    bucket.tokens -= cost;
    return true;
  }

  /** Forgets a key's bucket entirely (e.g. on disconnect), so memory doesn't grow unbounded. */
  public reset(key: string): void {
    this.buckets.delete(key);
  }
}
