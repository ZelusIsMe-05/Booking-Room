const express = require('express');
const router = express.Router();
const { requireAuth, authorize, requireApprovedLandlord } = require('../../middlewares/authMiddleware');
const roomController = require('../../controllers/host/roomController');
const { uploadRoomImages } = require('../../middlewares/uploadMiddleware');

// Host: list own rooms (cho phép cả landlord chưa duyệt xem danh sách + trạng thái)
router.get('/my', requireAuth, authorize('LANDLORD'), roomController.listMyRooms);

// Host: business overview / dashboard aggregates (counts, avg rating, revenue, top rooms)
router.get('/overview', requireAuth, authorize('LANDLORD'), roomController.getOverview);

// Host: create a room (multipart images in field `images`) — yêu cầu đã được duyệt
router.post('/', requireAuth, authorize('LANDLORD'), requireApprovedLandlord, uploadRoomImages, roomController.createRoom);

// Host: update room (supports multipart images in field `images`) — yêu cầu đã được duyệt
router.patch('/:roomId', requireAuth, authorize('LANDLORD'), requireApprovedLandlord, uploadRoomImages, roomController.updateRoom);

// Host: delete room — yêu cầu đã được duyệt
router.delete('/:roomId', requireAuth, authorize('LANDLORD'), requireApprovedLandlord, roomController.deleteRoom);

// Host: update status (e.g., PENDING -> APPROVED by admin normally) — yêu cầu đã được duyệt
router.patch('/:roomId/status', requireAuth, authorize('LANDLORD'), requireApprovedLandlord, roomController.updateRoomStatus);

module.exports = router;
