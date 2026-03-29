const { IS_DEV, mockWithLock } = require('../config/devMocks');

if (IS_DEV) {
  console.log('[DEV] Using in-memory mutex for distributed locks');
  module.exports = { withLock: mockWithLock };
} else {
  const { default: Redlock } = require('redlock');
  const redis = require('../config/redis');

  const redlock = new Redlock([redis], {
    driftFactor: 0.01,
    retryCount: 3,
    retryDelay: 200,
    retryJitter: 100,
  });

  redlock.on('error', (err) => {
    if (err.name !== 'LockError') {
      console.error('[redlock] Error:', err.message);
    }
  });

  async function withLock(resources, ttl, fn) {
    const sortedResources = [...resources].sort().map(r => `lock:${r}`);
    const lock = await redlock.acquire(sortedResources, ttl);
    try {
      return await fn();
    } finally {
      await lock.release();
    }
  }

  module.exports = { redlock, withLock };
}
