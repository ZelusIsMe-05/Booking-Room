# Kế Hoạch Triển Khai (Phần Thinh Đảm Nhận)

**Base URL:** `http://localhost:5000/api`

---

## Tổng quan kiến trúc

Luồng xử lý theo chuẩn của dự án:

```
Route → Controller → Service → Repository → Database
```

| Layer | File | Vai trò |
| --- | --- | --- |
| Routes | `routes/booking/depositRoutes.js` | Định tuyến, gắn middleware auth/role |
| Routes | `routes/host/bookingRoutes.js` | Định tuyến cho LANDLORD |
| Routes | `routes/payment/transactionRoutes.js` | Định tuyến cho payment |
| Routes | `routes/admin/bookingRoutes.js` | Định tuyến cho ADMIN |
| Controller | `controllers/booking/depositController.js` | Nhận req, gọi service, trả response |
| Controller | `controllers/payment/transactionController.js` | Nhận req, gọi service, trả response |
| Service | `services/booking/depositService.js` | Business logic & validation |
| Service | `services/payment/transactionService.js` | Business logic & validation |
| Repository | `repositories/booking/depositRepository.js` | Tất cả DB query cho deposits |
| Repository | `repositories/payment/transactionRepository.js` | Tất cả DB query cho transactions |

---

## Module 1: Deposit (Đặt cọc phòng)

### Mục tiêu nghiệp vụ

Tenant muốn đặt cọc 1 phòng → hệ thống **khóa phòng 15 phút** để không ai đặt trùng trong lúc Tenant đang làm thủ tục thanh toán. Nếu quá 15 phút mà chưa thanh toán, deposit tự `EXPIRED` và phòng được mở lại.

### Luồng trạng thái

```
PROCESSING ──(thanh toán thành công)──► CONFIRMED (room giữ LOCKED, gửi thông báo cho Host)
CONFIRMED  ──(host duyệt ACCEPTED)────► ACCEPTED  (room → RENTED, bắt đầu 7 ngày payout)
CONFIRMED  ──(host từ chối REJECTED)──► REJECTED  (room → AVAILABLE, hoàn tiền cọc)
PROCESSING ──(tenant hủy)─────────────► CANCELLED (room → AVAILABLE)
PROCESSING ──(quá 15 phút)────────────► EXPIRED   (room → AVAILABLE)
```

---

### API 1.1 — Tạo đơn đặt cọc

```
POST /api/bookings/deposits
Authorization: Bearer {tenantToken}
```

**Input (body):**
```json
{
  "room_id": "uuid",
  "appointment_time": "2025-08-01T09:00:00Z"   // tuỳ chọn
}
```

**Các kiểm tra trước khi tạo (Business rules):**
1. `room_id` bắt buộc → nếu thiếu: `400`
2. Phòng phải tồn tại → nếu không: `404`
3. `room_approvals.approval_status = 'APPROVED'` → nếu chưa duyệt: `400`
4. `rooms.status = 'AVAILABLE'` → nếu đang LOCKED/RENTED: `409`
5. Tenant chưa có deposit `PROCESSING` cho phòng này → nếu đã có: `409`

**Tại sao kiểm tra như vậy?**
- Rule 3+4: Chỉ phòng đã được admin duyệt và đang trống mới có thể đặt cọc.
- Rule 5: Unique index `deposits_one_processing_per_room` trong DB đã bảo vệ tầng dưới, nhưng service kiểm tra trước để trả lỗi rõ ràng hơn.

**Khi tạo thành công (trong 1 DB transaction):**
- INSERT vào `deposits`: `status = PROCESSING`, `expired_at = now + 15 phút`, `deposit_amount` lấy từ `rooms.deposit_amount`
- UPDATE `rooms.status = LOCKED`

**Output (201):**
```json
{
  "success": true,
  "message": "Tao don dat coc thanh cong. Phong da bi khoa trong 15 phut.",
  "data": {
    "deposit": {
      "deposit_id": "uuid",
      "tenant_id": "uuid",
      "landlord_id": "uuid",
      "room_id": "uuid",
      "deposit_amount": 2000000,
      "status": "PROCESSING",
      "expired_at": "2025-08-01T09:15:00Z",
      "appointment_time": "2025-08-01T09:00:00Z",
      "created_at": "2025-08-01T09:00:00Z"
    }
  }
}
```

---

### API 1.2 — Tenant xem danh sách deposit của mình

```
GET /api/bookings/deposits/my?status=PROCESSING&page=1&limit=20
Authorization: Bearer {tenantToken}
```

**Tại sao route `/my` đứng trước `/:id`?**
Nếu để `/:id` trước, Express sẽ hiểu `my` là một `depositId` và báo lỗi "không tìm thấy deposit". Quy tắc: route cố định luôn đứng trước route có tham số.

**Output (200):**
```json
{
  "data": {
    "deposits": [ { "deposit_id": "...", "room_title": "...", ... } ],
    "pagination": { "page": 1, "limit": 20, "total": 5 }
  }
}
```

---

### API 1.3 — Xem chi tiết 1 deposit

```
GET /api/bookings/deposits/:id
Authorization: Bearer {token}
```

**Phân quyền:**
- `TENANT`: chỉ xem deposit của mình (`tenant_id = userId`) → nếu không phải: `403`
- `LANDLORD`: chỉ xem deposit phòng của mình (`landlord_id = userId`) → nếu không phải: `403`
- `ADMIN`: xem được tất cả

**Output (200):** deposit đầy đủ kèm `room_title`, `room_address`, `monthly_rent`.

---

### API 1.4 — Tenant hủy deposit

```
PATCH /api/bookings/deposits/:id/cancel
Authorization: Bearer {tenantToken}
Body: { "reason": "Đổi ý không thuê nữa." }   // tuỳ chọn
```

**Kiểm tra:**
1. Deposit phải tồn tại → `404`
2. `tenant_id` phải là userId của người gọi → `403`
3. `status` phải là `PROCESSING` → nếu đã CONFIRMED/CANCELLED/EXPIRED: `400`

**Khi hủy (1 DB transaction):**
- UPDATE `deposits.status = CANCELLED`, ghi `cancelled_at`, `cancellation_reason`
- UPDATE `rooms.status = AVAILABLE` — phòng được mở lại ngay

**Output (200):** deposit với status mới là `CANCELLED`.

---

### API 1.5 — Landlord xem danh sách deposit cho phòng của mình

```
GET /api/host/bookings/deposits?status=PROCESSING&page=1&limit=20
Authorization: Bearer {landlordToken}
```

JOIN với `users` để trả thêm `tenant_name`, `tenant_phone` — để host biết ai đang đặt.

---

### API 1.6 — Landlord xử lý deposit

```
PATCH /api/host/bookings/deposits/:id/status
Authorization: Bearer {landlordToken}
Body: { "status": "ACCEPTED" }  // Hoặc "REJECTED", có thể kèm "reason"
```

**Chỉ chấp nhận:** `ACCEPTED` hoặc `REJECTED`.

**Kiểm tra:**
1. `status` phải hợp lệ (`ACCEPTED`/`REJECTED`) → `400`
2. Deposit phải tồn tại → `404`
3. `landlord_id` phải là userId của host → `403`
4. `status` hiện tại của đơn đặt cọc phải là `CONFIRMED` (tức là tenant đã thanh toán thành công) → `400`

**Khi duyệt thành công (trong 1 DB transaction):**
- Nếu `status === 'ACCEPTED'`:
  - Cập nhật `deposits.status = 'ACCEPTED'`, ghi nhận `host_accepted_at = now`, `payout_eligible_at = now + 7 days` (tiền cọc sẽ được chuyển cho chủ trọ sau 7 ngày nếu không có ý kiến từ tenant), `payout_status = 'PENDING'`.
  - Cập nhật `rooms.status = 'RENTED'`.
  - Hệ thống tự động gửi thông báo cho Tenant: *"Đơn đặt cọc phòng [...] của bạn đã được chủ trọ phê duyệt. Phòng đã được thuê thành công!"*
- Nếu `status === 'REJECTED'`:
  - Cập nhật `deposits.status = 'REJECTED'`, ghi nhận `host_rejected_at = now`, `cancellation_reason = reason`, `payout_status = 'REFUNDED'` (hoàn trả tiền cho tenant).
  - Cập nhật `rooms.status = 'AVAILABLE'` để phòng trống trở lại.
  - Hệ thống tự động gửi thông báo cho Tenant báo bị từ chối kèm lý do và việc hoàn tiền.

---

## Module 2: Payment & Transactions

### Mục tiêu nghiệp vụ

Sau khi có deposit `PROCESSING`, Tenant tạo giao dịch → nhận link thanh toán → thực hiện thanh toán → cổng thanh toán gọi webhook → hệ thống cập nhật kết quả.

**Tại sao không lưu `payment_url` vào DB?**
Link thanh toán (VNPAY, MOMO, ...) chỉ có hiệu lực trong thời gian ngắn (thường 15 phút - vài giờ). Lưu vào DB sẽ tạo ra dữ liệu rác sau khi URL hết hạn. Thay vào đó, URL được sinh ra ngay khi tạo transaction và chỉ trả về trong response một lần duy nhất — nếu người dùng cần thanh toán lại, họ tạo transaction mới.

### Luồng trạng thái Transaction

```
PENDING ──(webhook SUCCESS)──► SUCCESS
PENDING ──(webhook FAILED) ──► FAILED
```

---

### API 2.1 — Tenant tạo giao dịch thanh toán

```
POST /api/payments/transactions
Authorization: Bearer {tenantToken}
Body:
{
  "deposit_id": "uuid",
  "payment_method": "VNPAY",       // VNPAY | MOMO | BANK_TRANSFER
  "return_url": "http://..."        // URL frontend để redirect sau khi thanh toán
}
```

**Kiểm tra:**
1. `deposit_id` bắt buộc → `400`
2. `payment_method` phải hợp lệ → `400`
3. Deposit phải tồn tại → `404`
4. `tenant_id` phải là người gọi → `403`
5. Deposit phải đang `PROCESSING` → `400`
6. Chưa có transaction `PENDING` cho deposit này → nếu đã có: `409`

**Tại sao kiểm tra rule 6?**
Tránh việc người dùng nhấn 2 lần tạo ra 2 giao dịch pending cho cùng 1 đơn cọc.

**Khi tạo:**
- INSERT `transactions` (`deposit_id`, `amount` lấy từ `deposit.deposit_amount`, `payment_method`, `status = PENDING`)
- Sinh `payment_url` mock từ `transaction_id` vừa tạo → **không lưu vào DB**

**Output (201):**
```json
{
  "data": {
    "transaction": {
      "transaction_id": "uuid",
      "deposit_id": "uuid",
      "amount": 2000000,
      "payment_method": "VNPAY",
      "status": "PENDING",
      "payment_url": "http://sandbox-gateway.local/pay?txn=uuid&return=...",
      "created_at": "..."
    }
  }
}
```

---

### API 2.2 — Webhook từ cổng thanh toán

```
POST /api/payments/webhook
(Không cần Authorization — public endpoint)
Body:
{
  "transaction_id": "uuid",
  "status": "SUCCESS",            // SUCCESS | FAILED
  "checksum": "mock-valid-checksum"
}
```

**Đây là endpoint quan trọng nhất — phải đảm bảo Idempotency:**
Cổng thanh toán thực tế có thể gọi webhook nhiều lần (retry). Nếu xử lý trùng sẽ dẫn đến double-confirm (rất nguy hiểm). Vì vậy:

**Luồng xử lý:**
1. Verify `checksum` → nếu sai: `400`
2. Lấy transaction → nếu không tìm thấy: `404`
3. **Idempotency check**: nếu `transaction.status != 'PENDING'` → transaction đã xử lý rồi → trả `200` ngay, không làm gì thêm
4. Nếu vẫn PENDING → cập nhật trong **1 DB transaction duy nhất**:

**Khi SUCCESS:**
- `transactions.status = SUCCESS`
- `deposits.status = CONFIRMED`, ghi `confirmed_at = now`
- `rooms.status = LOCKED` (phòng tiếp tục được khóa và chờ Host duyệt, không bị giải phóng bởi cron hết hạn vì đơn đã chuyển sang CONFIRMED)
- Gửi thông báo hệ thống đến cho Host để nhắc duyệt đơn đặt cọc.

**Khi FAILED:**
- `transactions.status = FAILED`
- `deposits.status = CANCELLED`, ghi `cancelled_at`
- `rooms.status = AVAILABLE`

**Tại sao dùng 1 DB transaction?**
Nếu bước giữa bị lỗi (ví dụ: update transaction thành công nhưng update phòng thất bại), dữ liệu sẽ inconsistent. 1 DB transaction đảm bảo tất cả hoặc không cái nào được commit.

**Output (200):**
```json
{
  "data": {
    "transaction": { "status": "SUCCESS", ... },
    "idempotent": false   // true nếu đã xử lý trước đó
  }
}
```

---

### API 2.3 — Xem chi tiết giao dịch

```
GET /api/payments/transactions/:id
Authorization: Bearer {token}
```

**Phân quyền** tương tự deposit: TENANT xem của mình, LANDLORD xem giao dịch phòng của mình, ADMIN xem tất cả.

---

### API 2.4 — Tenant xem lịch sử giao dịch

```
GET /api/payments/transactions/my?status=SUCCESS&page=1&limit=20
Authorization: Bearer {tenantToken}
```

*(Lưu ý: `/my` phải đứng trước `/:id` trong routes — cùng lý do như deposit)*

---

### API 2.5 — Admin xem toàn bộ giao dịch (read-only)

```
GET /api/admin/transactions?status=SUCCESS&payment_method=VNPAY&page=1&limit=20
Authorization: Bearer {adminToken}
```

Dữ liệu read-only — admin không thể sửa giao dịch. Kèm thông tin `tenant_name`, `tenant_email`, `room_title`.

---

## Module 3: Expire Job

### Mục tiêu nghiệp vụ

Deposit có `expired_at = created_at + 15 phút`. Sau 15 phút mà không thanh toán, deposit phải chuyển sang `EXPIRED` và phòng được giải phóng. Trong phạm vi backend-first (không cần cron job thật), dùng API để Postman trigger thủ công.

```
POST /api/admin/bookings/expire-deposits
Authorization: Bearer {adminToken}
```

**Luồng:**
1. Query tất cả deposit có `status = PROCESSING` VÀ `expired_at < NOW()`
2. Batch update trong 1 DB transaction:
   - `deposits.status = EXPIRED`
   - `rooms.status = AVAILABLE` cho tất cả phòng liên quan

**Tại sao batch trong 1 transaction?**
Nếu expire 10 deposit mà giữa chừng bị lỗi, sẽ có phòng bị EXPIRED deposit nhưng vẫn còn LOCKED. Batch transaction đảm bảo all-or-nothing.

**Output (200):**
```json
{
  "message": "Da expire 3 don dat coc qua han.",
  "data": {
    "expired": [ { "deposit_id": "...", "status": "EXPIRED", ... } ],
    "count": 3
  }
}
```

---

## Tóm tắt file đã tạo/sửa

### Files mới (Thinh)

| File | Layer | Mô tả |
| --- | --- | --- |
| `repositories/booking/depositRepository.js` | Repository | DB queries cho deposits. Helper nội bộ `_setRoomStatus()` dùng chung để lock/unlock phòng |
| `repositories/payment/transactionRepository.js` | Repository | DB queries cho transactions. `processWebhookUpdate()` cập nhật 3 bảng atomically |
| `services/booking/depositService.js` | Service | Business logic: validate điều kiện, role guard, tính `expired_at` |
| `services/payment/transactionService.js` | Service | Business logic: validate, idempotency webhook, sinh `payment_url` on-the-fly |
| `controllers/booking/depositController.js` | Controller | Gọi service, wrap response |
| `controllers/payment/transactionController.js` | Controller | Gọi service, wrap response |
| `routes/booking/depositRoutes.js` | Route | Tenant: `/api/bookings/deposits/*` |
| `routes/host/bookingRoutes.js` | Route | Landlord: `/api/host/bookings/deposits/*` |
| `routes/payment/transactionRoutes.js` | Route | `/api/payments/*` |
| `routes/admin/bookingRoutes.js` | Route | Admin: `/api/admin/transactions`, `/api/admin/bookings/expire-deposits` |

### Files đã sửa (có ghi chú)

| File | Thay đổi |
| --- | --- |
| `app.js` | Mount tất cả routes mới của Thinh, host routes |
| `routes/host/roomRoutes.js` | ⚠️ Sửa `authenticate` → `requireAuth` (lỗi từ merge Thi) |
| `routes/admin/roomRoutes.js` | ⚠️ Sửa `authenticate` → `requireAuth` (lỗi từ merge Thi) |

### File cần xóa thủ công

| File | Lý do |
| --- | --- |
| `db/migrations/023_add_payment_url_to_transactions.js` | `payment_url` không cần lưu DB (URL hết hạn nhanh), bị loại bỏ sau review |

---

## ✅ Checklist hoàn thành

- [x] Repository deposit: tất cả hàm query
- [x] Repository transaction: tất cả hàm query, processWebhookUpdate atomic
- [x] Service deposit: kiểm tra điều kiện, lock room, expired_at 15 phút
- [x] Service transaction: tạo transaction, webhook idempotent, payment_url không lưu DB
- [x] Controller deposit + transaction
- [x] Routes: tenant, landlord (LANDLORD role), payment, admin
- [x] Mount routes vào app.js
- [x] Sửa lỗi `authenticate` → `requireAuth` từ merge Thi
- [ ] Xóa file migration 023 (bạn tự xóa thủ công)
- [ ] Chạy `npm run migrate` để áp dụng migration `024_add_deposit_states_and_payout.js`
- [ ] Test Postman theo các luồng mới trong `thinh/test.md`
