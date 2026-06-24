const express = require('express');
const router = express.Router();
const { requireAuth, authorize } = require('../../middlewares/authMiddleware');
const revenueController = require('../../controllers/host/revenueController');

/**
 * Host revenue routes. Mounted at /api/host/revenue.
 */

// KPI summary + 6-month trend for a range (month|quarter|year).
router.get('/overview', requireAuth, authorize('LANDLORD'), revenueController.getOverview);

// Paginated settlement detail rows.
router.get('/settlements', requireAuth, authorize('LANDLORD'), revenueController.listSettlements);

// Export settlement rows as CSV.
router.get('/export', requireAuth, authorize('LANDLORD'), revenueController.exportSettlements);

module.exports = router;
