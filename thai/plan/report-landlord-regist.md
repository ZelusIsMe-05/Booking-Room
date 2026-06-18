# Report: Tách đăng ký Tenant/Landlord + Duyệt Landlord

Triển khai theo plan `1.10-plan-landlord-regist.md`. Giữ **1 endpoint `/register`**, field `role` quyết định nhánh xử lý (Tenant ngay / Landlord chờ Admin duyệt). Landlord đăng ký kèm 2 ảnh CCCD (multipart). Ảnh lưu **local** `uploads/landlords/{id}/1.jpg|2.jpg` qua tầng trừu tượng `idCardStorage` (sẵn sàng đổi S3).

## Endpoint

| Method | Path | Mô tả |
| --- | --- | --- |
| POST | `/api/auth/register` | `role=TENANT` (JSON) → như cũ. `role=LANDLORD` (multipart + `id_card_front`/`id_card_back`) → tạo user `INACTIVE` + landlord `PENDING` → gửi OTP |
| GET | `/api/auth/me` | Trả thêm `approvalStatus` cho landlord |
| GET | `/api/admin/landlords?status=` | Danh sách hồ sơ chủ nhà (lọc PENDING/APPROVED/REJECTED) |
| GET | `/api/admin/landlords/:id` | Chi tiết hồ sơ |
| GET | `/api/admin/landlords/:id/id-card/:side` | Stream ảnh CCCD (`side=front\|back`), chỉ Admin |
| PATCH | `/api/admin/landlords/:id/approve` | Duyệt → `APPROVED` |
| PATCH | `/api/admin/landlords/:id/reject` | Từ chối → `REJECTED` (+ `reason` bắt buộc) |

Thao tác chủ nhà (`POST/PATCH/DELETE /api/host/rooms…`) bị chặn `403 LANDLORD_NOT_APPROVED` tới khi được duyệt. `GET /my` vẫn cho xem.

## Quyết định thiết kế

- **Trạng thái duyệt đặt ở `landlords.approval_status`** (không thêm status vào `users`) → không đụng luồng login/refresh/verify. Landlord verify OTP xong `status=ACTIVE` nhưng `approval_status=PENDING`.
- **1 endpoint + dynamic schema theo role**: multer `uploadIdCards` luôn chạy (tự bỏ qua nếu JSON) → `validateRegisterByRole` chọn schema → controller rẽ service. Tương thích ngược: client cũ không gửi `role` → nhánh TENANT.
- **File validate ngoài Zod**: Zod chỉ validate `req.body`; bắt buộc 2 ảnh CCCD check ở controller (`req.files`).
- **Sinh `user_id` ở app** (`crypto.randomUUID()`) cho landlord để biết thư mục ảnh trước, ghi ảnh **trước** transaction DB (tránh gọi I/O trong transaction — quan trọng khi lên S3); rollback `idCardStorage.remove()` nếu DB lỗi.
- **DB lưu key tương đối** `landlords/{id}/1.jpg` (không full URL) → đổi S3 không phải migrate dữ liệu.

## File liên quan

### Tạo mới
| File | Vai trò |
| --- | --- |
| `backend/db/migrations/027_add_landlord_approval.js` | Thêm `approval_status`/`rejection_reason`/`reviewed_at`/`reviewed_by` vào `landlords`; backfill `APPROVED` cho landlord cũ |
| `backend/services/storage/idCardStorage.js` | Lưu ảnh CCCD (driver local): `save`/`remove`/`getStream`, key tương đối, sẵn sàng S3 |
| `backend/routes/admin/landlordRoutes.js` | Route admin duyệt landlord (`/api/admin/landlords`) |

### Sửa
| File | Thay đổi |
| --- | --- |
| `backend/models/User.js` | Tách `registerTenantSchema`/`registerLandlordSchema` (chung `baseRegisterFields`, `role` literal); `toRegisterResponse` trả thêm `role`+`approvalStatus` |
| `backend/middlewares/validateMiddleware.js` | `validateRegisterByRole` chọn schema theo `req.body.role` |
| `backend/middlewares/uploadMiddleware.js` | `uploadIdCards` (`upload.fields` 2 ảnh) + map `MulterError`→`AppError 400` |
| `backend/middlewares/authMiddleware.js` | `requireApprovedLandlord` (403 nếu chưa duyệt) |
| `backend/controllers/auth/auth.controller.js` | `register` rẽ nhánh theo role + check 2 file CCCD |
| `backend/services/auth/auth.service.js` | `registerLandlord` (sinh id, lưu ảnh, rollback); `getCurrentUser` trả `approvalStatus` |
| `backend/repositories/auth/auth.repository.js` | `createUserWithRole` nhận `userId`+URL ảnh+`approval_status=PENDING`; `findUserById` leftJoin landlords; `getLandlordApprovalStatus` |
| `backend/routes/auth/auth.route.js` | `/register` = `uploadIdCards → validateRegisterByRole → register` |
| `backend/routes/host/roomRoutes.js` | Thêm `requireApprovedLandlord` vào create/update/delete/status |
| `backend/services/admin/userService.js` | `listLandlords`/`getLandlordDetail`/`approveLandlord`/`rejectLandlord`/`getLandlordIdCardKey` |
| `backend/controllers/admin/userController.js` | 5 handler landlord + stream ảnh CCCD |
| `backend/app.js` | Mount `landlordRoutes`; **chặn `/uploads/landlords` khỏi serve tĩnh** |
| `backend/db/seeds/002_users.js` | Landlord seed set `approval_status='APPROVED'` |

## Quy ước lưu ảnh CCCD
- Đường dẫn: `backend/uploads/landlords/{landlordId}/1.jpg` (mặt trước), `2.jpg` (mặt sau).
- Tên cố định → đăng ký lại ghi đè, không tích rác.
- Ảnh lưu `.jpg` cố định bất kể định dạng gốc (**giả định** theo yêu cầu; nếu cần chính xác phải convert bằng `sharp` hoặc giữ đuôi gốc).
- Không serve tĩnh; chỉ Admin xem qua endpoint stream.

## Luồng kiểm thử đề xuất
| Bước | Kỳ vọng |
| --- | --- |
| `register` role=TENANT (JSON) | `201`, không cần ảnh, tạo tenant |
| `register` role=LANDLORD thiếu ảnh | `400 ID_CARD_REQUIRED` |
| `register` role=LANDLORD đủ 2 ảnh | `201`, file ghi vào `uploads/landlords/{id}/1.jpg,2.jpg`, landlord `PENDING` |
| Ảnh quá 5MB / không phải ảnh | `400 INVALID_UPLOAD` |
| Verify OTP landlord | `200`, `status=ACTIVE`, `approval_status` vẫn `PENDING` |
| Landlord chưa duyệt tạo phòng | `403 LANDLORD_NOT_APPROVED` (kèm approvalStatus) |
| `GET /me` (landlord) | có field `approvalStatus` |
| Admin `GET /api/admin/landlords?status=PENDING` | thấy hồ sơ |
| Admin `GET .../id-card/front` | stream ảnh (200), người không phải admin → 403 |
| Truy cập trực tiếp `/uploads/landlords/{id}/1.jpg` | `403` |
| Admin `approve` | `200`, landlord `APPROVED` → tạo phòng OK |
| Admin `reject` thiếu reason | `400 REJECTION_REASON_REQUIRED` |
| Admin `reject` có reason | `200`, `REJECTED` + `rejection_reason` |

## Trạng thái
- `node --check` toàn bộ file đã sửa: **OK**. `require('./app')`: **OK** (không lỗi require-time/circular).
- **Chưa chạy** `npm run migrate` / test runtime với DB thật.

## Việc còn lại
- Chạy `cd backend && npm run migrate` (áp `027`); reseed nếu cần (`npm run seed`).
- Guard `requireApprovedLandlord` query DB mỗi request — có thể cache sau nếu cần tối ưu (JWT không mang approval).
- (Tương lai) Thêm driver `s3` cho `idCardStorage` + `STORAGE_DRIVER=s3`; presigned URL thay stream. Service/controller không đổi.
- (Tùy chọn) Gửi email/thông báo cho landlord khi được approve/reject.
- Seed landlord cũ dùng URL `https://cdn.booking.local/...` (giả) → endpoint stream sẽ lỗi cho seed; chỉ landlord đăng ký thật mới có file local hợp lệ.
