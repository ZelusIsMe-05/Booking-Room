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
    return sendSuccess(res, { status: 200, message: `Xóa phòng thành công.` });
  } catch (err) {
    return next(err instanceof AppError ? err : new AppError('UNEXPECTED', 'Đã xảy ra lỗi.', 500));
  }
}

async function updateRoomStatus(req, res, next) {
  try {
    const body = req.body || {};
    // Accept either { visible: boolean } or { action: 'show' | 'hide' }.
    let visible;
    if (typeof body.visible === 'boolean') {
      visible = body.visible;
    } else if (body.action === 'show' || body.action === 'hide') {
      visible = body.action === 'show';
    } else {
      throw new AppError('VALIDATION_ERROR', "Cần truyền 'visible' (boolean) hoặc 'action' ('show'|'hide').", 400);
    }

    const result = await roomService.setRoomVisibility(req.user.userId, req.params.roomId, visible);
    return sendSuccess(res, {
      status: 200,
      message: visible ? 'Đã hiển thị tin đăng.' : 'Đã tạm ẩn tin đăng.',
      data: result,
    });
  } catch (err) {
    if (!(err instanceof AppError)) console.error('[host.roomController.updateRoomStatus ERROR]', err);
    return next(err instanceof AppError ? err : new AppError('UNEXPECTED', 'Đã xảy ra lỗi.', 500));
  }
}

async function getOverview(req, res, next) {
  try {
    const result = await roomService.getOverview(req.user.userId, { year: req.query.year });
    return sendSuccess(res, { status: 200, message: 'Tổng quan kinh doanh', data: result });
  } catch (err) {
    if (!(err instanceof AppError)) console.error('[host.roomController.getOverview ERROR]', err);
    return next(err instanceof AppError ? err : new AppError('UNEXPECTED', 'Đã xảy ra lỗi.', 500));
  }
}

module.exports = {
  listMyRooms,
  createRoom,
  updateRoom,
  deleteRoom,
  updateRoomStatus,
  getOverview,
};
