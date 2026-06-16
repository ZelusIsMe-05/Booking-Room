const express = require('express');
const roomController = require('../../controllers/host/roomController');
const { requireAuth } = require('../../middlewares/authMiddleware');
const { authorizeRoles } = require('../../middlewares/roleMiddleware');

const router = express.Router();

router.post('/', requireAuth, authorizeRoles('LANDLORD'), roomController.createRoom);
router.get('/my', requireAuth, authorizeRoles('LANDLORD'), roomController.listMyRooms);
router.patch('/:id', requireAuth, authorizeRoles('LANDLORD'), roomController.updateRoom);
router.delete('/:id', requireAuth, authorizeRoles('LANDLORD'), roomController.deleteRoom);

module.exports = router;
