const Room = require('../../models/Room');
const AppError = require('../../utils/AppError');

async function listPendingRooms() {
  return Room.listPendingRooms();
}

async function approveRoom(roomId) {
  const room = await Room.findRoomById(roomId);
  if (!room) throw new AppError('Room not found', 404);
  if (room.approval_status !== 'PENDING') {
    throw new AppError('Only pending rooms can be approved', 400);
  }

  await Room.updateApproval(roomId, 'APPROVED');
  return Room.findRoomById(roomId);
}

async function rejectRoom(roomId) {
  const room = await Room.findRoomById(roomId);
  if (!room) throw new AppError('Room not found', 404);
  if (room.approval_status !== 'PENDING') {
    throw new AppError('Only pending rooms can be rejected', 400);
  }

  await Room.updateApproval(roomId, 'REJECTED');
  return Room.findRoomById(roomId);
}

module.exports = {
  listPendingRooms,
  approveRoom,
  rejectRoom,
};
