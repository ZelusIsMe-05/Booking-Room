# Day 1 — Test Auth bằng Postman

Hướng dẫn nhanh: đăng nhập lấy 2 token → dùng access token gọi `/me`.

## 0. Chuẩn bị

- Chạy backend: trong thư mục `backend/` gõ `npm run dev` (hoặc `npm start`).
- Base URL: `http://localhost:5000`
- Mọi request gửi body JSON đặt header: `Content-Type: application/json`
- Tài khoản seed — **mật khẩu chung: `Password@123`**

| Vai trò | username | email | password |
| --- | --- | --- | --- |
| Admin | `admin` | `admin@booking.local` | `Password@123` |
| Landlord | `landlord1` | `landlord1@booking.local` | `Password@123` |
| Tenant | `tenant1` | `tenant1@booking.local` | `Password@123` |

> `identifier` nhận username, email hoặc số điện thoại đều được.

## 1. Đăng nhập — lấy Access Token + Refresh Token

- **Method:** `POST`
- **URL:** `http://localhost:5000/api/auth/login`
- **Body → raw → JSON:**

```json
{
  "identifier": "tenant1",
  "password": "Password@123"
}
```

Đổi `identifier` thành `admin` hoặc `landlord1` để test vai trò khác.

**Kết quả (200):** copy 2 chuỗi token để dùng ở bước sau.

```json
{
  "success": true,
  "message": "Đăng nhập thành công.",
  "data": {
    "tokenType": "Bearer",
    "accessToken": "eyJhbGciOi...",   // dùng để gọi API tài nguyên
    "accessExpiresIn": "15m",
    "refreshToken": "eyJhbGciOi...",  // dùng để xin access token mới
    "refreshExpiresIn": "7d",
    "user": { "userId": "...", "role": "TENANT", "status": "ACTIVE" }
  }
}
```

## 2. Lấy thông tin user — dùng Access Token

- **Method:** `GET`
- **URL:** `http://localhost:5000/api/auth/me`
- **Authorization:** chọn type **Bearer Token**, dán `accessToken` ở bước 1.
  (Hoặc tab Headers: `Authorization: Bearer <accessToken>`)
- **Body:** không có.

**Kết quả (200):**

```json
{
  "success": true,
  "message": "Lấy thông tin người dùng thành công.",
  "data": {
    "user": {
      "userId": "c0000000-0000-0000-0000-000000000004",
      "fullName": "Le Van Khach",
      "email": "tenant1@booking.local",
      "phoneNumber": "0900000004",
      "username": "tenant1",
      "avatarUrl": null,
      "role": "TENANT",
      "status": "ACTIVE"
    }
  }
}
```

## 3. Khi Access Token hết hạn (sau 15 phút) — lấy access token mới

Dùng **refresh token** (KHÔNG cần đăng nhập lại):

- **Method:** `POST`
- **URL:** `http://localhost:5000/api/auth/refresh`
- **Body → raw → JSON:**

```json
{
  "refreshToken": "eyJhbGciOi..."
}
```

**Kết quả (200):** nhận `accessToken` mới, refresh token giữ nguyên dùng tiếp tới khi hết 7 ngày.

```json
{
  "success": true,
  "message": "Cấp lại access token thành công.",
  "data": {
    "tokenType": "Bearer",
    "accessToken": "eyJhbGciOi...",
    "accessExpiresIn": "15m"
  }
}
```

## 4. Đăng xuất — thu hồi Refresh Token

Đăng xuất sẽ **xóa refresh token khỏi DB**. Sau đó refresh token cũ không xin được access token mới nữa.

- **Method:** `POST`
- **URL:** `http://localhost:5000/api/auth/logout`
- **Authorization:** Bearer Token = `accessToken` (bắt buộc, để xác định bạn là ai).
- **Body → raw → JSON:** (refresh token của phiên cần đăng xuất)

```json
{
  "refreshToken": "eyJhbGciOi..."
}
```

**Kết quả (200):**

```json
{
  "success": true,
  "message": "Đăng xuất thành công."
}
```

### Kiểm chứng đã đăng xuất

1. Gọi lại bước **3 (refresh)** bằng refresh token vừa logout → phải nhận **401** "Refresh token không hợp lệ hoặc đã hết hạn." (vì đã bị xóa khỏi DB).
2. Gọi lại **logout** lần nữa → vẫn **200** (idempotent — gọi nhiều lần không lỗi).

> Lưu ý mô hình token: `accessToken` cũ **vẫn gọi được** API tài nguyên (vd `/me`) cho tới khi nó tự hết hạn (tối đa theo `accessExpiresIn`, mặc định 15 phút). Sau mốc đó nó không gia hạn được nữa → bị đăng xuất hoàn toàn. Đây là đánh đổi của access token ngắn hạn (không cần blacklist).

## Lỗi thường gặp

| Tình huống | HTTP | message |
| --- | --- | --- |
| Sai/thiếu tài khoản hoặc mật khẩu | 401 | Tài khoản hoặc mật khẩu không chính xác. |
| Sai mật khẩu > 5 lần liên tiếp | 423 | Tài khoản đang bị khóa tạm thời... (khóa 10 phút) |
| Gọi `/me` hoặc `/logout` không gắn access token | 401 | Bạn cần đăng nhập để thực hiện thao tác này. |
| Token sai / hết hạn | 401 | Phiên đăng nhập không hợp lệ hoặc đã hết hạn. |
| Refresh bằng token đã logout | 401 | Refresh token không hợp lệ hoặc đã hết hạn. |
| Logout/refresh thiếu `refreshToken` trong body | 400 | Thiếu refresh token. |
