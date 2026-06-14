const roomService = require('../../services/admin/roomService');
const { sendSuccess } = require('../../utils/responseHelper');

async function listPendingRooms(req, res, next) {
  try {
    const rooms = await roomService.listPendingRooms();
    return sendSuccess(res, {
      status: 200,
      message: 'Pending rooms fetched successfully',
      data: { rooms },
    });
  } catch (err) {
    next(err);
  }
}

async function approveRoom(req, res, next) {
  try {
    const room = await roomService.approveRoom(req.params.id);
    return sendSuccess(res, {
      status: 200,
      message: 'Room approved successfully',
      data: { room },
    });
  } catch (err) {
    next(err);
  }
}

async function rejectRoom(req, res, next) {
  try {
    const room = await roomService.rejectRoom(req.params.id);
    return sendSuccess(res, {
      status: 200,
      message: 'Room rejected successfully',
      data: { room },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listPendingRooms,
  approveRoom,
  rejectRoom,
};
