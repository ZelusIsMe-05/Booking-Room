# Report: Đăng nhập mạng xã hội (Google / Facebook / GitHub)

Triển khai theo plan `1.9-google-facebook-github-auth.md`. Mô hình **additive**: giữ nguyên
`users` (vẫn có username/password cho local), thêm bảng liên kết `oauth_accounts` (1 user → N provider).
Một endpoint thống nhất cho cả 3 provider; tái dùng `issueTokens` + audit như login thường.

## Endpoint

| Method | Path | Auth | Body | Mô tả |
| --- | --- | --- | --- | --- |
| POST | `/api/auth/oauth/:provider` | Không | `{ code, redirectUri }` | `:provider` = `google`\|`facebook`\|`github`. Đổi code → profile → login/link/create → trả token + `isNewUser` |

Frontend lấy `code` (Authorization Code), backend giữ client secret và đổi token (cách A trong plan).

## Luồng (find → link → create)

1. Đổi `code` lấy access token tại provider → lấy profile, chuẩn hóa `{ providerUserId, email, emailVerified, fullName, avatarUrl }`.
2. Bắt buộc **email đã verified** (GitHub lấy thêm qua `/user/emails`); thiếu → `422`.
3. Tìm `oauth_accounts(provider, provider_user_id)` → có thì dùng user đó.
4. Chưa có → tìm user theo email: có (≠BANNED) → **liên kết**; không có → **tạo mới** (`ACTIVE`, `TENANT`, password ngẫu nhiên, username tự sinh).
5. `issueTokens` + ghi `login_audit_logs` → trả `{ tokens, user, isNewUser }`.

## File liên quan

### Tạo mới
| File | Vai trò |
| --- | --- |
| `backend/services/auth/oauthProviders.js` | Adapter 3 provider: đổi code + lấy profile (dùng global `fetch`, có timeout); chuẩn hóa profile; map lỗi `400`/`422`/`502` |
| `backend/db/migrations/025_create_oauth_accounts.js` | Bảng `oauth_accounts` (đánh số **025** vì ledger DB chung đã có `024_add_deposit_states_and_payout`) |

### Sửa
| File | Thay đổi |
| --- | --- |
| `backend/config/env.js` | Thêm `env.oauth.{google,facebook,github}` (clientId/secret) |
| `backend/config/authConstants.js` | Thêm `OAUTH_PROVIDER` |
| `backend/models/User.js` | `oauthLoginSchema` (`code`, `redirectUri`) |
| `backend/repositories/auth/auth.repository.js` | `findOAuthAccount`, `linkOAuthAccount`, `isUsernameTaken`, `createOAuthUser` (transaction) |
| `backend/services/auth/auth.service.js` | `loginWithOAuth` + helper `generateUniqueUsername`, `randomPasswordHash` |
| `backend/controllers/auth/auth.controller.js` | `oauthLogin` (whitelist provider qua `isSupportedProvider`) |
| `backend/routes/auth/auth.route.js` | `POST /oauth/:provider` + `validate(...)` |

## Bảng `oauth_accounts`

| Cột | Ghi chú |
| --- | --- |
| `oauth_account_id` uuid PK | `gen_random_uuid()` |
| `user_id` uuid FK → users | `onDelete CASCADE` |
| `provider` enum | `GOOGLE`/`FACEBOOK`/`GITHUB` (type `oauth_provider`) |
| `provider_user_id` varchar | ID phía provider |
| `email` varchar null | tham khảo |
| `created_at` timestamptz | |

Ràng buộc: `unique(provider, provider_user_id)`, `unique(user_id, provider)`, index `user_id`.

## Quyết định thiết kế

- **Additive (`oauth_accounts`) thay vì bóc username/password khỏi `users`**: tránh viết lại toàn bộ auth 1.1–1.8 đã test và migrate destructive `users` trong khi ledger đang lệch. Hỗ trợ 1 user nhiều provider (khác với phương án cột nullable).
- **Password `NOT NULL`**: user OAuth lưu `password = hash(random 32B)` không dùng được → đặt mật khẩu thật sau qua `forgot-password` (1.8). Không phải đổi schema.
- **Username tự sinh**, đổi sau ở profile; **không** nhận username trong call OAuth (vì `code` dùng-một-lần, tránh login fail vì username trùng/sai).
- **Chỉ link khi email verified** → chống chiếm tài khoản (đặc biệt Facebook/GitHub).
- **`emailVerified`**: Google đọc `email_verified`; Facebook coi email đã cấp là verified; GitHub lấy từ `/user/emails` (`verified`).

## Map lỗi

| Tình huống | HTTP |
| --- | --- |
| provider ngoài whitelist / thiếu code / redirectUri sai | `400` |
| `code` đổi token báo `invalid_grant` (sai/hết hạn) | `400` |
| email không verified / provider không trả email | `422` |
| tài khoản `BANNED` | `403` |
| lỗi gọi provider (mạng/timeout/parse/token) | `502` |
| provider chưa cấu hình client id/secret | `500` |

## Migration (ledger lệch)

- Ledger DB chung đã tới batch 5 (có `021/022/023` + `024_add_deposit_states_and_payout`) trong khi nhánh `thai` thiếu file → `npm run migrate` vẫn chặn.
- Đã đặt tên **`025`** (tránh đụng `024` của team) và **áp trực tiếp**: chạy `up(db)` tạo bảng + chèn dòng ledger `025_create_oauth_accounts.js` (batch 6). Cần đồng bộ migration với team sau.

## Kết quả test

- ✅ **Smoke-load** toàn bộ module → `OK`.
- ✅ **E2E logic test** trên Neon thật (stub `oauthProviders.getProfile`, không gọi mạng), tự dọn dữ liệu sau:

| Case | Kết quả |
| --- | --- |
| Google lần đầu (email mới) | `isNewUser=true`, user `ACTIVE`/`TENANT`, trả access+refresh |
| Google lần 2 | `isNewUser=false`, đúng user cũ (qua `oauth_accounts`) |
| GitHub cùng email | liên kết cùng user → 2 dòng `oauth_accounts` |
| Email chưa verified | `422` (`OAUTH_EMAIL_REQUIRED`) |

- ✅ **E2E với provider THẬT** (Google + GitHub + Facebook) qua harness cục bộ (`backend/oauth-harness.js`, cổng 5050: bắt redirect → lấy `code` thật → `loginWithOAuth`):

| Case thật | Kết quả |
| --- | --- |
| Google, email đã có tài khoản | liên kết vào user cũ (`isNewUser=false`) |
| GitHub, cùng email | cùng user → 2 dòng `oauth_accounts` (GOOGLE+GITHUB) |
| Google, email mới | tạo user mới (`isNewUser=true`), username auto |
| Facebook, email trùng user vừa tạo | liên kết → user có GOOGLE+FACEBOOK |
| Tất cả | trả access + refresh token chuẩn |

> Cấu hình Facebook cần thêm ngoài client id/secret: quyền `email` trong Use case + `localhost` ở App Domains + Website platform (lỗi `Invalid Scopes: email` / domain nếu thiếu).

## Việc còn lại

- **Giữ** `backend/oauth-harness.js` làm công cụ test OAuth thủ công (cổng 5000) — hướng dẫn dùng ở `thai/GUIDE/day3-human-read.md` §B2. Không build vào production.
- Đồng bộ lại file migration `024_add_deposit...` với team để `npm run migrate` chạy lại bình thường (021/022 đã có trong nhánh).
- (Tương lai) Trang profile cho user đổi username; endpoint xem/huỷ liên kết provider.
