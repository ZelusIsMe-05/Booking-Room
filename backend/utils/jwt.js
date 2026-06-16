const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

const TOKEN_TYPE = {
  ACCESS: 'access',
  REFRESH: 'refresh',
};

/**
 * Sign a short-lived access token.
 * Payload carries the user UUID in `sub` so other modules can extract it.
 *
 * @param {{ userId: string, role: string, status: string }} params
 * @returns {string} signed JWT
 */
function signAccessToken({ userId, role, status }) {
  return jwt.sign({ role, status, type: TOKEN_TYPE.ACCESS }, env.jwt.accessSecret, {
    subject: userId,
    expiresIn: env.jwt.accessExpiresIn,
  });
}

/**
 * Sign a long-lived refresh token. Kept minimal on purpose.
 * Mang `jti` (id phiên) để đối chiếu với bản ghi trong bảng refresh_tokens.
 *
 * @param {{ userId: string, jti: string }} params
 * @returns {string} signed JWT
 */
function signRefreshToken({ userId, jti }) {
  return jwt.sign({ type: TOKEN_TYPE.REFRESH }, env.jwt.refreshSecret, {
    subject: userId,
    jwtid: jti,
    expiresIn: env.jwt.refreshExpiresIn,
  });
}

/**
 * SHA-256 (hex) của một chuỗi token. Dùng để lưu hash của refresh token vào DB
 * thay vì token thô — nếu DB rò rỉ thì không có sẵn token dùng được.
 *
 * @param {string} token
 * @returns {string} hex digest
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Verify an access token and return its decoded payload.
 * Throws the underlying jsonwebtoken error on failure.
 *
 * @param {string} token
 * @returns {object} decoded payload
 */
function verifyAccessToken(token) {
  const payload = jwt.verify(token, env.jwt.accessSecret);
  if (payload.type !== TOKEN_TYPE.ACCESS) {
    throw new jwt.JsonWebTokenError('Invalid token type');
  }
  return payload;
}

/**
 * Verify a refresh token and return its decoded payload.
 *
 * @param {string} token
 * @returns {object} decoded payload
 */
function verifyRefreshToken(token) {

  // jwt.verify() làm các việc sau (mặc định):
  // 1. Kiểm tra định dạng JWT (3 phần header.payload.signature).
  // 2. Kiểm tra chữ ký bằng refreshSecret — sai secret hoặc token bị sửa → ném JsonWebTokenError.
  // 3. Kiểm tra hạn (exp) — nếu hết hạn → ném TokenExpiredError (là lớp con của JsonWebTokenError).
  // 4. Kiểm tra nbf (not before) nếu có.
  const payload = jwt.verify(token, env.jwt.refreshSecret);
  if (payload.type !== TOKEN_TYPE.REFRESH) {
    throw new jwt.JsonWebTokenError('Invalid token type');
  }
  return payload;
}

/**
 * Extract the user UUID (the JWT `sub` claim) from a decoded payload.
 * Used by middlewares and other modules that only need the user id.
 *
 * @param {object} payload decoded JWT payload
 * @returns {string} user UUID
 */
function getUserIdFromPayload(payload) {
  return payload.sub;
}

/**
 * Extract the refresh-token session id (`jti` claim) from a decoded payload.
 *
 * @param {object} payload decoded JWT payload
 * @returns {string|undefined} jti
 */
function getJtiFromPayload(payload) {
  return payload.jti;
}

module.exports = {
  TOKEN_TYPE,
  signAccessToken,
  signRefreshToken,
  hashToken,
  verifyAccessToken,
  verifyRefreshToken,
  getUserIdFromPayload,
  getJtiFromPayload,
};
