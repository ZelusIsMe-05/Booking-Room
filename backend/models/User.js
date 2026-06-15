const db = require('../config/db');

const USER_COLUMNS = [
  'users.user_id',
  'users.full_name',
  'users.email',
  'users.phone_number',
  'users.gender',
  'users.date_of_birth',
  'users.address',
  'users.avatar_url',
  'users.status',
  'users.username',
  'users.role_id',
  'roles.role_name',
];

function toPublicUser(row) {
  if (!row) return null;

  return {
    user_id: row.user_id,
    full_name: row.full_name,
    email: row.email,
    phone_number: row.phone_number,
    gender: row.gender,
    date_of_birth: row.date_of_birth,
    address: row.address,
    avatar_url: row.avatar_url,
    status: row.status,
    username: row.username,
    role_id: row.role_id,
    role: row.role_name,
  };
}

async function findById(userId) {
  const row = await db('users')
    .join('roles', 'users.role_id', 'roles.role_id')
    .select(USER_COLUMNS)
    .where('users.user_id', userId)
    .first();

  return toPublicUser(row);
}

async function findByIdentifier(identifier) {
  return db('users')
    .join('roles', 'users.role_id', 'roles.role_id')
    .select([...USER_COLUMNS, 'users.password'])
    .where((builder) => {
      builder
        .whereRaw('LOWER(users.email) = LOWER(?)', [identifier])
        .orWhere('users.phone_number', identifier)
        .orWhereRaw('LOWER(users.username) = LOWER(?)', [identifier]);
    })
    .first();
}

async function findExistingIdentity({ email, phoneNumber, username }) {
  return db('users')
    .select('email', 'phone_number', 'username')
    .where((builder) => {
      builder.whereRaw('LOWER(email) = LOWER(?)', [email]);
      if (phoneNumber) builder.orWhere('phone_number', phoneNumber);
      if (username) builder.orWhereRaw('LOWER(username) = LOWER(?)', [username]);
    })
    .first();
}

async function findRole(roleName) {
  return db('roles').select('role_id', 'role_name').where('role_name', roleName).first();
}

async function createUserWithProfile(payload) {
  return db.transaction(async (trx) => {
    const [user] = await trx('users')
      .insert({
        full_name: payload.fullName,
        email: payload.email,
        phone_number: payload.phoneNumber || null,
        username: payload.username,
        password: payload.passwordHash,
        role_id: payload.roleId,
        status: 'ACTIVE',
      })
      .returning(['user_id']);

    if (payload.dbRole === 'LANDLORD') {
      await trx('landlords').insert({
        landlord_id: user.user_id,
        id_card_front_url: payload.idCardFrontUrl,
        id_card_back_url: payload.idCardBackUrl,
      });
    } else {
      await trx('tenants').insert({ tenant_id: user.user_id });
    }

    await trx('account_security')
      .insert({ user_id: user.user_id })
      .onConflict('user_id')
      .ignore();

    const row = await trx('users')
      .join('roles', 'users.role_id', 'roles.role_id')
      .select(USER_COLUMNS)
      .where('users.user_id', user.user_id)
      .first();

    return toPublicUser(row);
  });
}

module.exports = {
  toPublicUser,
  findById,
  findByIdentifier,
  findExistingIdentity,
  findRole,
  createUserWithProfile,
};
