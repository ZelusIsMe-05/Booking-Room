const AppError = require('../../utils/AppError');
const { sendSuccess } = require('../../utils/responseHelper');
const roomService = require('../../services/host/roomService');

async function listMyRooms(req, res, next) {
  try {
    const result = await roomService.listMyRooms(req.user.userId, req.query || {});
    return sendSuccess(res, { status: 200, message: 'Danh sách phòng của tôi', data: result });
  } catch (err) {
    if (!(err instanceof AppError)) console.error('[host.roomController.updateRoom ERROR]', err);
    return next(err instanceof AppError ? err : new AppError('UNEXPECTED', 'Đã xảy ra lỗi.', 500));
  }
}

async function createRoom(req, res, next) {
  try {
    const files = req.files || [];
    const result = await roomService.createRoom(req.user.userId, req.body, files);
    return sendSuccess(res, { status: 201, message: 'Host tạo phòng thành công', data: result });
  } catch (err) {
    return next(err instanceof AppError ? err : new AppError('UNEXPECTED', 'Đã xảy ra lỗi.', 500));
  }
}

async function updateRoom(req, res, next) {
  try {
    const files = req.files || [];
    const result = await roomService.updateRoom(req.user.userId, req.params.roomId, req.body || {}, files);
    return sendSuccess(res, { status: 200, message: `Host cập nhật phòng thành công`, data: result });
  } catch (err) {
    return next(err instanceof AppError ? err : new AppError('UNEXPECTED', 'Đã xảy ra lỗi.', 500));
  }
}

async function deleteRoom(req, res, next) {
  try {
    await roomService.deleteRoom(req.user.userId, req.params.roomId);
    return sendSuccess(res, { status: 200, message: `deleted` });
  } catch (err) {
    return next(err instanceof AppError ? err : new AppError('UNEXPECTED', 'Đã xảy ra lỗi.', 500));
  }
}

async function updateRoomStatus(req, res, next) {
  try {
    // await roomService.updateRoomStatus(req.user.userId, req.params.roomId, req.body);
    return sendSuccess(res, { status: 200, message: `Stub: Host cập nhật trạng thái phòng ID ${req.params.roomId}` });
  } catch (err) {
    return next(err instanceof AppError ? err : new AppError('UNEXPECTED', 'Đã xảy ra lỗi.', 500));
  }
}

module.exports = {
  listMyRooms,
  createRoom,
  updateRoom,
  deleteRoom,
  updateRoomStatus,
};