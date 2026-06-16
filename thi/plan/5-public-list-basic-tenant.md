# Plan: U010 / FR-3.1 & FR-3.2 — Public Room List Basic (Tenant)

## Mục tiêu
Cài đặt API public list phòng cho khách vãng lai và tenant:
- `GET /api/rooms`
- Phải trả về `200`, `items`, `pagination`
- Hỗ trợ lọc cơ bản theo keyword, location, roomType, minPrice, maxPrice, sort, page, limit
- Trả về dữ liệu tóm tắt phù hợp với UI: ảnh bìa, tiêu đề, giá thuê, địa chỉ rút gọn, trạng thái
- Chỉ hiển thị phòng đang `AVAILABLE` và đã duyệt public (APPROVED) nếu có workflow duyệt phòng

## Dữ liệu schema liên quan
Sử dụng schema hiện tại trong `backend/db/migrations`:
- `007_create_rooms.js`
  - `rooms` có các trường:
    - `title`, `room_type`, `detailed_address`, `max_capacity`, `monthly_rent`, `deposit_amount`, `electricity_cost`, `water_cost`, `internet_cost`, `service_fee`, `status`, `average_rating`, `room_description`, `longitude`, `latitude`
  - `status` enum: `AVAILABLE|RENTED`
- `008_create_room_images.js`
  - `room_images` lưu ảnh, `sequence_number`, `image_url`, `is_cover`
  - cover image có thể dùng để hiển thị ảnh bìa
- `010_create_room_approvals.js`
  - `room_approvals` lưu `approval_status` `PENDING|APPROVED|REJECTED`
- `020_required_database_fixes.js`
  - đã tạo index `room_approvals_room_status_idx` tối ưu `room_id, approval_status`

### Schema hạn chế cần lưu ý
- Hiện tại không có cột địa điểm chuẩn hoá `province|district|ward`; chỉ có `detailed_address` string.
- Không có cột amenity/service như `has_air_conditioner`, `has_parking`, `pet_allowed`, `private_toilet`.

=> Với schema hiện có, phần `location` và `service/tiện ích` sẽ được giải quyết bằng bộ lọc chuỗi trên `detailed_address`, `title`, `room_description`, hoặc cần bổ sung schema ở phase sau.

## API spec
| Method | Path | Query | Auth | Success |
| --- | --- | --- | --- | --- |
| GET | /api/rooms | `page`, `limit`, `keyword`, `location`, `roomType`, `minPrice`, `maxPrice`, `sort` | none | `200`, `{ success: true, message, data: { items, pagination } }` |

Query params:
- `page`: số trang, mặc định `1`
- `limit`: số phần tử mỗi trang, mặc định `20`
- `keyword`: tìm tự do trên tiêu đề / địa chỉ / mô tả
- `location`: tìm theo chuỗi địa chỉ (quận/huyện/phường/thành phố)
- `roomType`: lọc `room_type`
- `minPrice`, `maxPrice`: phạm vi `monthly_rent`
- `sort`: `price_asc`, `price_desc`, `newest`, `rating_desc`

## Business rules theo yêu cầu
- Chỉ trả về phòng `status = AVAILABLE`.
- Nếu hệ thống có approval workflow, chỉ trả về phòng có latest `room_approvals.approval_status = 'APPROVED'`.
- Không trả về phòng `RENTED` hoặc chưa được duyệt/rejected.
- Pagination bắt buộc để tránh trả về quá nhiều bản ghi cùng lúc.
- Nếu không tìm thấy kết quả, trả về `items: []`, `pagination` hợp lệ.

## Implementation steps

### 1) Route
- File: `backend/routes/guest/roomRoutes.js`
- Đã có
  - `router.get('/', roomController.listRooms);`
  - `router.get('/:roomId', roomController.getRoomById);`
- Kiểm tra route mount trong `backend/app.js` để đảm bảo `/api/rooms` được sử dụng.

### 2) Controller
- File: `backend/controllers/guest/roomController.js`
- Thay stub bằng call service:
  - `const result = await roomService.listRooms(req.query);`
  - `return sendSuccess(res, { status: 200, message: 'Danh sách phòng công khai', data: result });`
- Validate query params cơ bản:
  - `page`/`limit` phải là số dương.
  - `minPrice`/`maxPrice` phải là số không âm.
  - `sort` phải nằm trong danh sách chấp nhận.
- Nếu `roomService` ném `AppError`, let middleware handle it.

### 3) Service
- File: `backend/services/roomService.js`
- Implement `async listRooms(query)`:
  1. Normalize query params: `page`, `limit`, `keyword`, `location`, `roomType`, `minPrice`, `maxPrice`, `sort`.
  2. Build `filters` object cho repository.
  3. Call repository query với `onlyApproved = true` và `status = 'AVAILABLE'`.
  4. Map output items sang summary fields.
  5. Return `{ items, pagination: { page, limit, total } }`.

### 4) Repository
- File: `backend/repositories/roomRepository.js`
- Extend `find()` or add method `findPublic({ page, limit, filters, sort })` để thực hiện:
  - `SELECT r.* FROM rooms r`
  - `JOIN room_approvals ra ON r.room_id = ra.room_id AND ra.approval_status = 'APPROVED'` (nếu cần)
  - `WHERE r.status = 'AVAILABLE'`
  - `WHERE` conditions:
    - Nếu `keyword` => `whereILike('r.title', '%keyword%') OR whereILike('r.detailed_address','%keyword%') OR whereILike('r.room_description','%keyword%')`
    - Nếu `location` => `whereILike('r.detailed_address', '%location%')`
    - Nếu `roomType` => `where('r.room_type', roomType)`
    - Nếu `minPrice` => `where('r.monthly_rent', '>=', minPrice)`
    - Nếu `maxPrice` => `where('r.monthly_rent', '<=', maxPrice)`
  - Sort options:
    - `price_asc` => `orderBy('r.monthly_rent', 'asc')`
    - `price_desc` => `orderBy('r.monthly_rent', 'desc')`
    - `newest` => `orderBy('r.created_at', 'desc')`
    - `rating_desc` => `orderBy('r.average_rating', 'desc')`
    - fallback `created_at desc`
  - Pagination: `limit`, `offset = (page-1)*limit`
  - Select summary columns: `r.room_id, r.title, r.room_type, r.detailed_address, r.monthly_rent, r.status, r.average_rating, r.longitude, r.latitude`
- Fetch cover images by `room_images` join / subquery:
  - `leftJoin('room_images as ri', function () { this.on('ri.room_id', 'r.room_id').andOn('ri.is_cover', true); })`
  - select `ri.image_url as cover_image_url`
- Return rows as summary objects.

### 5) Pagination and total
- Use count query separately or window function if needed:
  - `SELECT count(*) FROM rooms r ...` with same filters.
- Return `total`, `page`, `limit`.
- Example response:
  ```json
  {
    "items": [
      {
        "roomId": "...",
        "title": "...",
        "monthlyRent": 3500000,
        "coverImageUrl": "...",
        "addressSummary": "45 Tô Hiến Thành, Q10, HCM",
        "status": "AVAILABLE",
        "averageRating": 4.5,
        "roomType": "Room"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 42
    }
  }
  ```

### 6) Location filter implementation
- Vì schema hiện tại không phân tách tỉnh/quận/phường, dùng `location` như một chuỗi tìm kiếm trên `detailed_address`.
- Nếu cần nâng cấp schema trong tương lai, thêm các cột `province`, `district`, `ward` hoặc bảng `room_locations`.

### 7) Services/Amenity filters
- Nếu yêu cầu `dịch vụ và tiện ích` cần filter chính xác, schema hiện tại không hỗ trợ trực tiếp.
- Option 1: tạm thời dùng `keyword` trên `room_description` để lọc `AC`, `parking`, `pet`, `private toilet`.
- Option 2: mở rộng schema bằng migration mới:
  - thêm cột boolean `has_ac`, `has_parking`, `pet_allowed`, `private_toilet` vào `rooms`
  - hoặc thêm bảng `room_amenities(room_id, amenity_key, value)`
- Plan giai đoạn này tập trung vào `public list basic`; amenity filter là enhancement nếu schema được mở rộng sau.

### 8) Sorting
- Hỗ trợ `sort` query:
  - `price_asc`
  - `price_desc`
  - `newest`
  - `rating_desc`
- Validate sort value trong service, fallback nếu không hợp lệ.

### 9) Non-functional requirements
- `page/limit` để tránh trả về toàn bộ data.
- Giới hạn `limit` tối đa, ví dụ `limit <= 50`.
- Query tối ưu bằng index:
  - `room_approvals_room_status_idx` cho join approval.
  - `room_id` PK, `status`, và `room_type` cột đã có index tự động? Nếu cần, thêm index trong migration sau.
- Thời gian phản hồi mục tiêu <2s.

### 10) Testing
- Postman/Insomnia:
  - Happy path: `GET /api/rooms?page=1&limit=10` trả `200`, items non-empty.
  - Keyword search: `keyword=Bách Khoa` hoặc `keyword=Đại học`.
  - Location search: `location=Q10` hoặc `location=HCM`.
  - Price filter: `minPrice=2000000&maxPrice=4000000`.
  - Room type filter: `roomType=Room`.
  - Sort: `sort=price_asc`, `sort=price_desc`, `sort=newest`.
  - Empty result: filter quá khắt khe -> `items: []`.
- DB checks:
  - Ensure returned rooms have `status = 'AVAILABLE'`.
  - If approval join dùng, ensure room is approved.
- Unit / integration tests:
  - repository returns correct counts and rows for each filter.
  - service normalizes params and returns pagination metadata.

### 11) Checklist
- [ ] Implement `guest/roomController.listRooms` using `roomService.listRooms(req.query)`.
- [ ] Implement `roomService.listRooms` trong `backend/services/roomService.js`.
- [ ] Extend `roomRepository.find()` or add `findPublic()` với filters, joins, and custom sorting.
- [ ] Fetch cover image via `room_images.is_cover` and include `coverImageUrl`.
- [ ] Enforce `status = AVAILABLE` and `APPROVED` if approval exist.
- [ ] Validate query params and default pagination values.
- [ ] Add Postman tests for happy path and each filter parameter.
- [ ] Document any schema limitation for location/service filtering and propose schema extension if needed.

## Tài liệu tham khảo
- `backend/db/migrations/007_create_rooms.js`
- `backend/db/migrations/008_create_room_images.js`
- `backend/db/migrations/010_create_room_approvals.js`
- `backend/db/migrations/020_required_database_fixes.js`
- `backend/routes/guest/roomRoutes.js`
- `backend/controllers/guest/roomController.js`
- `backend/services/roomService.js`

---
End of plan.
