# Plan: U015 / FR-6.3 — Update Room (Host)

## Mục tiêu
Cho phép Chủ phòng (Host) cập nhật thông tin thương mại của một hồ sơ phòng đã có, và quản lý trạng thái hiển thị (AVAILABLE <-> RENTED). Khi cập nhật thông tin ảnh hưởng tới hiển thị (ví dụ thay đổi giá hoặc ảnh), hệ thống sẽ reset luồng duyệt về `PENDING` (insert record vào `room_approvals`).

API chính
- `PATCH /api/rooms/:id` — Host token, body chứa các trường partial để cập nhật (ví dụ `monthly_rent`, `deposit_amount`, `service_fee`, `room_description`, `status`, `available_calendar`, ...)

Schema liên quan (tóm tắt)
- `rooms` (see `backend/db/migrations/007_create_rooms.js`): các trường thương mại (`monthly_rent`, `deposit_amount`, `electricity_cost`, `water_cost`, `service_fee`), `status` enum (`AVAILABLE|RENTED`), `created_at`, `updated_at`.
- `room_images` (008_create_room_images.js): lưu ảnh phòng, `sequence_number`, `image_url`, `is_cover`.
- `room_approvals` (010_create_room_approvals.js): audit, `approval_status` (PENDING|APPROVED|REJECTED`).

Business rules (theo FR-6.3 & Use Case)
- Host chỉ có thể sửa phòng của chính họ (ownership guard).
- Để bài đăng chuyển sang trạng thái "Đang hiển thị" (public), phải thỏa ít nhất: có giá (`monthly_rent` hoặc field tương ứng) và ít nhất 3 ảnh trong `room_images`.
- Nếu Host thay đổi các trường thương mại quan trọng (giá, ảnh, mô tả chính), service phải tạo một bản ghi `room_approvals` mới với `approval_status = 'PENDING'` (reset approval flow).
- Host có thể cập nhật `status` thủ công thành `RENTED` để ẩn khỏi tìm kiếm công khai; khi chuyển về `AVAILABLE`, nếu latest approval != `APPROVED` thì bài vẫn không xuất hiện công khai.

Non-functional constraints
- Phản hồi cập nhật phải hoàn tất nhanh (<2s) — dùng transaction cho DB updates và I/O tối thiểu.
- Trường `status` chỉ chấp nhận các giá trị enum đã định. Validate inputs.

Implementation steps (developer-level)

1) Controller
- File: `backend/controllers/host/roomController.js`
- Replace stub in `updateRoom` to call `roomService.updateRoom(userId, roomId, payload, files)`; return `sendSuccess` with updated room summary.

2) Route
- `backend/routes/host/roomRoutes.js` already defines `router.patch('/:roomId', requireAuth, roomController.updateRoom);` — ensure `uploadRoomImages` middleware *only* used when files are present (support multipart). If endpoint may accept multipart when updating images, add `uploadRoomImages` before controller.

3) Service
- File: `backend/services/host/roomService.js`
- New function: `async updateRoom(landlordId, roomId, payload, files = [])`
  - Verify ownership: load room by `roomId` and compare `landlord_id`.
  - Validate partial payload: numeric fields >= 0; `monthly_rent > 0` if provided and required for publish.
  - If `files` provided: validate count and size; write files to `/uploads/rooms/<roomId>/` and upsert into `room_images` (use sequence numbers, set `is_cover` accordingly). Consider deleting/archiving replaced images as needed.
  - Use a DB transaction: update `rooms` table with patch, update/insert `room_images` rows if any, and if required insert a new `room_approvals` record with `approval_status = 'PENDING'`.
  - Determine condition to reset approval: any change to `monthly_rent`, `deposit_amount`, `title`, `room_description`, or images → create `room_approvals` record.
  - Return updated room summary (selected fields + images array + latest approval status).

4) Repository
- File: `backend/repositories/roomRepository.js`
- Add method `async update(roomId, patch, trx)` already exists; extend if needed to return updated row.
- Add helper `async replaceImages(roomId, images, trx)` to delete existing images (or upsert) and insert new rows with sequence numbers.
- Add helper `async getImagesByRoomIds(roomIds)` already used in list implementation — reuse for single room.

5) Validation & Errors
- If update request attempts to change ownership or invalid `status` → throw `AppError('FORBIDDEN'|'VALIDATION_ERROR', ..., 403/400)`.
- If publish requested (status AVAILABLE) but room lacks required fields (price or <3 images) → throw `AppError('VALIDATION_ERROR', 'Missing required fields to publish', 400)`.

6) Transactions
- Wrap DB writes (rooms update, images replace, approval insert) in a Knex transaction to ensure ACID.

7) Tests & Postman
- Postman requests:
  - `PATCH /api/rooms/:id` — update price only (expect 200, approval reset PENDING).
  - `PATCH /api/rooms/:id` — update images (multipart) (expect 200, images updated, approval reset PENDING).
  - `PATCH /api/rooms/:id` — set `status=RENTED` (expect 200, room hidden from public queries).
  - Negative: tenant or other host attempts update → expect 403.

8) Logging & Monitoring
- Log audit entries when host changes `status` or critical commercial fields (for admin traceability).

9) Migration / DB checks
- No migration changes required for current schema. Ensure `room_approvals` insertion uses `gen_random_uuid()` if required.

Developer checklist (before PR)
- [ ] Implement `roomService.updateRoom` with transaction and approval reset logic.
- [ ] Add or reuse repository helpers for image replace.
- [ ] Wire controller to service and enable multipart when images included.
- [ ] Add Postman requests and automated integration tests.
- [ ] Manual test: update price, update images, change status, verify approval records and public visibility.

