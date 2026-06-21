const db = require('../../config/db');
const AppError = require('../../utils/AppError');
const { hashPassword } = require('../../utils/hashPassword');
const { USER_STATUS } = require('../../config/authConstants');
const { writeSystemLog } = require('./systemLogService');
const notificationRepository = require('../../repositories/guest/notificationRepository');

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const VALID_STATUSES = Object.values(USER_STATUS);
const PASSWORD_MIN_LENGTH = 8;

function parsePositiveInteger(value, fallback) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function normalizeRole(role) {
  return String(role || '').trim().toUpperCase();
}

function toPublicUser(row) {
  const publicUser = {
    userId: row.user_id,
    fullName: row.full_name,
    email: row.email,
    phoneNumber: row.phone_number,
    username: row.username,
    gender: row.gender,
    dateOfBirth: row.date_of_birth,
    address: row.address,
    avatarUrl: row.avatar_url,
    status: row.status,
    role: row.role_name,
  };

  if (row.approval_status) {
    publicUser.approvalStatus = row.approval_status;
  }

  return publicUser;
}

function toUserDetail(row) {
  return {
    ...toPublicUser(row),
    landlord: {
      exists: Boolean(row.landlord_id),
      idCardFrontUrl: row.id_card_front_url || null,
      idCardBackUrl: row.id_card_back_url || null,
      approvalStatus: row.approval_status || null,
      rejectionReason: row.rejection_reason || null,
    },
    tenant: {
      exists: Boolean(row.tenant_id),
    },
    accountSecurity: {
      failedLoginAttempts: Number(row.failed_login_attempts || 0),
      lockedUntil: row.locked_until || null,
      lastLoginAt: row.last_login_at || null,
    },
  };
}

function baseUserQuery() {
  return db('users')
    .join('roles', 'users.role_id', 'roles.role_id')
    .leftJoin('landlords', 'users.user_id', 'landlords.landlord_id')
    .leftJoin('tenants', 'users.user_id', 'tenants.tenant_id')
    .leftJoin('account_security', 'users.user_id', 'account_security.user_id');
}

function selectUserFields(query) {
  return query.select(
    'users.user_id',
    'users.full_name',
    'users.email',
    'users.phone_number',
    'users.username',
    'users.gender',
    'users.date_of_birth',
    'users.address',
    'users.avatar_url',
    'users.status',
    'roles.role_name',
    'landlords.landlord_id',
    'landlords.id_card_front_url',
    'landlords.id_card_back_url',
    'landlords.approval_status',
    'landlords.rejection_reason',
    'tenants.tenant_id',
    'account_security.failed_login_attempts',
    'account_security.locked_until',
    'account_security.last_login_at',
  );
}

function applyListFilters(query, filters) {
  if (filters.role) {
    query.where('roles.role_name', normalizeRole(filters.role));
  } else {
    query.where('roles.role_name', '!=', 'ADMIN');
  }

  if (filters.status) {
    query.where('users.status', String(filters.status).trim().toUpperCase());
  }

  if (filters.keyword) {
    const keyword = `%${String(filters.keyword).trim()}%`;
    query.where((builder) => {
      builder
        .whereILike('users.full_name', keyword)
        .orWhereILike('users.email', keyword)
        .orWhereILike('users.phone_number', keyword)
        .orWhereILike('users.username', keyword);
    });
  }
}

async function getExistingUser(userId) {
  const user = await selectUserFields(baseUserQuery())
    .where('users.user_id', userId)
    .first();

  if (!user) {
    throw new AppError('USER_NOT_FOUND', 'User khong ton tai.', 404);
  }

  return user;
}

async function getRoleByName(role) {
  const roleName = normalizeRole(role);
  if (!roleName) {
    throw new AppError('INVALID_ROLE', 'Role khong hop le.', 400);
  }

  const row = await db('roles').where({ role_name: roleName }).first();
  if (!row) {
    throw new AppError('INVALID_ROLE', 'Role khong hop le.', 400);
  }

  return row;
}

async function logAdminAction(actor, action) {
  await writeSystemLog({
    userId: actor.userId,
    action,
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });
}

async function listUsers(filters = {}) {
  if (filters.status && !VALID_STATUSES.includes(String(filters.status).trim().toUpperCase())) {
    throw new AppError('INVALID_STATUS', 'Status khong hop le.', 400);
  }

  if (filters.role) {
    await getRoleByName(filters.role);
  }

  const page = parsePositiveInteger(filters.page, DEFAULT_PAGE);
  const limit = Math.min(parsePositiveInteger(filters.limit, DEFAULT_LIMIT), MAX_LIMIT);
  const offset = (page - 1) * limit;
  const baseQuery = baseUserQuery();

  applyListFilters(baseQuery, filters);

  const countQuery = baseQuery.clone().clearSelect().clearOrder().countDistinct({ total: 'users.user_id' }).first();
  const rowsQuery = selectUserFields(baseQuery.clone())
    .orderBy('users.full_name', 'asc')
    .limit(limit)
    .offset(offset);

  const [countRow, rows] = await Promise.all([countQuery, rowsQuery]);
  const total = Number(countRow ? countRow.total : 0);

  return {
    items: rows.map(toPublicUser),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function getUserDetail(userId) {
  const user = await getExistingUser(userId);
  return toUserDetail(user);
}

async function lockUser({ userId, reason, actor }) {
  await getExistingUser(userId);

  const [row] = await db('users')
    .where({ user_id: userId })
    .update({ status: USER_STATUS.BANNED })
    .returning('*');

  await logAdminAction(actor, `ADMIN_LOCK_USER target=${userId} reason=${reason || ''}`.trim());

  await notificationRepository.insertNotification({
    user_id: userId,
    title: 'Tài khoản của bạn đã bị khóa',
    content: `Quản trị viên đã khóa tài khoản của bạn. Lý do: ${reason || 'Vi phạm điều khoản hệ thống'}. Vui lòng liên hệ hỗ trợ để biết thêm chi tiết.`,
    notification_type: 'SYSTEM',
  });

  const updated = await getExistingUser(row.user_id);
  return toPublicUser(updated);
}

async function unlockUser({ userId, actor }) {
  await getExistingUser(userId);

  const [row] = await db('users')
    .where({ user_id: userId })
    .update({ status: USER_STATUS.ACTIVE })
    .returning('*');

  await db('account_security')
    .where({ user_id: userId })
    .update({
      failed_login_attempts: 0,
      locked_until: null,
      updated_at: db.fn.now(),
    });

  await logAdminAction(actor, `ADMIN_UNLOCK_USER target=${userId}`);

  await notificationRepository.insertNotification({
    user_id: userId,
    title: 'Tài khoản của bạn đã được mở khóa',
    content: 'Quản trị viên đã mở khóa tài khoản của bạn. Bây giờ bạn có thể sử dụng các dịch vụ bình thường.',
    notification_type: 'SYSTEM',
  });

  const updated = await getExistingUser(row.user_id);
  return toPublicUser(updated);
}

async function updateUserRole({ userId, role, actor }) {
  await getExistingUser(userId);
  const roleRow = await getRoleByName(role);

  const [row] = await db('users')
    .where({ user_id: userId })
    .update({ role_id: roleRow.role_id })
    .returning('*');

  if (roleRow.role_name === 'TENANT') {
    await db('tenants')
      .insert({ tenant_id: userId })
      .onConflict('tenant_id')
      .ignore();
  }

  await logAdminAction(actor, `ADMIN_CHANGE_USER_ROLE target=${userId} role=${roleRow.role_name}`);

  const updated = await getExistingUser(row.user_id);
  return toPublicUser(updated);
}

async function resetUserPassword({ userId, temporaryPassword, actor }) {
  await getExistingUser(userId);

  if (!temporaryPassword || String(temporaryPassword).length < PASSWORD_MIN_LENGTH) {
    throw new AppError(
      'INVALID_TEMPORARY_PASSWORD',
      `Temporary password phai co it nhat ${PASSWORD_MIN_LENGTH} ky tu.`,
      400,
    );
  }

  const password = await hashPassword(String(temporaryPassword));
  const [row] = await db('users')
    .where({ user_id: userId })
    .update({ password })
    .returning('*');

  await db('account_security')
    .insert({
      user_id: userId,
      failed_login_attempts: 0,
      locked_until: null,
      updated_at: db.fn.now(),
    })
    .onConflict('user_id')
    .merge({
      failed_login_attempts: 0,
      locked_until: null,
      updated_at: db.fn.now(),
    });

  await logAdminAction(actor, `ADMIN_RESET_USER_PASSWORD target=${userId}`);

  const updated = await getExistingUser(row.user_id);
  return toPublicUser(updated);
}

// ---- Landlord approval ----

const LANDLORD_APPROVAL_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'];

function toLandlordDetail(row) {
  return {
    userId: row.user_id,
    fullName: row.full_name,
    email: row.email,
    phoneNumber: row.phone_number,
    username: row.username,
    status: row.status,
    role: row.role_name,
    approvalStatus: row.approval_status,
    rejectionReason: row.rejection_reason || null,
    reviewedAt: row.reviewed_at || null,
    reviewedBy: row.reviewed_by || null,
    idCardFrontUrl: row.id_card_front_url || null,
    idCardBackUrl: row.id_card_back_url || null,
  };
}

function baseLandlordQuery() {
  return db('landlords')
    .join('users', 'landlords.landlord_id', 'users.user_id')
    .join('roles', 'users.role_id', 'roles.role_id');
}

function selectLandlordFields(query) {
  return query.select(
    'users.user_id',
    'users.full_name',
    'users.email',
    'users.phone_number',
    'users.username',
    'users.status',
    'roles.role_name',
    'landlords.approval_status',
    'landlords.rejection_reason',
    'landlords.reviewed_at',
    'landlords.reviewed_by',
    'landlords.id_card_front_url',
    'landlords.id_card_back_url',
  );
}

async function getExistingLandlord(userId) {
  const row = await selectLandlordFields(baseLandlordQuery())
    .where('landlords.landlord_id', userId)
    .first();

  if (!row) {
    throw new AppError('LANDLORD_NOT_FOUND', 'Không tìm thấy chủ nhà.', 404);
  }

  return row;
}

async function listLandlords(filters = {}) {
  if (filters.status && !LANDLORD_APPROVAL_STATUSES.includes(String(filters.status).trim().toUpperCase())) {
    throw new AppError('INVALID_STATUS', 'Trạng thái duyệt không hợp lệ.', 400);
  }

  const page = parsePositiveInteger(filters.page, DEFAULT_PAGE);
  const limit = Math.min(parsePositiveInteger(filters.limit, DEFAULT_LIMIT), MAX_LIMIT);
  const offset = (page - 1) * limit;
  const baseQuery = baseLandlordQuery();

  if (filters.status) {
    baseQuery.where('landlords.approval_status', String(filters.status).trim().toUpperCase());
  }

  const countQuery = baseQuery.clone().clearSelect().clearOrder().countDistinct({ total: 'landlords.landlord_id' }).first();
  const rowsQuery = selectLandlordFields(baseQuery.clone())
    .orderBy('users.full_name', 'asc')
    .limit(limit)
    .offset(offset);

  const [countRow, rows] = await Promise.all([countQuery, rowsQuery]);
  const total = Number(countRow ? countRow.total : 0);

  return {
    items: rows.map(toLandlordDetail),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function getLandlordDetail(userId) {
  const row = await getExistingLandlord(userId);
  return toLandlordDetail(row);
}

async function approveLandlord({ userId, actor }) {
  const row = await getExistingLandlord(userId);

  // Chỉ duyệt khi chủ nhà đã nộp đủ 2 ảnh CCCD (cột NULL = chưa nộp).
  if (!row.id_card_front_url || !row.id_card_back_url) {
    throw new AppError('ID_CARD_MISSING', 'Chủ nhà không nộp đủ CCCD, không thể phê duyệt.', 400);
  }

  await db('landlords')
    .where({ landlord_id: userId })
    .update({
      approval_status: 'APPROVED',
      rejection_reason: null,
      reviewed_at: db.fn.now(),
      reviewed_by: actor.userId,
    });

  await logAdminAction(actor, `ADMIN_APPROVE_LANDLORD target=${userId}`);

  await notificationRepository.insertNotification({
    user_id: userId,
    title: 'Xác thực Chủ nhà thành công',
    content: 'Tài liệu xác thực của bạn đã được quản trị viên phê duyệt. Bây giờ bạn có thể bắt đầu đăng bài cho thuê phòng trên hệ thống.',
    notification_type: 'SYSTEM',
  });

  return toLandlordDetail(await getExistingLandlord(userId));
}

async function rejectLandlord({ userId, reason, actor }) {
  await getExistingLandlord(userId);

  const trimmedReason = String(reason || '').trim();
  if (!trimmedReason) {
    throw new AppError('REJECTION_REASON_REQUIRED', 'Vui long nhap ly do tu choi.', 400);
  }

  await db('landlords')
    .where({ landlord_id: userId })
    .update({
      approval_status: 'REJECTED',
      rejection_reason: trimmedReason,
      reviewed_at: db.fn.now(),
      reviewed_by: actor.userId,
    });

  await logAdminAction(actor, `ADMIN_REJECT_LANDLORD target=${userId} reason=${trimmedReason}`);

  await notificationRepository.insertNotification({
    user_id: userId,
    title: 'Từ chối xác thực Chủ nhà',
    content: `Tài liệu xác thực của bạn không được chấp thuận. Lý do: ${trimmedReason}. Vui lòng cập nhật lại thông tin chính xác.`,
    notification_type: 'SYSTEM',
  });

  return toLandlordDetail(await getExistingLandlord(userId));
}

/**
 * Lay key anh CCCD de stream (chi Admin). side = 'front' | 'back'.
 *
 * @param {string} userId
 * @param {string} side
 * @returns {Promise<string>} storage key
 */
async function getLandlordIdCardKey(userId, side) {
  const normalized = String(side || '').toLowerCase();
  if (normalized !== 'front' && normalized !== 'back') {
    throw new AppError('INVALID_ID_CARD_SIDE', 'Chỉ nhận mặt trước và sau CCCD.', 400);
  }

  const row = await getExistingLandlord(userId);
  const key = normalized === 'front' ? row.id_card_front_url : row.id_card_back_url;
  if (!key) {
    throw new AppError('ID_CARD_NOT_FOUND', 'Không tìm thấy ảnh CCCD.', 404);
  }
  return key;
}

module.exports = {
  listUsers,
  getUserDetail,
  lockUser,
  unlockUser,
  updateUserRole,
  resetUserPassword,
  listLandlords,
  getLandlordDetail,
  approveLandlord,
  rejectLandlord,
  getLandlordIdCardKey,
};
