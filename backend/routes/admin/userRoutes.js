const express = require('express');
const userController = require('../../controllers/admin/userController');
const { requireAuth } = require('../../middlewares/authMiddleware');
const { authorizeRoles } = require('../../middlewares/roleMiddleware');

const router = express.Router();

router.use(requireAuth, authorizeRoles('ADMIN'));

router.get('/', userController.listUsers);
router.get('/:id', userController.getUserDetail);
router.patch('/:id/lock', userController.lockUser);
router.patch('/:id/unlock', userController.unlockUser);
router.patch('/:id/role', userController.updateUserRole);
router.post('/:id/password-reset', userController.resetUserPassword);
router.patch('/:id/approve', userController.approveLandlord);
router.patch('/:id/reject', userController.rejectLandlord);

module.exports = router;
