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

module.exports = {
  findUserByIdentifier,
  findUserById,
  getAccountSecurity,
  ensureAccountSecurity,
  registerFailedAttempt,
  registerSuccessfulLogin,
  writeLoginAudit,
};
