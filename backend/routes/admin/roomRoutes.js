const express = require('express');
const roomController = require('../../controllers/admin/roomController');
const { requireAuth } = require('../../middlewares/authMiddleware');
const { authorizeRoles } = require('../../middlewares/roleMiddleware');

const router = express.Router();

router.get('/pending', requireAuth, authorizeRoles('ADMIN'), roomController.listPendingRooms);
router.patch('/:id/approve', requireAuth, authorizeRoles('ADMIN'), roomController.approveRoom);
router.patch('/:id/reject', requireAuth, authorizeRoles('ADMIN'), roomController.rejectRoom);

module.exports = router;
