# Plan: Create Room (Host) - FR-6.1

## Mục tiêu
Cho phép Chủ phòng (Host) tạo / đăng bài phòng theo FR-6.1, lưu record vào `rooms` và khởi tạo audit `room_approvals` ở trạng thái `PENDING`. Hiển thị chỉ khi được admin approve (theo schema hiện có).

## Tóm tắt use-case
- Actor: Host (đã authenticate)
- Pre-condition: Hồ sơ phòng có đủ thông tin cơ bản và ít nhất 3 ảnh
- Result: Bài đăng lưu với trạng thái Pending; sau khi admin approve -> public hiển thị

## Schema liên quan (trích từ `backend/db/migrations`)
- `rooms` (fields chính):
  - `room_id` (uuid PK)
  - `landlord_id` (uuid)
  - `title`, `room_type`, `detailed_address`, `max_capacity`, `monthly_rent`, `deposit_amount`, `electricity_cost`, `water_cost`, `internet_cost`, `service_fee`, `status` (AVAILABLE|RENTED), `average_rating`, `room_description`, `longitude`, `latitude`, `created_at`, `updated_at`
- `room_approvals` (audit):
  - `approval_id`, `room_id`, `approval_status` (PENDING|APPROVED|REJECTED)

Lưu ý: approval flow dùng `room_approvals`—`rooms.status` chỉ phản ánh trạng thái thuê (AVAILABLE/RENTED).

## Ràng buộc nghiệp vụ (từ requirements)
- Bắt buộc: `title`, `room_type`, `detailed_address`, `max_capacity`, `monthly_rent`, `deposit_amount`
- `monthly_rent`, `deposit_amount`, `max_capacity` (số), `diện tích` nếu có phải > 0
- Tối thiểu 3 ảnh rõ nét
- Kích thước mỗi file ảnh <= 5MB
- Sau lưu: tạo record `room_approvals` với `approval_status = 'PENDING'`

## Steps triển khai (chi tiết)
1. Xác nhận schema & migration (done).

2. Repository (`backend/repositories/roomRepository.js`)
   - Implement with Knex:
     - `findById(roomId)` -> trả row từ `rooms` (join latest approval nếu cần)
     - `find(query)` -> filters, pagination, chỉ trả approved cho public nếu flag `onlyApproved`
     - `create(room)` -> insert vào `rooms` và trả `room_id`
     - `update(roomId, patch)` -> cập nhật trường thương mại
     - `remove(roomId)` -> xóa hoặc đánh dấu (theo convention)

3. Service (`backend/services/host/roomService.js` hoặc `backend/services/roomService.js`)
   - `createRoom(landlordId, payload, images)`:
     - Validate input (required fields, số dương)
     - Validate images >= 3 và size <= 5MB
     - Begin transaction:
       - Insert vào `rooms` (status mặc định AVAILABLE)
       - Insert vào `room_approvals` với `PENDING`
     - Commit và trả room summary
   - Ghi log / throw AppError với code/message rõ ràng khi validation fail

4. Upload handling
   - Reuse existing `backend/config/multer.js` or `middlewares/uploadMiddleware.js`
   - Định nghĩa route middleware để nhận đa phần `multipart/form-data` (field `images[]`)
   - Lưu file vào `uploads/rooms/<room_id>/` hoặc tạm lưu trước khi commit; lưu đường dẫn vào `room_images` table nếu có (migration `008_create_room_images.js` tồn tại)
   - Kiểm tra kích thước file trước lưu (<= 5MB)

5. Controller (`backend/controllers/host/roomController.js`)
   - `createRoom(req, res, next)`:
     - Lấy `req.user.userId` làm `landlord_id`
     - Lấy body + files, gọi `roomService.createRoom(...)`
     - Trả `sendSuccess(res, { status: 201, data: { roomId, approval: 'PENDING' } })`
   - Trả lỗi validation bằng `AppError` để middleware `errorHandler` chuẩn hóa

6. Tích hợp với `room_approvals`
   - Tạo record PENDING khi tạo room
   - Admin approval endpoint sẽ cập nhật `room_approvals` -> lúc approve, public listing `find()` cần lọc chỉ return rooms có latest approval = APPROVED

7. Tests / Postman
   - Tạo Postman folder cho flow: Host create room (multipart), verify 400 nếu <3 ảnh, verify 201 + pending
   - Happy path: create -> admin approve -> public list sees room

8. Non-functional / Perf
   - Ensure createRoom returns within <2s (validate/insert, small file I/O)
   - Nếu ảnh lớn, offload to async upload service (out of scope Day 2)

## Output deliverables
- `backend/repositories/roomRepository.js` (implemented)
- `backend/services/host/roomService.js` (createRoom + validations)
- Update `backend/controllers/host/roomController.js` để gọi service
   - Upload middleware usage in `backend/routes/host/roomRoutes.js` for POST `/api/rooms`
- Postman requests: `Host Create Room`, `Admin Approve Room`, `Public List/Detail`
- Short day2 report files to create later: `thi/day2-AI-read.md` and `thi/day2-human-read.md` (Postman steps)

---

Nếu bạn muốn, tôi có thể tiếp tục và implement `roomRepository.create` + `host roomService.createRoom` và cập nhật controller ngay bây giờ. Bạn muốn tôi bắt đầu phần code nào trước?