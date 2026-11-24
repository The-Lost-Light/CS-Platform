import type { RepoCommitDetails } from "@modules/repository";

export const ETAG_CACHE_TTL_MS = 60 * 60 * 1000;
export const MAX_ETAG_CACHE_BODY_CHARS = 2 * 1024 * 1024;
export const COMMIT_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
export const MAX_COMMIT_CACHE_PATCH_CHARS = 1_000_000;
export const VISIBILITY_CACHE_TTL_MS = 10 * 60 * 1000;
const TOKEN_ID_TTL_MS = 24 * 60 * 60 * 1000;

export interface HttpResponseSnapshot {
  status: number;
  statusText: string;
  headers: Array<[string, string]>;
  bodyText: string;
}

export interface CachedEtagResponse extends HttpResponseSnapshot {
  etag: string;
}

const NULL_BODY_STATUSES = new Set([101, 204, 205, 304]);

export function snapshotToResponse(snapshot: HttpResponseSnapshot): Response {
  const body = NULL_BODY_STATUSES.has(snapshot.status) ? null : snapshot.bodyText;
  return new Response(body, {
    status: snapshot.status,
    statusText: snapshot.statusText,
    headers: new Headers(snapshot.headers),
  });
}

export class BoundedCache<V> {
  private readonly map = new Map<string, { value: V; expiresAt: number }>();

  constructor(private readonly maxEntries: number) {}

  get(key: string, now = Date.now()): V | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= now) {
      this.map.delete(key);
      return undefined;
    }
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  set(key: string, value: V, ttlMs: number, now = Date.now()): void {
    if (this.maxEntries <= 0) return;
    if (this.map.has(key)) {
      this.map.delete(key);
    }
    while (this.map.size >= this.maxEntries) {
      const oldestKey = this.map.keys().next().value;
      if (oldestKey === undefined) break;
      this.map.delete(oldestKey);
    }
    this.map.set(key, { value, expiresAt: now + ttlMs });
  }

  delete(key: string): void {
    this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
  }
}

export class GitHubCacheStore {
  readonly etagResponses = new BoundedCache<CachedEtagResponse>(1000);
  readonly inFlight = new Map<string, Promise<HttpResponseSnapshot>>();
  readonly commitDetails = new BoundedCache<RepoCommitDetails>(500);
  readonly repoVisibility = new BoundedCache<"public" | "private">(1000);
  private readonly tokenIds = new BoundedCache<number>(32);
  private nextTokenId = 0;

  constructor(readonly epoch: number) {}

  getTokenId(token: string): number {
    const existing = this.tokenIds.get(token);
    if (existing !== undefined) return existing;
    const id = ++this.nextTokenId;
    this.tokenIds.set(token, id, TOKEN_ID_TTL_MS);
    return id;
  }

  getCommitDetails(
    tokenId: number,
    fullKey: string,
    sha: string,
    page: number,
  ): RepoCommitDetails | undefined {
    return this.commitDetails.get(
      `${tokenId}:${fullKey.toLowerCase()}:${sha.toLowerCase()}:page:${page}`,
    );
  }

  setCommitDetails(
    tokenId: number,
    fullKey: string,
    sha: string,
    page: number,
    details: RepoCommitDetails,
  ): void {
    let totalPatchLength = 0;
    for (const file of details.files ?? []) {
      if (file.patch) totalPatchLength += file.patch.length;
    }
    if (totalPatchLength > MAX_COMMIT_CACHE_PATCH_CHARS) return;
    this.commitDetails.set(
      `${tokenId}:${fullKey.toLowerCase()}:${sha.toLowerCase()}:page:${page}`,
      details,
      COMMIT_CACHE_TTL_MS,
    );
  }

  getRepoVisibility(tokenId: number, fullKey: string): "public" | "private" | undefined {
    return this.repoVisibility.get(`${tokenId}:${fullKey.toLowerCase()}`);
  }

  setRepoVisibility(tokenId: number, fullKey: string, visibility: "public" | "private"): void {
    this.repoVisibility.set(
      `${tokenId}:${fullKey.toLowerCase()}`,
      visibility,
      VISIBILITY_CACHE_TTL_MS,
    );
  }
}

let cacheEpoch = 0;
const storesByFetch = new WeakMap<typeof globalThis.fetch, GitHubCacheStore>();

/**
 * Scope caches per `fetch` implementation so production Workers share one store
 * across requests while isolated test transports never leak cache state.
 */
export function getGitHubCacheStore(fetchFn: typeof globalThis.fetch): GitHubCacheStore {
  const existing = storesByFetch.get(fetchFn);
  if (existing && existing.epoch === cacheEpoch) return existing;
  const store = new GitHubCacheStore(cacheEpoch);
  storesByFetch.set(fetchFn, store);
  return store;
}

export function clearServerGitHubCache(): void {
  cacheEpoch++;
}
