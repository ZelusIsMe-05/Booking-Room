# Day 2 — Test Đăng ký + OTP bằng Postman

Luồng: **đăng ký → nhận OTP → xác thực → đăng nhập**. OTP gửi qua email; nếu chưa cấu hình
SMTP thì OTP được in ra **console của server** (`[MAILER:DEV] ... otp=xxxxxx`).

## 0. Chuẩn bị
- Chạy backend: trong `backend/` gõ `npm run dev`.
- Cần **Redis** đang chạy (`REDIS_URL` trong `.env`).
- Base URL: `http://localhost:5000`
- Header mọi request có body: `Content-Type: application/json`

## 1. Đăng ký
- **POST** `http://localhost:5000/api/auth/register`
- **Body:**
```json
{
  "fullName": "Nguyen Van A",
  "username": "vana",
  "email": "vana@example.com",
  "phoneNumber": "0912345678",
  "password": "Password@123",
  "confirmPassword": "Password@123"
}
```
- **Kết quả (201):** tài khoản tạo ở trạng thái `INACTIVE`, OTP đã được gửi.
```json
{
  "success": true,
  "message": "Đăng ký thành công. Vui lòng kiểm tra email để nhận mã OTP.",
  "data": { "userId": "...", "username": "vana", "email": "vana@example.com",
            "phoneNumber": "0912345678", "status": "INACTIVE", "otpExpiresInSeconds": 300 }
}
```
> Lấy mã OTP: mở email, hoặc xem console server (`[MAILER:DEV] ... otp=123456`).

## 2. Xác thực OTP — kích hoạt tài khoản
- **POST** `http://localhost:5000/api/auth/verify-otp`
- **Body:**
```json
{ "email": "vana@example.com", "otp": "123456" }
```
- **Kết quả (200):** tài khoản chuyển `ACTIVE`.
```json
{ "success": true, "message": "Xác thực OTP thành công. Tài khoản đã được kích hoạt.",
  "data": { "userId": "...", "status": "ACTIVE" } }
```

## 3. Gửi lại OTP (nếu hết hạn / nhập sai nhiều lần)
- **POST** `http://localhost:5000/api/auth/resend-otp`
- **Body:**
```json
{ "email": "vana@example.com", "purpose": "REGISTRATION" }
```
- **Kết quả (200):** `{ "data": { "otpExpiresInSeconds": 300 } }` — OTP cũ bị thay bằng mã mới.
> Gọi lại trong vòng 60s → `429` (cooldown). Đợi rồi thử lại.

## 4. Đăng nhập (sau khi đã ACTIVE)
- **POST** `http://localhost:5000/api/auth/login` với `identifier` = email/username/phone + `password`.
  (Tài khoản còn `INACTIVE` sẽ **không** đăng nhập được — phải verify OTP trước.)

## Lỗi thường gặp

| Tình huống | HTTP | message |
| --- | --- | --- |
| Thiếu/sai field (email, mật khẩu yếu, confirm không khớp...) | 400 | Dữ liệu không hợp lệ (kèm `data.errors`) |
| Email / SĐT / username đã tồn tại | 409 | Email, số điện thoại hoặc tên đăng nhập đã được sử dụng. |
| OTP sai | 400 | Mã OTP không chính xác. (kèm `data.remainingAttempts`) |
| OTP sai quá 3 lần | 429 | Mã OTP đã bị khóa... yêu cầu gửi lại mã mới. |
| OTP hết hạn (quá 5 phút) | 410 | Mã OTP đã hết hạn. Vui lòng yêu cầu gửi lại mã mới. |
| Verify khi tài khoản đã active | 404 | Không tìm thấy tài khoản cần xác thực. |
| Resend khi đã active | 409 | Tài khoản đã được kích hoạt. |
| Resend quá nhanh (<60s) | 429 | Bạn yêu cầu gửi lại mã quá thường xuyên... |
| Resend email không tồn tại | 404 | Không tìm thấy tài khoản. |
