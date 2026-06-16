const crypto = require('crypto');
const redis = require('./redisClient');
const env = require('../config/env');

/**
 * Lưu trữ OTP trên Redis cho các flow xác thực (đăng ký, ...).
 * - Key:   otp:{purpose}:{identifier}        (identifier = email đã normalize)
 * - Value: Redis Hash { code, attempts }     (code lưu plaintext)
 * - TTL:   OTP_TTL_SECONDS (mặc định 300s) — tự hết hạn, không cần cleanup.
 */

const OTP_PURPOSE = {
  REGISTRATION: 'REGISTRATION',
  PASSWORD_RESET: 'PASSWORD_RESET',
};

function normalizeIdentifier(identifier) {
  return String(identifier).trim().toLowerCase();
}

function otpKey(purpose, identifier) {
  return `otp:${purpose}:${normalizeIdentifier(identifier)}`;
}

function cooldownKey(purpose, identifier) {
  return `otp:cooldown:${purpose}:${normalizeIdentifier(identifier)}`;
}

/** Sinh OTP 6 chữ số ngẫu nhiên an toàn (giữ cả số 0 ở đầu). */
function generateOtp() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

/** So sánh an toàn theo thời gian hằng định (tránh timing attack). */
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Tạo/ghi đè OTP cho một subject. Reset attempts = 0 và TTL về mặc định.
 * @param {{ purpose: string, identifier: string, code: string }} params
 */
async function setOtp({ purpose, identifier, code }) {
  const key = otpKey(purpose, identifier);
  await redis
    .multi()
    .hset(key, { code: String(code), attempts: 0 })
    .expire(key, env.otp.ttlSeconds)
    .exec();
}

/**
 * Kiểm tra OTP người dùng nhập.
 * @returns {Promise<{ status: 'OK'|'WRONG'|'EXPIRED'|'LOCKED', attempts: number }>}
 *  - EXPIRED: key không còn (hết TTL hoặc chưa từng có).
 *  - LOCKED:  đã nhập sai >= OTP_MAX_ATTEMPTS.
 *  - WRONG:   sai code (chưa tăng attempts — gọi incrAttempts ở service nếu muốn).
 *  - OK:      khớp.
 */
async function verifyOtp({ purpose, identifier, code }) {
  const data = await redis.hgetall(otpKey(purpose, identifier));
  if (!data || !data.code) {
    return { status: 'EXPIRED', attempts: 0 };
  }
  const attempts = Number(data.attempts || 0);
  if (attempts >= env.otp.maxAttempts) {
    return { status: 'LOCKED', attempts };
  }
  if (!safeEqual(data.code, String(code))) {
    return { status: 'WRONG', attempts };
  }
  return { status: 'OK', attempts };
}

/** Tăng số lần nhập sai (atomic, không reset TTL). Trả về attempts mới. */
async function incrAttempts({ purpose, identifier }) {
  return redis.hincrby(otpKey(purpose, identifier), 'attempts', 1);
}

/** Xóa OTP (consume khi verify đúng, hoặc khi vượt số lần). */
async function deleteOtp({ purpose, identifier }) {
  return redis.del(otpKey(purpose, identifier));
}

/** Đặt cooldown chặn resend dồn dập. */
async function setResendCooldown({ purpose, identifier }) {
  await redis.set(cooldownKey(purpose, identifier), '1', 'EX', env.otp.resendCooldownSeconds);
}

/** Còn trong thời gian cooldown? */
async function isOnCooldown({ purpose, identifier }) {
  return (await redis.exists(cooldownKey(purpose, identifier))) === 1;
}

module.exports = {
  OTP_PURPOSE,
  generateOtp,
  setOtp,
  verifyOtp,
  incrAttempts,
  deleteOtp,
  setResendCooldown,
  isOnCooldown,
};
