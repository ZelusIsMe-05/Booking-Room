const express = require('express');
const router = express.Router();
const { requireAuth, authorize } = require('../../middlewares/authMiddleware');
const roomController = require('../../controllers/admin/roomController');

router.patch('/:roomId/approve', requireAuth, authorize('ADMIN'), roomController.approveRoom);
router.patch('/:roomId/reject', requireAuth, authorize('ADMIN'), roomController.rejectRoom);
router.get('/pending', requireAuth, authorize('ADMIN'), roomController.listPendingRooms);

module.exports = router;
