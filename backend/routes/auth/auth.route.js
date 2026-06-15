const express = require('express');
const authController = require('../../controllers/auth/auth.controller');
const { requireAuth } = require('../../middlewares/authMiddleware');
const { validate } = require('../../middlewares/validateMiddleware');
const {
  registerSchema,
  verifyOtpSchema,
  resendOtpSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
} = require('../../models/User');

const router = express.Router();

// POST /api/auth/register — create a TENANT account (INACTIVE) and send an OTP.
router.post('/register', validate({ body: registerSchema }), authController.register);

// POST /api/auth/verify-otp — verify the registration OTP and activate the account.
router.post('/verify-otp', validate({ body: verifyOtpSchema }), authController.verifyOtp);

// POST /api/auth/resend-otp — resend a new registration OTP (with cooldown).
router.post('/resend-otp', validate({ body: resendOtpSchema }), authController.resendOtp);

// POST /api/auth/login — authenticate and issue an access + refresh token pair.
router.post('/login', validate({ body: loginSchema }), authController.login);

// POST /api/auth/refresh — exchange a refresh token for a new access token.
router.post('/refresh', validate({ body: refreshSchema }), authController.refresh);

// POST /api/auth/logout — revoke (hard-delete) the refresh token session.
router.post('/logout', requireAuth, validate({ body: logoutSchema }), authController.logout);

// GET /api/auth/me — return the authenticated user's profile (requires access token).
router.get('/me', requireAuth, authController.getMe);

module.exports = router;
