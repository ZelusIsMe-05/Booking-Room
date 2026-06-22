const express = require('express');
const router = express.Router();
const transactionController = require('../../controllers/payment/transactionController');
const { requireAuth } = require('../../middlewares/authMiddleware');
const { authorizeRoles } = require('../../middlewares/roleMiddleware');

/**
 * Payment / Transaction routes.
 * Mounted at: /api/payments
 */

// POST /api/payments/transactions — Tenant tạo giao dịch thanh toán
router.post(
  '/transactions',
  requireAuth,
  authorizeRoles('TENANT'),
  transactionController.createTransaction,
);

// POST /api/payments/webhook — Public (mock gateway callback), idempotent
router.post('/webhook', transactionController.processWebhook);

// GET /api/payments/vnpay/ipn — Public IPN callback from VNPAY
router.get('/vnpay/ipn', transactionController.vnpayIpn);

// GET /api/payments/vnpay/verify — Public verification of transaction status
router.get('/vnpay/verify', transactionController.vnpayVerify);

// GET /api/payments/transactions/my — Tenant xem lịch sử giao dịch của mình
// IMPORTANT: /my đứng TRƯỚC /:id để tránh bị parse nhầm
router.get(
  '/transactions/my',
  requireAuth,
  authorizeRoles('TENANT'),
  transactionController.listMyTransactions,
);

// GET /api/payments/transactions/:id — Tenant / Landlord / Admin xem chi tiết giao dịch
router.get('/transactions/:id', requireAuth, transactionController.getTransactionDetail);

module.exports = router;
