const Redis = require('ioredis');
const env = require('../config/env');

/**
 * Redis client dùng chung (singleton) cho toàn app: OTP store, rate-limit, v.v.
 * Kết nối lazy theo ioredis; tự reconnect khi rớt.
 */
const redis = new Redis(env.redis.url, {
  maxRetriesPerRequest: 3,
});

module.exports = redis;
