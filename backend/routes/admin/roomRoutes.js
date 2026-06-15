const express = require('express');
const roomController = require('../../controllers/admin/roomController');
const { authenticate } = require('../../middlewares/authMiddleware');
const { authorizeRoles } = require('../../middlewares/roleMiddleware');

const router = express.Router();

router.get('/pending', authenticate, authorizeRoles('ADMIN'), roomController.listPendingRooms);
router.patch('/:id/approve', authenticate, authorizeRoles('ADMIN'), roomController.approveRoom);
router.patch('/:id/reject', authenticate, authorizeRoles('ADMIN'), roomController.rejectRoom);

module.exports = router;
