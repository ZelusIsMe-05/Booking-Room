const db = require('../../config/db');
const AppError = require('../../utils/AppError');
const { hashPassword } = require('../../utils/hashPassword');
const { USER_STATUS } = require('../../config/authConstants');
const { writeSystemLog } = require('./systemLogService');

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
  return {
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
}

function toUserDetail(row) {
  return {
    ...toPublicUser(row),
    landlord: {
      exists: Boolean(row.landlord_id),
      idCardFrontUrl: row.id_card_front_url || null,
      idCardBackUrl: row.id_card_back_url || null,
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
    'tenants.tenant_id',
    'account_security.failed_login_attempts',
    'account_security.locked_until',
    'account_security.last_login_at',
  );
}

function applyListFilters(query, filters) {
  if (filters.role) {
    query.where('roles.role_name', normalizeRole(filters.role));
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

module.exports = {
  listUsers,
  getUserDetail,
  lockUser,
  unlockUser,
  updateUserRole,
  resetUserPassword,
};
