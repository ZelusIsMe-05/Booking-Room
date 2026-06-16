# Report: Cụm Đăng ký (Register + Verify OTP + Resend OTP)

Triển khai 3 endpoint theo plan `1.1`/`1.2`/`1.3` + `1.1-2-3-full-plan-regist.md`.
OTP lưu **Redis** (plaintext, TTL 300s), email-only, gửi qua **SMTP (Gmail)** — dev fallback log console.

## Endpoint

| Method | Path | Mô tả |
| --- | --- | --- |
| POST | `/api/auth/register` | Tạo user TENANT `INACTIVE` (+tenant +account_security) trong transaction → set OTP Redis → gửi email |
| POST | `/api/auth/verify-otp` | So OTP → `ACTIVE`, xóa key (consume) |
| POST | `/api/auth/resend-otp` | Cooldown 60s → ghi đè OTP mới → gửi email |

## File liên quan

### Tạo mới
| File | Vai trò |
| --- | --- |
| `backend/redis/redisClient.js` | Client ioredis singleton (từ `REDIS_URL`) |
| `backend/redis/otpStore.js` | Thao tác OTP trên Redis: `generateOtp`, `setOtp`, `verifyOtp`, `incrAttempts`, `deleteOtp`, `setResendCooldown`, `isOnCooldown`, `OTP_PURPOSE` |
| `backend/utils/mailer.js` | `sendOtpEmail` qua SMTP; thiếu SMTP → log console (dev) |

### Sửa
| File | Thay đổi |
| --- | --- |
| `backend/config/env.js` | Thêm `env.redis`, `env.otp`, `env.smtp` |
| `backend/models/User.js` | `registerSchema`, `verifyOtpSchema`, `resendOtpSchema` (Zod) + DTO `toRegisterResponse` |
| `backend/repositories/auth/auth.repository.js` | `getRoleIdByName`, `findUserByEmailPhoneUsername`, `createTenantUser` (transaction), `findInactiveUserByEmail`, `findUserByEmail`, `activateUser` |
| `backend/services/auth/auth.service.js` | `register`, `verifyOtp`, `resendOtp` |
| `backend/controllers/auth/auth.controller.js` | `register`, `verifyOtp`, `resendOtp` |
| `backend/routes/auth/auth.route.js` | 3 route + `validate(...)` |
| `backend/package.json` | Thêm `ioredis`, `nodemailer` |

## Env cần thiết (`backend/.env`)
```
REDIS_URL=rediss://...            # bắt buộc (đã cấu hình Upstash)
OTP_TTL_SECONDS=300               # optional, default 300
OTP_MAX_ATTEMPTS=3                # optional, default 3
OTP_RESEND_COOLDOWN_SECONDS=60    # optional, default 60
SMTP_HOST=smtp.gmail.com          # bỏ trống => dev mode log OTP ra console
SMTP_PORT=587
SMTP_USER=<gmail>
SMTP_PASS=<app-password 16 ký tự, không dấu cách>
SMTP_FROM=BookingRoom <gmail>
```

## Quy ước nghiệp vụ
- `username` user tự đặt (normalize lowercase, regex `^[a-z][a-z0-9_.]{2,49}$`).
- `phoneNumber` lưu (unique) nhưng **không xác thực SMS**; chỉ email xác thực OTP.
- `identifier` của OTP = email normalize (trim + lowercase).
- Redis không phân biệt "hết hạn" vs "chưa có" → INACTIVE + không key ⇒ `410`.
- Verify: consume key (`DEL`) **trước** rồi activate → chống double-submit.

## Kết quả test (Redis Upstash + Neon thật)

### Register
| Case | Kết quả |
| --- | --- |
| Hợp lệ | `201`, user `INACTIVE`, OTP vào Redis (TTL ~300), email gửi OK |
| Trùng email/phone/username | `409` |
| Sai dữ liệu | `400` + `data.errors` |
| Gửi email thật (Gmail) | ✅ nhận OTP trong hộp thư |

### Verify OTP
| Case | Kết quả |
| --- | --- |
| Sai lần 1/2 | `400` + `remainingAttempts` 2→1 |
| Sai lần 3 | `429` (khóa) |
| OTP đúng sau khi khóa | `429` (không cho qua) |
| OTP đúng | `200`, user `ACTIVE`, key Redis bị xóa |
| Verify lại khi đã active | `404` |
| Login sau active | `200` đăng nhập được |

### Resend OTP
| Case | Kết quả |
| --- | --- |
| Resend hợp lệ | `200`, OTP mới khác OTP cũ |
| Resend ngay lại (cooldown) | `429` |
| Email không tồn tại | `404` |
| Resend khi đã active | `409` |

## Ghi chú / việc còn lại
- **Migration `024`** (`users.created_at/updated_at/verified_at`) **chưa làm** — hoãn sang cleanup `1.7`. Hệ quả: user `INACTIVE` chưa verify giữ email/username/phone đến khi có cleanup.
- Register gửi email **đồng bộ** (~5s/lần với Gmail). Có thể chuyển async/queue sau nếu cần nhanh.
- Lệch migration ledger nhánh `thai` vs DB chung (thiếu `021/022` enums) — cần đồng bộ với team trước khi chạy `npm run migrate`.
- Sửa nốt `SMTP_FROM` trong `.env` (bỏ dấu `'` thừa) nếu chưa.
