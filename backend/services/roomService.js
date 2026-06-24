const db = require('../config/db');
const AppError = require('../utils/AppError');
const roomRepository = require('../repositories/roomRepository');
const reviewService = require('./guest/reviewService');

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const ALLOWED_SORTS = ['price_asc', 'price_desc', 'newest', 'rating_desc'];

function normalizeNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

async function listRooms(query) {
  try {
    const depositService = require('./booking/depositService');
    await depositService.expireOverdueDeposits();
  } catch (err) {
    console.error('Error expiring overdue deposits during listRooms:', err);
  }

  const page = Math.max(1, Math.floor(normalizeNumber(query.page, DEFAULT_PAGE)));
  const limit = Math.min(MAX_LIMIT, Math.max(1, Math.floor(normalizeNumber(query.limit, DEFAULT_LIMIT))));
  const sort = ALLOWED_SORTS.includes(query.sort) ? query.sort : 'newest';
  const keyword = query.keyword ? String(query.keyword).trim() : undefined;
  const location = query.location ? String(query.location).trim() : undefined;
  const roomType = query.roomType ? String(query.roomType).trim() : undefined;
  const minPrice = query.minPrice !== undefined ? normalizeNumber(query.minPrice, undefined) : undefined;
  const maxPrice = query.maxPrice !== undefined ? normalizeNumber(query.maxPrice, undefined) : undefined;

  // Tìm theo vị trí địa lý
  const nearLat = query.nearLat !== undefined ? normalizeNumber(query.nearLat, undefined) : undefined;
  const nearLng = query.nearLng !== undefined ? normalizeNumber(query.nearLng, undefined) : undefined;
  const radiusKm = query.radiusKm !== undefined ? Math.max(0.5, normalizeNumber(query.radiusKm, 5)) : undefined;

  if (minPrice !== undefined && minPrice < 0) {
    throw new AppError('VALIDATION_ERROR', 'minPrice must be >= 0', 400);
  }

  if (maxPrice !== undefined && maxPrice < 0) {
    throw new AppError('VALIDATION_ERROR', 'maxPrice must be >= 0', 400);
  }

  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    throw new AppError('VALIDATION_ERROR', 'minPrice must be less than or equal to maxPrice', 400);
  }

  // Validate tọa độ hợp lẹ
  if (nearLat !== undefined && (nearLat < -90 || nearLat > 90)) {
    throw new AppError('VALIDATION_ERROR', 'nearLat must be between -90 and 90', 400);
  }
  if (nearLng !== undefined && (nearLng < -180 || nearLng > 180)) {
    throw new AppError('VALIDATION_ERROR', 'nearLng must be between -180 and 180', 400);
  }

  const filters = {
    keyword,
    location,
    roomType,
    minPrice,
    maxPrice,
    nearLat,
    nearLng,
    radiusKm,
  };

  const items = await roomRepository.findPublic({ page, limit, filters, sort, onlyApproved: true });
  const total = await roomRepository.countPublic({ filters, onlyApproved: true });

  const mappedItems = items.map((row) => ({
    roomId: row.room_id,
    title: row.title,
    roomType: row.room_type,
    coverImageUrl: row.cover_image_url || null,
    monthlyRent: Number(row.monthly_rent),
    depositAmount: Number(row.deposit_amount),
    addressSummary: row.detailed_address,
    provinceName: row.province_name || null,
    districtName: row.district_name || null,
    wardName: row.ward_name || null,
    formattedAddress: row.formatted_address || null,
    placeId: row.place_id || null,
    status: row.status,
    averageRating: row.average_rating !== null ? Number(row.average_rating) : null,
    longitude: row.longitude,
    latitude: row.latitude,
  }));

  return {
    items: mappedItems,
    pagination: {
      page,
      limit,
      total,
    },
  };
}

async function getRoomById(roomId, user = null) {
  if (!roomId) {
    throw new AppError('BAD_REQUEST', 'roomId is required', 400);
  }

  try {
    const depositService = require('./booking/depositService');
    await depositService.expireOverdueDeposits();
  } catch (err) {
    console.error('Error expiring overdue deposits during getRoomById:', err);
  }

  // Query room with landlord details and approvals joined
  const rawRoom = await db('rooms as r')
    .select(
      'r.*',
      'ra.approval_status',
      'u.full_name as landlord_full_name',
      'u.username as landlord_username',
      'u.avatar_url as landlord_avatar_url',
      'u.email as landlord_email',
      'u.phone_number as landlord_phone_number',
      'sec.created_at as landlord_created_at'
    )
    .leftJoin('room_approvals as ra', 'r.room_id', 'ra.room_id')
    .leftJoin('users as u', 'u.user_id', 'r.landlord_id')
    .leftJoin('account_security as sec', 'sec.user_id', 'u.user_id')
    .where('r.room_id', roomId)
    .first();

  if (!rawRoom) {
    throw new AppError('NOT_FOUND', 'Không tìm thấy phòng.', 404);
  }

  // Find who rented the room if it's RENTED (most recent accepted deposit)
  let tenantRentingId = null;
  const acceptedDeposit = await db('deposits')
    .where({ room_id: roomId, status: 'ACCEPTED' })
    .orderBy('created_at', 'desc')
    .first();
  if (acceptedDeposit) {
    tenantRentingId = acceptedDeposit.tenant_id;
  }

  let room = null;
  const isAdmin = user && user.role === 'ADMIN';
  const isOwner = user && user.role === 'LANDLORD' && rawRoom.landlord_id === user.userId;

  if (isAdmin || isOwner) {
    room = rawRoom;
  } else {
    // Normal guest / tenant check
    if (rawRoom.approval_status !== 'APPROVED') {
      throw new AppError('ROOM_NOT_AVAILABLE', 'Phòng không khả dụng.', 400);
    }

    if (rawRoom.status === 'AVAILABLE') {
      room = rawRoom;
    } else if (rawRoom.status === 'LOCKED') {
      // Check if this tenant has an active processing deposit
      if (user && user.role === 'TENANT') {
        const activeDeposit = await db('deposits')
          .where({ tenant_id: user.userId, room_id: roomId, status: 'PROCESSING' })
          .first();
        if (activeDeposit) {
          room = rawRoom;
        }
      }
      if (!room) {
        throw new AppError('ROOM_NOT_AVAILABLE', 'Phòng không khả dụng.', 400);
      }
    } else if (rawRoom.status === 'RENTED') {
      room = rawRoom;
    } else {
      throw new AppError('ROOM_NOT_AVAILABLE', 'Phòng không khả dụng.', 400);
    }
  }

  if (!room) {
    throw new AppError('NOT_FOUND', 'Không tìm thấy phòng.', 404);
  }

  const images = await roomRepository.findImagesByRoomId(roomId);
  const reviews = await reviewService.listRoomReviews(roomId, { page: 1, limit: 5 });

  return {
    roomId: room.room_id,
    title: room.title,
    roomType: room.room_type,
    detailedAddress: room.detailed_address,
    provinceName: room.province_name || null,
    districtName: room.district_name || null,
    wardName: room.ward_name || null,
    formattedAddress: room.formatted_address || null,
    placeId: room.place_id || null,
    roomDescription: room.room_description,
    maxCapacity: room.max_capacity,
    monthlyRent: Number(room.monthly_rent),
    depositAmount: Number(room.deposit_amount),
    electricityCost: Number(room.electricity_cost),
    waterCost: Number(room.water_cost),
    internetCost: Number(room.internet_cost),
    serviceFee: Number(room.service_fee),
    status: room.status,
    rentedBy: tenantRentingId,
    averageRating: room.average_rating !== null ? Number(room.average_rating) : null,
    longitude: room.longitude,
    latitude: room.latitude,
    createdAt: room.created_at,
    updatedAt: room.updated_at,
    images: images.map((image) => ({
      sequenceNumber: image.sequence_number,
      imageUrl: image.image_url,
      isCover: image.is_cover,
    })),
    host: {
      landlordId: room.landlord_id,
      fullName: room.landlord_full_name,
      username: room.landlord_username,
      avatarUrl: room.landlord_avatar_url,
      email: room.landlord_email,
      phoneNumber: room.landlord_phone_number,
      createdAt: room.landlord_created_at,
    },
    reviews,
    amenities: (() => {
      if (!room.room_description) {
        return [];
      }
      const desc = room.room_description.toLowerCase();
      const list = [];
      if (desc.includes('máy lạnh') || desc.includes('điều hòa')) {
        list.push('Máy lạnh');
      }
      if (desc.includes('wifi') || desc.includes('internet')) {
        list.push('Wifi tốc độ cao');
      }
      if (desc.includes('tự do')) {
        list.push('Giờ giấc tự do');
      }
      if (desc.includes('máy giặt')) {
        list.push('Máy giặt chung');
      }
      if (desc.includes('tủ lạnh')) {
        list.push('Tủ lạnh');
      }
      if (desc.includes('để xe') || desc.includes('đỗ xe') || desc.includes('bãi xe') || desc.includes('gửi xe') || desc.includes('bãi đậu')) {
        list.push('Bãi đậu xe máy');
      }
      return list;
    })(),
  };
}

async function listMyRooms(userId, query) {
  // TODO: list rooms for host
  throw new AppError('NOT_IMPLEMENTED', 'listMyRooms not implemented', 501);
}

async function createRoom(userId, payload) {
  // TODO: create room with ownership
  throw new AppError('NOT_IMPLEMENTED', 'createRoom not implemented', 501);
}

async function updateRoom(userId, roomId, payload) {
  // TODO: update room, ownership guard
  throw new AppError('NOT_IMPLEMENTED', 'updateRoom not implemented', 501);
}

async function deleteRoom(userId, roomId) {
  // TODO: delete room, ownership guard
  throw new AppError('NOT_IMPLEMENTED', 'deleteRoom not implemented', 501);
}

async function updateRoomStatus(roomId, status) {
  if (!roomId || !status) {
    throw new AppError('BAD_REQUEST', 'roomId and status are required', 501);
  }

  return { roomId, status };
}

module.exports = {
  listRooms,
  getRoomById,
  listMyRooms,
  createRoom,
  updateRoom,
  deleteRoom,
  updateRoomStatus,
};
