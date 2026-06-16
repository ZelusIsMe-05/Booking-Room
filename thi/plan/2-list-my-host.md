# Plan: UC14 — List My Rooms (Host)

## Mục tiêu
Cho phép Chủ phòng (Host) xem danh sách tất cả phòng thuộc sở hữu của họ (bao gồm cả trạng thái nháp / chưa được public). API chính:
- `GET /api/rooms/my` — trả danh sách phòng của host khi có token Host (include drafts)

Tệp này mô tả chi tiết các bước triển khai, map trực tiếp tới schema trong `backend/db/migrations` (bảng `rooms`, `room_images`, `room_approvals`).

## Schema liên quan (tóm tắt từ `backend/db/migrations`)
- `rooms` (PK `room_id` uuid)
  - `landlord_id` (uuid) — owner FK -> `landlords.landlord_id`
  - `title`, `room_type`, `detailed_address`, `max_capacity`, `monthly_rent`, `deposit_amount`, `electricity_cost`, `water_cost`, `internet_cost`, `service_fee`, `status`, `average_rating`, `room_description`, `longitude`, `latitude`, `created_at`, `updated_at`
- `room_images`
  - composite PK `[room_id, sequence_number]`, `image_url`, `is_cover`
- `room_approvals`
  - `approval_id`, `room_id`, `approval_status` (PENDING|APPROVED|REJECTED)

Theo UC14, danh sách "my rooms" PHẢI trả tất cả bản ghi của host (không lọc theo `room_approvals`), nhưng khi hiển thị public thì sẽ cần approval=APPROVED (không phải phần của UC14).

## Non-functional constraints
- Trả theo response envelope chuẩn `{ success, message, data }`.
- Phân trang: `page`, `limit` (mặc định `page=1`, `limit=20`).
- Sắp xếp: optional `sortBy` (ví dụ `created_at`, `monthly_rent`) và `order` (`asc|desc`).
- Bảo mật: phải có `requireAuth` middleware; chỉ trả phòng có `landlord_id === req.user.userId`.

## Endpoints & Contract

1) `GET /api/rooms/my` (host)
 - Header: `Authorization: Bearer <HOST_TOKEN>`
 - Query params: `page`, `limit`, `sortBy`, `order`, optional `status` to filter by `rooms.status` (e.g., DRAFT/AVAILABLE/RENTED) — note: schema uses `status` enum only for AVAILABLE/RENTED, if drafts are represented differently (e.g., no approval) adapt accordingly.
 - Response (200):
  ```json
  {
    "success": true,
    "message": "Danh sách phòng của Host",
    "data": {
      "items": [
        {
          "room_id": "...",
          "title": "...",
          "room_type": "...",
          "detailed_address": "...",
          "max_capacity": 2,
          "monthly_rent": "5000000.00",
          "status": "AVAILABLE",
          "created_at": "...",
          "updated_at": "...",
          "cover_image_url": "...",
          "images": [ { "sequence_number": 1, "image_url": "..." }, ... ]
        }
      ],
      "pagination": { "page": 1, "limit": 20, "total": 123 }
    }
  }
  ```

2) (Removed) Room detail endpoint `/api/rooms/:id` is not part of UC14. Room detail for tenants/public is handled by the public feature and is out of scope for this use case.

## Implementation Steps (developer-level)

1. Verify migrations
 - Mở `backend/db/migrations/007_create_rooms.js`, `008_create_room_images.js`, `010_create_room_approvals.js` để hiểu trường và FK (đã kiểm tra trước khi viết kế hoạch).

2. Repository: add `findByLandlord` / `countByLandlord`
 - File: `backend/repositories/roomRepository.js`
 - New methods:
   - `async findByLandlord(landlordId, { page, limit, sortBy, order, status })` — returns items with basic room fields and an array of images (prefer joining `room_images` with `array_agg` or do a separate query per page result). Use Knex pagination: `offset = (page-1)*limit`.
   - `async countByLandlord(landlordId, { status })` — returns total count for pagination.
 - Implementation notes:
   - Only select needed columns (`room_id`, `title`, `room_type`, `detailed_address`, `max_capacity`, `monthly_rent`, `status`, `created_at`, `updated_at`).
   - For cover image: left join `room_images` where `is_cover=true` to fetch `cover_image_url` (or aggregate images ordered by `sequence_number`).
   - Protect against SQL injection: validate `sortBy` whitelisting allowed columns.

3. Service: implement `listMyRooms` logic
 - File: `backend/services/host/roomService.js` (exists)
 - New function: `async listMyRooms(landlordId, query)`
   - Parse and validate query params (page, limit, sortBy, order). Default values.
   - Call `roomRepository.countByLandlord(...)` and `roomRepository.findByLandlord(...)`.
   - Return object: `{ items, pagination: { page, limit, total } }`.
 - Edge cases:
   - If `page` or `limit` invalid → throw `AppError('VALIDATION_ERROR', 'Invalid pagination', 400)`.

4. Controller: wire up `listMyRooms`
 - File: `backend/controllers/host/roomController.js`
 - Replace stubbed method with actual call:
   ```js
   const result = await roomService.listMyRooms(req.user.userId, req.query);
   return sendSuccess(res, { status: 200, message: 'Danh sách phòng của tôi', data: result });
   ```
 - Ensure errors are forwarded to `next(err)`.

5. Routes: confirm middleware and endpoint
 - `backend/routes/host/roomRoutes.js` already has `router.get('/my', requireAuth, roomController.listMyRooms);` and `hostRoomRoutes` is mounted at `/api/rooms` in `backend/app.js`, so the final path is `/api/rooms/my`.
 - Ensure `requireAuth` is applied so only authenticated hosts can access this endpoint.

6. Authorization checks
 - Ensure `requireAuth` middleware populates `req.user.userId`.
 - If host role check required, use role middleware (e.g., `authorize('LANDLORD')`) or verify `landlords` record linked to `req.user.userId`.

7. Tests & Postman
 - Add Postman requests:
   - `GET /api/rooms/my` (with Host token) — expect 200 and items includes host rooms.
 - Add automated integration test (optional): create a host user via seed, create several rooms via repository/createRoom helper, call endpoint and assert response/pagination.

8. Performance & Implementation notes
 - Use pagination at DB level to avoid loading all rows.
 - Prefer 1 query for page rows and a second query to fetch images for those room_ids (WHERE room_id IN (...)) to prevent N+1 queries. Map images back to rooms in memory.
 - For cover image, either store a `cover_image_url` field later or derive from `room_images` where `is_cover=true`.

9. Migration & DB compatibility checks
 - Confirm `landlords` table exists and that `req.user.userId` maps to `landlord_id`. If `req.user.userId` is `user_id`, add mapping: load `landlords` by `user_id` or ensure auth returns `landlord_id` when Host role.
 - If landlord mapping differs, update service to resolve `landlord_id` from `users` or `landlords` table.

10. Developer checklist (before PR)
 - [ ] Implement repository + service + controller code
 - [ ] Unit tests for repository logic (mock DB)
 - [ ] Integration test (seed DB, call API)
 - [ ] Postman requests + documentation update (`thi/GUILD/1-test.md`, `TEAMWORK_CNPM.md` if needed)
 - [ ] Run `npm run migrate` and `npm run seed` locally and verify endpoint responses

## Notes for reviewers
- Ensure route mounting order in `backend/app.js` still satisfies public vs host routing.
- Confirm `req.user.userId` semantics with auth implementer (Thai) — whether that value equals `landlord_id` or a `user_id` which needs mapping.

---

If bạn muốn, tôi có thể tiếp tục và implement `roomRepository.findByLandlord` + `roomService.listMyRooms` và thay đổi `roomController.listMyRooms` ngay bây giờ. Bạn muốn mình làm code luôn chứ chỉ ghi plan thôi?
