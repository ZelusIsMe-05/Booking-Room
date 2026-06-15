# Test checklist cho Le Nhat Thanh (Integration & Admin Dashboard)

## Mục tiêu

- Xác minh backend boot, convention route prefix, response envelope và error handler.
- Kiểm tra các API admin mà Thanh quản lý: `/api/admin/dashboard/overview`, `/api/admin/system-logs`, `/api/admin/users`.
- Chuẩn bị Postman environment và chạy các test E2E ngắn liên quan tới dashboard/logs.

## Yêu cầu trước khi test

Để chạy và kiểm thử backend hoàn chỉnh, chỉ chạy `npm run dev` là **chưa đủ**. Bạn cần thực hiện đầy đủ các bước thiết lập dưới đây:

### 1. Cài đặt các thư viện (Dependencies)

Nếu đây là lần đầu hoặc sau khi cập nhật mã nguồn, hãy cài đặt các package cần thiết:

```bash
cd backend
npm install
```

### 2. Thiết lập môi trường (`.env`)

Kiểm tra xem file `backend/.env` đã có đầy đủ cấu hình chưa. Mặc định dự án đang sử dụng Database PostgreSQL trực tuyến trên Neon (`DATABASE_URL`).

- Nếu muốn sử dụng database Neon này: không cần cài đặt gì thêm ở máy local.
- Nếu muốn dùng database local: hãy cài đặt PostgreSQL và đổi lại `DATABASE_URL` trong `.env`.

### 3. Khởi tạo database & dữ liệu mẫu (Database Migration & Seed)

Vì các API kiểm thử yêu cầu dữ liệu thực tế (như tài khoản admin để đăng nhập lấy `adminToken`, thông tin phòng, phân quyền...), bạn **bắt buộc** phải chạy lệnh migrate và seed để khởi tạo database:

```bash
# Di chuyển vào thư mục backend
cd backend

# Chạy migrations để khởi tạo các bảng trong DB
npm run migrate

# Chạy seed để nạp dữ liệu mẫu (Roles, Admin/Tenant/Host accounts, Rooms...)
npm run seed
```

### 4. Khởi động Server Backend

Sau khi hoàn tất các bước trên, khởi động Server ở chế độ dev:

```bash
npm run dev
```

Server sẽ lắng nghe tại cổng `5000` (theo cấu hình `.env`).
*(Lưu ý: Không cần chạy server frontend Next.js vì đây là giai đoạn kiểm thử REST API độc lập qua Postman).*

### 5. Xác minh Server chạy thành công trước khi test

Gửi request GET tới các endpoint sau để kiểm tra:

- **Kiểm tra Server:** `GET http://localhost:5000/health` (Mong đợi nhận được `{ "success": true, "message": "OK", ... }`)
- **Kiểm tra Kết nối DB:** `GET http://localhost:5000/health/db` (Mong đợi nhận được `{ "success": true, "message": "Database connection OK", ... }`)

### 6. Cấu hình Postman Environment

Thiết lập Postman environment với các biến sau:

- `baseUrl` (ví dụ `http://localhost:5000`)
- `adminToken` (JWT của admin sau khi đăng nhập thành công)
- `tenantToken`, `hostToken` (dùng để kiểm tra phân quyền 401/403)
- `roomId`, `depositId`, `transactionId` (các biến lưu ID để dùng cho các request tiếp theo trong luồng E2E)

## Tổng quan cách test trên Postman

- Tạo environment mới, thêm biến `baseUrl` và token rỗng ban đầu.
- Tạo folder `Thanh - Integration` với các request dưới.
- Với request cần auth, thêm header `Authorization: Bearer {{adminToken}}`.
- Bật Test scripts trong Postman để lưu giá trị (ví dụ lưu `adminToken` sau login).

## Danh sách test chi tiết

1) Kiểm tra server / health

- Request: `GET {{baseUrl}}/health`
- Kỳ vọng: HTTP 200, body có structure:
  ```json
  { "success": true, "message": "OK", "data": { ... } }
  ```
- Kiểm tra thêm: `GET {{baseUrl}}/health/db` nếu endpoint tồn tại.

2) Kiểm tra response envelope chung

- Mở bất kỳ endpoint công khai (ví dụ `GET {{baseUrl}}/api/rooms` hoặc `/health`) và verify body có `success`, `message`, `data`.

3) Đăng nhập admin (nếu repo có seed admin)

- Request: `POST {{baseUrl}}/api/auth/login` (hoặc đường dẫn login tương ứng)
- Body: `identifier` + `password` (dùng account admin seed hoặc thông tin trong docs)
- Postman test: lưu `data.token` vào `adminToken` env var.

4) Admin Dashboard overview

- Request: `GET {{baseUrl}}/api/admin/dashboard/overview`
- Auth: `Authorization: Bearer {{adminToken}}`
- Kỳ vọng: HTTP 200, `data` chứa các KPI (ví dụ `users`, `rooms`, `pendingRooms`, `transactions`, `supportTickets`).
- Assertion examples (Postman Tests):
  - `pm.response.to.have.status(200);`
  - `pm.expect(json.success).to.be.true;`
  - `pm.expect(json.data).to.have.property('users');`

5) System logs (paging + filters)

- Request: `GET {{baseUrl}}/api/admin/system-logs?limit=10&page=1`
- Auth: admin
- Kỳ vọng: `data.items` là array, `data.pagination` có `page` và `total`.
- Test idempotence: thực hiện 1 hành động (ví dụ gọi `/health` hoặc tạo user), sau đó gọi `system-logs` và xác nhận log mới xuất hiện (căn cứ `action`/`resource`).

6) Admin users list & guards

- Request: `GET {{baseUrl}}/api/admin/users`
- Cases:
  - Không có token => expect 401 or 403
  - Dùng `tenantToken` => expect 403
  - Dùng `adminToken` => expect 200 and user items

7) Negative tests cho error handler

- Gửi request sai định dạng vào một endpoint public (ví dụ `POST /api/auth/register` bỏ trường bắt buộc) và verify:
  - HTTP 400
  - Body có `success: false`, `message` giải thích, và `details` nếu có.

8) Integration smoke: E2E ngắn (dashboard-focused)

- Steps (Postman Collection order):
  1. `POST /api/auth/register` tenant (save tenantToken)
  2. `POST /api/auth/register` host (save hostToken)
  3. `POST /api/auth/login` admin (save adminToken)
  4. (optional) Create seed data if scripts exist: run `npm run seed` ngoài Postman
  5. `GET /api/admin/dashboard/overview` (assert KPI present)
  6. Trigger an action (e.g., create a room as host), then `GET /api/admin/system-logs` and assert the event recorded.

## Gợi ý scripts & Postman Test snippets

- Lưu token sau login (Pre-request/Tests):

```js
const json = pm.response.json();
pm.environment.set('adminToken', json.data?.token || '');
```

- Kiểm tra envelope (Test script ví dụ):

```js
pm.test('Envelope ok', function(){
  const json = pm.response.json();
  pm.expect(json).to.have.property('success');
  pm.expect(json).to.have.property('message');
  pm.expect(json).to.have.property('data');
});
```

## Ghi chú cuối

- Nếu `package.json` trống (như repo mới clone), bạn cần khôi phục `package.json` trước khi chạy script `npm run migrate`/`npm run seed`/`npm run dev`.
- Tài liệu liên quan: xem [TEAMWORK_CNPM.md](../../TEAMWORK_CNPM.md) để biết kỳ vọng chi tiết và flow E2E.

---

File này tạo để hỗ trợ Thanh nhanh kiểm thử integration & admin dashboard bằng Postman.
