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
 *
 * @param {{ userId: string }} params
 * @returns {string} signed JWT
 */
function signRefreshToken({ userId }) {
  return jwt.sign({ type: TOKEN_TYPE.REFRESH }, env.jwt.refreshSecret, {
    subject: userId,
    expiresIn: env.jwt.refreshExpiresIn,
  });
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

module.exports = {
  TOKEN_TYPE,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  getUserIdFromPayload,
};
