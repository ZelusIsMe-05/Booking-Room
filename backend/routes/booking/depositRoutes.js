const express = require('express');
const router = express.Router();
const depositController = require('../../controllers/booking/depositController');
const { requireAuth } = require('../../middlewares/authMiddleware');
const { authorizeRoles } = require('../../middlewares/roleMiddleware');

/**
 * Booking/Deposit routes — Tenant-facing.
 * Mounted at: /api/bookings/deposits
 */

// POST /api/bookings/deposits — Tenant tạo đơn đặt cọc
router.post('/', requireAuth, authorizeRoles('TENANT'), depositController.createDeposit);

// GET /api/bookings/deposits/my — Tenant xem danh sách deposit của mình
// IMPORTANT: route /my phải đứng TRƯỚC /:id để tránh bị "my" parse thành depositId
router.get('/my', requireAuth, authorizeRoles('TENANT'), depositController.listMyDeposits);

// GET /api/bookings/deposits/active — Lấy deposit dang hoat dong cua tenant cho 1 phong
router.get('/active', requireAuth, authorizeRoles('TENANT'), depositController.getActiveDeposit);

// POST /api/bookings/deposits/expire-overdue — Trigger expire các đơn đặt cọc quá hạn (public)
router.post('/expire-overdue', depositController.expireDeposits);

// GET /api/bookings/deposits/:id — Tenant / Landlord / Admin xem chi tiết
router.get('/:id', requireAuth, depositController.getDepositDetail);

// PATCH /api/bookings/deposits/:id/cancel — Tenant hủy đơn
router.patch('/:id/cancel', requireAuth, authorizeRoles('TENANT'), depositController.cancelDeposit);

module.exports = router;
