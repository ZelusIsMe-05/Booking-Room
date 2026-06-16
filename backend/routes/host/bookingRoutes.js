const express = require('express');
const router = express.Router();
const depositController = require('../../controllers/booking/depositController');
const { requireAuth } = require('../../middlewares/authMiddleware');
const { authorizeRoles } = require('../../middlewares/roleMiddleware');

/**
 * Host (Landlord) deposit management routes.
 * Mounted at: /api/host/bookings/deposits
 */

// GET /api/host/bookings/deposits — Landlord xem danh sách deposit cho phòng của mình
router.get('/', requireAuth, authorizeRoles('LANDLORD'), depositController.listDepositsForLandlord);

// PATCH /api/host/bookings/deposits/:id/status — Landlord xử lý deposit (CONFIRMED / CANCELLED)
router.patch(
  '/:id/status',
  requireAuth,
  authorizeRoles('LANDLORD'),
  depositController.updateDepositByLandlord,
);

module.exports = router;
