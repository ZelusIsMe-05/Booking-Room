const db = require('../config/db');

const ROOM_COLUMNS = [
  'rooms.room_id',
  'rooms.landlord_id',
  'rooms.title',
  'rooms.room_type',
  'rooms.detailed_address',
  'rooms.max_capacity',
  'rooms.monthly_rent',
  'rooms.deposit_amount',
  'rooms.electricity_cost',
  'rooms.water_cost',
  'rooms.internet_cost',
  'rooms.service_fee',
  'rooms.status',
  'rooms.average_rating',
  'rooms.created_at',
  'rooms.updated_at',
  'rooms.room_description',
  'rooms.longitude',
  'rooms.latitude',
];

function publicHostColumns() {
  return [
    'users.user_id as host_id',
    'users.full_name as host_name',
    'users.avatar_url as host_avatar_url',
    'users.phone_number as host_phone_number',
  ];
}

function applyPublicRoomFilter(query) {
  query
    .join('room_approvals', 'rooms.room_id', 'room_approvals.room_id')
    .where('rooms.status', 'AVAILABLE')
    .where('room_approvals.approval_status', 'APPROVED');
}

function roomSelectQuery() {
  return db('rooms')
    .join('landlords', 'rooms.landlord_id', 'landlords.landlord_id')
    .join('users', 'landlords.landlord_id', 'users.user_id')
    .select([...ROOM_COLUMNS, ...publicHostColumns()]);
}

async function getImages(roomIds) {
  if (roomIds.length === 0) return new Map();

  const rows = await db('room_images')
    .select('room_id', 'sequence_number', 'image_url', 'is_cover')
    .whereIn('room_id', roomIds)
    .orderBy('sequence_number', 'asc');

  return rows.reduce((map, row) => {
    if (!map.has(row.room_id)) map.set(row.room_id, []);
    map.get(row.room_id).push({
      sequence_number: row.sequence_number,
      image_url: row.image_url,
      is_cover: row.is_cover,
    });
    return map;
  }, new Map());
}

async function getApprovalStatuses(roomIds) {
  if (roomIds.length === 0) return new Map();

  const rows = await db('room_approvals')
    .select('room_id', 'approval_status')
    .whereIn('room_id', roomIds);

  return rows.reduce((map, row) => {
    map.set(row.room_id, row.approval_status);
    return map;
  }, new Map());
}

function serializeRoom(row, images = [], approvalStatus = null) {
  if (!row) return null;

  const cover = images.find((image) => image.is_cover) || images[0] || null;

  return {
    room_id: row.room_id,
    landlord_id: row.landlord_id,
    title: row.title,
    room_type: row.room_type,
    detailed_address: row.detailed_address,
    max_capacity: row.max_capacity,
    monthly_rent: Number(row.monthly_rent),
    deposit_amount: Number(row.deposit_amount),
    electricity_cost: Number(row.electricity_cost),
    water_cost: Number(row.water_cost),
    internet_cost: Number(row.internet_cost),
    service_fee: Number(row.service_fee),
    status: row.status,
    approval_status: approvalStatus,
    average_rating: Number(row.average_rating),
    created_at: row.created_at,
    updated_at: row.updated_at,
    room_description: row.room_description,
    longitude: row.longitude === null ? null : Number(row.longitude),
    latitude: row.latitude === null ? null : Number(row.latitude),
    cover_image_url: cover?.image_url || null,
    images,
    host: {
      user_id: row.host_id,
      full_name: row.host_name,
      avatar_url: row.host_avatar_url,
      phone_number: row.host_phone_number,
    },
  };
}

async function listPublicRooms({ page = 1, limit = 12, keyword, minPrice, maxPrice, location, roomType, sort }) {
  const currentPage = Math.max(Number(page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(limit) || 12, 1), 50);

  const baseQuery = roomSelectQuery().modify(applyPublicRoomFilter);

  if (keyword) {
    baseQuery.where((builder) => {
      builder
        .whereILike('rooms.title', `%${keyword}%`)
        .orWhereILike('rooms.room_description', `%${keyword}%`)
        .orWhereILike('rooms.detailed_address', `%${keyword}%`);
    });
  }

  if (location) baseQuery.whereILike('rooms.detailed_address', `%${location}%`);
  if (roomType) baseQuery.whereILike('rooms.room_type', `%${roomType}%`);
  if (minPrice !== undefined) baseQuery.where('rooms.monthly_rent', '>=', Number(minPrice));
  if (maxPrice !== undefined) baseQuery.where('rooms.monthly_rent', '<=', Number(maxPrice));

  const countQuery = baseQuery.clone().clearSelect().clearOrder().countDistinct({ total: 'rooms.room_id' }).first();

  if (sort === 'price_asc') baseQuery.orderBy('rooms.monthly_rent', 'asc');
  else if (sort === 'price_desc') baseQuery.orderBy('rooms.monthly_rent', 'desc');
  else if (sort === 'rating_desc') baseQuery.orderBy('rooms.average_rating', 'desc');
  else baseQuery.orderBy('rooms.created_at', 'desc');

  const rows = await baseQuery.limit(pageSize).offset((currentPage - 1) * pageSize);
  const total = Number((await countQuery).total || 0);
  const roomIds = rows.map((row) => row.room_id);
  const imagesMap = await getImages(roomIds);
  const approvalMap = await getApprovalStatuses(roomIds);

  return {
    items: rows.map((row) => serializeRoom(row, imagesMap.get(row.room_id) || [], approvalMap.get(row.room_id) || null)),
    pagination: {
      page: currentPage,
      limit: pageSize,
      total,
      total_pages: Math.ceil(total / pageSize),
    },
  };
}

async function findRoomById(roomId) {
  const row = await roomSelectQuery().where('rooms.room_id', roomId).first();
  if (!row) return null;

  const imagesMap = await getImages([roomId]);
  const approvalMap = await getApprovalStatuses([roomId]);

  return serializeRoom(row, imagesMap.get(roomId) || [], approvalMap.get(roomId) || null);
}

async function listRoomsByLandlord(landlordId) {
  const rows = await roomSelectQuery().where('rooms.landlord_id', landlordId).orderBy('rooms.created_at', 'desc');
  const roomIds = rows.map((row) => row.room_id);
  const imagesMap = await getImages(roomIds);
  const approvalMap = await getApprovalStatuses(roomIds);

  return rows.map((row) => serializeRoom(row, imagesMap.get(row.room_id) || [], approvalMap.get(row.room_id) || null));
}

async function listPendingRooms() {
  const rows = await roomSelectQuery()
    .join('room_approvals', 'rooms.room_id', 'room_approvals.room_id')
    .where('room_approvals.approval_status', 'PENDING')
    .orderBy('rooms.created_at', 'asc');

  const roomIds = rows.map((row) => row.room_id);
  const imagesMap = await getImages(roomIds);

  return rows.map((row) => serializeRoom(row, imagesMap.get(row.room_id) || [], 'PENDING'));
}

async function createRoom(payload) {
  return db.transaction(async (trx) => {
    const [room] = await trx('rooms')
      .insert({
        landlord_id: payload.landlord_id,
        title: payload.title,
        room_type: payload.room_type,
        detailed_address: payload.detailed_address,
        max_capacity: payload.max_capacity,
        monthly_rent: payload.monthly_rent,
        deposit_amount: payload.deposit_amount,
        electricity_cost: payload.electricity_cost,
        water_cost: payload.water_cost,
        internet_cost: payload.internet_cost ?? 0,
        service_fee: payload.service_fee ?? 0,
        status: payload.status || 'AVAILABLE',
        average_rating: 0,
        room_description: payload.room_description || null,
        longitude: payload.longitude ?? null,
        latitude: payload.latitude ?? null,
      })
      .returning(['room_id']);

    await trx('room_approvals').insert({
      room_id: room.room_id,
      approval_status: 'PENDING',
    });

    if (payload.images.length > 0) {
      await trx('room_images').insert(
        payload.images.map((imageUrl, index) => ({
          room_id: room.room_id,
          sequence_number: index + 1,
          image_url: imageUrl,
          is_cover: index === 0,
        })),
      );
    }

    return room.room_id;
  });
}

async function updateRoom(roomId, changes) {
  return db.transaction(async (trx) => {
    await trx('rooms')
      .where('room_id', roomId)
      .update({
        ...changes.room,
        updated_at: trx.fn.now(),
      });

    if (changes.images) {
      await trx('room_images').where('room_id', roomId).delete();
      if (changes.images.length > 0) {
        await trx('room_images').insert(
          changes.images.map((imageUrl, index) => ({
            room_id: roomId,
            sequence_number: index + 1,
            image_url: imageUrl,
            is_cover: index === 0,
          })),
        );
      }
    }

    const existingApproval = await trx('room_approvals').where('room_id', roomId).first();
    if (existingApproval) {
      await trx('room_approvals').where('room_id', roomId).update({ approval_status: 'PENDING' });
    } else {
      await trx('room_approvals').insert({ room_id: roomId, approval_status: 'PENDING' });
    }
  });
}

async function deleteRoom(roomId) {
  return db('rooms').where('room_id', roomId).delete();
}

async function updateApproval(roomId, status) {
  const existingApproval = await db('room_approvals').where('room_id', roomId).first();
  if (!existingApproval) {
    await db('room_approvals').insert({ room_id: roomId, approval_status: status });
    return;
  }

  await db('room_approvals').where('room_id', roomId).update({ approval_status: status });
}

async function isVerifiedHost(userId) {
  const landlord = await db('landlords')
    .select('landlord_id')
    .where('landlord_id', userId)
    .whereNotNull('id_card_front_url')
    .whereNotNull('id_card_back_url')
    .first();

  return Boolean(landlord);
}

module.exports = {
  listPublicRooms,
  findRoomById,
  listRoomsByLandlord,
  listPendingRooms,
  createRoom,
  updateRoom,
  deleteRoom,
  updateApproval,
  isVerifiedHost,
};
