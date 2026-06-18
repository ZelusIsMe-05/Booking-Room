# Hướng dẫn test luồng Đăng ký Landlord + Duyệt (Postman)

Tài liệu dễ đọc để test tay tính năng theo `1.10-plan-landlord-regist.md` / `report-landlord-regist.md`.

**Base URL:** `http://localhost:5000`

---

## Bước 0 — Chuẩn bị

```bash
cd backend
npm run migrate      # áp migration 027 (thêm cột duyệt landlords)
npm run seed         # tạo admin + landlord/tenant mẫu (tùy chọn)
npm run dev          # chạy server (nodemon)
```

- **OTP lấy ở đâu:** nếu đã cấu hình SMTP trong `.env` → OTP gửi vào **email thật** (kiểm tra cả Spam). Nếu chưa cấu hình → server **in OTP ra console** (dev mode), nhìn terminal đang chạy `npm run dev`.
- **Admin có sẵn từ seed:** `admin@booking.local` / `Password@123`.
- Access token sống **15 phút**; nếu gặp `401` thì login lại hoặc gọi `POST /api/auth/refresh`.

---

## Bước 1 — Đăng ký Landlord (multipart)

`POST /api/auth/register`

Tab **Body → form-data** (KHÔNG dùng raw/JSON):

| Key | Type | Value |
|---|---|---|
| role | Text | `LANDLORD` |
| fullName | Text | `Nguyen Van Chu` |
| username | Text | `chunha01` |
| email | Text | `chunha01@example.com` |
| phoneNumber | Text | `0911222333` |
| password | Text | `Password@123` |
| confirmPassword | Text | `Password@123` |
| gender | Text | `MALE` |
| dateOfBirth | Text | `1990-05-20` |
| id_card_front | **File** | chọn 1 ảnh |
| id_card_back | **File** | chọn 1 ảnh |

### Cách upload ảnh (chi tiết từng click)

1. Tab **Body** → chọn radio **form-data** (KHÔNG phải `raw`/`binary`).
2. Nhập các field Text ở trên (giữ mặc định mỗi dòng là Text).
3. Thêm dòng key `id_card_front`:
   - Di chuột vào ô **Key** → góc phải hiện dropdown **Text ▾** → đổi sang **File**.
   - Cột **Value** biến thành nút **Select Files** → chọn 1 ảnh (jpg/png).
4. Làm tương tự cho `id_card_back`.
5. **Send.**

### ⚠️ 4 lỗi hay gặp

| Lỗi | Nguyên nhân | Cách sửa |
|---|---|---|
| `400 ID_CARD_REQUIRED` dù đã chọn ảnh | Sai tên field (`idCardFront`, `id_card`…) | Phải đúng **`id_card_front`** và **`id_card_back`** (snake_case) |
| Treo / `Unexpected end of form` | Tự set header `Content-Type: multipart/form-data` → mất boundary | **Xóa** header Content-Type tự thêm; để Postman tự sinh |
| `400 INVALID_UPLOAD` | File không phải ảnh hoặc > 5MB | Chọn ảnh `image/*`, ≤ 5MB |
| `400 VALIDATION_ERROR` ở `role` | Gửi `role=landlord` (thường) | Phải đúng chữ hoa **`LANDLORD`** |

> **Quan trọng nhất:** đừng tự thêm header `Content-Type`. Với form-data, Postman tự đặt `Content-Type: multipart/form-data; boundary=...`. Ghi đè thủ công sẽ làm multer không parse được file.

**Kỳ vọng:** `201`, `data.role=LANDLORD`, `data.approvalStatus=PENDING`.
Kiểm tra file ghi tại `backend/uploads/landlords/{userId}/1.jpg` và `2.jpg`.

**Test phụ:**
- Bỏ 1 file → `400 ID_CARD_REQUIRED`
- Upload file không phải ảnh → `400 INVALID_UPLOAD`
- Ảnh > 5MB → `400 INVALID_UPLOAD`
- Trùng email/username/phone → `409`

---

## Bước 2 — Verify OTP

`POST /api/auth/verify-otp` → Body **raw → JSON**:

```json
{ "email": "chunha01@example.com", "otp": "<OTP từ console>" }
```

**Kỳ vọng:** `200`, `status=ACTIVE`.

---

## Bước 3 — Đăng nhập landlord

`POST /api/auth/login` → raw JSON:

```json
{ "identifier": "chunha01@example.com", "password": "Password@123" }
```

**Kỳ vọng:** `200` → copy `data.accessToken`.

`GET /api/auth/me` → tab **Authorization → Bearer Token** dán token → thấy `approvalStatus: "PENDING"`.

---

## Bước 4 — Thử tạo phòng khi CHƯA duyệt (phải bị chặn)

`POST /api/host/rooms` (Bearer token landlord)

**Kỳ vọng:** `403 LANDLORD_NOT_APPROVED` kèm `data.approvalStatus`.

---

## Bước 5 — Admin duyệt

1. `POST /api/auth/login` với `admin@booking.local` / `Password@123` → copy accessToken admin.
2. `GET /api/admin/landlords?status=PENDING` (Bearer admin) → thấy hồ sơ vừa đăng ký, lấy `userId`.
3. (Xem ảnh) `GET /api/admin/landlords/{userId}/id-card/front` (Bearer admin) → Postman hiển thị ảnh ở tab Body. (`side` = `front` hoặc `back`)
4. Duyệt: `PATCH /api/admin/landlords/{userId}/approve` (Bearer admin) → `200`, `approvalStatus=APPROVED`.
   - Hoặc từ chối: `PATCH /api/admin/landlords/{userId}/reject` raw JSON:
     ```json
     { "reason": "Ảnh CCCD bị mờ" }
     ```
     - Thiếu `reason` → `400 REJECTION_REASON_REQUIRED`.

---

## Bước 6 — Landlord tạo phòng lại

`POST /api/host/rooms` (Bearer token landlord) → giờ qua được guard (không còn 403).

---

## Đối chứng — Đăng ký Tenant (không cần ảnh)

`POST /api/auth/register` → Body **raw → JSON**:
```json
{
  "role": "TENANT",
  "fullName": "Le Van Khach",
  "username": "khach01",
  "email": "khach01@example.com",
  "phoneNumber": "0911000999",
  "password": "Password@123",
  "confirmPassword": "Password@123",
  "gender": "MALE",
  "dateOfBirth": "2000-01-01"
}
```

**Kỳ vọng:** `201`; sau verify OTP dùng được ngay (không cần duyệt).

---

## Test bảo mật ảnh CCCD

Truy cập trực tiếp `GET http://localhost:5000/uploads/landlords/{userId}/1.jpg` (không qua admin)
→ **`403`** (đã chặn serve tĩnh; chỉ Admin xem qua endpoint `/api/admin/landlords/:id/id-card/:side`).

---

## Bảng tổng hợp case

| # | Hành động | Kỳ vọng |
|---|---|---|
| 1 | Register TENANT (JSON) | `201`, dùng ngay sau OTP |
| 2 | Register LANDLORD thiếu ảnh | `400 ID_CARD_REQUIRED` |
| 3 | Register LANDLORD đủ 2 ảnh | `201`, `PENDING`, file ghi vào uploads |
| 4 | Ảnh > 5MB / không phải ảnh | `400 INVALID_UPLOAD` |
| 5 | Trùng email/username/phone | `409` |
| 6 | Verify OTP landlord | `200`, `ACTIVE`, vẫn `PENDING` |
| 7 | `GET /me` landlord | có `approvalStatus` |
| 8 | Landlord chưa duyệt tạo phòng | `403 LANDLORD_NOT_APPROVED` |
| 9 | Admin list `?status=PENDING` | thấy hồ sơ |
| 10 | Admin xem ảnh CCCD | `200` ảnh; non-admin → `403` |
| 11 | Truy cập `/uploads/landlords/...` | `403` |
| 12 | Admin approve | `200`, `APPROVED` → tạo phòng OK |
| 13 | Admin reject thiếu reason | `400 REJECTION_REASON_REQUIRED` |
| 14 | Admin reject có reason | `200`, `REJECTED` + lý do |
