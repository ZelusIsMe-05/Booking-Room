const express = require('express');
const systemLogController = require('../../controllers/admin/systemLogController');
const { requireAuth } = require('../../middlewares/authMiddleware');
const { authorizeRoles } = require('../../middlewares/roleMiddleware');

const router = express.Router();

router.get('/', requireAuth, authorizeRoles('ADMIN'), systemLogController.listSystemLogs);

module.exports = router;
