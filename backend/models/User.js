const { z } = require('zod');

/**
 * Model User = Request schema (Zod) cho các endpoint auth.
 * Vì dự án dùng Knex (không ORM), "model" KHÔNG phải class ánh xạ bảng:
 * truy vấn vẫn nằm ở repositories/, ở đây chỉ định nghĩa shape input.
 *
 * Ghi chú: DTO (toPublicUser) tạm để trong service vì hiện chỉ auth.service dùng.
 * Khi có ≥2 nơi cùng trả User ra API (vd admin/host/guest profile), hãy nâng DTO
 * lên file này để tránh lệch field — xem convention-model-validate.md mục 5.
 */

// ---- Request schemas ----

// POST /api/auth/register
const usernameRegex = /^[a-z][a-z0-9_.]{2,49}$/;
const phoneRegex = /^0\d{9}$/;
// >=8 ký tự, có chữ hoa, chữ thường, số, ký tự đặc biệt.
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const registerSchema = z
  .object({
    fullName: z
      .string({ error: 'Vui lòng nhập họ tên.' })
      .trim()
      .min(1, 'Vui lòng nhập họ tên.')
      .max(255, 'Họ tên tối đa 255 ký tự.'),
    username: z
      .string({ error: 'Vui lòng nhập tên đăng nhập.' })
      .trim()
      .toLowerCase()
      .regex(usernameRegex, 'Tên đăng nhập 3–50 ký tự, bắt đầu bằng chữ thường, chỉ gồm chữ thường/số/`_`/`.`'),
    email: z
      .string({ error: 'Vui lòng nhập email.' })
      .trim()
      .toLowerCase()
      .email('Email không hợp lệ.'),
    phoneNumber: z
      .string({ error: 'Vui lòng nhập số điện thoại.' })
      .trim()
      .regex(phoneRegex, 'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0.'),
    password: z
      .string({ error: 'Vui lòng nhập mật khẩu.' })
      .regex(passwordRegex, 'Mật khẩu tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.'),
    confirmPassword: z.string({ error: 'Vui lòng xác nhận mật khẩu.' }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Xác nhận mật khẩu không khớp.',
    path: ['confirmPassword'],
  });

// POST /api/auth/verify-otp
const verifyOtpSchema = z.object({
  email: z.string({ error: 'Vui lòng nhập email.' }).trim().toLowerCase().email('Email không hợp lệ.'),
  otp: z
    .string({ error: 'Vui lòng nhập mã OTP.' })
    .trim()
    .regex(/^\d{6}$/, 'Mã OTP gồm 6 chữ số.'),
});

// POST /api/auth/resend-otp
const resendOtpSchema = z.object({
  email: z.string({ error: 'Vui lòng nhập email.' }).trim().toLowerCase().email('Email không hợp lệ.'),
  purpose: z
    .enum(['REGISTRATION', 'PASSWORD_RESET'], { error: 'purpose chỉ hỗ trợ REGISTRATION hoặc PASSWORD_RESET.' })
    .default('REGISTRATION'),
});

// POST /api/auth/forgot-password
const forgotPasswordSchema = z.object({
  email: z.string({ error: 'Vui lòng nhập email.' }).trim().toLowerCase().email('Email không hợp lệ.'),
});

// POST /api/auth/reset-password
const resetPasswordSchema = z
  .object({
    email: z.string({ error: 'Vui lòng nhập email.' }).trim().toLowerCase().email('Email không hợp lệ.'),
    otp: z
      .string({ error: 'Vui lòng nhập mã OTP.' })
      .trim()
      .regex(/^\d{6}$/, 'Mã OTP gồm 6 chữ số.'),
    newPassword: z
      .string({ error: 'Vui lòng nhập mật khẩu mới.' })
      .regex(passwordRegex, 'Mật khẩu tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.'),
    confirmPassword: z.string({ error: 'Vui lòng xác nhận mật khẩu.' }),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Xác nhận mật khẩu không khớp.',
    path: ['confirmPassword'],
  });

// POST /api/auth/oauth/:provider  (provider lấy từ params, validate ở controller)
const oauthLoginSchema = z.object({
  code: z.string({ error: 'Thiếu mã uỷ quyền.' }).trim().min(1, 'Thiếu mã uỷ quyền.'),
  redirectUri: z.string({ error: 'Thiếu redirectUri.' }).trim().url('redirectUri không hợp lệ.'),
});

// POST /api/auth/login
// Đặt `error` ở cấp string để khi field thiếu/sai kiểu vẫn ra message tiếng Việt
// (nếu chỉ để ở .min thì Zod báo lỗi kiểu mặc định trước khi tới .min).
const loginSchema = z.object({
  identifier: z.string({ error: 'Vui lòng nhập tài khoản.' }).trim().min(1, 'Vui lòng nhập tài khoản.'),
  password: z.string({ error: 'Vui lòng nhập mật khẩu.' }).min(1, 'Vui lòng nhập mật khẩu.'),
});

// POST /api/auth/refresh
const refreshSchema = z.object({
  refreshToken: z.string({ error: 'Thiếu refresh token.' }).trim().min(1, 'Thiếu refresh token.'),
});

// POST /api/auth/logout
const logoutSchema = z.object({
  refreshToken: z.string({ error: 'Thiếu refresh token.' }).trim().min(1, 'Thiếu refresh token.'),
});

// ---- Response DTO ----

/**
 * Shape dữ liệu user trả về sau khi đăng ký (map snake_case -> camelCase).
 *
 * @param {object} user user row vừa tạo
 * @returns {object}
 */
function toRegisterResponse(user) {
  return {
    userId: user.user_id,
    username: user.username,
    email: user.email,
    phoneNumber: user.phone_number,
    status: user.status,
  };
}

module.exports = {
  registerSchema,
  verifyOtpSchema,
  resendOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  oauthLoginSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
  toRegisterResponse,
};
