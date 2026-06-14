# Day 1 — Thi

## Mục tiêu
- Tạo tài liệu cho AI hiểu những gì Thi đã làm trong ngày 1.
- Ghi rõ các thay đổi backend, route scaffold và giải quyết xung đột merge.

## Những việc đã làm
1. Dọn xong xung đột merge trong backend.
2. Chuẩn hóa route mount cho backend:
   - `/api/auth`
   - `/api/rooms` (guest + host routes)
   - `/api/admin/rooms`
3. Đảm bảo `backend/app.js` có `/health` và `/health/db`.
4. Sửa lại cách dùng response helper để thống nhất `sendSuccess`.
5. Sửa lại import `AppError` và `roleMiddleware` để dùng đúng module.
6. Cập nhật controller/service room và auth để phù hợp với cấu trúc `route → controller → service → repository`.

## File đã chỉnh sửa
- `backend/app.js`
- `backend/server.js`
- `backend/routes/auth/authRoutes.js`
- `backend/controllers/auth/authController.js`
- `backend/services/auth/authService.js`
- `backend/middlewares/roleMiddleware.js`
- `backend/controllers/guest/roomController.js`
- `backend/controllers/host/roomController.js`
- `backend/controllers/admin/roomController.js`
- `backend/services/guest/roomService.js`
- `backend/services/host/roomService.js`
- `backend/services/admin/roomService.js`
- `backend/knexfile.js`

## Quy ước đã theo
- Không cấu trúc logic nghiệp vụ trong controller.
- Dùng `sendSuccess` / `sendError` từ `backend/utils/responseHelper.js`.
- Dùng `AppError` từ `backend/utils/AppError.js`.
- Bảo toàn kiến trúc route/controller/service/repository.

## Ghi chú
- Đây là bước chuẩn bị và dọn dẹp trước khi chạy API.
- Hoạt động tiếp theo là xác nhận backend boot và test các endpoint bằng Postman.
