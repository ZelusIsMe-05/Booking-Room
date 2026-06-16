# Test Plan: U011 — Public Room Detail Basic (Tenant / Guest)

## Mục tiêu
Kiểm tra yêu cầu `GET /api/rooms/:roomId` để hiển thị chi tiết phòng công khai phù hợp với FR-4.

## 1) Chuẩn bị môi trường
- Từ thư mục `backend`:

```bash
npm install
npm run migrate
npm run seed
npm start
```

- Mở Postman / Insomnia hoặc dùng `curl`.
- Endpoint cần test: `GET http://localhost:5000/api/rooms/:roomId`
- API là public nên không cần token.

## 2) Dữ liệu chuẩn bị
1. Đảm bảo tồn tại một phòng hợp lệ trong DB với:
   - `rooms.status = 'AVAILABLE'`
   - Một dòng `room_approvals` cho `room_id` đó với `approval_status = 'APPROVED'`
2. Xác định roomId thử nghiệm:
   - Có thể dùng seed data hoặc tạo bằng API host rồi approve bằng admin.
3. Kiểm tra rằng phòng có ít nhất 1 ảnh trong `room_images`.
4. Nếu có thể, tạo một số review cho phòng đó để kiểm thử phần review.

## 3) Kịch bản chính — Happy path
### 3.1 Request
- `GET /api/rooms/:roomId`

### 3.2 Expect
- HTTP 200
- `success: true`
- `message` rõ nghĩa như `Chi tiết phòng`
- `data` object chứa:
  - `roomId`
  - `title`
  - `roomType`
  - `detailedAddress`
  - `roomDescription`
  - `monthlyRent`
  - `depositAmount`
  - `electricityCost`
  - `waterCost`
  - `internetCost`
  - `serviceFee`
  - `maxCapacity`
  - `status`
  - `averageRating`
  - `longitude`, `latitude`
  - `createdAt`, `updatedAt`
  - `images`: array
  - `host`: object
  - `reviews`: object
  - `amenities`: [] (schema hiện tại chưa có, nhưng API trả về trường rỗng)

### 3.3 Validate response shape
- `data.images` là mảng, mỗi item có:
  - `sequenceNumber`
  - `imageUrl`
  - `isCover`
- `data.host` là object với:
  - `landlordId`
  - `fullName`
  - `username`
  - `avatarUrl`
  - `email` (nếu hiện hữu)
  - `phoneNumber` (nếu hiện hữu)
- `data.reviews` là object chứa:
  - `items` (mảng)
  - `pagination` có `page`, `limit`, `total`

### 3.4 Validate content
- `data.status` phải là `AVAILABLE`
- `data.images` nếu không trống thì `imageUrl` phải là URL và `sequenceNumber` tăng dần.
- `data.host.fullName` không rỗng.
- `data.averageRating` là số hoặc null.

## 4) Case phòng không tồn tại hoặc không public
### 4.1 Không tồn tại
- Request với `roomId` giả:
  - `GET /api/rooms/00000000-0000-0000-0000-000000000000`
- Expect:
  - HTTP 404
  - `success: false`
  - `message: 'Không tìm thấy phòng.'`

### 4.2 Phòng chưa approve / pending / rejected
- Chọn `roomId` có `room_approvals.approval_status = 'PENDING'` hoặc `REJECTED`
- Expect giống như case không tồn tại: HTTP 404.

### 4.3 Phòng status khác `AVAILABLE`
- Chọn `roomId` có `rooms.status = 'RENTED'` hoặc `LOCKED` nếu tồn tại
- Expect: HTTP 404.

## 5) Edge cases data shape
### 5.1 Ảnh trống
- Nếu phòng chưa có ảnh, `data.images` phải trả về `[]` chứ không phải `null`.
- Client có thể hiển thị placeholder.

### 5.2 `longitude`/`latitude` null
- Nếu phòng không có tọa độ, response vẫn thành công.
- `data.longitude` và `data.latitude` phải là `null`.

### 5.3 Review rỗng
- Nếu phòng chưa có review, `data.reviews.items` phải là `[]` và `data.reviews.total = 0`.

## 6) Kiểm tra mapping host và ảnh
- `data.host.landlordId` phải khớp `rooms.landlord_id`.
- `data.host.fullName` phải khớp `users.full_name` của chủ.
- `data.images` phải theo `sequence_number` tăng dần.

## 7) SQL / schema validation
- Kiểm tra quan hệ:
  - `rooms.landlord_id` → `landlords.landlord_id`
  - `landlords.landlord_id` = `users.user_id`
- Kiểm tra approval rule:
  - `room_approvals.room_id = roomId`
  - `room_approvals.approval_status = 'APPROVED'`
- Kiểm tra `room_images` vì ảnh chứa `sequence_number`, `image_url`, `is_cover`.

## 8) Postman script mẫu
### Pre-request
- Không cần token.

### Tests
```javascript
const body = pm.response.json();
pm.test('Status is 200', () => pm.response.to.have.status(200));
pm.test('Success true', () => pm.expect(body.success).to.be.true);
pm.test('Has data object', () => pm.expect(body.data).to.be.an('object'));
pm.test('Has roomId', () => pm.expect(body.data).to.have.property('roomId'));
pm.test('Images array', () => pm.expect(body.data.images).to.be.an('array'));
pm.test('Host object', () => pm.expect(body.data.host).to.be.an('object'));
pm.test('Reviews object', () => pm.expect(body.data.reviews).to.be.an('object'));
```

## 9) Kịch bản kiểm thử bằng curl
### 9.1 Happy path
```bash
curl -i http://localhost:5000/api/rooms/<roomId>
```

### 9.2 Not found
```bash
curl -i http://localhost:5000/api/rooms/00000000-0000-0000-0000-000000000000
```

## 10) Debug checklist
- Nếu trả 501: kiểm tra `backend/services/roomService.js` có còn placeholder `NOT_IMPLEMENTED` không.
- Nếu trả 404 cho room hợp lệ:
  - kiểm tra `room_approvals` row đã `APPROVED` chưa.
  - kiểm tra `rooms.status` có đúng `AVAILABLE` không.
- Nếu `images` không trả về:
  - kiểm tra `room_images.room_id` và trường `sequence_number` / `image_url`.
- Nếu host thiếu dữ liệu:
  - kiểm tra `users` join trong repository.

---

Hoàn thành test plan cho `GET /api/rooms/:roomId`.
