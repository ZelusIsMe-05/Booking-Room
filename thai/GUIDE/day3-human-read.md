# Day 3 — Test Quên mật khẩu + Đăng nhập mạng xã hội (OAuth)

Hai luồng mới:
- **Quên mật khẩu**: nhập email → nhận OTP qua email → đặt mật khẩu mới. Đổi mật khẩu sẽ **đăng xuất mọi phiên cũ**.
- **OAuth**: đăng nhập bằng Google/Facebook/GitHub. Lần đầu sẽ **tự tạo tài khoản**.

OTP vẫn in ra **console server** nếu chưa cấu hình SMTP (`[MAILER:DEV] ... otp=xxxxxx`).

## 0. Chuẩn bị
- Chạy backend: trong `backend/` gõ `npm run dev`.
- Cần **Redis** (`REDIS_URL`) đang chạy.
- Base URL: `http://localhost:5000`
- Header mọi request có body: `Content-Type: application/json`

---

# A. Quên mật khẩu (Postman)

## A1. Yêu cầu mã đặt lại mật khẩu
- **POST** `http://localhost:5000/api/auth/forgot-password`
- **Body:**
```json
{ "email": "vana@example.com" }
```
- **Kết quả (luôn 200):** dù email có tồn tại hay không, message luôn giống nhau (chống dò tài khoản).
```json
{ "success": true,
  "message": "Nếu email tồn tại và đã kích hoạt, mã OTP đặt lại mật khẩu đã được gửi.",
  "data": { "otpExpiresInSeconds": 300 } }
```
> Lấy OTP: mở email, hoặc xem console server. Email phải đang ở trạng thái `ACTIVE` thì mới thực sự gửi.

## A2. Đặt lại mật khẩu
- **POST** `http://localhost:5000/api/auth/reset-password`
- **Body:**
```json
{ "email": "vana@example.com", "otp": "123456",
  "newPassword": "NewPass@123", "confirmPassword": "NewPass@123" }
```
- **Kết quả (200):** mật khẩu đã đổi, **tất cả phiên đăng nhập cũ bị thu hồi**.
```json
{ "success": true, "message": "Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại." }
```
> Sau bước này: đăng nhập bằng mật khẩu mới → `200`; mật khẩu cũ → `401`; refresh token cũ → `401`.

## A3. Gửi lại OTP đặt lại mật khẩu (nếu hết hạn)
- **POST** `http://localhost:5000/api/auth/resend-otp`
- **Body:** (chú ý `purpose`)
```json
{ "email": "vana@example.com", "purpose": "PASSWORD_RESET" }
```
- **Kết quả (200):** OTP mới. Gọi lại trong 60s → vẫn `200` nhưng không gửi (cooldown).

## Lỗi thường gặp (quên mật khẩu)

| Tình huống | HTTP | Ghi chú |
| --- | --- | --- |
| OTP sai | 400 | kèm `data.remainingAttempts` |
| OTP sai quá số lần | 429 | yêu cầu gửi lại mã |
| OTP hết hạn (quá 5 phút) | 410 | gửi lại mã mới |
| Xác nhận mật khẩu không khớp / mật khẩu yếu | 400 | `VALIDATION_ERROR` |
| reset-password không thấy tài khoản ACTIVE | 404 | |

---

# B. Đăng nhập mạng xã hội (OAuth)

Backend dùng **Authorization Code**: frontend lấy `code` từ provider rồi POST lên backend; backend giữ client secret, tự đổi `code` → token → profile.

## B1. Endpoint
- **POST** `http://localhost:5000/api/auth/oauth/:provider` — `:provider` = `google` | `facebook` | `github`
- **Body:**
```json
{ "code": "<authorization_code_từ_provider>", "redirectUri": "http://localhost:5000/oauth/google/callback" }
```
- **Kết quả (200):** trả access + refresh token (như login thường) kèm `isNewUser`.
```json
{ "success": true, "message": "Đăng nhập thành công.",
  "data": { "accessToken": "...", "refreshToken": "...", "tokenType": "Bearer",
            "user": { "userId": "...", "email": "...", "username": "..." },
            "isNewUser": true } }
```
- `isNewUser: true` → vừa tạo tài khoản mới (username tự sinh, có thể đổi sau ở profile).
- `isNewUser: false` → đã đăng nhập/liên kết vào tài khoản có sẵn (cùng email).

## B2. Test nhanh bằng harness (không cần frontend)
- Lấy file `.env` mới nhất tui gửi.
- Chạy: trong `backend/` gõ `node oauth-harness.js` → mở `http://localhost:5000`.
- Bấm "Test Google / GitHub / Facebook" → đăng nhập → harness tự bắt `code`, gọi `loginWithOAuth`, in kết quả ra trang + console.

> Riêng **Facebook** cần thêm: quyền `email` trong Use case + `localhost` ở App Domains + Website platform (thiếu sẽ báo `Invalid Scopes: email` / lỗi domain).

## Lỗi thường gặp (OAuth)

| Tình huống | HTTP | Ghi chú |
| --- | --- | --- |
| provider không hỗ trợ / thiếu code / redirectUri sai | 400 | |
| `code` sai hoặc hết hạn (dùng lại) | 400 | `invalid_grant` |
| Email chưa xác minh / provider không trả email | 422 | bắt buộc email verified |
| Tài khoản bị khóa (`BANNED`) | 403 | |
| Lỗi gọi provider (mạng/timeout) | 502 | |
| Provider chưa cấu hình client id/secret | 500 | thiếu `.env` |
