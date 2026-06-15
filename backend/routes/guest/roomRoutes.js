const express = require('express');
const roomController = require('../../controllers/guest/roomController');
const { optionalAuthenticate } = require('../../middlewares/authMiddleware');

const router = express.Router();

router.get('/', roomController.listRooms);
router.get('/:id', optionalAuthenticate, roomController.getRoomById);

module.exports = router;
