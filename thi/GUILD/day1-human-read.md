# Day 1 — Thi

## Mục tiêu
Hướng dẫn người khác kiểm tra và dùng Postman với backend đã cập nhật.

## Endpoints cần kiểm tra
1. `GET /health`
   - Kiểm tra server đang chạy.
2. `GET /health/db`
   - Kiểm tra kết nối database.
3. `POST /api/auth/login`
   - Đăng nhập bằng `identifier` và `password`.
4. `POST /api/auth/refresh`
   - Cấp lại access token bằng `refreshToken`.
5. `GET /api/auth/me`
   - Lấy profile người dùng hiện tại, cần header `Authorization: Bearer <accessToken>`.
6. `GET /api/rooms`
   - Danh sách phòng public.
7. `GET /api/rooms/:id`
   - Chi tiết một phòng public (optional auth được hỗ trợ nếu có token).
8. `POST /api/rooms`
   - Host tạo phòng mới, cần `Authorization: Bearer <accessToken>` và role HOST.
9. `GET /api/rooms/my`
   - Host lấy danh sách phòng của chính mình.
10. `PATCH /api/rooms/:id`
    - Host cập nhật phòng của mình.
11. `DELETE /api/rooms/:id`
    - Host xoá phòng của mình.
12. `GET /api/admin/rooms/pending`
    - Admin lấy phòng đang chờ duyệt.
13. `PATCH /api/admin/rooms/:id/approve`
    - Admin duyệt phòng.
14. `PATCH /api/admin/rooms/:id/reject`
    - Admin từ chối phòng.

## Cách dùng Postman
1. Mở Postman và tạo một collection mới, ví dụ `BookingRoom Day1`.
2. Tạo biến môi trường:
   - `baseUrl` = `http://localhost:5000`
   - `accessToken`
   - `refreshToken`
   - `roomId`
3. Thử `GET {{baseUrl}}/health`.
4. Thử `GET {{baseUrl}}/health/db`.
5. Tạo request `POST {{baseUrl}}/api/auth/login`:
   - Header: `Content-Type: application/json`
   - Body JSON:
     {
       "identifier": "admin@example.com",
       "password": "your-password"
     }
   - Lưu `accessToken` và `refreshToken` vào biến môi trường.
6. Tạo request `GET {{baseUrl}}/api/auth/me`:
   - Header: `Authorization: Bearer {{accessToken}}`
7. Tạo request `GET {{baseUrl}}/api/rooms`.
8. Đối với host, dùng request `POST {{baseUrl}}/api/rooms` với token host.
9. Đối với admin, dùng token admin để gọi `GET /api/admin/rooms/pending` và approve/reject.

## Ghi chú
- Nếu endpoint nào trả lỗi 500, kiểm tra lại console backend.
- Nếu token không hợp lệ, kiểm tra lại delta giữa token bạn dùng và response login.
- Mọi request cần có `Content-Type: application/json` nếu gửi body JSON.
