const express = require('express');
const authController = require('../../controllers/auth/authController');
const { requireAuth } = require('../../middlewares/authMiddleware');

const router = express.Router();

// POST /api/auth/login — authenticate and issue an access + refresh token pair.
router.post('/login', authController.login);

// POST /api/auth/refresh — exchange a refresh token for a new access token.
router.post('/refresh', authController.refresh);

// GET /api/auth/me — return the authenticated user's profile (requires access token).
router.get('/me', requireAuth, authController.getMe);

module.exports = router;
