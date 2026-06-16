# Guideline Viết Code & Test (Deposit, Payment, Transactions)

## 1. Guideline Test Deposit (Đặt cọc) Bằng Postman

Base URL: `http://localhost:5000/api`

### Bước 1: Đăng nhập lấy token

Đăng nhập bằng tài khoản **TENANT** để tạo deposit:
```json
POST /api/auth/login
{
  "identifier": "tenant1",
  "password": "Password@123"
}
```
Lấy `accessToken` nhét vào tab **Authorization > Bearer Token**.

Đăng nhập bằng **LANDLORD** để test phần host:
```json
{
  "identifier": "landlord1",
  "password": "Password@123"
}
```

Đăng nhập bằng **ADMIN** để test admin:
```json
{
  "identifier": "admin",
  "password": "Password@123"
}
```

---

### Bước 2: Tạo đơn đặt cọc (Tenant)

```
POST http://localhost:5000/api/bookings/deposits
Authorization: Bearer {tenantToken}
```
Body:
```json
{
  "room_id": "d0000000-0000-0000-0000-000000000001",
  "appointment_time": "2025-08-01T09:00:00Z"
}
```
Kết quả mong đợi:
- HTTP `201`
- `data.deposit.status = "PROCESSING"`
- `data.deposit.expired_at` = `created_at + 15 phút`
- Room bị chuyển sang `status = LOCKED`

**Test lỗi – tạo deposit khi phòng chưa APPROVED:**
- Dùng `room_id` của phòng đang PENDING → expect `400` hoặc `404`.

**Test lỗi – tạo 2 deposit PROCESSING cùng lúc:**
- Gọi lại request trên lần 2 → expect `409 Conflict`.

---

### Bước 3: Xem danh sách deposit của Tenant

```
GET http://localhost:5000/api/bookings/deposits/my
Authorization: Bearer {tenantToken}
```
Có thể lọc: `?status=PROCESSING`

---

### Bước 4: Xem chi tiết 1 deposit

```
GET http://localhost:5000/api/bookings/deposits/{deposit_id}
Authorization: Bearer {tenantToken}
```

---

### Bước 5: Hủy đơn đặt cọc

```
PATCH http://localhost:5000/api/bookings/deposits/{deposit_id}/cancel
Authorization: Bearer {tenantToken}
```
Body (tuỳ chọn):
```json
{
  "reason": "Tôi đổi ý không thuê nữa."
}
```
Kết quả mong đợi:
- HTTP `200`
- `data.deposit.status = "CANCELLED"`
- Room trở về `status = AVAILABLE`

---

### Bước 6: Host xem và xử lý deposit

Xem danh sách deposit của phòng mình:
```
GET http://localhost:5000/api/host/bookings/deposits
Authorization: Bearer {hostToken}
```

Xác nhận hoặc từ chối deposit:
```
PATCH http://localhost:5000/api/host/bookings/deposits/{deposit_id}/status
Authorization: Bearer {hostToken}
```
Body:
```json
{
  "status": "CANCELLED",
  "reason": "Phòng đã có người khác đặt"
}
```

---

## 2. Guideline Test Payment & Transactions Bằng Postman

### Bước 1: Tạo giao dịch thanh toán (Tenant)

Sau khi có deposit đang `PROCESSING`, tạo transaction:
```
POST http://localhost:5000/api/payments/transactions
Authorization: Bearer {tenantToken}
```
Body:
```json
{
  "deposit_id": "<deposit_id vừa tạo>",
  "payment_method": "VNPAY",
  "return_url": "http://localhost:3000/payment/result"
}
```
Kết quả mong đợi:
- HTTP `201`
- `data.transaction.status = "PENDING"`
- `data.transaction.payment_url` có giá trị (mock URL)

**Test lỗi – tạo 2 transaction cho cùng 1 deposit:**
- Gọi lại request → expect `409 Conflict`.

---

### Bước 2: Mock webhook – Thanh toán THÀNH CÔNG

Simulate cổng thanh toán gọi webhook:
```
POST http://localhost:5000/api/payments/webhook
```
Body (mock payload thành công):
```json
{
  "transaction_id": "<transaction_id vừa tạo>",
  "status": "SUCCESS",
  "checksum": "mock-valid-checksum"
}
```
Kết quả mong đợi:
- HTTP `200`
- `transaction.status = "SUCCESS"`
- `deposit.status = "CONFIRMED"`
- `room.status = "RENTED"`

**Test idempotency – gọi webhook lần 2:**
- Gọi lại cùng request → vẫn phải trả `200`, không thay đổi gì thêm.

---

### Bước 3: Mock webhook – Thanh toán THẤT BẠI

```
POST http://localhost:5000/api/payments/webhook
```
Body (mock payload thất bại):
```json
{
  "transaction_id": "<transaction_id của transaction khác>",
  "status": "FAILED",
  "checksum": "mock-valid-checksum"
}
```
Kết quả mong đợi:
- `transaction.status = "FAILED"`
- `deposit.status = "CANCELLED"`
- `room.status = "AVAILABLE"`

---

### Bước 4: Xem chi tiết giao dịch

```
GET http://localhost:5000/api/payments/transactions/{transaction_id}
Authorization: Bearer {tenantToken}
```

---

### Bước 5: Xem lịch sử giao dịch của Tenant

```
GET http://localhost:5000/api/payments/transactions/my
Authorization: Bearer {tenantToken}
```

---

### Bước 6: Admin xem toàn bộ giao dịch (read-only)

```
GET http://localhost:5000/api/admin/transactions
Authorization: Bearer {adminToken}
```
Có thể lọc: `?status=SUCCESS&page=1&limit=20`

**Test phân quyền:**
- Dùng `tenantToken` gọi admin API → expect `403`.

---

## 3. Guideline Test Expire Deposit Bằng Postman

### Trigger hết hạn deposit (Admin)

Endpoint dùng để simulate cron job, gọi khi cần test expire flow:
```
POST http://localhost:5000/api/admin/bookings/expire-deposits
Authorization: Bearer {adminToken}
```
Kết quả mong đợi:
- HTTP `200`
- `data.expired` là mảng các deposit đã bị expire
- Deposit có `expired_at < NOW()` và `status = PROCESSING` → chuyển thành `EXPIRED`
- Room tương ứng → `AVAILABLE`

**Cách test:**
1. Tạo deposit mới (bước 2 mục 1).
2. Sửa `expired_at` trực tiếp trong DB về quá khứ (hoặc đợi 15 phút).
3. Gọi endpoint expire này.
4. Gọi `GET /api/bookings/deposits/{id}` kiểm tra `status = EXPIRED`.

---

## 4. Flow E2E Hoàn Chỉnh (Booking → Payment → Confirm)

Chạy theo đúng thứ tự này:

1. `POST /api/auth/login` (tenant) → lưu `tenantToken`
2. `POST /api/auth/login` (admin) → lưu `adminToken`
3. `POST /api/bookings/deposits` → lưu `depositId`
4. Verify: `GET /api/bookings/deposits/{depositId}` → status `PROCESSING`
5. `POST /api/payments/transactions` (dùng `depositId`) → lưu `transactionId`
6. `POST /api/payments/webhook` (status SUCCESS, dùng `transactionId`)
7. Verify: `GET /api/payments/transactions/{transactionId}` → status `SUCCESS`
8. Verify: `GET /api/bookings/deposits/{depositId}` → status `CONFIRMED`
9. `GET /api/admin/transactions` (adminToken) → thấy transaction vừa tạo

---

## 5. Postman Test Scripts

**Lưu token sau khi login:**
```js
const json = pm.response.json();
pm.environment.set('tenantToken', json.data?.tokens?.accessToken || '');
```

**Lưu depositId sau khi tạo deposit:**
```js
const json = pm.response.json();
pm.environment.set('depositId', json.data?.deposit?.deposit_id || '');
```

**Lưu transactionId:**
```js
const json = pm.response.json();
pm.environment.set('transactionId', json.data?.transaction?.transaction_id || '');
```

**Kiểm tra response envelope:**
```js
pm.test('Envelope OK', function() {
  const json = pm.response.json();
  pm.expect(json).to.have.property('success');
  pm.expect(json).to.have.property('message');
  pm.expect(json).to.have.property('data');
  pm.expect(json.success).to.be.true;
});
```

**Kiểm tra idempotency của webhook:**
```js
pm.test('Idempotent webhook', function() {
  pm.response.to.have.status(200);
  const json = pm.response.json();
  pm.expect(json.success).to.be.true;
});
```
