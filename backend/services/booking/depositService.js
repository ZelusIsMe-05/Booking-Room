const depositRepository = require('../../repositories/booking/depositRepository');
const AppError = require('../../utils/AppError');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const DEPOSIT_LOCK_MINUTES = 15;
const VALID_HOST_STATUSES = ['ACCEPTED', 'REJECTED'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse số nguyên dương an toàn; trả về fallback nếu không hợp lệ.
 */
function parsePositiveInt(value, fallback) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Tạo đơn đặt cọc mới cho tenant.
 * Business rules:
 * - Phòng phải APPROVED và AVAILABLE.
 * - Tenant không có PROCESSING deposit cho phòng này.
 *
 * @param {object} user         req.user từ middleware
 * @param {object} body         request body
 * @returns {Promise<object>}   deposit đã tạo
 */
async function createDeposit(user, { room_id, appointment_time }) {
  if (!room_id) {
    throw new AppError('VALIDATION_ERROR', 'room_id la bat buoc.', 400);
  }

  // 1. Kiểm tra phòng tồn tại, đã approved, đang available
  const room = await depositRepository.findRoomForDeposit(room_id);
  if (!room) {
    throw new AppError('ROOM_NOT_FOUND', 'Phong khong ton tai.', 404);
  }
  if (room.approval_status !== 'APPROVED') {
    throw new AppError('ROOM_NOT_APPROVED', 'Phong chua duoc duyet.', 400);
  }
  if (room.status !== 'AVAILABLE') {
    throw new AppError('ROOM_NOT_AVAILABLE', 'Phong hien khong con trong.', 409);
  }

  // 2. Kiểm tra tenant chưa có PROCESSING deposit cho phòng này
  const existing = await depositRepository.findActiveDepositByTenantAndRoom(user.userId, room_id);
  if (existing) {
    throw new AppError(
      'DEPOSIT_CONFLICT',
      'Ban da co don dat coc dang xu ly cho phong nay.',
      409,
    );
  }

  // 3. Tạo deposit
  const deposit = await depositRepository.createDeposit({
    tenantId: user.userId,
    roomId: room_id,
    landlordId: room.landlord_id,
    depositAmount: Number(room.deposit_amount),
    appointmentTime: appointment_time || null,
  });

  return deposit;
}

/**
 * Lấy danh sách deposit của tenant đang đăng nhập.
 *
 * @param {object} user
 * @param {object} query    req.query
 * @returns {Promise<{ items, total }>}
 */
async function listMyDeposits(user, query) {
  const page = parsePositiveInt(query.page, 1);
  const limit = Math.min(parsePositiveInt(query.limit, 20), 50);
  const status = query.status ? String(query.status).toUpperCase() : undefined;

  return depositRepository.findDepositsByTenant(user.userId, { status, page, limit });
}

/**
 * Lấy chi tiết 1 deposit.
 * Tenant chỉ xem được deposit của mình; Landlord xem được deposit phòng của mình;
 * Admin xem được tất cả.
 *
 * @param {object} user
 * @param {string} depositId
 * @returns {Promise<object>}
 */
async function getDepositDetail(user, depositId) {
  const deposit = await depositRepository.findDepositById(depositId);
  if (!deposit) {
    throw new AppError('DEPOSIT_NOT_FOUND', 'Don dat coc khong ton tai.', 404);
  }

  const role = String(user.role || '').toUpperCase();
  if (role === 'TENANT' && deposit.tenant_id !== user.userId) {
    throw new AppError('FORBIDDEN', 'Ban khong co quyen xem don dat coc nay.', 403);
  }
  if (role === 'LANDLORD' && deposit.landlord_id !== user.userId) {
    throw new AppError('FORBIDDEN', 'Ban khong co quyen xem don dat coc nay.', 403);
  }

  return deposit;
}

/**
 * Tenant hủy deposit của mình.
 *
 * @param {object} user
 * @param {string} depositId
 * @param {string|null} reason
 * @returns {Promise<object>}
 */
async function cancelDeposit(user, depositId, reason) {
  const deposit = await depositRepository.findDepositById(depositId);
  if (!deposit) {
    throw new AppError('DEPOSIT_NOT_FOUND', 'Don dat coc khong ton tai.', 404);
  }
  if (deposit.tenant_id !== user.userId) {
    throw new AppError('FORBIDDEN', 'Ban khong co quyen huy don dat coc nay.', 403);
  }
  if (deposit.status !== 'PROCESSING') {
    throw new AppError(
      'DEPOSIT_NOT_CANCELLABLE',
      `Don dat coc dang o trang thai "${deposit.status}", khong the huy.`,
      400,
    );
  }

  return depositRepository.cancelDeposit(depositId, deposit.room_id, reason || null);
}

/**
 * Landlord xem danh sách deposit cho phòng của mình.
 *
 * @param {object} user
 * @param {object} query
 * @returns {Promise<{ items, total }>}
 */
async function listDepositsForLandlord(user, query) {
  const page = parsePositiveInt(query.page, 1);
  const limit = Math.min(parsePositiveInt(query.limit, 20), 50);
  const status = query.status ? String(query.status).toUpperCase() : undefined;

  return depositRepository.findDepositsByLandlord(user.userId, { status, page, limit });
}

/**
 * Landlord cập nhật trạng thái deposit (CONFIRMED / CANCELLED).
 *
 * @param {object} user
 * @param {string} depositId
 * @param {string} newStatus
 * @param {string|null} reason
 * @returns {Promise<object>}
 */
async function updateDepositByLandlord(user, depositId, newStatus, reason) {
  const statusUpper = String(newStatus || '').toUpperCase();
  if (!newStatus || !VALID_HOST_STATUSES.includes(statusUpper)) {
    throw new AppError(
      'INVALID_STATUS',
      `Status khong hop le. Chi chap nhan: ${VALID_HOST_STATUSES.join(', ')}.`,
      400,
    );
  }

  const deposit = await depositRepository.findDepositById(depositId);
  if (!deposit) {
    throw new AppError('DEPOSIT_NOT_FOUND', 'Don dat coc khong ton tai.', 404);
  }
  if (deposit.landlord_id !== user.userId) {
    throw new AppError('FORBIDDEN', 'Ban khong co quyen xu ly don dat coc nay.', 403);
  }
  if (deposit.status !== 'CONFIRMED') {
    throw new AppError(
      'DEPOSIT_NOT_PROCESSABLE',
      `Don dat coc phai o trang thai "CONFIRMED" (da thanh toan) moi co the phe duyet.`,
      400,
    );
  }

  const updatedDeposit = await depositRepository.updateDepositDecisionByHost(
    depositId,
    deposit.room_id,
    statusUpper,
    reason || null,
  );

  // Gửi thông báo cho Tenant báo kết quả duyệt đặt cọc
  try {
    const notificationService = require('../guest/notificationService');
    const title = statusUpper === 'ACCEPTED' ? 'Đơn đặt cọc được chấp nhận' : 'Đơn đặt cọc bị từ chối';
    const content = statusUpper === 'ACCEPTED'
      ? `Đơn đặt cọc phòng "${deposit.room_title}" của bạn đã được chủ trọ phê duyệt. Phòng đã được thuê thành công!`
      : `Đơn đặt cọc phòng "${deposit.room_title}" của bạn đã bị từ chối. Lý do: ${reason || 'Không có lý do cụ thể'}. Tiền cọc sẽ được hoàn lại cho bạn.`;

    await notificationService.createNotification(
      deposit.tenant_id,
      title,
      content,
      'DEPOSIT'
    );
  } catch (err) {
    console.error('Loi gui thong bao cho Tenant sau quyet dinh cua Host:', err);
  }

  return updatedDeposit;
}

/**
 * Admin trigger expire tất cả deposit quá hạn.
 *
 * @returns {Promise<object[]>} danh sách deposit đã expire
 */
async function expireOverdueDeposits() {
  const overdueDeposits = await depositRepository.findExpiredDeposits();
  return depositRepository.expireDeposits(overdueDeposits);
}

/**
 * Lấy deposit PROCESSING của tenant với room tương ứng kèm transaction PENDING của nó (nếu có).
 *
 * @param {object} user
 * @param {string} roomId
 * @returns {Promise<object|null>}
 */
async function getActiveDeposit(user, roomId) {
  if (!roomId) {
    throw new AppError('BAD_REQUEST', 'room_id is required', 400);
  }

  const deposit = await depositRepository.findActiveDepositByTenantAndRoom(user.userId, roomId);
  if (!deposit) {
    return null;
  }

  const db = require('../../config/db');
  const transaction = await db('transactions')
    .where({ deposit_id: deposit.deposit_id })
    .orderBy('created_at', 'desc')
    .first();

  return {
    deposit,
    transaction: transaction || null,
  };
}

module.exports = {
  createDeposit,
  listMyDeposits,
  getDepositDetail,
  cancelDeposit,
  listDepositsForLandlord,
  updateDepositByLandlord,
  expireOverdueDeposits,
  getActiveDeposit,
  DEPOSIT_LOCK_MINUTES,
};
