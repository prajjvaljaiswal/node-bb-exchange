const { IS_DEV, mockRedis } = require('./devMocks');

if (IS_DEV) {
  console.log('[DEV] Using in-memory mock Redis');
  module.exports = mockRedis;
} else {
  const Redis = require('ioredis');
  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    retryStrategy: (times) => Math.min(times * 50, 2000),
    maxRetriesPerRequest: 3,
  });
  redis.on('connect', () => console.log('[redis] Connected'));
  redis.on('error', (err) => console.error('[redis] Error:', err.message));
  module.exports = redis;
}
