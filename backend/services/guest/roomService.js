const Room = require('../../models/Room');
const AppError = require('../../utils/AppError');

function canSeeRoom(room, user) {
  if (!room) return false;
  if (room.status === 'AVAILABLE' && room.approval_status === 'APPROVED') return true;
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  return user.role === 'HOST' && room.landlord_id === user.user_id;
}

async function listRooms(query) {
  const minPrice = query.minPrice ?? query.min_price;
  const maxPrice = query.maxPrice ?? query.max_price;

  if (minPrice !== undefined && Number.isNaN(Number(minPrice))) {
    throw new AppError('minPrice must be a number', 400);
  }
  if (maxPrice !== undefined && Number.isNaN(Number(maxPrice))) {
    throw new AppError('maxPrice must be a number', 400);
  }

  return Room.listPublicRooms({
    page: query.page,
    limit: query.limit,
    keyword: query.keyword || query.q,
    minPrice,
    maxPrice,
    location: query.location,
    roomType: query.roomType || query.room_type,
    sort: query.sort,
  });
}

async function getRoomById(roomId, user = null) {
  const room = await Room.findRoomById(roomId);
  if (!canSeeRoom(room, user)) {
    throw new AppError('Room not found', 404);
  }
  return room;
}

module.exports = {
  listRooms,
  getRoomById,
};
