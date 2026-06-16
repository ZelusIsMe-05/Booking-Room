# Day 2 — Đăng ký + OTP (Redis) cho AI agent / dev module khác

Cụm đăng ký: `register → verify-otp → resend-otp`. OTP lưu **Redis** (plaintext, TTL 300s),
email-only, gửi qua SMTP (thiếu SMTP → log console). Đọc file nguồn khi cần chi tiết.

## Muốn làm gì thì đọc file nào

| Mục đích | File |
| --- | --- |
| Thao tác OTP trên Redis (set/verify/attempts/cooldown) | `backend/redis/otpStore.js` |
| Client Redis dùng chung | `backend/redis/redisClient.js` |
| Gửi email OTP (dev fallback console) | `backend/utils/mailer.js` |
| Logic register / verify / resend | `backend/services/auth/auth.service.js` |
| Schema validate + DTO | `backend/models/User.js` |
| Truy vấn DB (tạo user, kích hoạt...) | `backend/repositories/auth/auth.repository.js` |
| Cấu hình Redis/OTP/SMTP | `backend/config/env.js` + `backend/.env` |
| Đặc tả endpoint | `thai/plan/1.1-register.md`, `1.2-verify-otp.md`, `1.3-resend-otp.md` |
| Report tổng hợp | `thai/plan/report-regist.md` |

## Endpoint mới

| Method | Path | Auth | Body |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | Không | `fullName, username, email, phoneNumber, password, confirmPassword` |
| POST | `/api/auth/verify-otp` | Không | `email, otp` |
| POST | `/api/auth/resend-otp` | Không | `email, purpose=REGISTRATION` |

## Tái dùng OTP cho mục đích khác (password reset, đổi email...)

Đừng tự dựng lại — dùng `redis/otpStore.js`:

```js
const otpStore = require('../redis/otpStore');
const purpose = otpStore.OTP_PURPOSE.REGISTRATION; // thêm purpose mới vào OTP_PURPOSE khi cần

const code = otpStore.generateOtp();                       // 6 số
await otpStore.setOtp({ purpose, identifier: email, code }); // HSET + EXPIRE(TTL)
const r = await otpStore.verifyOtp({ purpose, identifier: email, code }); // { status, attempts }
// status: 'OK' | 'WRONG' | 'EXPIRED' | 'LOCKED'
await otpStore.incrAttempts({ purpose, identifier: email });
await otpStore.deleteOtp({ purpose, identifier: email });   // consume
await otpStore.setResendCooldown({ purpose, identifier: email });
await otpStore.isOnCooldown({ purpose, identifier: email });
```

- `identifier` = email **normalize** (trim + lowercase) — phải nhất quán mọi flow.
- Key Redis: `otp:{purpose}:{identifier}`; cooldown: `otp:cooldown:{purpose}:{identifier}`.

## Gửi email

```js
const { sendOtpEmail } = require('../utils/mailer');
await sendOtpEmail({ to: email, code, purpose });
// Thiếu SMTP_HOST/USER/PASS trong .env => log "[MAILER:DEV] ... otp=xxxxxx" ra console.
```

## Quy ước (giống Day 1)

- Layering `route → controller → service → repository`; OTP/Redis qua `redis/otpStore.js`.
- Validate ở route bằng `validate({ body: <schema> })` (`models/User.js`), không check tay trong controller.
- Lỗi nghiệp vụ: `throw new AppError(code, message, status, data?)`.
- Response qua `sendSuccess`/`sendError`.
- Map lỗi OTP: hết hạn/không key → `410`; sai → `400` + `remainingAttempts`; quá số lần → `429`.
- Verify đúng: `DEL` key **trước** rồi mới activate (chống double-submit).
