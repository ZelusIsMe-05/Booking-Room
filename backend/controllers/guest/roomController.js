const roomService = require('../../services/guest/roomService');
const { sendSuccess } = require('../../utils/responseHelper');

async function listRooms(req, res, next) {
  try {
    const result = await roomService.listRooms(req.query);
    return sendSuccess(res, {
      status: 200,
      message: 'Rooms fetched successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function getRoomById(req, res, next) {
  try {
    const room = await roomService.getRoomById(req.params.id, req.user || null);
    return sendSuccess(res, {
      status: 200,
      message: 'Room fetched successfully',
      data: { room },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listRooms,
  getRoomById,
};
