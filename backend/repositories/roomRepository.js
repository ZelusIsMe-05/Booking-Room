const db = require('../config/db');

async function findById(roomId, trx) {
  const conn = trx || db;
  const row = await conn('rooms as r')
    .select('r.*', 'ra.approval_status')
    .leftJoin('room_approvals as ra', 'r.room_id', 'ra.room_id')
    .where('r.room_id', roomId)
    .first();
  return row || null;
}

async function findPublicById(roomId, trx) {
  const conn = trx || db;
  const row = await conn('rooms as r')
    .select(
      'r.room_id',
      'r.landlord_id',
      'r.title',
      'r.room_type',
      'r.detailed_address',
      'r.room_description',
      'r.max_capacity',
      'r.monthly_rent',
      'r.deposit_amount',
      'r.electricity_cost',
      'r.water_cost',
      'r.internet_cost',
      'r.service_fee',
      'r.status',
      'r.average_rating',
      'r.longitude',
      'r.latitude',
      'r.created_at',
      'r.updated_at',
      'u.full_name as landlord_full_name',
      'u.username as landlord_username',
      'u.avatar_url as landlord_avatar_url',
      'u.email as landlord_email',
      'u.phone_number as landlord_phone_number'
    )
    .join('users as u', 'u.user_id', 'r.landlord_id')
    .where('r.room_id', roomId)
    .where('r.status', 'AVAILABLE')
    .whereExists(function () {
      this.select('*')
        .from('room_approvals as ra')
        .whereRaw('ra.room_id = r.room_id')
        .andWhere('ra.approval_status', 'APPROVED');
    })
    .first();
  return row || null;
}

async function findImagesByRoomId(roomId, trx) {
  const conn = trx || db;
  return conn('room_images')
    .select('sequence_number', 'image_url', 'is_cover')
    .where('room_id', roomId)
    .orderBy('sequence_number', 'asc');
}

async function find({ onlyApproved = false, landlordId, limit = 20, offset = 0, filters = {} } = {}) {
  const q = db('rooms as r').select('r.*');

  if (onlyApproved) {
    q.join('room_approvals as ra', 'r.room_id', 'ra.room_id').where('ra.approval_status', 'APPROVED');
  }

  if (landlordId) q.where('r.landlord_id', landlordId);

  if (filters.title) q.whereILike('r.title', `%${filters.title}%`);
  if (filters.room_type) q.where('r.room_type', filters.room_type);
  if (filters.min_price) q.where('r.monthly_rent', '>=', filters.min_price);
  if (filters.max_price) q.where('r.monthly_rent', '<=', filters.max_price);

  const results = await q.limit(limit).offset(offset);
  return results;
}

function applyPublicRoomFilters(q, filters = {}) {
  if (filters.keyword) {
    q.where(function () {
      this.whereILike('r.title', `%${filters.keyword}%`)
        .orWhereILike('r.detailed_address', `%${filters.keyword}%`)
        .orWhereILike('r.room_description', `%${filters.keyword}%`);
    });
  }

  if (filters.location) {
    q.whereILike('r.detailed_address', `%${filters.location}%`);
  }

  if (filters.roomType) {
    q.where('r.room_type', filters.roomType);
  }

  if (filters.minPrice !== undefined) {
    q.where('r.monthly_rent', '>=', filters.minPrice);
  }

  if (filters.maxPrice !== undefined) {
    q.where('r.monthly_rent', '<=', filters.maxPrice);
  }
}

function applyPublicRoomSorting(q, sort) {
  switch (sort) {
    case 'price_asc':
      q.orderBy('r.monthly_rent', 'asc');
      break;
    case 'price_desc':
      q.orderBy('r.monthly_rent', 'desc');
      break;
    case 'rating_desc':
      q.orderBy('r.average_rating', 'desc');
      break;
    case 'newest':
    default:
      q.orderBy('r.created_at', 'desc');
      break;
  }
}

function applyApprovalConstraint(q, onlyApproved) {
  if (!onlyApproved) return;
  q.whereExists(function () {
    this.select('*')
      .from('room_approvals as ra')
      .whereRaw('ra.room_id = r.room_id')
      .andWhere('ra.approval_status', 'APPROVED');
  });
}

async function findPublic({ page = 1, limit = 20, filters = {}, sort = 'newest', onlyApproved = true } = {}) {
  const offset = (Math.max(1, Number(page)) - 1) * Number(limit);

  const q = db('rooms as r')
    .select(
      'r.room_id',
      'r.title',
      'r.room_type',
      'r.detailed_address',
      'r.monthly_rent',
      'r.deposit_amount',
      'r.status',
      'r.average_rating',
      'r.longitude',
      'r.latitude',
      'ri.image_url as cover_image_url'
    )
    .leftJoin('room_images as ri', function () {
      this.on('ri.room_id', 'r.room_id').andOnVal('ri.is_cover', '=', true);
    })
    .where('r.status', 'AVAILABLE');

  applyPublicRoomFilters(q, filters);
  applyApprovalConstraint(q, onlyApproved);
  applyPublicRoomSorting(q, sort);

  const results = await q.limit(limit).offset(offset);
  return results;
}

async function countPublic({ filters = {}, onlyApproved = true } = {}) {
  const q = db('rooms as r').countDistinct({ total: 'r.room_id' }).where('r.status', 'AVAILABLE');
  applyPublicRoomFilters(q, filters);
  applyApprovalConstraint(q, onlyApproved);
  const [{ total }] = await q;
  return Number(total) || 0;
}

async function create(room, images = [], trx) {
  const conn = trx || db;
  const [created] = await conn('rooms').insert(room).returning('*');

  if (images && images.length) {
    const rows = images.map((img, idx) => ({
      room_id: created.room_id,
      sequence_number: idx + 1,
      image_url: img,
      is_cover: idx === 0,
    }));
    await conn('room_images').insert(rows);
  }

  return created;
}

async function update(roomId, patch, trx) {
  const conn = trx || db;
  const [updated] = await conn('rooms').where('room_id', roomId).update(patch).returning('*');
  return updated || null;
}

async function replaceImages(roomId, images = [], trx) {
  const conn = trx || db;
  await conn('room_images').where('room_id', roomId).del();
  if (!images || !images.length) return [];
  const rows = images.map((url, idx) => ({
    room_id: roomId,
    sequence_number: idx + 1,
    image_url: url,
    is_cover: idx === 0,
  }));
  await conn('room_images').insert(rows);
  return rows;
}

async function remove(roomId, trx) {
  // Soft-delete is not defined in schema; perform hard delete for now
  const conn = trx || db;
  await conn('rooms').where('room_id', roomId).del();
  return true;
}

async function countByLandlord(landlordId, { status } = {}) {
  const q = db('rooms as r').count({ count: 'r.room_id' });
  q.where('r.landlord_id', landlordId);
  if (status) q.where('r.status', status);
  const [{ count }] = await q;
  return Number(count) || 0;
}

async function findByLandlord(landlordId, { page = 1, limit = 20, sortBy = 'created_at', order = 'desc', status } = {}) {
  const allowedSort = ['created_at', 'monthly_rent', 'updated_at', 'title'];
  if (!allowedSort.includes(sortBy)) sortBy = 'created_at';
  order = order && order.toLowerCase() === 'asc' ? 'asc' : 'desc';

  const offset = (Math.max(1, Number(page)) - 1) * Number(limit);

  const rows = await db('rooms as r')
    .select(
      'r.room_id',
      'r.title',
      'r.room_type',
      'r.detailed_address',
      'r.max_capacity',
      'r.monthly_rent',
      'r.deposit_amount',
      'r.status',
      'r.created_at',
      'r.updated_at'
    )
    .where('r.landlord_id', landlordId)
    .modify((qb) => {
      if (status) qb.where('r.status', status);
    })
    .orderBy(`r.${sortBy}`, order)
    .limit(limit)
    .offset(offset);

  if (!rows.length) return { items: [], total: 0 };

  const roomIds = rows.map((r) => r.room_id);
  const images = await db('room_images').select('room_id', 'sequence_number', 'image_url', 'is_cover').whereIn('room_id', roomIds).orderBy(['room_id', 'sequence_number']);

  const imagesByRoom = images.reduce((acc, img) => {
    acc[img.room_id] = acc[img.room_id] || [];
    acc[img.room_id].push({ sequence_number: img.sequence_number, image_url: img.image_url, is_cover: img.is_cover });
    return acc;
  }, {});

  const items = rows.map((r) => {
    const imgs = imagesByRoom[r.room_id] || [];
    const cover = imgs.find((i) => i.is_cover) || imgs[0] || null;
    return Object.assign({}, r, { images: imgs, cover_image_url: cover ? cover.image_url : null });
  });

  const total = await countByLandlord(landlordId, { status });

  return { items, total };
}

async function findPendingRooms({ page = 1, limit = 20 } = {}, trx) {
  const conn = trx || db;
  const offset = (Math.max(1, Number(page)) - 1) * Number(limit);

  const rows = await conn('rooms as r')
    .select(
      'r.room_id',
      'r.landlord_id',
      'r.title',
      'r.room_type',
      'r.detailed_address',
      'r.monthly_rent',
      'r.deposit_amount',
      'r.status',
      'r.created_at',
      'r.updated_at',
      'ra.approval_id',
      'u.full_name as landlord_full_name',
      'u.username as landlord_username',
      'u.email as landlord_email',
      'u.phone_number as landlord_phone_number',
      'u.avatar_url as landlord_avatar_url',
      'ri.image_url as cover_image_url'
    )
    .innerJoin('room_approvals as ra', function () {
      this.on('r.room_id', 'ra.room_id').andOnVal('ra.approval_status', '=', 'PENDING');
    })
    .leftJoin('users as u', 'u.user_id', 'r.landlord_id')
    .leftJoin('room_images as ri', function () {
      this.on('ri.room_id', 'r.room_id').andOnVal('ri.is_cover', '=', true);
    })
    .orderBy('r.created_at', 'desc')
    .limit(limit)
    .offset(offset);

  return rows;
}

async function countPendingRooms(trx) {
  const conn = trx || db;
  const [result] = await conn('rooms as r')
    .countDistinct({ total: 'r.room_id' })
    .innerJoin('room_approvals as ra', function () {
      this.on('r.room_id', 'ra.room_id').andOnVal('ra.approval_status', '=', 'PENDING');
    });
  
  return Number(result.total) || 0;
}

async function updateApprovalStatus(roomId, status, trx) {
  const conn = trx || db;
  const [updated] = await conn('room_approvals')
    .where('room_id', roomId)
    .update({ approval_status: status })
    .returning('*');
  return updated;
}

module.exports = {
  findById,
  find,
  create,
  update,
  remove,
  countByLandlord,
  findByLandlord,
  replaceImages,
  findPublicById,
  findImagesByRoomId,
  findPublic,
  countPublic,
  findPendingRooms,
  countPendingRooms,
  updateApprovalStatus,
};
