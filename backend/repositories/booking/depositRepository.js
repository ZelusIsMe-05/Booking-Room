const db = require('../../config/db');

/**
 * Data-access layer cho bảng deposits và transactions.
 * Chỉ layer này biết tên bảng/cột; không xử lý HTTP.
 */

// ---------------------------------------------------------------------------
// Helpers nội bộ
// ---------------------------------------------------------------------------

/**
 * Set room.status và trả về room mới.
 * @param {object} trx  - knex transaction hoặc db
 * @param {string} roomId
 * @param {'AVAILABLE'|'LOCKED'|'RENTED'} status
 */
async function _setRoomStatus(trx, roomId, status) {
  await trx('rooms').where({ room_id: roomId }).update({ status, updated_at: trx.fn.now() });
}

// ---------------------------------------------------------------------------
// Deposit queries
// ---------------------------------------------------------------------------

/**
 * Lấy thông tin phòng cần thiết để kiểm tra điều kiện tạo deposit.
 * JOIN room_approvals để lấy approval_status.
 *
 * @param {string} roomId
 * @returns {Promise<object|undefined>}
 */
function findRoomForDeposit(roomId) {
  return db('rooms')
    .leftJoin('room_approvals', 'rooms.room_id', 'room_approvals.room_id')
    .where('rooms.room_id', roomId)
    .select(
      'rooms.room_id',
      'rooms.landlord_id',
      'rooms.status',
      'rooms.deposit_amount',
      'room_approvals.approval_status',
    )
    .first();
}

/**
 * Kiểm tra xem có deposit PROCESSING nào cho cặp (tenantId, roomId) chưa.
 * Dùng để tránh tạo 2 deposit cùng lúc.
 *
 * @param {string} tenantId
 * @param {string} roomId
 * @returns {Promise<object|undefined>}
 */
function findActiveDepositByTenantAndRoom(tenantId, roomId) {
  return db('deposits')
    .where({ tenant_id: tenantId, room_id: roomId })
    .whereIn('status', ['PROCESSING', 'CONFIRMED'])
    .first();
}

/**
 * Tạo 1 deposit mới và lock phòng trong cùng 1 DB transaction.
 *
 * @param {object} payload
 * @param {string} payload.tenantId
 * @param {string} payload.roomId
 * @param {string} payload.landlordId
 * @param {number} payload.depositAmount
 * @param {string|null} payload.appointmentTime
 * @returns {Promise<object>} deposit vừa tạo
 */
async function createDeposit({ tenantId, roomId, landlordId, depositAmount, appointmentTime }) {
  return db.transaction(async (trx) => {
    const expiredAt = new Date(Date.now() + 15 * 60 * 1000); // +15 phút

    const [deposit] = await trx('deposits')
      .insert({
        tenant_id: tenantId,
        room_id: roomId,
        landlord_id: landlordId,
        deposit_amount: depositAmount,
        appointment_time: appointmentTime || null,
        status: 'PROCESSING',
        expired_at: expiredAt,
        created_at: trx.fn.now(),
      })
      .returning('*');

    await _setRoomStatus(trx, roomId, 'LOCKED');

    return deposit;
  });
}

/**
 * Lấy danh sách deposit của 1 tenant, có lọc theo status.
 *
 * @param {string} tenantId
 * @param {object} filters
 * @param {string} [filters.status]
 * @param {number} [filters.page=1]
 * @param {number} [filters.limit=20]
 * @returns {Promise<{ items: object[], total: number }>}
 */
async function findDepositsByTenant(tenantId, { status, page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;

  const query = db('deposits')
    .join('rooms', 'deposits.room_id', 'rooms.room_id')
    .where('deposits.tenant_id', tenantId);

  if (status) query.where('deposits.status', status.toUpperCase());

  const [{ count }] = await query.clone().count('deposits.deposit_id as count');

  const items = await query
    .orderBy('deposits.created_at', 'desc')
    .limit(limit)
    .offset(offset)
    .select(
      'deposits.*',
      'rooms.title as room_title',
      'rooms.detailed_address as room_address',
    );

  return { items, total: Number(count) };
}

/**
 * Lấy chi tiết 1 deposit kèm thông tin phòng.
 *
 * @param {string} depositId
 * @returns {Promise<object|undefined>}
 */
function findDepositById(depositId) {
  return db('deposits')
    .join('rooms', 'deposits.room_id', 'rooms.room_id')
    .where('deposits.deposit_id', depositId)
    .select(
      'deposits.*',
      'rooms.title as room_title',
      'rooms.detailed_address as room_address',
      'rooms.monthly_rent',
    )
    .first();
}

/**
 * Hủy deposit (CANCELLED) và release phòng về AVAILABLE trong 1 DB transaction.
 *
 * @param {string} depositId
 * @param {string} roomId
 * @param {string|null} reason
 * @returns {Promise<object>} deposit sau khi update
 */
async function cancelDeposit(depositId, roomId, reason) {
  return db.transaction(async (trx) => {
    const [deposit] = await trx('deposits')
      .where({ deposit_id: depositId })
      .update({
        status: 'CANCELLED',
        cancellation_reason: reason || null,
        cancelled_at: trx.fn.now(),
      })
      .returning('*');

    await _setRoomStatus(trx, roomId, 'AVAILABLE');

    // Cập nhật tất cả transaction PENDING liên quan đến deposit này thành FAILED
    await trx('transactions')
      .where({ deposit_id: depositId, status: 'PENDING' })
      .update({ status: 'FAILED' });

    return deposit;
  });
}

/**
 * Lấy danh sách deposit cho tất cả phòng của 1 landlord.
 *
 * @param {string} landlordId
 * @param {object} filters
 * @param {string} [filters.status]
 * @param {number} [filters.page=1]
 * @param {number} [filters.limit=20]
 * @returns {Promise<{ items: object[], total: number }>}
 */
async function findDepositsByLandlord(landlordId, { status, page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;

  const query = db('deposits')
    .join('rooms', 'deposits.room_id', 'rooms.room_id')
    .join('tenants', 'deposits.tenant_id', 'tenants.tenant_id')
    .join('users', 'tenants.tenant_id', 'users.user_id')
    .where('deposits.landlord_id', landlordId);

  if (status) query.where('deposits.status', status.toUpperCase());

  const [{ count }] = await query.clone().count('deposits.deposit_id as count');

  const items = await query
    .orderBy('deposits.created_at', 'desc')
    .limit(limit)
    .offset(offset)
    .select(
      'deposits.*',
      'rooms.title as room_title',
      'rooms.detailed_address as room_address',
      'users.full_name as tenant_name',
      'users.phone_number as tenant_phone',
    );

  return { items, total: Number(count) };
}

/**
 * Host cập nhật trạng thái deposit (chỉ dùng cho host action: CONFIRMED / CANCELLED).
 *
 * @param {string} depositId
 * @param {string} roomId
 * @param {'CONFIRMED'|'CANCELLED'} newStatus
 * @param {string|null} reason
 * @returns {Promise<object>} deposit sau khi update
 */
async function updateDepositStatusByHost(depositId, roomId, newStatus, reason) {
  return db.transaction(async (trx) => {
    const updates = { status: newStatus };

    if (newStatus === 'CONFIRMED') {
      updates.confirmed_at = trx.fn.now();
    } else if (newStatus === 'CANCELLED') {
      updates.cancelled_at = trx.fn.now();
      updates.cancellation_reason = reason || null;
    }

    const [deposit] = await trx('deposits')
      .where({ deposit_id: depositId })
      .update(updates)
      .returning('*');

    // Nếu host cancel → release phòng
    if (newStatus === 'CANCELLED') {
      await _setRoomStatus(trx, roomId, 'AVAILABLE');
    }

    return deposit;
  });
}

/**
 * Lấy tất cả deposit đang PROCESSING đã quá expired_at.
 *
 * @returns {Promise<object[]>}
 */
function findExpiredDeposits() {
  return db('deposits')
    .where({ status: 'PROCESSING' })
    .where('expired_at', '<', db.fn.now())
    .select('deposit_id', 'room_id');
}

/**
 * Expire 1 danh sách deposit (batch): chuyển EXPIRED + unlock phòng.
 * Chạy trong 1 transaction duy nhất.
 *
 * @param {Array<{ deposit_id: string, room_id: string }>} deposits
 * @returns {Promise<object[]>} danh sách deposit đã expire
 */
async function expireDeposits(deposits) {
  if (deposits.length === 0) return [];

  return db.transaction(async (trx) => {
    const depositIds = deposits.map((d) => d.deposit_id);
    const roomIds = deposits.map((d) => d.room_id);

    const expired = await trx('deposits')
      .whereIn('deposit_id', depositIds)
      .update({ status: 'EXPIRED' })
      .returning('*');

    await trx('rooms')
      .whereIn('room_id', roomIds)
      .update({ status: 'AVAILABLE', updated_at: trx.fn.now() });

    // Cập nhật các giao dịch PENDING của các đơn cọc hết hạn thành FAILED
    await trx('transactions')
      .whereIn('deposit_id', depositIds)
      .where({ status: 'PENDING' })
      .update({ status: 'FAILED' });

    return expired;
  });
}

/**
 * Host duyệt hoặc từ chối đơn đặt cọc (ACCEPTED / REJECTED) sau khi tenant đã thanh toán.
 *
 * @param {string} depositId
 * @param {string} roomId
 * @param {'ACCEPTED'|'REJECTED'} newStatus
 * @param {string|null} reason
 * @returns {Promise<object>} deposit sau khi update
 */
async function updateDepositDecisionByHost(depositId, roomId, newStatus, reason) {
  return db.transaction(async (trx) => {
    const updates = { status: newStatus };

    if (newStatus === 'ACCEPTED') {
      updates.host_accepted_at = trx.fn.now();
      // Host nhận tiền cọc sau 7 ngày nếu không có khiếu nại
      const payoutEligible = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      updates.payout_eligible_at = payoutEligible;
      updates.payout_status = 'PENDING';
    } else if (newStatus === 'REJECTED') {
      updates.host_rejected_at = trx.fn.now();
      updates.cancellation_reason = reason || null;
      updates.payout_status = 'REFUNDED';
    }

    const [deposit] = await trx('deposits')
      .where({ deposit_id: depositId })
      .update(updates)
      .returning('*');

    // Cập nhật trạng thái phòng dựa trên quyết định
    if (newStatus === 'ACCEPTED') {
      await _setRoomStatus(trx, roomId, 'RENTED');
    } else if (newStatus === 'REJECTED') {
      await _setRoomStatus(trx, roomId, 'AVAILABLE');
    }

    return deposit;
  });
}

module.exports = {
  findRoomForDeposit,
  findActiveDepositByTenantAndRoom,
  createDeposit,
  findDepositsByTenant,
  findDepositById,
  cancelDeposit,
  findDepositsByLandlord,
  updateDepositStatusByHost,
  updateDepositDecisionByHost,
  findExpiredDeposits,
  expireDeposits,
};
