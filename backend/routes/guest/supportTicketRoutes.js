const express = require('express');
const router = express.Router();
const supportTicketController = require('../../controllers/guest/supportTicketController');
const { requireAuth } = require('../../middlewares/authMiddleware');
const upload = require('../../config/multer');

/**
 * Support Ticket routes.
 * Mounted at: /api/support-tickets
 */

// All routes require authentication
router.use(requireAuth);

// POST /api/support-tickets — Create a new ticket
router.post('/', upload.single('evidence_image'), supportTicketController.create);

// GET /api/support-tickets — List tickets
router.get('/', supportTicketController.list);

// GET /api/support-tickets/:id — View ticket details
router.get('/:id', supportTicketController.detail);

// PATCH /api/support-tickets/:id/cancel — Cancel a ticket
router.patch('/:id/cancel', supportTicketController.cancel);

module.exports = router;
