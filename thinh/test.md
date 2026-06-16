# Test Checklist cho Đặng Lê Đức Thịnh (Booking / Payment / Transactions)

## Mục tiêu

- Xác minh toàn bộ luồng đặt cọc: Tenant tạo deposit → phòng bị LOCKED → thanh toán → webhook cập nhật → phòng chuyển RENTED.
- Kiểm tra các API Thinh quản lý: `/api/bookings/deposits`, `/api/payments/transactions`, `/api/payments/webhook`, `/api/admin/transactions`.
- Đảm bảo tính idempotency của webhook, không double-confirm, không double-payment.
- Test expire deposit và release phòng đúng cách.

---

## Yêu cầu trước khi test

### 1. Cài đặt thư viện

```bash
cd backend
npm install
```

### 2. Thiết lập môi trường (`.env`)

Kiểm tra `backend/.env` có đủ:
- `DATABASE_URL` — kết nối PostgreSQL (Neon cloud hoặc local).
- `JWT_SECRET` — secret cho JWT.
- `PORT=5000`

### 3. Khởi tạo database & dữ liệu mẫu

```bash
cd backend
npm run migrate
npm run seed
```

Seed sẽ tạo sẵn:
- Tài khoản `admin` (role ADMIN)
- Tài khoản `tenant1`, `tenant2` (role TENANT)
- Tài khoản `landlord1`, `landlord2` (role LANDLORD)
- Các phòng mẫu đã được approve

### 4. Khởi động server

```bash
npm run dev
```

Server lắng nghe tại `http://localhost:5000`.

### 5. Xác minh server trước khi test

```
GET http://localhost:5000/health
→ { "success": true, "message": "OK" }

GET http://localhost:5000/health/db
→ { "success": true, "message": "Database connection OK" }
```

### 6. Cấu hình Postman Environment

Tạo environment với các biến:

| Biến | Mô tả |
| --- | --- |
| `baseUrl` | `http://localhost:5000` |
| `tenantToken` | JWT của tenant (lưu sau khi login) |
| `hostToken` | JWT của landlord (lưu sau khi login) |
| `adminToken` | JWT của admin (lưu sau khi login) |
| `roomId` | ID phòng có sẵn trong DB (từ seed) |
| `depositId` | ID deposit (lưu sau khi tạo) |
| `transactionId` | ID transaction (lưu sau khi tạo) |

---

## Danh sách test chi tiết

### 1. Đăng nhập lấy token

**Test 1.1 – Login Tenant:**
- Request: `POST {{baseUrl}}/api/auth/login`
- Body: `{ "identifier": "tenant1", "password": "Password@123" }`
- Kỳ vọng: HTTP 200, `data.tokens.accessToken` có giá trị.
- Postman script: lưu `tenantToken`.

**Test 1.2 – Login Landlord:**
- Body: `{ "identifier": "landlord1", "password": "Password@123" }`
- Lưu `hostToken`.

**Test 1.3 – Login Admin:**
- Body: `{ "identifier": "admin", "password": "Password@123" }`
- Lưu `adminToken`.

---

### 2. Tạo Deposit (Happy Path)

**Test 2.1 – Tạo deposit thành công:**
- Request: `POST {{baseUrl}}/api/bookings/deposits`
- Auth: `Bearer {{tenantToken}}`
- Body:
  ```json
  {
    "room_id": "{{roomId}}",
    "appointment_time": "2026-08-01T09:00:00Z"
  }
  ```
- Kỳ vọng:
  - HTTP 201
  - `data.deposit.status = "PROCESSING"`
  - `data.deposit.expired_at` lớn hơn `created_at` đúng 15 phút
  - `data.deposit.room_id` khớp với `roomId` đã gửi
- Script: lưu `depositId = data.deposit.deposit_id`.

**Test 2.2 – Verify phòng đã bị LOCKED:**
- Request: `GET {{baseUrl}}/api/rooms/{{roomId}}`
- Kỳ vọng: `data.room.status = "LOCKED"` (hoặc không hiển thị ở public list nữa).

---

### 3. Tạo Deposit (Error Cases)

**Test 3.1 – Phòng chưa APPROVED:**
- Dùng `room_id` của phòng đang `PENDING`.
- Kỳ vọng: HTTP 400 hoặc 404, `success: false`.

**Test 3.2 – Tạo 2 deposit PROCESSING cùng lúc (Conflict):**
- Gọi lại `POST /api/bookings/deposits` với cùng `roomId`.
- Kỳ vọng: HTTP 409, message có từ "conflict" hoặc "đã có đơn".

**Test 3.3 – Tenant gọi host API:**
- Request: `GET {{baseUrl}}/api/host/bookings/deposits`
- Auth: `Bearer {{tenantToken}}`
- Kỳ vọng: HTTP 403.

**Test 3.4 – Không có token:**
- Request: `POST {{baseUrl}}/api/bookings/deposits` (không có Authorization header).
- Kỳ vọng: HTTP 401.

---

### 4. Xem và Quản lý Deposit

**Test 4.1 – Tenant xem danh sách deposit của mình:**
- Request: `GET {{baseUrl}}/api/bookings/deposits/my`
- Auth: `Bearer {{tenantToken}}`
- Kỳ vọng: HTTP 200, `data.deposits` là array chứa deposit vừa tạo.

**Test 4.2 – Filter theo status:**
- Request: `GET {{baseUrl}}/api/bookings/deposits/my?status=PROCESSING`
- Kỳ vọng: Chỉ trả về deposit đang PROCESSING.

**Test 4.3 – Xem chi tiết deposit:**
- Request: `GET {{baseUrl}}/api/bookings/deposits/{{depositId}}`
- Auth: `Bearer {{tenantToken}}`
- Kỳ vọng: HTTP 200, đầy đủ thông tin deposit.

**Test 4.4 – Host xem deposit của phòng mình:**
- Request: `GET {{baseUrl}}/api/host/bookings/deposits`
- Auth: `Bearer {{hostToken}}`
- Kỳ vọng: HTTP 200, danh sách deposit của các phòng landlord1 sở hữu.

---

### 5. Hủy Deposit (Tenant Cancel)

**Test 5.1 – Hủy deposit thành công:**
- Request: `PATCH {{baseUrl}}/api/bookings/deposits/{{depositId}}/cancel`
- Auth: `Bearer {{tenantToken}}`
- Body: `{ "reason": "Đổi ý không thuê nữa" }`
- Kỳ vọng:
  - HTTP 200
  - `data.deposit.status = "CANCELLED"`
  - Phòng trở lại `AVAILABLE`

**Test 5.2 – Tạo lại deposit mới để test tiếp luồng Payment:**
- Gọi lại `POST /api/bookings/deposits` → lưu `depositId` mới.

---

### 6. Tạo Transaction (Payment)

**Test 6.1 – Tạo transaction thành công:**
- Request: `POST {{baseUrl}}/api/payments/transactions`
- Auth: `Bearer {{tenantToken}}`
- Body:
  ```json
  {
    "deposit_id": "{{depositId}}",
    "payment_method": "VNPAY",
    "return_url": "http://localhost:3000/payment/result"
  }
  ```
- Kỳ vọng:
  - HTTP 201
  - `data.transaction.status = "PENDING"`
  - `data.transaction.payment_url` không rỗng (mock URL)
- Script: lưu `transactionId = data.transaction.transaction_id`.

**Test 6.2 – Duplicate transaction cho cùng deposit:**
- Gọi lại request trên.
- Kỳ vọng: HTTP 409.

**Test 6.3 – Tạo transaction cho deposit không tồn tại:**
- Dùng `deposit_id` giả.
- Kỳ vọng: HTTP 404.

---

### 7. Webhook – Thanh Toán Thành Công

**Test 7.1 – Webhook SUCCESS:**
- Request: `POST {{baseUrl}}/api/payments/webhook`
- Body:
  ```json
  {
    "transaction_id": "{{transactionId}}",
    "status": "SUCCESS",
    "checksum": "mock-valid-checksum"
  }
  ```
- Kỳ vọng:
  - HTTP 200
  - `transaction.status = "SUCCESS"`
  - `deposit.status = "CONFIRMED"`
  - `room.status = "RENTED"`

**Test 7.2 – Verify bằng GET sau webhook:**
- `GET /api/payments/transactions/{{transactionId}}` → `status = "SUCCESS"`
- `GET /api/bookings/deposits/{{depositId}}` → `status = "CONFIRMED"`

**Test 7.3 – Idempotency: gọi webhook lần 2:**
- Gọi lại webhook SUCCESS với cùng `transactionId`.
- Kỳ vọng: HTTP 200, không có gì thay đổi (không double-confirm).

---

### 8. Webhook – Thanh Toán Thất Bại

**Test 8.1 – Tạo deposit + transaction mới để test failed flow:**
- `POST /api/bookings/deposits` → `depositId2`
- `POST /api/payments/transactions` (với `depositId2`) → `transactionId2`

**Test 8.2 – Webhook FAILED:**
- Body:
  ```json
  {
    "transaction_id": "{{transactionId2}}",
    "status": "FAILED",
    "checksum": "mock-valid-checksum"
  }
  ```
- Kỳ vọng:
  - `transaction.status = "FAILED"`
  - `deposit.status = "CANCELLED"`
  - `room.status = "AVAILABLE"`

---

### 9. Expire Deposit (Admin)

**Test 9.1 – Trigger expire thủ công:**
- *(Trước đó: sửa `expired_at` của 1 deposit về quá khứ trong DB, hoặc tạo deposit rồi đợi 15 phút)*
- Request: `POST {{baseUrl}}/api/admin/bookings/expire-deposits`
- Auth: `Bearer {{adminToken}}`
- Kỳ vọng:
  - HTTP 200
  - `data.expired` là array (có thể rỗng nếu chưa có deposit hết hạn)
  - Deposit hết hạn chuyển thành `EXPIRED`, phòng về `AVAILABLE`

**Test 9.2 – Non-admin gọi expire:**
- Auth: `Bearer {{tenantToken}}`
- Kỳ vọng: HTTP 403.

---

### 10. Admin Transaction List

**Test 10.1 – Admin xem toàn bộ giao dịch:**
- Request: `GET {{baseUrl}}/api/admin/transactions`
- Auth: `Bearer {{adminToken}}`
- Kỳ vọng: HTTP 200, `data.items` là array, có `pagination`.

**Test 10.2 – Filter theo status:**
- Request: `GET {{baseUrl}}/api/admin/transactions?status=SUCCESS`
- Kỳ vọng: chỉ trả về transaction SUCCESS.

**Test 10.3 – Tenant xem admin API:**
- Auth: `Bearer {{tenantToken}}`
- Kỳ vọng: HTTP 403.

---

## Postman Test Scripts Hữu Ích

**Lưu token sau login:**
```js
const json = pm.response.json();
pm.environment.set('tenantToken', json.data?.tokens?.accessToken || '');
```

**Lưu depositId:**
```js
const json = pm.response.json();
pm.environment.set('depositId', json.data?.deposit?.deposit_id || '');
```

**Lưu transactionId:**
```js
const json = pm.response.json();
pm.environment.set('transactionId', json.data?.transaction?.transaction_id || '');
```

**Kiểm tra envelope chuẩn:**
```js
pm.test('Response envelope OK', function() {
  const json = pm.response.json();
  pm.expect(json).to.have.property('success');
  pm.expect(json).to.have.property('message');
  pm.expect(json).to.have.property('data');
});
```

**Kiểm tra status PROCESSING sau khi tạo deposit:**
```js
pm.test('Deposit status PROCESSING', function() {
  const json = pm.response.json();
  pm.expect(json.data.deposit.status).to.eql('PROCESSING');
});
```

**Kiểm tra idempotency:**
```js
pm.test('Webhook idempotent', function() {
  pm.response.to.have.status(200);
  pm.expect(pm.response.json().success).to.be.true;
});
```

---

## Ghi chú cuối

- Webhook trong project này là **mock** – không có signature thật, checksum chỉ cần khớp giá trị cố định trong code.
- Nếu muốn test expire tự động mà không cần đợi 15 phút, hãy update trực tiếp `expired_at` trong DB: `UPDATE deposits SET expired_at = NOW() - INTERVAL '1 minute' WHERE deposit_id = '...'`.
- Tài liệu liên quan: xem [TEAMWORK_CNPM.md](../../TEAMWORK_CNPM.md) mục `6.3 Booking/Payment/Transactions`.

---

*File này tạo để hỗ trợ Thịnh kiểm thử module Booking & Payment bằng Postman.*
