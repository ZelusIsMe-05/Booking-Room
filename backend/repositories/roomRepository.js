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
      'r.province_name',
      'r.district_name',
      'r.ward_name',
      'r.formatted_address',
      'r.place_id',
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
      'u.phone_number as landlord_phone_number',
      'sec.created_at as landlord_created_at'
    )
    .leftJoin('users as u', 'u.user_id', 'r.landlord_id')
    .leftJoin('account_security as sec', 'sec.user_id', 'u.user_id')
    .where('r.room_id', roomId)
    .whereIn('r.status', ['AVAILABLE', 'RENTED'])
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
        .orWhereILike('r.formatted_address', `%${filters.keyword}%`)
        .orWhereILike('r.province_name', `%${filters.keyword}%`)
        .orWhereILike('r.district_name', `%${filters.keyword}%`)
        .orWhereILike('r.ward_name', `%${filters.keyword}%`)
        .orWhereILike('r.room_description', `%${filters.keyword}%`);
    });
  }

  if (filters.location) {
    // Strip Vietnamese administrative prefixes so "Thành phố Hà Nội" matches "Hà Nội" in DB
    const ADMIN_PREFIXES = /^(Thành phố|Tỉnh|Quận|Huyện|Thị xã|Thị trấn|Phường|Xã)\s+/i;
    const normalizeLocation = (loc) => loc.replace(ADMIN_PREFIXES, '').trim();

    const locs = filters.location
      .split('|')
      .map(l => l.trim())
      .filter(Boolean)
      .flatMap(loc => {
        const normalized = normalizeLocation(loc);
        // Include both original and normalized to handle all cases
        return normalized !== loc ? [loc, normalized] : [loc];
      });

    q.where(function () {
      locs.forEach(loc => {
        this.orWhere(function() {
          this.whereILike('r.detailed_address', `%${loc}%`)
            .orWhereILike('r.formatted_address', `%${loc}%`)
            .orWhereILike('r.province_name', `%${loc}%`)
            .orWhereILike('r.district_name', `%${loc}%`)
            .orWhereILike('r.ward_name', `%${loc}%`);
        });
      });
    });
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

  // Tìm theo khoảng cách địa lý bằng công thức Haversine (không cần PostGIS extension)
  // nearLat, nearLng: tọa độ tâm tìm kiếm
  // radiusKm: bán kính tìm kiếm (mặc định 5km)
  if (filters.nearLat !== undefined && filters.nearLng !== undefined) {
    const radiusKm = filters.radiusKm || 5;
    const EARTH_RADIUS_KM = 6371;
    q.whereNotNull('r.latitude')
     .whereNotNull('r.longitude')
     .whereRaw(
       // GREATEST(-1.0, LEAST(1.0, ...)) clamp cả 2 phía để tránh lỗi acos() domain error
       // khi floating point precision khiến giá trị vượt ra ngoài [-1, 1]
       `(
         ${EARTH_RADIUS_KM} * acos(
           GREATEST(-1.0, LEAST(1.0,
             cos(radians(?::float8)) * cos(radians(r.latitude::float8))
             * cos(radians(r.longitude::float8) - radians(?::float8))
             + sin(radians(?::float8)) * sin(radians(r.latitude::float8))
           ))
         )
       ) <= ?::float8`,
       [filters.nearLat, filters.nearLng, filters.nearLat, radiusKm]
     );
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
      'r.province_name',
      'r.district_name',
      'r.ward_name',
      'r.formatted_address',
      'r.place_id',
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
    .whereIn('r.status', ['AVAILABLE', 'RENTED']);

  applyPublicRoomFilters(q, filters);
  applyApprovalConstraint(q, onlyApproved);
  applyPublicRoomSorting(q, sort);

  const results = await q.limit(limit).offset(offset);
  return results;
}

async function countPublic({ filters = {}, onlyApproved = true } = {}) {
  const q = db('rooms as r').countDistinct({ total: 'r.room_id' }).whereIn('r.status', ['AVAILABLE', 'RENTED']);
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

  // Effective approval status per room. room_approvals can hold multiple rows
  // after edits (each edit inserts a new PENDING), and approval_id is a UUID so
  // there is no orderable column to pick the "latest". We surface PENDING when
  // any pending approval exists, otherwise APPROVED, otherwise REJECTED.
  const approvalAgg = db('room_approvals')
    .select('room_id')
    .select(
      db.raw(
        `CASE
           WHEN bool_or(approval_status = 'PENDING') THEN 'PENDING'
           WHEN bool_or(approval_status = 'APPROVED') THEN 'APPROVED'
           ELSE 'REJECTED'
         END as approval_status`
      )
    )
    .groupBy('room_id')
    .as('ra');

  const rows = await db('rooms as r')
    .select(
      'r.room_id',
      'r.title',
      'r.room_type',
      'r.detailed_address',
      'r.province_name',
      'r.district_name',
      'r.ward_name',
      'r.formatted_address',
      'r.place_id',
      'r.room_description',
      'r.max_capacity',
      'r.monthly_rent',
      'r.deposit_amount',
      'r.electricity_cost',
      'r.water_cost',
      'r.internet_cost',
      'r.service_fee',
      'r.longitude',
      'r.latitude',
      'r.status',
      'r.average_rating',
      'r.created_at',
      'r.updated_at',
      'ra.approval_status',
      db.raw('COALESCE(fav.favorite_count, 0)::int as favorite_count')
    )
    .leftJoin(approvalAgg, 'ra.room_id', 'r.room_id')
    .leftJoin(
      db('favorites').select('room_id').count('* as favorite_count').where('status', true).groupBy('room_id').as('fav'),
      'fav.room_id',
      'r.room_id'
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

async function findPendingRooms({ page = 1, limit = 20, status, keyword } = {}, trx) {
  const conn = trx || db;
  const offset = (Math.max(1, Number(page)) - 1) * Number(limit);

  const query = conn('rooms as r')
    .select(
      'r.room_id',
      'r.landlord_id',
      'r.title',
      'r.room_type',
      'r.detailed_address',
      'r.province_name',
      'r.district_name',
      'r.ward_name',
      'r.formatted_address',
      'r.place_id',
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
      this.on('r.room_id', 'ra.room_id');
      if (status) {
        this.andOnVal('ra.approval_status', '=', status.toUpperCase());
      } else {
        this.andOnVal('ra.approval_status', '=', 'PENDING');
      }
    })
    .leftJoin('users as u', 'u.user_id', 'r.landlord_id')
    .leftJoin('room_images as ri', function () {
      this.on('ri.room_id', 'r.room_id').andOnVal('ri.is_cover', '=', true);
    });

  if (keyword) {
    const kw = `%${keyword}%`;
    query.where((builder) => {
      builder
        .whereILike('r.title', kw)
        .orWhereILike('r.detailed_address', kw)
        .orWhereILike('u.full_name', kw)
        .orWhereILike('u.email', kw);
    });
  }

  const rows = await query
    .orderBy('r.created_at', 'desc')
    .limit(limit)
    .offset(offset);

  return rows;
}

async function countPendingRooms({ status, keyword } = {}, trx) {
  const conn = trx || db;
  const query = conn('rooms as r')
    .countDistinct({ total: 'r.room_id' })
    .innerJoin('room_approvals as ra', function () {
      this.on('r.room_id', 'ra.room_id');
      if (status) {
        this.andOnVal('ra.approval_status', '=', status.toUpperCase());
      } else {
        this.andOnVal('ra.approval_status', '=', 'PENDING');
      }
    })
    .leftJoin('users as u', 'u.user_id', 'r.landlord_id');

  if (keyword) {
    const kw = `%${keyword}%`;
    query.where((builder) => {
      builder
        .whereILike('r.title', kw)
        .orWhereILike('r.detailed_address', kw)
        .orWhereILike('u.full_name', kw)
        .orWhereILike('u.email', kw);
    });
  }

  const [result] = await query;
  
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

// ---------------------------------------------------------------------------
// Landlord overview / dashboard aggregates
// ---------------------------------------------------------------------------

/**
 * Effective approval status per room as a joinable subquery.
 * room_approvals can hold multiple rows after edits; we surface PENDING when
 * any pending exists, else APPROVED, else REJECTED.
 */
function approvalAggSubquery() {
  return db('room_approvals')
    .select('room_id')
    .select(
      db.raw(
        `CASE
           WHEN bool_or(approval_status = 'PENDING') THEN 'PENDING'
           WHEN bool_or(approval_status = 'APPROVED') THEN 'APPROVED'
           ELSE 'REJECTED'
         END as approval_status`
      )
    )
    .groupBy('room_id')
    .as('ra');
}

/**
 * Aggregate room counts by bucket + average rating for a landlord.
 * Buckets are mutually exclusive (priority: hidden > pending > rented > available).
 * RENTED and LOCKED are both counted as "rented" (occupied / in a deal).
 */
async function getLandlordStats(landlordId) {
  const row = await db('rooms as r')
    .leftJoin(approvalAggSubquery(), 'ra.room_id', 'r.room_id')
    .where('r.landlord_id', landlordId)
    .select(
      db.raw('COUNT(*)::int as total'),
      db.raw(`COUNT(*) FILTER (WHERE r.status = 'HIDDEN')::int as hidden`),
      db.raw(`COUNT(*) FILTER (WHERE r.status <> 'HIDDEN' AND ra.approval_status = 'PENDING')::int as pending`),
      db.raw(`COUNT(*) FILTER (WHERE r.status <> 'HIDDEN' AND (ra.approval_status IS NULL OR ra.approval_status <> 'PENDING') AND r.status IN ('RENTED','LOCKED'))::int as rented`),
      db.raw(`COUNT(*) FILTER (WHERE r.status <> 'HIDDEN' AND (ra.approval_status IS NULL OR ra.approval_status <> 'PENDING') AND r.status = 'AVAILABLE')::int as available`),
      db.raw(`COALESCE(ROUND(AVG(r.average_rating) FILTER (WHERE r.average_rating > 0), 2), 0)::float as average_rating`)
    )
    .first();

  return row || { total: 0, hidden: 0, pending: 0, rented: 0, available: 0, average_rating: 0 };
}

/**
 * Monthly revenue (SUCCESS transactions) for a landlord in a given year.
 * Revenue = tiền cọc khách đã thanh toán thành công cho phòng của landlord.
 * @returns {Promise<Array<{ month: number, amount: number }>>}
 */
async function getLandlordMonthlyRevenue(landlordId, year) {
  const rows = await db('transactions as t')
    .join('deposits as d', 't.deposit_id', 'd.deposit_id')
    .where('d.landlord_id', landlordId)
    .where('t.status', 'SUCCESS')
    .whereRaw('EXTRACT(YEAR FROM t.created_at) = ?', [year])
    .groupByRaw('EXTRACT(MONTH FROM t.created_at)')
    .select(
      db.raw('EXTRACT(MONTH FROM t.created_at)::int as month'),
      db.raw('SUM(t.amount)::float as amount')
    );

  return rows;
}

/**
 * Top-rated rooms of a landlord, with favourite count + cover image.
 */
async function findTopRatedByLandlord(landlordId, limit = 3) {
  const favAgg = db('favorites')
    .select('room_id')
    .count('* as favorite_count')
    .where('status', true)
    .groupBy('room_id')
    .as('fav');

  const rows = await db('rooms as r')
    .leftJoin(approvalAggSubquery(), 'ra.room_id', 'r.room_id')
    .leftJoin(favAgg, 'fav.room_id', 'r.room_id')
    .leftJoin('room_images as ri', function () {
      this.on('ri.room_id', 'r.room_id').andOnVal('ri.is_cover', '=', true);
    })
    .where('r.landlord_id', landlordId)
    .select(
      'r.room_id',
      'r.title',
      'r.detailed_address',
      'r.monthly_rent',
      'r.status',
      'r.average_rating',
      'ra.approval_status',
      db.raw('COALESCE(fav.favorite_count, 0)::int as favorite_count'),
      'ri.image_url as cover_image_url'
    )
    .orderBy('r.average_rating', 'desc')
    .orderBy('r.created_at', 'desc')
    .limit(limit);

  return rows;
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
  getLandlordStats,
  getLandlordMonthlyRevenue,
  findTopRatedByLandlord,
};
