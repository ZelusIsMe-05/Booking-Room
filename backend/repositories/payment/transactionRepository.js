const db = require('../../config/db');

/**
 * Data-access layer cho bảng transactions.
 */

// ---------------------------------------------------------------------------
// Transaction queries
// ---------------------------------------------------------------------------

/**
 * Tạo 1 transaction mới với trạng thái PENDING.
 *
 * @param {object} payload
 * @param {string} payload.depositId
 * @param {number} payload.amount
 * @param {'VNPAY'|'MOMO'|'BANK_TRANSFER'} payload.paymentMethod
 * @param {string} payload.paymentUrl
 * @returns {Promise<object>} transaction vừa tạo
 */
async function createTransaction({ transactionId, depositId, amount, paymentMethod, paymentUrl }) {
  const insertData = {
    deposit_id: depositId,
    amount,
    payment_method: paymentMethod,
    status: 'PENDING',
    payment_url: paymentUrl,
    created_at: db.fn.now(),
  };

  if (transactionId) {
    insertData.transaction_id = transactionId;
  }

  const [transaction] = await db('transactions')
    .insert(insertData)
    .returning('*');
  return transaction;
}

/**
 * Lấy chi tiết 1 transaction theo ID, kèm thông tin deposit và room.
 *
 * @param {string} transactionId
 * @returns {Promise<object|undefined>}
 */
function findTransactionById(transactionId) {
  return db('transactions')
    .join('deposits', 'transactions.deposit_id', 'deposits.deposit_id')
    .join('rooms', 'deposits.room_id', 'rooms.room_id')
    .where('transactions.transaction_id', transactionId)
    .select(
      'transactions.*',
      'deposits.tenant_id',
      'deposits.landlord_id',
      'deposits.room_id',
      'deposits.status as deposit_status',
      'rooms.title as room_title',
    )
    .first();
}

/**
 * Kiểm tra đã có transaction PENDING cho deposit này chưa (tránh duplicate).
 *
 * @param {string} depositId
 * @returns {Promise<object|undefined>}
 */
function findPendingTransactionByDeposit(depositId) {
  return db('transactions')
    .where({ deposit_id: depositId, status: 'PENDING' })
    .first();
}

/**
 * Cập nhật trạng thái transaction sau khi nhận webhook.
 * Đồng thời cập nhật deposit và room status trong cùng 1 DB transaction.
 *
 * @param {string} transactionId
 * @param {'SUCCESS'|'FAILED'} newStatus
 * @param {object} depositInfo  - { deposit_id, room_id }
 * @returns {Promise<object>} transaction sau khi update
 */
async function processWebhookUpdate(transactionId, newStatus, depositInfo) {
  return db.transaction(async (trx) => {
    // 1. Cập nhật transaction
    const [transaction] = await trx('transactions')
      .where({ transaction_id: transactionId })
      .update({ status: newStatus })
      .returning('*');

    // 2. Cập nhật deposit và room theo kết quả webhook
    if (newStatus === 'SUCCESS') {
      await trx('deposits')
        .where({ deposit_id: depositInfo.deposit_id })
        .update({ status: 'CONFIRMED', confirmed_at: trx.fn.now() });

      await trx('rooms')
        .where({ room_id: depositInfo.room_id })
        .update({ status: 'LOCKED', updated_at: trx.fn.now() });
    } else {
      // FAILED → cancel deposit, release phòng
      await trx('deposits')
        .where({ deposit_id: depositInfo.deposit_id })
        .update({
          status: 'CANCELLED',
          cancelled_at: trx.fn.now(),
          cancellation_reason: 'Thanh toan that bai.',
        });

      await trx('rooms')
        .where({ room_id: depositInfo.room_id })
        .update({ status: 'AVAILABLE', updated_at: trx.fn.now() });
    }

    return transaction;
  });
}

/**
 * Lấy lịch sử giao dịch của 1 tenant.
 *
 * @param {string} tenantId
 * @param {object} filters
 * @param {string} [filters.status]
 * @param {number} [filters.page=1]
 * @param {number} [filters.limit=20]
 * @returns {Promise<{ items: object[], total: number }>}
 */
async function findTransactionsByTenant(tenantId, { status, page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;

  const query = db('transactions')
    .join('deposits', 'transactions.deposit_id', 'deposits.deposit_id')
    .join('rooms', 'deposits.room_id', 'rooms.room_id')
    .where('deposits.tenant_id', tenantId);

  if (status) query.where('transactions.status', status.toUpperCase());

  const [{ count }] = await query.clone().count('transactions.transaction_id as count');

  const items = await query
    .orderBy('transactions.created_at', 'desc')
    .limit(limit)
    .offset(offset)
    .select(
      'transactions.*',
      'rooms.title as room_title',
      'deposits.deposit_id',
      'deposits.status as deposit_status',
    );

  return { items, total: Number(count) };
}

/**
 * Admin: lấy toàn bộ giao dịch (read-only), có lọc và phân trang.
 *
 * @param {object} filters
 * @param {string} [filters.status]
 * @param {string} [filters.paymentMethod]
 * @param {number} [filters.page=1]
 * @param {number} [filters.limit=20]
 * @returns {Promise<{ items: object[], total: number }>}
 */
async function findAllTransactions({ status, paymentMethod, page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;

  const query = db('transactions')
    .join('deposits', 'transactions.deposit_id', 'deposits.deposit_id')
    .join('rooms', 'deposits.room_id', 'rooms.room_id')
    .join('tenants', 'deposits.tenant_id', 'tenants.tenant_id')
    .join('users', 'tenants.tenant_id', 'users.user_id');

  if (status) query.where('transactions.status', status.toUpperCase());
  if (paymentMethod) query.where('transactions.payment_method', paymentMethod.toUpperCase());

  const [{ count }] = await query.clone().count('transactions.transaction_id as count');

  const items = await query
    .orderBy('transactions.created_at', 'desc')
    .limit(limit)
    .offset(offset)
    .select(
      'transactions.*',
      'rooms.title as room_title',
      'deposits.status as deposit_status',
      'users.full_name as tenant_name',
      'users.email as tenant_email',
    );

  return { items, total: Number(count) };
}

module.exports = {
  createTransaction,
  findTransactionById,
  findPendingTransactionByDeposit,
  processWebhookUpdate,
  findTransactionsByTenant,
  findAllTransactions,
};
