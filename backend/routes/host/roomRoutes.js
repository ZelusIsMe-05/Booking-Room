const express = require('express');
const router = express.Router();

const { requireAuth } = require('../../middlewares/authMiddleware');
const roomController = require('../../controllers/host/roomController');
const { uploadRoomImages } = require('../../middlewares/uploadMiddleware');

// Host: list own rooms
router.get('/my', requireAuth, roomController.listMyRooms);

// Host: create a room (multipart images in field `images`)
router.post('/', requireAuth, uploadRoomImages, roomController.createRoom);

// Host: update room (supports multipart images in field `images`)
router.patch('/:roomId', requireAuth, uploadRoomImages, roomController.updateRoom);

// Host: delete room
router.delete('/:roomId', requireAuth, roomController.deleteRoom);

// Host: update status (e.g., PENDING -> APPROVED by admin normally)
router.patch('/:roomId/status', requireAuth, roomController.updateRoomStatus);

module.exports = router;
