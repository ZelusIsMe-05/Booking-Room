const express = require('express');
const router = express.Router();
const transactionController = require('../../controllers/payment/transactionController');
const depositController = require('../../controllers/booking/depositController');
const { requireAuth } = require('../../middlewares/authMiddleware');
const { authorizeRoles } = require('../../middlewares/roleMiddleware');

/**
 * Admin routes — Booking & Payment management.
 *
 * Mounted in app.js:
 *   app.use('/api/admin/bookings', bookingRoutes)  → expire-deposits
 *   app.use('/api/admin', bookingRoutes)            → /transactions
 */

// GET /api/admin/transactions — Admin xem toàn bộ giao dịch (read-only)
router.get(
  '/transactions',
  requireAuth,
  authorizeRoles('ADMIN'),
  transactionController.listAllTransactions,
);

// POST /api/admin/bookings/expire-deposits — Admin trigger expire thủ công
router.post(
  '/expire-deposits',
  requireAuth,
  authorizeRoles('ADMIN'),
  depositController.expireDeposits,
);

module.exports = router;
