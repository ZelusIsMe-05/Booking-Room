# Plan: FR-6.2 — Admin Pending Rooms List

Owner: Thi
Related API: `GET /api/admin/rooms/pending`
Goal: Provide backend implementation for admin to fetch a paginated list of rooms awaiting approval.

## Principles and visibility rules

- Only **Admin** role can access this endpoint (enforce via `authorize` middleware).
- Return rooms with `room_approvals.approval_status = 'PENDING'` AND `rooms.status = 'AVAILABLE'`.
- Exclude already APPROVED or REJECTED rooms.
- Sort by `room_approvals.created_at DESC` or `rooms.created_at DESC` (newest pending first).
- Include landlord (host) information so admin knows who submitted.

## Data sources (refer to backend/db/migrations)

- `rooms` (columns):
  - `room_id`, `landlord_id`, `title`, `room_type`, `detailed_address`, `monthly_rent`, `deposit_amount`, `status`, `created_at`, `updated_at`.
  - Note: `status` must be `AVAILABLE` (rooms only appear in pending list if available, not yet rented).
- `room_approvals` (columns):
  - `approval_id`, `room_id`, `approval_status` (PENDING, APPROVED, REJECTED), `created_at` (when submitted for approval).
- `users` (via `rooms.landlord_id`):
  - `user_id`, `full_name`, `email`, `phone_number`, `username`, `avatar_url`.
- `landlords`:
  - `landlord_id` (references `users.user_id`), `id_card_front_url`, `id_card_back_url`.
- `room_images`:
  - Optional: for cover image preview (one per room with `is_cover = true`).

## Acceptance criteria (API contract)

- **Request**: `GET /api/admin/rooms/pending?page=1&limit=20`
  - Query params: `page` (default 1), `limit` (default 20, max 50).
  - **Auth required**: Admin token (enforce via `requireAuth` + `authorize('ADMIN')`).
  
- **Success (200)**: JSON envelope with `data` object containing:
  ```json
  {
    "items": [
      {
        "roomId": "uuid",
        "title": "string",
        "roomType": "string",
        "detailedAddress": "string",
        "monthlyRent": number,
        "depositAmount": number,
        "status": "AVAILABLE",
        "createdAt": "ISO timestamp",
        "updatedAt": "ISO timestamp",
        "host": {
          "landlordId": "uuid",
          "fullName": "string",
          "username": "string",
          "email": "string",
          "phoneNumber": "string",
          "avatarUrl": "string or null"
        },
        "coverImageUrl": "string or null",
        "approvalId": "uuid",
        "approvalCreatedAt": "ISO timestamp"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5
    }
  }
  ```

- **Validation errors (400)**:
  - Invalid page / limit (must be positive integers, limit <= 50).

- **Auth errors (401 / 403)**:
  - `401` if no token.
  - `403` if token is not ADMIN role.

- **Empty result (200)**:
  - No pending rooms: `items: []`, `pagination.total: 0`.

## Implementation plan (step-by-step)

### 1. Review schema ✓ (done)
- Columns in `backend/db/migrations/007_create_rooms.js`, `010_create_room_approvals.js`.
- Relationship: `room_approvals.room_id` → `rooms.room_id`.

### 2. Repository: Add `findPendingRooms(page, limit)` in `backend/repositories/admin/roomRepository.js` (or extend main roomRepository)
   - **Query requirements**:
     - Select room columns and approval columns.
     - Join `room_approvals` with `approval_status = 'PENDING'`.
     - Join `users` to get landlord info via `rooms.landlord_id → users.user_id`.
     - Optional: Left join `room_images` with `is_cover = true` for cover image.
     - Filter: `rooms.status = 'AVAILABLE'` (assuming pending rooms are still available).
     - Order by: `room_approvals.created_at DESC` (newest approval request first).
     - Paginate with offset.
   - **Return**:
     - Array of room + approval + host info.
     - Use parameter binding.
   - **Example join structure**:
     ```sql
     SELECT r.*, ra.approval_id, ra.created_at AS approval_created_at,
            u.full_name, u.username, u.email, u.phone_number, u.avatar_url,
            ri.image_url AS cover_image_url
     FROM rooms r
     INNER JOIN room_approvals ra ON r.room_id = ra.room_id AND ra.approval_status = 'PENDING'
     LEFT JOIN users u ON u.user_id = r.landlord_id
     LEFT JOIN room_images ri ON ri.room_id = r.room_id AND ri.is_cover = true
     WHERE r.status = 'AVAILABLE'
     ORDER BY ra.created_at DESC
     LIMIT ? OFFSET ?
     ```

### 3. Repository: Add helper `countPendingRooms()` for pagination total
   - Count rooms with PENDING approval status and AVAILABLE status.

### 4. Service: Add `listPendingRooms(query)` in `backend/services/admin/roomService.js` (or shared `services/roomService.js`)
   - Normalize / validate pagination params (page, limit).
   - Call `roomRepository.findPendingRooms(page, limit)`.
   - Call `roomRepository.countPendingRooms()`.
   - Map fields into API DTO (camelCase, convert decimals to numbers).
   - Return paginated response.

### 5. Controller: Add `listPendingRooms` in `backend/controllers/admin/roomController.js`
   - Extract query params from `req.query`.
   - Call `roomService.listPendingRooms(req.query)`.
   - Return `sendSuccess(res, { status: 200, message: 'Danh sách phòng chờ duyệt', data: result })`.
   - Handle errors via middleware.

### 6. Route: Mount `GET /api/admin/rooms/pending` in `backend/routes/admin/roomRoutes.js`
   - Apply `requireAuth` middleware to enforce JWT token.
   - Apply `authorize('ADMIN')` middleware to enforce admin-only access.
   - Wire to controller method.

### 7. Tests & Postman
   - Happy path: Admin token, no filters → returns list with pagination.
   - Pagination tests: page=2, limit=10, etc.
   - Auth error: No token → 401.
   - Auth error: Tenant/Host token → 403.
   - Empty result: If no pending rooms → 200 with `items: []`.
   - Add to `thi/GUILD/9-test.md` and Postman collection.

## Error handling & edge cases

- **No auth token**: `401 Unauthorized` (handled by `requireAuth` middleware).
- **Non-admin role**: `403 Forbidden` (handled by `authorize` middleware).
- **Invalid pagination**: `400 Bad Request` (validate in service).
- **Null values**: `avatar_url`, `cover_image_url` can be null → return as null in DTO.
- **Room image missing**: If no cover image, return `coverImageUrl: null`.
- **Empty pending list**: Return `items: []` and `total: 0` (not an error).

## Implementation notes (developer tips)

- **Middleware order in route**: `requireAuth` must run before `authorize` to ensure token is present.
- **SQL JOIN**: Use `INNER JOIN` for `room_approvals` (must have approval row); use `LEFT JOIN` for `room_images` and `users` (can be missing).
- **is_cover check**: If using left join on room_images, ensure `WHERE ri.is_cover = true` OR `ri.is_cover IS NULL` to get exactly one cover per room if exists.
- **Performance**: Add index on `(room_id, approval_status, created_at)` for room_approvals (likely already exists per migration 020).
- **DTO mapping**: Follow existing pattern from `listRooms` in `services/roomService.js` for consistency.

## Deliverables

- Code:
  - `backend/repositories/admin/roomRepository.js` (new) OR extend existing `roomRepository.js`
  - `backend/services/admin/roomService.js` (new) OR extend existing service
  - `backend/controllers/admin/roomController.js` (add method)
  - `backend/routes/admin/roomRoutes.js` (add route)
- Tests:
  - `thi/GUILD/9-test.md` (test plan)
  - Postman request in collection
- Plan file: this document

## Timeline (estimate)

- Review schema & draft plan: 30m ✓
- Repository + service + controller + route: 60–90m
- Tests + Postman + verification: 30–60m

---

Created by: Thi
Date: 2026-06-16
