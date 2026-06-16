# Report: Quên mật khẩu (Forgot / Reset password) + mở rộng resend-otp

Triển khai theo plan `1.8-forgot-password.md`. Tái dùng hạ tầng OTP Redis (`redis/otpStore.js`)
với purpose mới `PASSWORD_RESET`, tách biệt hoàn toàn với OTP đăng ký (`REGISTRATION`).

## Endpoint

| Method | Path | Mô tả |
| --- | --- | --- |
| POST | `/api/auth/forgot-password` | Gửi OTP `PASSWORD_RESET` cho user `ACTIVE`. Chống enumeration → **luôn `200`** |
| POST | `/api/auth/reset-password` | Verify OTP → đổi mật khẩu → thu hồi mọi refresh token + mở khóa account_security |
| POST | `/api/auth/resend-otp` | **Mở rộng**: nhận `purpose` = `REGISTRATION` \| `PASSWORD_RESET` |

## File liên quan (đều là **sửa**, không tạo file mới)

| File | Thay đổi |
| --- | --- |
| `backend/redis/otpStore.js` | Thêm `PASSWORD_RESET` vào `OTP_PURPOSE` |
| `backend/models/User.js` | Thêm `forgotPasswordSchema`, `resetPasswordSchema`; mở rộng `resendOtpSchema.purpose` → `enum(['REGISTRATION','PASSWORD_RESET'])` |
| `backend/repositories/auth/auth.repository.js` | Thêm `findActiveUserByEmail`, `updateUserPassword`, `deleteRefreshTokensByUser`, `resetAccountSecurity` |
| `backend/services/auth/auth.service.js` | Thêm helper `assertOtpValid` (dùng chung verify/reset), `forgotPassword`, `resetPassword`; `resendOtp` đa purpose; refactor `verifyOtp` dùng helper |
| `backend/controllers/auth/auth.controller.js` | Thêm `forgotPassword`, `resetPassword`; `resendOtp` truyền `purpose` |
| `backend/routes/auth/auth.route.js` | Thêm 2 route + `validate(...)` |

## Quy ước nghiệp vụ

- **Chống dò tài khoản:** `forgot-password` (và `resend-otp` purpose `PASSWORD_RESET`) luôn trả `200`, chỉ thực sự gửi mã khi email tồn tại + `ACTIVE` + không cooldown.
- **Consume trước khi đổi:** `DEL` key OTP **trước** khi cập nhật mật khẩu → chống double-submit.
- **Đổi mật khẩu = đăng xuất toàn bộ:** xóa hết phiên trong `refresh_tokens`; access token cũ tự hết hạn ≤15 phút. Reset `failed_login_attempts`/`locked_until` để đăng nhập lại ngay.
- **Tách theo purpose:** key OTP và cooldown đều gắn `purpose`, nên cùng một email có thể có OTP đăng ký và OTP reset độc lập, không đụng nhau.
- `reset-password` cần user `ACTIVE` (user đã chủ động nhập OTP từ email nên `404` khi không thấy là chấp nhận được).
- Mật khẩu mới dùng lại đúng `passwordRegex` của register.

## Map lỗi (giống cụm đăng ký)

| Tình huống | HTTP |
| --- | --- |
| OTP hết hạn / không còn key | `410` |
| OTP sai (còn lượt) | `400` + `data.remainingAttempts` |
| OTP sai quá `OTP_MAX_ATTEMPTS` | `429` |
| reset-password không thấy user ACTIVE | `404` |
| confirm không khớp / sai định dạng | `400` (`VALIDATION_ERROR`) |

## Kiểm thử

- ✅ **Smoke-load**: `node -e "require(...)"` nạp toàn bộ route/model/service/repository/otpStore → `OK: all modules load` (không lỗi wiring/cú pháp).
- ⏳ **Postman / e2e**: chưa chạy. Checklist test ở `1.8-forgot-password.md` §9. Các case chính:

| Case | Kỳ vọng |
| --- | --- |
| forgot-password email ACTIVE | `200`, key `otp:PASSWORD_RESET:{email}` vào Redis, email gửi |
| forgot-password email không tồn tại / INACTIVE | `200` (message chung, không gửi) |
| forgot-password gọi lại <60s | `200` (cooldown, không gửi lại) |
| reset-password OTP đúng | `200`, mật khẩu đổi, `refresh_tokens` của user bị xóa hết |
| reset-password OTP sai / hết hạn / quá số lần | `400`+remaining / `410` / `429` |
| reset-password confirm không khớp | `400` |
| login mật khẩu mới sau reset | `200`; mật khẩu cũ → `401` |
| refresh token cũ sau reset | `401` (đã thu hồi) |
| resend-otp purpose=PASSWORD_RESET | `200`, OTP mới |

## Ghi chú / việc còn lại

- Endpoint cần chạy Postman trên Redis (Upstash) + Neon thật để chốt như cụm đăng ký 1.1–1.3.
- Email gửi **đồng bộ** (giống register) — có thể chuyển async/queue sau.
- `users.updated_at` chưa có cột (migration 024 hoãn) → đổi mật khẩu không stamp thời điểm; cân nhắc khi làm cleanup 1.7.
