const Room = require('../../models/Room');
const AppError = require('../../utils/AppError');

function normalizeImages(payload) {
  if (Array.isArray(payload.images)) return payload.images.filter(Boolean);
  if (payload.image_url) return [payload.image_url];
  return [];
}

function numberField(value, field, errors, { required = true, min = 0 } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) errors[field] = `${field} is required`;
    return undefined;
  }

  const number = Number(value);
  if (!Number.isFinite(number) || number < min) {
    errors[field] = `${field} must be a number >= ${min}`;
    return undefined;
  }

  return number;
}

function validateCreatePayload(payload) {
  const errors = {};

  const room = {
    title: String(payload.title || '').trim(),
    room_type: String(payload.room_type || payload.roomType || '').trim(),
    detailed_address: String(payload.detailed_address || payload.detailedAddress || '').trim(),
    max_capacity: numberField(payload.max_capacity ?? payload.maxCapacity, 'max_capacity', errors, { min: 1 }),
    monthly_rent: numberField(payload.monthly_rent ?? payload.monthlyRent, 'monthly_rent', errors),
    deposit_amount: numberField(payload.deposit_amount ?? payload.depositAmount, 'deposit_amount', errors),
    electricity_cost: numberField(payload.electricity_cost ?? payload.electricityCost, 'electricity_cost', errors),
    water_cost: numberField(payload.water_cost ?? payload.waterCost, 'water_cost', errors),
    internet_cost: numberField(payload.internet_cost ?? payload.internetCost ?? 0, 'internet_cost', errors, { required: false }),
    service_fee: numberField(payload.service_fee ?? payload.serviceFee ?? 0, 'service_fee', errors, { required: false }),
    room_description: payload.room_description ?? payload.roomDescription ?? null,
    longitude: numberField(payload.longitude, 'longitude', errors, { required: false, min: -180 }),
    latitude: numberField(payload.latitude, 'latitude', errors, { required: false, min: -90 }),
    images: normalizeImages(payload),
  };

  if (room.longitude !== undefined && room.longitude > 180) errors.longitude = 'longitude must be between -180 and 180';
  if (room.latitude !== undefined && room.latitude > 90) errors.latitude = 'latitude must be between -90 and 90';

  if (!room.title) errors.title = 'title is required';
  if (!room.room_type) errors.room_type = 'room_type is required';
  if (!room.detailed_address) errors.detailed_address = 'detailed_address is required';

  if (Object.keys(errors).length > 0) {
    throw new AppError('Validation failed', 400, errors);
  }

  return room;
}

function validateUpdatePayload(payload) {
  const errors = {};
  const room = {};

  const stringMap = {
    title: 'title',
    room_type: 'room_type',
    roomType: 'room_type',
    detailed_address: 'detailed_address',
    detailedAddress: 'detailed_address',
    room_description: 'room_description',
    roomDescription: 'room_description',
  };

  for (const [input, column] of Object.entries(stringMap)) {
    if (payload[input] !== undefined) {
      room[column] = payload[input] === null ? null : String(payload[input]).trim();
    }
  }

  const numericFields = [
    ['max_capacity', 'maxCapacity', 1],
    ['monthly_rent', 'monthlyRent', 0],
    ['deposit_amount', 'depositAmount', 0],
    ['electricity_cost', 'electricityCost', 0],
    ['water_cost', 'waterCost', 0],
    ['internet_cost', 'internetCost', 0],
    ['service_fee', 'serviceFee', 0],
    ['longitude', 'longitude', -180],
    ['latitude', 'latitude', -90],
  ];

  for (const [snake, camel, min] of numericFields) {
    const value = payload[snake] ?? payload[camel];
    if (value !== undefined) {
      room[snake] = numberField(value, snake, errors, { required: false, min });
    }
  }

  if (room.longitude !== undefined && room.longitude > 180) errors.longitude = 'longitude must be between -180 and 180';
  if (room.latitude !== undefined && room.latitude > 90) errors.latitude = 'latitude must be between -90 and 90';

  const hasImages = payload.images !== undefined || payload.image_url !== undefined;
  const images = hasImages ? normalizeImages(payload) : undefined;

  if (Object.keys(errors).length > 0) {
    throw new AppError('Validation failed', 400, errors);
  }

  if (Object.keys(room).length === 0 && !hasImages) {
    throw new AppError('No room fields to update', 400);
  }

  return { room, images };
}

async function assertVerifiedHost(userId) {
  const verified = await Room.isVerifiedHost(userId);
  if (!verified) {
    throw new AppError('Host account must be verified before creating room posts', 403);
  }
}

async function assertOwnRoom(roomId, userId) {
  const room = await Room.findRoomById(roomId);
  if (!room) throw new AppError('Room not found', 404);
  if (room.landlord_id !== userId) throw new AppError('Forbidden', 403);
  return room;
}

async function createRoom(user, payload) {
  await assertVerifiedHost(user.userId);
  const roomPayload = validateCreatePayload(payload);
  const roomId = await Room.createRoom({
    ...roomPayload,
    landlord_id: user.userId,
  });
  return Room.findRoomById(roomId);
}

async function listMyRooms(user) {
  return Room.listRoomsByLandlord(user.userId);
}

async function updateRoom(user, roomId, payload) {
  await assertOwnRoom(roomId, user.userId);
  const changes = validateUpdatePayload(payload);
  await Room.updateRoom(roomId, changes);
  return Room.findRoomById(roomId);
}

async function deleteRoom(user, roomId) {
  await assertOwnRoom(roomId, user.userId);
  await Room.deleteRoom(roomId);
  return null;
}

module.exports = {
  createRoom,
  listMyRooms,
  updateRoom,
  deleteRoom,
};
