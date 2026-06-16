# Day 3 — Quên mật khẩu + Đăng nhập mạng xã hội (OAuth) cho AI agent / dev module khác

Hai cụm mới, đều dựng trên hạ tầng Day 2:
- **Quên mật khẩu**: `forgot-password → reset-password`, tái dùng OTP Redis với purpose mới `PASSWORD_RESET`.
- **OAuth**: 1 endpoint `oauth/:provider` cho Google/Facebook/GitHub, thêm bảng liên kết `oauth_accounts`.

Đọc file nguồn khi cần chi tiết.

## Muốn làm gì thì đọc file nào

| Mục đích | File |
| --- | --- |
| Logic forgot/reset password + helper OTP dùng chung (`assertOtpValid`) | `backend/services/auth/auth.service.js` |
| Logic OAuth (find → link → create), sinh username, password ngẫu nhiên | `backend/services/auth/auth.service.js` (`loginWithOAuth`) |
| Adapter 3 provider: đổi `code` → access token → profile | `backend/services/auth/oauthProviders.js` |
| Schema validate (`forgotPassword/resetPassword/oauthLogin`) | `backend/models/User.js` |
| Truy vấn DB (reset mật khẩu, OAuth account, tạo user OAuth) | `backend/repositories/auth/auth.repository.js` |
| Thao tác OTP trên Redis (purpose `PASSWORD_RESET`) | `backend/redis/otpStore.js` |
| Cấu hình client id/secret OAuth | `backend/config/env.js` + `backend/.env` (`env.oauth.*`) |
| Bảng `oauth_accounts` | `backend/db/migrations/025_create_oauth_accounts.js` |
| Đặc tả + report | `thai/plan/1.8-forgot-password.md`, `1.9-google-facebook-github-auth.md`, `report-forgot-password.md`, `report-oauth.md` |
| Harness test OAuth thủ công (cổng 5000) | `backend/oauth-harness.js` |

## Endpoint mới

| Method | Path | Auth | Body |
| --- | --- | --- | --- |
| POST | `/api/auth/forgot-password` | Không | `email` |
| POST | `/api/auth/reset-password` | Không | `email, otp, newPassword, confirmPassword` |
| POST | `/api/auth/oauth/:provider` | Không | `code, redirectUri` (`:provider` = `google`\|`facebook`\|`github`) |
| POST | `/api/auth/resend-otp` | Không | `email, purpose` (**mở rộng** thêm `PASSWORD_RESET`) |

## Tái dùng OTP cho purpose mới

OTP đã đa-purpose; thêm purpose khác (đổi email...) chỉ cần khai báo trong `OTP_PURPOSE`:

```js
const otpStore = require('../redis/otpStore');
const purpose = otpStore.OTP_PURPOSE.PASSWORD_RESET; // 'REGISTRATION' | 'PASSWORD_RESET'
// key Redis tách theo purpose → cùng email có OTP đăng ký và OTP reset độc lập.
```

- `forgot-password` và `resend-otp` purpose `PASSWORD_RESET` **luôn trả 200** (chống dò tài khoản), chỉ gửi khi user `ACTIVE` + không cooldown.
- `reset-password`: `DEL` OTP **trước** khi đổi mật khẩu → xóa hết `refresh_tokens` (đăng xuất mọi phiên) → reset `failed_login_attempts`/`locked_until`.
- Helper `assertOtpValid({ purpose, email, otp })` trong service dùng chung cho cả `verifyOtp` và `resetPassword` — map 410/429/400+remaining.

## Gọi/tái dùng OAuth

```js
const authService = require('../services/auth/auth.service');
const result = await authService.loginWithOAuth({
  provider, code, redirectUri, ipAddress, userAgent,
}); // → { user, tokens, isNewUser }
```

Luồng `loginWithOAuth` (xem service):
1. `oauthProviders.getProfile({ provider, code, redirectUri })` → `{ providerUserId, email, emailVerified, fullName, avatarUrl }`.
2. **Bắt buộc `emailVerified`** → thiếu `422`.
3. Tìm `oauth_accounts(provider, provider_user_id)` → có thì dùng user đó.
4. Chưa có → tìm user theo email: có (≠`BANNED`) → **liên kết** (`linkOAuthAccount`); không có → **tạo mới** (`createOAuthUser`: `ACTIVE`, `TENANT`, password ngẫu nhiên không dùng được, username tự sinh).
5. `issueTokens` + ghi `login_audit_logs` (như login thường).

Thêm provider mới: thêm adapter trong `oauthProviders.js` (`SUPPORTED`, hàm `*Profile`) + enum `oauth_provider` trong DB + `OAUTH_PROVIDER` ở `authConstants.js` + `env.oauth.*`.

## Mô hình dữ liệu OAuth (additive)

- **Không** bóc `username/password` khỏi `users`. Thêm bảng `oauth_accounts` (1 user → N provider): `unique(provider, provider_user_id)`, `unique(user_id, provider)`.
- User OAuth-only: `password = hash(random 32B)` (không đăng nhập local được) → có thể đặt mật khẩu thật sau qua `forgot-password`.
- Username tự sinh (`generateUniqueUsername`), đổi sau ở profile. **Không** nhận username trong call OAuth (`code` dùng-một-lần).
- Chỉ link/create khi email **verified** → chống chiếm tài khoản.

## Map lỗi

| Tình huống | HTTP |
| --- | --- |
| OTP hết hạn / không còn key | `410` |
| OTP sai (còn lượt) | `400` + `data.remainingAttempts` |
| OTP sai quá `OTP_MAX_ATTEMPTS` | `429` |
| reset-password không thấy user ACTIVE | `404` |
| confirm không khớp / sai định dạng | `400` (`VALIDATION_ERROR`) |
| provider ngoài whitelist / thiếu code / redirectUri sai | `400` |
| `code` đổi token báo `invalid_grant` | `400` |
| email không verified / provider không trả email | `422` |
| tài khoản `BANNED` | `403` |
| lỗi gọi provider (mạng/timeout/parse/token) | `502` |
| provider chưa cấu hình client id/secret | `500` |

## Quy ước (giống Day 1–2)

- Layering `route → controller → service → repository`; OTP/Redis qua `redis/otpStore.js`; gọi provider qua `oauthProviders.js`.
- Validate ở route bằng `validate({ body: <schema> })`; provider whitelist check trong controller (`isSupportedProvider`).
- Lỗi nghiệp vụ: `throw new AppError(code, message, status, data?)` (thuộc tính là `.status`).
- Response qua `sendSuccess`/`sendError`.
- Migration ledger nhánh `thai` đang lệch DB chung → `oauth_accounts` đánh số **025** và áp trực tiếp; đồng bộ với team sau.
