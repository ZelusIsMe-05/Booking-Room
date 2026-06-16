const AppError = require('../../utils/AppError');
const { sendSuccess } = require('../../utils/responseHelper');
const roomService = require('../../services/roomService');

async function listRooms(req, res, next) {
  try {
    const result = await roomService.listRooms(req.query);
    return sendSuccess(res, { status: 200, message: 'Danh sách phòng công khai', data: result });
  } catch (err) {
    return next(err instanceof AppError ? err : new AppError('UNEXPECTED', 'Đã xảy ra lỗi.', 500));
  }
}

async function getRoomById(req, res, next) {
  try {
    const { roomId } = req.params;
    const result = await roomService.getRoomById(roomId);
    return sendSuccess(res, {
      status: 200,
      message: 'Chi tiết phòng',
      data: result,
    });
  } catch (err) {
    return next(err instanceof AppError ? err : new AppError('UNEXPECTED', 'Đã xảy ra lỗi.', 500));
  }
}

module.exports = {
  listRooms,
  getRoomById,
};
