const express = require('express');
const router = express.Router();
const violationReportController = require('../../controllers/admin/violationReportController');
const { requireAuth } = require('../../middlewares/authMiddleware');
const { authorizeRoles } = require('../../middlewares/roleMiddleware');

/**
 * Admin Violation Report (Complaints) routes.
 * Mounted at: /api/admin/violation-reports
 */

router.use(requireAuth, authorizeRoles('ADMIN'));

// GET /api/admin/violation-reports/stats — Summary statistics
router.get('/stats', violationReportController.getReportStats);

// GET /api/admin/violation-reports — List all reports with filters & pagination
router.get('/', violationReportController.listReports);

// GET /api/admin/violation-reports/:id — Get report detail
router.get('/:id', violationReportController.getReportDetail);

// PATCH /api/admin/violation-reports/:id/status — Update report status
router.patch('/:id/status', violationReportController.updateReportStatus);

module.exports = router;
