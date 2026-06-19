const express = require('express');
const router = express.Router();
const supportTicketController = require('../../controllers/admin/supportTicketController');
const { requireAuth } = require('../../middlewares/authMiddleware');
const { authorizeRoles } = require('../../middlewares/roleMiddleware');

/**
 * Admin Support Ticket routes.
 * Mounted at: /api/admin/support-tickets
 */

router.use(requireAuth, authorizeRoles('ADMIN'));

// GET /api/admin/support-tickets/stats — Summary statistics
router.get('/stats', supportTicketController.getTicketStats);

// GET /api/admin/support-tickets — List all tickets with filters & pagination
router.get('/', supportTicketController.listTickets);

// GET /api/admin/support-tickets/:id — Get ticket detail
router.get('/:id', supportTicketController.getTicketDetail);

// PATCH /api/admin/support-tickets/:id/status — Update ticket status
router.patch('/:id/status', supportTicketController.updateTicketStatus);

module.exports = router;
