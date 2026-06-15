const express = require('express');
const roomController = require('../../controllers/host/roomController');
const { authenticate } = require('../../middlewares/authMiddleware');
const { authorizeRoles } = require('../../middlewares/roleMiddleware');

const router = express.Router();

router.post('/', authenticate, authorizeRoles('LANDLORD'), roomController.createRoom);
router.get('/my', authenticate, authorizeRoles('LANDLORD'), roomController.listMyRooms);
router.patch('/:id', authenticate, authorizeRoles('LANDLORD'), roomController.updateRoom);
router.delete('/:id', authenticate, authorizeRoles('LANDLORD'), roomController.deleteRoom);

module.exports = router;
