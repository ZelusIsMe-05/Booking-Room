const express = require('express');
const userController = require('../../controllers/admin/userController');
const { requireAuth } = require('../../middlewares/authMiddleware');
const { authorizeRoles } = require('../../middlewares/roleMiddleware');

const router = express.Router();

router.use(requireAuth, authorizeRoles('ADMIN'));

// Danh sách hồ sơ chủ nhà (lọc theo ?status=PENDING|APPROVED|REJECTED)
router.get('/', userController.listLandlords);

// Chi tiết hồ sơ chủ nhà
router.get('/:id', userController.getLandlordDetail);

// Stream ảnh CCCD (side = front|back) — chỉ Admin, thay cho serve tĩnh public
router.get('/:id/id-card/:side', userController.getLandlordIdCard);

// Duyệt / từ chối hồ sơ
router.patch('/:id/approve', userController.approveLandlord);
router.patch('/:id/reject', userController.rejectLandlord);

module.exports = router;
