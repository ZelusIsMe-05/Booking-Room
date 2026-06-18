const transactionRepository = require('../../repositories/payment/transactionRepository');
const depositRepository = require('../../repositories/booking/depositRepository');
const AppError = require('../../utils/AppError');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const VALID_PAYMENT_METHODS = ['VNPAY', 'MOMO', 'BANK_TRANSFER'];
const MOCK_WEBHOOK_CHECKSUM = 'mock-valid-checksum';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function parsePositiveInt(value, fallback) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

/**
 * Sinh mock payment_url cho sandbox/test.
 */
function buildMockPaymentUrl(transactionId, returnUrl) {
  const base = `http://sandbox-gateway.local/pay?txn=${transactionId}`;
  return returnUrl ? `${base}&return=${encodeURIComponent(returnUrl)}` : base;
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Tenant tạo giao dịch thanh toán cho 1 deposit PROCESSING.
 * Business rules:
 * - Deposit phải tồn tại và đang PROCESSING.
 * - Chưa có transaction PENDING nào cho deposit này.
 * - payment_method phải hợp lệ.
 *
 * @param {object} user         req.user
 * @param {object} body         { deposit_id, payment_method, return_url }
 * @returns {Promise<object>}   { transaction, payment_url }
 */
async function createTransaction(user, { deposit_id, payment_method, return_url }) {
  // 1. Validate input
  if (!deposit_id) {
    throw new AppError('VALIDATION_ERROR', 'deposit_id la bat buoc.', 400);
  }
  if (!payment_method || !VALID_PAYMENT_METHODS.includes(String(payment_method).toUpperCase())) {
    throw new AppError(
      'INVALID_PAYMENT_METHOD',
      `payment_method khong hop le. Chi chap nhan: ${VALID_PAYMENT_METHODS.join(', ')}.`,
      400,
    );
  }

  // 2. Kiểm tra deposit
  const deposit = await depositRepository.findDepositById(deposit_id);
  if (!deposit) {
    throw new AppError('DEPOSIT_NOT_FOUND', 'Don dat coc khong ton tai.', 404);
  }
  if (deposit.tenant_id !== user.userId) {
    throw new AppError('FORBIDDEN', 'Ban khong co quyen tao giao dich cho don dat coc nay.', 403);
  }
  if (deposit.status !== 'PROCESSING') {
    throw new AppError(
      'DEPOSIT_NOT_PROCESSABLE',
      `Don dat coc dang o trang thai "${deposit.status}", khong the thanh toan.`,
      400,
    );
  }

  // 3. Kiểm tra chưa có transaction PENDING (tránh duplicate)
  const existing = await transactionRepository.findPendingTransactionByDeposit(deposit_id);
  if (existing) {
    throw new AppError(
      'TRANSACTION_DUPLICATE',
      'Da co giao dich dang xu ly cho don dat coc nay.',
      409,
    );
  }

  const crypto = require('crypto');
  const transactionId = crypto.randomUUID();
  const paymentUrl = buildMockPaymentUrl(transactionId, return_url);

  // 4. Tạo transaction
  const transaction = await transactionRepository.createTransaction({
    transactionId,
    depositId: deposit_id,
    amount: Number(deposit.deposit_amount),
    paymentMethod: String(payment_method).toUpperCase(),
    paymentUrl,
  });

  return { transaction, paymentUrl };
}

/**
 * Xử lý webhook từ cổng thanh toán (mock).
 * Idempotent: nếu transaction đã được xử lý trước đó, trả về 200 không làm gì.
 *
 * @param {object} body   { transaction_id, status, checksum }
 * @returns {Promise<object>}  { transaction, deposit, idempotent }
 */
async function processWebhook({ transaction_id, status, checksum }) {
  // 1. Validate checksum mock
  if (checksum !== MOCK_WEBHOOK_CHECKSUM) {
    throw new AppError('INVALID_CHECKSUM', 'Checksum khong hop le.', 400);
  }

  const newStatus = String(status || '').toUpperCase();
  if (!['SUCCESS', 'FAILED'].includes(newStatus)) {
    throw new AppError('INVALID_STATUS', 'Status webhook khong hop le. Chi chap nhan: SUCCESS, FAILED.', 400);
  }

  // 2. Lấy transaction
  const transaction = await transactionRepository.findTransactionById(transaction_id);
  if (!transaction) {
    throw new AppError('TRANSACTION_NOT_FOUND', 'Giao dich khong ton tai.', 404);
  }

  // 3. Idempotency: đã xử lý rồi thì bỏ qua
  if (transaction.status !== 'PENDING') {
    return { transaction, idempotent: true };
  }

  // 4. Cập nhật transaction + deposit + room trong 1 DB transaction
  const updated = await transactionRepository.processWebhookUpdate(
    transaction_id,
    newStatus,
    {
      deposit_id: transaction.deposit_id,
      room_id: transaction.room_id,
    },
  );

  // Gửi thông báo cho Host nếu thanh toán thành công
  if (newStatus === 'SUCCESS') {
    try {
      const notificationService = require('../guest/notificationService');
      await notificationService.createNotification(
        transaction.landlord_id,
        'Yêu cầu duyệt đặt cọc mới',
        `Phòng "${transaction.room_title}" đã được thanh toán tiền cọc thành công. Vui lòng phê duyệt hoặc từ chối đơn đặt cọc.`,
        'DEPOSIT',
      );
    } catch (err) {
      console.error('Loi gui thong bao cho Host sau webhook SUCCESS:', err);
    }
  }

  return { transaction: updated, idempotent: false };
}

/**
 * Lấy chi tiết 1 giao dịch.
 * Tenant chỉ xem của mình; Landlord xem giao dịch phòng của mình; Admin xem tất cả.
 *
 * @param {object} user
 * @param {string} transactionId
 * @returns {Promise<object>}
 */
async function getTransactionDetail(user, transactionId) {
  const transaction = await transactionRepository.findTransactionById(transactionId);
  if (!transaction) {
    throw new AppError('TRANSACTION_NOT_FOUND', 'Giao dich khong ton tai.', 404);
  }

  const role = String(user.role || '').toUpperCase();
  if (role === 'TENANT' && transaction.tenant_id !== user.userId) {
    throw new AppError('FORBIDDEN', 'Ban khong co quyen xem giao dich nay.', 403);
  }
  if (role === 'LANDLORD' && transaction.landlord_id !== user.userId) {
    throw new AppError('FORBIDDEN', 'Ban khong co quyen xem giao dich nay.', 403);
  }

  return transaction;
}

/**
 * Tenant xem lịch sử giao dịch của mình.
 *
 * @param {object} user
 * @param {object} query
 * @returns {Promise<{ items, total }>}
 */
async function listMyTransactions(user, query) {
  const page = parsePositiveInt(query.page, 1);
  const limit = Math.min(parsePositiveInt(query.limit, 20), 50);
  const status = query.status ? String(query.status).toUpperCase() : undefined;

  return transactionRepository.findTransactionsByTenant(user.userId, { status, page, limit });
}

/**
 * Admin xem toàn bộ giao dịch (read-only).
 *
 * @param {object} query
 * @returns {Promise<{ items, total }>}
 */
async function listAllTransactions(query) {
  const page = parsePositiveInt(query.page, 1);
  const limit = Math.min(parsePositiveInt(query.limit, 20), 100);
  const status = query.status ? String(query.status).toUpperCase() : undefined;
  const paymentMethod = query.payment_method
    ? String(query.payment_method).toUpperCase()
    : undefined;

  return transactionRepository.findAllTransactions({ status, paymentMethod, page, limit });
}

module.exports = {
  createTransaction,
  processWebhook,
  getTransactionDetail,
  listMyTransactions,
  listAllTransactions,
  VALID_PAYMENT_METHODS,
};
