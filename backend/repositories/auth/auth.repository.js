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
    .leftJoin('landlords', 'users.user_id', 'landlords.landlord_id')
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
      'users.avatar_url',
      'users.gender',
      'users.date_of_birth',
      'users.address',
      'users.status',
      'users.role_id',
      'roles.role_name',
      'landlords.approval_status',
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
 * Tạo user mới ở trạng thái INACTIVE, kèm bản ghi tenants/landlords + account_security,
 * trong một transaction tùy thuộc vào vai trò (roleName).
 *
 * @param {object} params
 * @returns {Promise<object>} user row vừa tạo (user_id, username, email, phone_number, status)
 */
async function createUserWithRole({
  userId,
  fullName,
  username,
  email,
  phoneNumber,
  passwordHash,
  roleId,
  roleName,
  gender,
  dateOfBirth,
  idCardFrontUrl,
  idCardBackUrl,
}) {
  return db.transaction(async (trx) => {
    const insertData = {
      full_name: fullName,
      username,
      email,
      phone_number: phoneNumber,
      password: passwordHash,
      role_id: roleId,
      gender: gender || 'OTHER',
      date_of_birth: dateOfBirth || null,
      status: 'INACTIVE',
    };
    // Landlord sinh user_id ở app để biết thư mục ảnh trước khi insert; tenant/OAuth
    // vẫn để DB sinh (gen_random_uuid()).
    if (userId) {
      insertData.user_id = userId;
    }

    const [user] = await trx('users')
      .insert(insertData)
      .returning(['user_id', 'username', 'email', 'phone_number', 'status', 'gender', 'date_of_birth']);

    if (roleName === 'LANDLORD') {
      await trx('landlords').insert({
        landlord_id: user.user_id,
        // NULL = chưa nộp CCCD (để assertVerifiedHost/duyệt phản ánh đúng); ảnh nộp ở API riêng.
        id_card_front_url: idCardFrontUrl || null,
        id_card_back_url: idCardBackUrl || null,
        approval_status: 'PENDING',
      });
    } else {
      await trx('tenants').insert({ tenant_id: user.user_id });
    }
    await trx('account_security').insert({ user_id: user.user_id });

    return user;
  });
}

/**
 * Cập nhật 2 ảnh CCCD của landlord (URL S3 lưu DB). Khi `resetToPending` (nộp lại sau khi
 * bị từ chối) thì đưa approval_status về PENDING + xóa lý do từ chối để Admin duyệt lại.
 *
 * @param {string} landlordId
 * @param {{ frontKey: string, backKey: string, resetToPending?: boolean }} params
 * @returns {Promise<number>} số bản ghi cập nhật
 */
function updateLandlordIdCards(landlordId, { frontKey, backKey, resetToPending = false }) {
  const update = {
    id_card_front_url: frontKey,
    id_card_back_url: backKey,
  };
  if (resetToPending) {
    update.approval_status = 'PENDING';
    update.rejection_reason = null;
    update.reviewed_at = null;
    update.reviewed_by = null;
  }
  return db('landlords').where({ landlord_id: landlordId }).update(update);
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
 * Tìm user đang ACTIVE theo email — dùng cho flow quên mật khẩu.
 *
 * @param {string} email
 * @returns {Promise<{ user_id: string, status: string }|undefined>}
 */
function findActiveUserByEmail(email) {
  return db('users')
    .where({ email, status: 'ACTIVE' })
    .select('user_id', 'status')
    .first();
}

/**
 * Cập nhật mật khẩu (hash) của user.
 *
 * @param {string} userId
 * @param {string} passwordHash
 * @returns {Promise<number>} số bản ghi cập nhật
 */
function updateUserPassword(userId, passwordHash) {
  return db('users').where({ user_id: userId }).update({ password: passwordHash });
}

/**
 * Xóa toàn bộ phiên refresh token của một user (logout mọi thiết bị) —
 * dùng sau khi đổi mật khẩu. Trả về số phiên đã xóa.
 *
 * @param {string} userId
 * @returns {Promise<number>}
 */
function deleteRefreshTokensByUser(userId) {
  return db('refresh_tokens').where({ user_id: userId }).del();
}

/**
 * Reset bộ đếm đăng nhập sai và mở khóa cho user (sau khi đổi mật khẩu),
 * để user đăng nhập lại ngay bằng mật khẩu mới.
 *
 * @param {string} userId
 * @returns {Promise<void>}
 */
async function resetAccountSecurity(userId) {
  await db('account_security')
    .where({ user_id: userId })
    .update({
      failed_login_attempts: 0,
      locked_until: null,
      updated_at: db.fn.now(),
    });
}

/**
 * Tìm liên kết OAuth theo (provider, provider_user_id).
 *
 * @param {string} provider GOOGLE | FACEBOOK | GITHUB
 * @param {string} providerUserId
 * @returns {Promise<{ oauth_account_id: string, user_id: string }|undefined>}
 */
function findOAuthAccount(provider, providerUserId) {
  return db('oauth_accounts')
    .where({ provider, provider_user_id: providerUserId })
    .select('oauth_account_id', 'user_id')
    .first();
}

/**
 * Liên kết một danh tính OAuth vào user đã tồn tại.
 *
 * @param {{ userId: string, provider: string, providerUserId: string, email?: string }} params
 * @returns {Promise<void>}
 */
async function linkOAuthAccount({ userId, provider, providerUserId, email }) {
  await db('oauth_accounts').insert({
    user_id: userId,
    provider,
    provider_user_id: providerUserId,
    email: email || null,
  });
}

/**
 * Username đã được dùng chưa (hỗ trợ sinh username unique cho user OAuth).
 *
 * @param {string} username
 * @returns {Promise<boolean>}
 */
async function isUsernameTaken(username) {
  const row = await db('users').where({ username }).select('user_id').first();
  return Boolean(row);
}

/**
 * Tạo user OAuth (status ACTIVE) + tenants + account_security + oauth_accounts,
 * trong một transaction. Trả về user_id vừa tạo.
 *
 * @param {object} params
 * @returns {Promise<string>} user_id
 */
async function createOAuthUser({
  fullName,
  email,
  username,
  avatarUrl,
  passwordHash,
  roleId,
  provider,
  providerUserId,
}) {
  return db.transaction(async (trx) => {
    const [user] = await trx('users')
      .insert({
        full_name: fullName,
        username,
        email,
        avatar_url: avatarUrl || null,
        password: passwordHash,
        role_id: roleId,
        status: 'ACTIVE',
      })
      .returning(['user_id']);

    await trx('tenants').insert({ tenant_id: user.user_id });
    await trx('account_security').insert({ user_id: user.user_id });
    await trx('oauth_accounts').insert({
      user_id: user.user_id,
      provider,
      provider_user_id: providerUserId,
      email: email || null,
    });

    return user.user_id;
  });
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
    .leftJoin('landlords', 'users.user_id', 'landlords.landlord_id')
    .where('users.user_id', userId)
    .select(
      'users.user_id',
      'users.full_name',
      'users.email',
      'users.phone_number',
      'users.username',
      'users.avatar_url',
      'users.gender',
      'users.date_of_birth',
      'users.address',
      'users.status',
      'users.role_id',
      'roles.role_name',
      'landlords.approval_status',
    )
    .first();
}

/**
 * Lấy trạng thái duyệt của landlord (PENDING/APPROVED/REJECTED). Trả undefined
 * nếu user không phải landlord (không có bản ghi trong landlords).
 *
 * @param {string} userId
 * @returns {Promise<{ approval_status: string, rejection_reason: string|null }|undefined>}
 */
function getLandlordApprovalStatus(userId) {
  return db('landlords')
    .where({ landlord_id: userId })
    .select('approval_status', 'rejection_reason')
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

/**
 * Cập nhật thông tin hồ sơ của người dùng.
 *
 * @param {string} userId
 * @param {object} updates
 * @returns {Promise<object>}
 */
async function updateUserProfile(userId, { fullName, phoneNumber, gender, dateOfBirth, address, avatarUrl }) {
  const updatePayload = {
    full_name: fullName,
    phone_number: phoneNumber || null,
    gender: gender || 'OTHER',
    date_of_birth: dateOfBirth || null,
    address: address || null,
  };
  if (avatarUrl !== undefined) {
    updatePayload.avatar_url = avatarUrl;
  }

  const [updatedUser] = await db('users')
    .where({ user_id: userId })
    .update(updatePayload)
    .returning('*');
  return updatedUser;
}

/**
 * Lấy mật khẩu hash của người dùng theo ID.
 *
 * @param {string} userId
 * @returns {Promise<{ password: string }|undefined>}
 */
function findUserPasswordById(userId) {
  return db('users').where({ user_id: userId }).select('password').first();
}

/**
 * Cập nhật cột avatar_url của người dùng.
 *
 * @param {string} userId
 * @param {string} avatarUrl
 * @returns {Promise<object>} updated user row
 */
async function updateUserAvatar(userId, avatarUrl) {
  const [updatedUser] = await db('users')
    .where({ user_id: userId })
    .update({
      avatar_url: avatarUrl,
    })
    .returning('*');
  return updatedUser;
}

module.exports = {
  getRoleIdByName,
  findUserByEmailPhoneUsername,
  createUserWithRole,
  updateLandlordIdCards,
  findInactiveUserByEmail,
  findUserByEmail,
  activateUser,
  findActiveUserByEmail,
  updateUserPassword,
  deleteRefreshTokensByUser,
  resetAccountSecurity,
  findOAuthAccount,
  linkOAuthAccount,
  isUsernameTaken,
  createOAuthUser,
  findUserByIdentifier,
  findUserById,
  getLandlordApprovalStatus,
  getAccountSecurity,
  ensureAccountSecurity,
  registerFailedAttempt,
  registerSuccessfulLogin,
  writeLoginAudit,
  insertRefreshToken,
  findRefreshTokenById,
  deleteRefreshToken,
  updateUserProfile,
  findUserPasswordById,
  updateUserAvatar,
};
