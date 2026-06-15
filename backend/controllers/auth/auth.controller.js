const authService = require('../../services/auth/auth.service');
const { sendSuccess } = require('../../utils/responseHelper');

/**
 * Read the client IP, honouring X-Forwarded-For when behind a trusted proxy.
 */
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip;
}

/**
 * POST /api/auth/register
 * Tạo tài khoản TENANT (INACTIVE) và gửi OTP qua email.
 */
async function register(req, res, next) {
  try {
    // req.body đã validate + normalize (lowercase email/username) bởi registerSchema.
    const { fullName, username, email, phoneNumber, password } = req.body;

    const { user, otpExpiresInSeconds } = await authService.register({
      fullName,
      username,
      email,
      phoneNumber,
      password,
    });

    return sendSuccess(res, {
      status: 201,
      message: 'Đăng ký thành công. Vui lòng kiểm tra email để nhận mã OTP.',
      data: { ...user, otpExpiresInSeconds },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/auth/verify-otp
 * Xác thực OTP đăng ký → kích hoạt tài khoản.
 */
async function verifyOtp(req, res, next) {
  try {
    const { email, otp } = req.body;

    const data = await authService.verifyOtp({ email, otp });

    return sendSuccess(res, {
      status: 200,
      message: 'Xác thực OTP thành công. Tài khoản đã được kích hoạt.',
      data,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/auth/resend-otp
 * Gửi lại OTP đăng ký cho tài khoản đang chờ xác thực.
 */
async function resendOtp(req, res, next) {
  try {
    const { email } = req.body;

    const data = await authService.resendOtp({ email });

    return sendSuccess(res, {
      status: 200,
      message: 'Mã OTP mới đã được gửi.',
      data,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/auth/login
 * Validates input, delegates to the service, and returns the token pair.
 */
async function login(req, res, next) {
  try {
    // req.body đã được validate + trim bởi validate({ body: loginSchema }).
    const { identifier, password } = req.body;

    const { user, tokens } = await authService.login({
      identifier,
      password,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });

    return sendSuccess(res, {
      status: 200,
      message: 'Đăng nhập thành công.',
      data: { ...tokens, user },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/auth/refresh
 * Exchanges a refresh token for a new access token.
 */
async function refresh(req, res, next) {
  try {
    // req.body đã được validate + trim bởi validate({ body: refreshSchema }).
    const { refreshToken } = req.body;

    const tokens = await authService.refreshAccessToken({ refreshToken });

    return sendSuccess(res, {
      status: 200,
      message: 'Cấp lại access token thành công.',
      data: tokens,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/auth/logout
 * Thu hồi refresh token của phiên (hard-delete). Idempotent.
 * userId lấy từ req.user (requireAuth); refreshToken lấy từ body đã validate.
 */
async function logout(req, res, next) {
  try {
    const { refreshToken } = req.body;

    await authService.logout({ userId: req.user.userId, refreshToken });

    return sendSuccess(res, {
      status: 200,
      message: 'Đăng xuất thành công.',
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/auth/me
 * Returns the authenticated user's public profile. The UUID is taken from
 * req.user.userId, which requireAuth extracted from the access token.
 */
async function getMe(req, res, next) {
  try {
    const user = await authService.getCurrentUser(req.user.userId);

    return sendSuccess(res, {
      status: 200,
      message: 'Lấy thông tin người dùng thành công.',
      data: { user },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  register,
  verifyOtp,
  resendOtp,
  login,
  refresh,
  logout,
  getMe,
};
