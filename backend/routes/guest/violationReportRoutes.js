const express = require('express');
const router = express.Router();
const violationReportController = require('../../controllers/guest/violationReportController');
const { requireAuth } = require('../../middlewares/authMiddleware');
const upload = require('../../config/multer');

/**
 * Violation Report routes.
 * Mounted at: /api/violation-reports
 */

// All routes require authentication
router.use(requireAuth);

// GET /api/violation-reports/eligible-targets — Get target rooms/landlords that user can report
router.get('/eligible-targets', violationReportController.getEligibleTargets);

// POST /api/violation-reports — Create a new report
router.post('/', upload.single('evidence_image'), violationReportController.create);

// GET /api/violation-reports — List reports
router.get('/', violationReportController.list);

// GET /api/violation-reports/:id — View report details
router.get('/:id', violationReportController.detail);

module.exports = router;
