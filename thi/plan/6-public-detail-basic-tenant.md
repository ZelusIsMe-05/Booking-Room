# Plan: FR-4 — Public Room Detail (Basic) — Tenant / Guest

Owner: Thi
Related API: GET /api/rooms/:id
Goal: Provide a backend implementation and test plan to return complete public room detail payload required by FR-4.

Principles and visibility rules
- Publicly visible if and only if:
  - `rooms.status = 'AVAILABLE'` AND
  - There exists a `room_approvals` row for this room with `approval_status = 'APPROVED'`.
- If the room is not visible (not found, deleted, not AVAILABLE, or not APPROVED) return 404.

Data sources (refer to backend/db/migrations)
- `rooms` (columns used): `room_id`, `landlord_id`, `title`, `room_type`, `detailed_address`, `room_description`, `monthly_rent`, `deposit_amount`, `electricity_cost`, `water_cost`, `internet_cost`, `service_fee`, `max_capacity`, `status`, `average_rating`, `longitude`, `latitude`, `created_at`, `updated_at`.
- `room_images`: `sequence_number`, `image_url`, `is_cover` (one cover per room enforced by unique index).
- `room_approvals`: `room_id`, `approval_status` (used to require APPROVED).
- `landlords`: `landlord_id` (references `users.user_id`).
- `users`: `user_id`, `full_name`, `avatar_url`, `phone_number`, `email`, `username` (use to populate host info shown publicly).
- `reviews`: `review_id`, `room_id`, `tenant_id`, `rating`, `comment`, `created_at` (use to list recent reviews and derive average rating if needed).
- `deposits` / `transactions` are NOT required for read-only detail but note `deposits` exists (on-delete restrict) — not relevant here.

Acceptance criteria (API contract)
- Request: `GET /api/rooms/:id` (public: no auth required)
- Success (200): JSON envelope with `data` object containing:
  - `room_id`, `title`, `room_type`, `detailed_address`, `room_description`, `monthly_rent`, `deposit_amount`, `electricity_cost`, `water_cost`, `internet_cost`, `service_fee`, `max_capacity`, `status`, `average_rating`, `longitude`, `latitude`, `created_at`, `updated_at`.
  - `images`: ordered array of `{ sequence_number, image_url, is_cover }` (ordered by `sequence_number` asc).
  - `host`: `{ landlord_id, full_name, username, avatar_url, contact_email?, contact_phone? }` (omit private fields if needed—email/phone can be included as per product policy; consider exposing only contact_email=false for public viewers; decide with PO).
  - `reviews`: pagination stub with `items` (recent 5 reviews) each `{ review_id, tenant_id, rating, comment, created_at }` and `pagination` (page, limit, total).
  - `amenities`: NOT present in current schema; if product needs amenities, document an extension (see Extensions section).
- Not found (404): `{ success: false, message: 'Không tìm thấy phòng.' }` when room does not exist or does not meet public visibility rules.
- Error (500): generic error envelope used via existing `AppError`/errorHandler.

Implementation plan (step-by-step)
1. Review schema and indexes (done)
   - Confirm columns in `backend/db/migrations/007_create_rooms.js`, `008_create_room_images.js`, `010_create_room_approvals.js`, `020_required_database_fixes.js` (reviews).
2. Repository: Add `findPublicById(roomId, trx)` in `backend/repositories/roomRepository.js`
   - Requirements for the query:
     - Select columns from `rooms` listed in Acceptance Criteria.
     - Left join `room_images` to fetch all images for the room ordered by `sequence_number`.
       - Use `.where('ri.room_id', roomId)` or join with `ri.room_id = r.room_id` and select `ri.sequence_number, ri.image_url, ri.is_cover`.
       - Ensure boolean literal comparisons use `andOnVal` where appropriate (see existing `findPublic` fix for `is_cover`).
     - Join `users` to retrieve host public info. Because `rooms.landlord_id` references `landlords.landlord_id` (which equals `users.user_id`), join `users` as `u` on `u.user_id = r.landlord_id` and select `u.full_name, u.avatar_url, u.username, u.email, u.phone_number`.
     - Enforce visibility: `r.status = 'AVAILABLE'` AND exists `room_approvals` row with `approval_status = 'APPROVED'` (use `whereExists` subquery to check `room_approvals`).
     - Use parameter binding, and accept optional `trx` to be consistent with other repository methods.
     - Return a single aggregated object (room fields) and a separate query to fetch image rows and review rows (or use two queries for simplicity and clarity).
3. Repository: Add helper `findPublicImagesByRoomId(roomId)` (or reuse generic `room_images` query) returning images ordered by `sequence_number`.
4. Repository: Add `findRecentReviewsByRoomId(roomId, {limit=5})` reading from `reviews` ordered by `created_at DESC`.
5. Service: Add `getRoomDetail(roomId)` in `backend/services/roomService.js` (or `host/roomService.js`? For public listing, use `services/roomService.js` shared for guest)
   - Call `roomRepository.findPublicById(roomId)`; if null -> throw `AppError(404, 'Không tìm thấy phòng.')`.
   - Call `roomRepository.findPublicImagesByRoomId(roomId)`.
   - Call `roomRepository.findRecentReviewsByRoomId(roomId, {limit:5})` and `count` for reviews to populate pagination total.
   - Map/format fields into API DTO (e.g., parse decimals to numbers/strings consistent with project conventions).
   - Ensure returned DTO does not leak internal-only fields.
6. Controller: Add `getRoomById` in `backend/controllers/guest/roomController.js`
   - Extract `roomId` from `req.params.id`.
   - Call `roomService.getRoomDetail(roomId)`.
   - Return `sendSuccess(res, 'OK', data)` (use existing response helper).
   - Handle `AppError` thrown by service (error handler middleware will format 404/500 accordingly).
7. Route: Ensure `routes/guest/rooms.js` (or equivalent) mounts `GET /api/rooms/:id` to controller's `getRoomById`.
   - Confirm route prefixing in `backend/app.js`.
8. Tests & Postman
   - Add Postman request example to Postman collection (folder `Rooms -> Public -> Get Room Detail`).
   - Add a simple integration test (manual steps) in `thi/GUILD/6-test.md` describing cases:
     - Happy path: approved & available room with images and reviews -> 200 with full DTO.
     - 404 path: room pending/rejected/locked/not exists -> 404.
     - Data shape validation: images array exists and ordered; host object has `full_name` & `avatar_url`.
9. Manual verification steps (run locally)
   - Ensure backend is running: `cd backend && npm start`.
   - Create/identify an APPROVED room in DB (via seeds or admin approve flow). If no approved room exists, insert a `room_approvals` row with `approval_status = 'APPROVED'` for an existing `room_id`.
   - Curl example:
     - `curl http://localhost:5000/api/rooms/<room_id>`
   - PowerShell example:
     - `Invoke-RestMethod http://localhost:5000/api/rooms/<room_id>`
10. Error handling & edge cases
   - If `longitude`/`latitude` null, return nulls in DTO; client should hide map or show fallback.
   - If images empty, return `images: []` and client should show placeholder.
   - Large image lists: implement lazy loading / client-side pagination if needed (front-end concern).
   - Security: Do not return `rooms.*` fields that are admin-only (none present now). Do not expose internal `landlord_id` email/phone unless product decides to.

Implementation notes (developer tips)
- Keep repository queries simple and readable; prefer multiple simple queries over a single complex query returning repeated rows.
- Use Knex `.whereExists()` to require approved row:
  - `.whereExists(function(){ this.select('*').from('room_approvals as ra').whereRaw('ra.room_id = r.room_id').andWhere('ra.approval_status','APPROVED') })`
- Boolean literal comparisons with `room_images.is_cover` should use `andOnVal('ri.is_cover','=', true)` to avoid SQL literal interpretation issues.
- Convert `decimal` fields to strings or numbers depending on project convention for JSON. Check `services/roomService.listRooms` for precedent.

Extensions (optional)
- Add `amenities` table and `room_amenities` bridge for structured amenities (boolean/enum list). If added, extend `findPublicById` to left join and return `amenities: []`.
- Add `video_urls` table or store in `room_images` with a `type` column to support videos.

Deliverables
- Code changes:
  - `backend/repositories/roomRepository.js`
  - `backend/services/roomService.js`
  - `backend/controllers/guest/roomController.js` (or update existing)
  - `backend/routes/guest/rooms.js` (route mount)
  - tests/docs: `thi/GUILD/6-test.md` and Postman request
- Plan file: this document (`thi/plan/6-public-detail-basic-tenant.md`) committed.

Timeline (estimate)
- Read schema & draft plan: 30–60m (completed)
- Repo + service + controller + route: 60–120m
- Tests + Postman + manual verification: 30–60m

---

Created by: Thi
Date: (auto)
