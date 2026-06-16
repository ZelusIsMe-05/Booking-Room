# Test Plan: U010 — Public Room List Basic (Tenant)

## Mục tiêu
Kiểm tra đầy đủ các yêu cầu của `GET /api/rooms` với filter và pagination.

## 1) Chuẩn bị môi trường
- Chạy backend từ thư mục `backend`:

```bash
npm install
npm run migrate
npm run seed
npm start
```

- Mở Postman/Insomnia hoặc dùng `curl`.
- Endpoint cần test: `GET http://localhost:<port>/api/rooms`
- Không cần token vì API public.

## 2) Kiểm tra basic response
- Request: `GET /api/rooms`
- Expect:
  - HTTP 200
  - `success: true`
  - `data.items` là mảng
  - `data.pagination` chứa `page`, `limit`, `total`
- Validate sample response shape:
  - `roomId`
  - `title`
  - `roomType`
  - `coverImageUrl`
  - `monthlyRent`
  - `depositAmount`
  - `addressSummary`
  - `status`
  - `averageRating`

## 3) Kiểm tra pagination
### 3.1 default pagination
- Request: `GET /api/rooms`
- Expect: `page = 1`, `limit = 20`, `total >= 0`

### 3.2 custom pagination
- Request: `GET /api/rooms?page=2&limit=1`
- Expect: cũng nhận được `page=2`, `limit=1`, và mã phản hồi 200.

### 3.3 invalid pagination
- Request: `GET /api/rooms?page=0&limit=10`
- Expect: HTTP 400 và message `page must be a positive integer`
- Request: `GET /api/rooms?page=1&limit=100`
- Expect: HTTP 400 và message `limit must be a positive integer and no more than 50`

## 4) Kiểm tra filter keyword
- Request: `GET /api/rooms?keyword=Bách Khoa`
- Expect: chỉ những phòng có `Bách Khoa` trong `title`, `detailed_address`, hoặc `room_description`
- Nếu DB seed có room phù hợp, item list phải không rỗng.

## 5) Kiểm tra filter location
- Request: `GET /api/rooms?location=Q10`
- Expect: tất cả `addressSummary` chứa `Q10` hoặc tương tự.

## 6) Kiểm tra filter roomType
- Request: `GET /api/rooms?roomType=Room`
- Expect: chỉ trả về phòng có `roomType = Room`.

## 7) Kiểm tra filter price
### 7.1 minPrice only
- Request: `GET /api/rooms?minPrice=4000000`
- Expect: mọi item có `monthlyRent >= 4000000`

### 7.2 maxPrice only
- Request: `GET /api/rooms?maxPrice=4000000`
- Expect: mọi item có `monthlyRent <= 4000000`

### 7.3 range
- Request: `GET /api/rooms?minPrice=3000000&maxPrice=4000000`
- Expect: mọi item có `3000000 <= monthlyRent <= 4000000`

### 7.4 invalid price range
- Request: `GET /api/rooms?minPrice=5000000&maxPrice=2000000`
- Expect: HTTP 400 và message `minPrice must be less than or equal to maxPrice`

## 8) Kiểm tra sort options
### 8.1 price_asc
- Request: `GET /api/rooms?sort=price_asc`
- Expect: items theo thứ tự `monthlyRent` tăng dần.

### 8.2 price_desc
- Request: `GET /api/rooms?sort=price_desc`
- Expect: items theo thứ tự `monthlyRent` giảm dần.

### 8.3 newest
- Request: `GET /api/rooms?sort=newest`
- Expect: items theo `created_at` mới nhất lên trước.

### 8.4 rating_desc
- Request: `GET /api/rooms?sort=rating_desc`
- Expect: items theo `averageRating` giảm dần.

### 8.5 invalid sort
- Request: `GET /api/rooms?sort=bad_option`
- Expect: HTTP 400 và message `sort must be one of price_asc, price_desc, newest, rating_desc`

## 9) Kiểm tra trạng thái phòng
- Confirm API chỉ trả về phòng `status = AVAILABLE`.
- Yêu cầu: với data seed hoặc DB hiện tại, không xuất hiện phòng có `status = RENTED`.

## 10) Kiểm tra approval constraint
- Nếu hệ thống có approval workflow (room_approvals table): chỉ trả phòng `APPROVED`.
- Validate bằng DB query:
  - `SELECT room_id FROM room_approvals WHERE approval_status != 'APPROVED'` và xác nhận các `room_id` này không xuất hiện trong response.

## 11) Case không tìm thấy kết quả
- Request: `GET /api/rooms?keyword=khongtonaitrongdb1234`
- Expect: HTTP 200 và `data.items = []`
- `data.pagination.total = 0`

## 12) Test bằng Postman script
### Postman test block
```javascript
pm.test('Status is 200', () => pm.response.to.have.status(200));
const body = pm.response.json();
pm.test('success true', () => pm.expect(body.success).to.be.true);
pm.test('pagination exists', () => pm.expect(body.data).to.have.property('pagination'));
pm.test('items is array', () => pm.expect(body.data.items).to.be.an('array'));
```

## 13) Debug checklist
- Nếu response trả 501: kiểm tra `backend/services/roomService.js` và `controllers/guest/roomController.js` đã được cập nhật.
- Nếu chưa có `coverImageUrl`: kiểm tra `room_images` và giá trị `is_cover = true`.
- Nếu có phòng `RENTED` xuất hiện: kiểm tra điều kiện `q.where('r.status', 'AVAILABLE')` trong `roomRepository.findPublic()`.

## 14) Ghi chú schema
- Location filter hiện tại là tìm chuỗi trong `detailed_address` vì schema chưa chuẩn hoá `province/district/ward`.
- Service filter hiện tại chưa có do schema chưa chứa cột amenity; nếu cần, cần migration thêm `has_ac`, `has_parking`, `pet_allowed`, `private_toilet`.

---
Hoàn thành test cho feature `GET /api/rooms`.
