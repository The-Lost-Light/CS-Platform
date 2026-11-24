export const GITHUB_USER_WINDOW_MS = 60_000;
export const GITHUB_USER_MAX_REQUESTS = 30;
export const GITHUB_USER_MAX_CONCURRENT = 6;
export const GITHUB_RATE_LIMIT_MAX_USERS = 5_000;

interface UserBucket {
  timestamps: number[];
  inFlight: number;
}

export interface RateLimitLease {
  release: () => void;
}

export type RateLimitAcquireResult =
  | { allowed: true; lease: RateLimitLease }
  | { allowed: false; retryAfterSeconds: number };

export function createGitHubUserRateLimiter(options?: {
  windowMs?: number;
  maxRequests?: number;
  maxConcurrent?: number;
  maxUsers?: number;
  now?: () => number;
}) {
  const windowMs = options?.windowMs ?? GITHUB_USER_WINDOW_MS;
  const maxRequests = options?.maxRequests ?? GITHUB_USER_MAX_REQUESTS;
  const maxConcurrent = options?.maxConcurrent ?? GITHUB_USER_MAX_CONCURRENT;
  const maxUsers = options?.maxUsers ?? GITHUB_RATE_LIMIT_MAX_USERS;
  const now = options?.now ?? Date.now;
  const buckets = new Map<string, UserBucket>();

  function pruneExpired(bucket: UserBucket, currentNow: number): void {
    const cutoff = currentNow - windowMs;
    while (bucket.timestamps.length > 0 && bucket.timestamps[0] <= cutoff) {
      bucket.timestamps.shift();
    }
  }

  function evictOldestIfNeeded(protectedUserId: string): void {
    while (buckets.size > maxUsers) {
      let evictKey: string | undefined;
      for (const [key, entry] of buckets) {
        if (key !== protectedUserId && entry.inFlight === 0) {
          evictKey = key;
          break;
        }
      }
      if (evictKey === undefined) {
        for (const key of buckets.keys()) {
          if (key !== protectedUserId) {
            evictKey = key;
            break;
          }
        }
      }
      if (evictKey === undefined) break;
      buckets.delete(evictKey);
    }
  }

  function acquire(userId: string): RateLimitAcquireResult {
    const currentNow = now();
    const existing = buckets.get(userId);
    if (existing) {
      pruneExpired(existing, currentNow);
      if (existing.inFlight >= maxConcurrent) {
        return { allowed: false, retryAfterSeconds: 1 };
      }
      if (existing.timestamps.length >= maxRequests) {
        const oldest = existing.timestamps[0] ?? currentNow;
        const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - currentNow) / 1000));
        return { allowed: false, retryAfterSeconds };
      }
    } else if (maxConcurrent < 1 || maxRequests < 1) {
      return { allowed: false, retryAfterSeconds: 1 };
    }

    const bucket = existing ?? { timestamps: [], inFlight: 0 };
    bucket.timestamps.push(currentNow);
    bucket.inFlight += 1;
    if (buckets.has(userId)) {
      buckets.delete(userId);
    }
    buckets.set(userId, bucket);
    evictOldestIfNeeded(userId);

    let released = false;
    return {
      allowed: true,
      lease: {
        release() {
          if (released) return;
          released = true;
          bucket.inFlight = Math.max(0, bucket.inFlight - 1);
          pruneExpired(bucket, now());
          if (bucket.inFlight === 0 && bucket.timestamps.length === 0) {
            if (buckets.get(userId) === bucket) {
              buckets.delete(userId);
            }
          }
        },
      },
    };
  }

  function reset(): void {
    buckets.clear();
  }

  return { acquire, reset };
}

const defaultUserRateLimiter = createGitHubUserRateLimiter();

export function acquireGitHubUserQuota(userId: string): RateLimitAcquireResult {
  return defaultUserRateLimiter.acquire(userId);
}

export function resetGitHubUserRateLimiter(): void {
  defaultUserRateLimiter.reset();
}
