const db = require('../../config/db');

/**
 * Data-access layer for authentication.
 * Only this layer knows about table/column names; it never deals with HTTP.
 */

/**
 * Find a user by email, phone number, or username (the login identifier).
 * Joins roles to resolve the role name used in the JWT/response.
 *
 * @param {string} identifier
 * @returns {Promise<object|undefined>} user row with role_name, or undefined
 */
function findUserByIdentifier(identifier) {
  return db('users')
    .join('roles', 'users.role_id', 'roles.role_id')
    .where('users.email', identifier)
    .orWhere('users.phone_number', identifier)
    .orWhere('users.username', identifier)
    .select(
      'users.user_id',
      'users.full_name',
      'users.email',
      'users.phone_number',
      'users.username',
      'users.password',
      'users.status',
      'users.role_id',
      'roles.role_name',
    )
    .first();
}

/**
 * Lấy role_id theo role_name (vd 'TENANT').
 *
 * @param {string} roleName
 * @returns {Promise<{ role_id: string }|undefined>}
 */
function getRoleIdByName(roleName) {
  return db('roles').where({ role_name: roleName }).select('role_id').first();
}

/**
 * Tìm user trùng email / số điện thoại / username (dùng cho check đăng ký).
 *
 * @param {{ email: string, phoneNumber: string, username: string }} params
 * @returns {Promise<object|undefined>} bản ghi đầu tiên trùng, hoặc undefined
 */
function findUserByEmailPhoneUsername({ email, phoneNumber, username }) {
  return db('users')
    .where('email', email)
    .orWhere('phone_number', phoneNumber)
    .orWhere('username', username)
    .first();
}

/**
 * Tạo user TENANT mới ở trạng thái INACTIVE, kèm bản ghi tenants + account_security,
 * trong một transaction.
 *
 * @param {object} params
 * @returns {Promise<object>} user row vừa tạo (user_id, username, email, phone_number, status)
 */
async function createTenantUser({ fullName, username, email, phoneNumber, passwordHash, roleId }) {
  return db.transaction(async (trx) => {
    const [user] = await trx('users')
      .insert({
        full_name: fullName,
        username,
        email,
        phone_number: phoneNumber,
        password: passwordHash,
        role_id: roleId,
        status: 'INACTIVE',
      })
      .returning(['user_id', 'username', 'email', 'phone_number', 'status']);

    await trx('tenants').insert({ tenant_id: user.user_id });
    await trx('account_security').insert({ user_id: user.user_id });

    return user;
  });
}

/**
 * Tìm user đang INACTIVE theo email (dùng cho verify/resend OTP đăng ký).
 *
 * @param {string} email
 * @returns {Promise<object|undefined>}
 */
function findInactiveUserByEmail(email) {
  return db('users')
    .where({ email, status: 'INACTIVE' })
    .select('user_id', 'email', 'status')
    .first();
}

/**
 * Tìm user theo email (mọi trạng thái) — dùng cho resend OTP để phân biệt
 * không tồn tại (404) vs đã kích hoạt (409).
 *
 * @param {string} email
 * @returns {Promise<{ user_id: string, status: string }|undefined>}
 */
function findUserByEmail(email) {
  return db('users').where({ email }).select('user_id', 'status').first();
}

/**
 * Kích hoạt tài khoản: chuyển status sang ACTIVE.
 *
 * @param {string} userId
 * @returns {Promise<number>} số bản ghi cập nhật
 */
function activateUser(userId) {
  return db('users').where({ user_id: userId }).update({ status: 'ACTIVE' });
}

/**
 * Find a user by primary key, joined with their role name.
 * Used when re-issuing an access token from a refresh token.
 *
 * @param {string} userId
 * @returns {Promise<object|undefined>} user row with role_name, or undefined
 */
function findUserById(userId) {
  return db('users')
    .join('roles', 'users.role_id', 'roles.role_id')
    .where('users.user_id', userId)
    .select(
      'users.user_id',
      'users.full_name',
      'users.email',
      'users.phone_number',
      'users.username',
      'users.avatar_url',
      'users.status',
      'users.role_id',
      'roles.role_name',
    )
    .first();
}

/**
 * Read the account_security row for a user.
 *
 * @param {string} userId
 * @returns {Promise<object|undefined>}
 */
function getAccountSecurity(userId) {
  return db('account_security').where({ user_id: userId }).first();
}

/**
 * Ensure an account_security row exists for the user (seed users may lack one).
 *
 * @param {string} userId
 * @returns {Promise<void>}
 */
async function ensureAccountSecurity(userId) {
  await db('account_security')
    .insert({ user_id: userId })
    .onConflict('user_id')
    .ignore();
}

/**
 * Increment failed_login_attempts and optionally set locked_until.
 *
 * @param {string} userId
 * @param {Date|null} lockedUntil set when the account must be locked
 * @returns {Promise<object>} updated security row
 */
async function registerFailedAttempt(userId, lockedUntil) {
  const [row] = await db('account_security')
    .where({ user_id: userId })
    .update({
      failed_login_attempts: db.raw('failed_login_attempts + 1'),
      locked_until: lockedUntil,
      updated_at: db.fn.now(),
    })
    .returning('*');
  return row;
}

/**
 * Reset the failure counter and stamp last_login_at on a successful login.
 *
 * @param {string} userId
 * @returns {Promise<void>}
 */
async function registerSuccessfulLogin(userId) {
  await db('account_security')
    .where({ user_id: userId })
    .update({
      failed_login_attempts: 0,
      locked_until: null,
      last_login_at: db.fn.now(),
      updated_at: db.fn.now(),
    });
}

/**
 * Append a row to the login audit trail. Used for both success and failure,
 * including the case where no user matched (userId = null).
 *
 * @param {object} entry
 * @returns {Promise<void>}
 */
async function writeLoginAudit({ userId, identifier, success, failureReason, ipAddress, userAgent }) {
  await db('login_audit_logs').insert({
    user_id: userId || null,
    login_identifier: identifier,
    success,
    failure_reason: failureReason || null,
    ip_address: ipAddress || null,
    user_agent: userAgent || null,
  });
}

/**
 * Lưu một phiên refresh token mới (token_id = jti). Chỉ lưu hash, không lưu token thô.
 *
 * @param {object} entry
 * @param {string} entry.tokenId jti của refresh token
 * @param {string} entry.userId
 * @param {string} entry.tokenHash SHA-256 của refresh token
 * @param {Date} entry.expiresAt
 * @param {string} [entry.ipAddress]
 * @param {string} [entry.userAgent]
 * @returns {Promise<void>}
 */
async function insertRefreshToken({ tokenId, userId, tokenHash, expiresAt, ipAddress, userAgent }) {
  await db('refresh_tokens').insert({
    token_id: tokenId,
    user_id: userId,
    token_hash: tokenHash,
    expires_at: expiresAt,
    ip_address: ipAddress || null,
    user_agent: userAgent || null,
  });
}

/**
 * Đọc một phiên refresh token theo jti.
 *
 * @param {string} tokenId jti
 * @returns {Promise<object|undefined>}
 */
function findRefreshTokenById(tokenId) {
  return db('refresh_tokens').where({ token_id: tokenId }).first();
}

/**
 * Xóa cứng một phiên refresh token. Ràng buộc thêm user_id để một user không thể
 * xóa phiên của user khác. Trả về số bản ghi đã xóa (0 nếu không có gì để xóa).
 *
 * @param {string} tokenId jti
 * @param {string} userId
 * @returns {Promise<number>}
 */
function deleteRefreshToken(tokenId, userId) {
  return db('refresh_tokens').where({ token_id: tokenId, user_id: userId }).del();
}

module.exports = {
  getRoleIdByName,
  findUserByEmailPhoneUsername,
  createTenantUser,
  findInactiveUserByEmail,
  findUserByEmail,
  activateUser,
  findUserByIdentifier,
  findUserById,
  getAccountSecurity,
  ensureAccountSecurity,
  registerFailedAttempt,
  registerSuccessfulLogin,
  writeLoginAudit,
  insertRefreshToken,
  findRefreshTokenById,
  deleteRefreshToken,
};
