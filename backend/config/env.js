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
};

if (!Number.isInteger(env.port) || env.port <= 0) {
  throw new Error('PORT must be a positive integer');
}

if (!Number.isInteger(env.bcryptSaltRounds) || env.bcryptSaltRounds < 10) {
  throw new Error('BCRYPT_SALT_ROUNDS must be an integer >= 10');
}

module.exports = env;
