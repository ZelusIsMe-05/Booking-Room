const roomService = require('../../services/host/roomService');
const { sendSuccess } = require('../../utils/responseHelper');

async function createRoom(req, res, next) {
  try {
    const room = await roomService.createRoom(req.user, req.body);
    return sendSuccess(res, {
      status: 201,
      message: 'Room submitted for approval',
      data: { room },
    });
  } catch (err) {
    next(err);
  }
}

async function listMyRooms(req, res, next) {
  try {
    const rooms = await roomService.listMyRooms(req.user);
    return sendSuccess(res, {
      status: 200,
      message: 'Host rooms fetched successfully',
      data: { rooms },
    });
  } catch (err) {
    next(err);
  }
}

async function updateRoom(req, res, next) {
  try {
    const room = await roomService.updateRoom(req.user, req.params.id, req.body);
    return sendSuccess(res, {
      status: 200,
      message: 'Room updated and submitted for approval',
      data: { room },
    });
  } catch (err) {
    next(err);
  }
}

async function deleteRoom(req, res, next) {
  try {
    await roomService.deleteRoom(req.user, req.params.id);
    return sendSuccess(res, {
      status: 200,
      message: 'Room deleted successfully',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createRoom,
  listMyRooms,
  updateRoom,
  deleteRoom,
};
