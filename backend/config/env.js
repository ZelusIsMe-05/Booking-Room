const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const required = ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
const missing = required.filter((key) => !process.env[key] || String(process.env[key]).trim() === '');

if (missing.length > 0) {
  throw new Error(`Missing required environment variable(s): ${missing.join(', ')}`);
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5000),
  databaseUrl: process.env.DATABASE_URL,
  bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS || 10),
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  redis: {
    // Dev mặc định Redis local; production set REDIS_URL trong .env.
    url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  },
  otp: {
    ttlSeconds: Number(process.env.OTP_TTL_SECONDS || 300),
    maxAttempts: Number(process.env.OTP_MAX_ATTEMPTS || 3),
    resendCooldownSeconds: Number(process.env.OTP_RESEND_COOLDOWN_SECONDS || 60),
  },
  smtp: {
    // Nếu thiếu host/user/pass → mailer chạy chế độ dev (log OTP ra console).
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || 'BookingRoom <no-reply@booking.local>',
  },
  oauth: {
    // Client id/secret của từng provider. Thiếu cấu hình → gọi provider đó sẽ lỗi 502.
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
    facebook: {
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    },
  },
};

if (!Number.isInteger(env.port) || env.port <= 0) {
  throw new Error('PORT must be a positive integer');
}

if (!Number.isInteger(env.bcryptSaltRounds) || env.bcryptSaltRounds < 10) {
  throw new Error('BCRYPT_SALT_ROUNDS must be an integer >= 10');
}

module.exports = env;
