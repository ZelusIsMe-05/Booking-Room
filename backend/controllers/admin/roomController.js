const adminRoomService = require('../../services/admin/roomService');
const { sendSuccess } = require('../../utils/responseHelper');

async function approveRoom(req, res, next) {
  try {
    const adminId = req.user.userId;
    const roomId = req.params.roomId;
    const result = await adminRoomService.approveRoom(roomId, adminId);
    return sendSuccess(res, { status: 200, message: 'Phê duyệt bài đăng thành công.', data: result });
  } catch (err) { next(err); }
}

async function rejectRoom(req, res, next) {
  try {
    const adminId = req.user.userId;
    const roomId = req.params.roomId;
    const reason = req.body.reason;
    const result = await adminRoomService.rejectRoom(roomId, adminId, reason);
    return sendSuccess(res, { status: 200, message: 'Từ chối bài đăng thành công.', data: result });
  } catch (err) { next(err); }
}

async function listPendingRooms(req, res, next) {
  try {
    const result = await adminRoomService.listPendingRooms(req.query);
    return sendSuccess(res, { status: 200, message: 'Danh sách phòng chờ duyệt', data: result });
  } catch (err) { next(err); }
}

module.exports = { 
  approveRoom, 
  rejectRoom, 
  listPendingRooms
};