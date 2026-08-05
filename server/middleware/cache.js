/**
 * Simple in-memory response cache middleware.
 * Usage: router.get('/dashboard', cacheFor(30), handler)
 *
 * Cache key = userId + originalUrl
 * Swap for Redis in production.
 */

const store = new Map();

const MAX_ENTRIES = 500;
const CLEANUP_INTERVAL = 60 * 1000;

// Periodic cleanup of expired entries
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.expiresAt) store.delete(key);
  }
  // Evict oldest if over max
  if (store.size > MAX_ENTRIES) {
    const sorted = [...store.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt);
    for (let i = 0; i < sorted.length - MAX_ENTRIES; i++) {
      store.delete(sorted[i][0]);
    }
  }
}, CLEANUP_INTERVAL);

/**
 * @param {number} ttlSeconds — time to live in seconds
 */
export function cacheFor(ttlSeconds) {
  return (req, res, next) => {
    if (req.method !== 'GET') return next();

    const userId = req.user?.id || 'anon';
    const key = `${userId}:${req.originalUrl}`;
    const cached = store.get(key);

    if (cached && Date.now() < cached.expiresAt) {
      return res.json(cached.data);
    }

    const originalJson = res.json.bind(res);
    res.json = (data) => {
      if (res.statusCode < 400) {
        store.set(key, { data, expiresAt: Date.now() + ttlSeconds * 1000 });
      }
      return originalJson(data);
    };

    next();
  };
}

/**
 * Invalidate cache entries for a user (call after mutations).
 */
export function invalidateCache(userId, pathPrefix) {
  for (const [key] of store) {
    if (key.startsWith(`${userId}:`) && (!pathPrefix || key.includes(pathPrefix))) {
      store.delete(key);
    }
  }
}
