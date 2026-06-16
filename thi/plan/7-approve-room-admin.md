# Plan: FR-6.2 — Approve Room (Admin)

Owner: Thi
Related API: `PATCH /api/admin/rooms/:id/approve`
Goal: Provide backend implementation for admin to approve a pending room listing.

## Principles and Conventions

- **Security & RBAC**: Only **Admin** role can access this endpoint. Enforce via `authorize('ADMIN')` and `requireAuth`.
- **Code Style**: Follow `CODEX.md` (no hardcoding, use `camelCase`, layered architecture, standard JSON response).
- **Error Handling**: Use custom `AppError` and proper HTTP status codes. No empty try-catch.
- **Transactions**: State changes involving multiple tables must be wrapped in a database transaction (`trx`).

## Database Context

- `rooms` table: We ensure the room exists.
- `room_approvals` table: Target to update `approval_status` from `PENDING` to `APPROVED`.
- `system_logs` table: Log the admin action (`action: 'ADMIN_APPROVED_ROOM'`).
- `notifications` table: Send a notification to the Host (`user_id = room.landlord_id`) that the room is approved.

## Acceptance Criteria (API Contract)

- **Request**: `PATCH /api/admin/rooms/:id/approve`
  - Auth required: Admin JWT token.
  
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "message": "Phê duyệt bài đăng thành công.",
    "data": {
      "roomId": "uuid",
      "approvalStatus": "APPROVED"
    }
  }
  ```

- **Error Cases**:
  - `401 Unauthorized`: Missing or invalid token.
  - `403 Forbidden`: Token belongs to Tenant/Host.
  - `404 Not Found`: Room does not exist.
  - `409 Conflict`: Room is not in PENDING state (e.g., already approved or rejected).

## Implementation Plan (Step-by-step)

### 1. Repository Layer (`backend/repositories/admin/roomRepository.js` or shared)
   - Add/extend a method `updateApprovalStatus(roomId, status, trx)` that updates the `room_approvals` table where `room_id = roomId`.
   - Add a method to fetch the current approval status of the room to validate before updating.
   - Add `system_logs` repository insertion.
   - Add `notifications` repository insertion.

### 2. Service Layer (`backend/services/admin/roomService.js`)
   - Create method `approveRoom(roomId, adminId)`.
   - Start a DB transaction (`db.transaction`).
   - Validate if room exists (throw 404 if not).
   - Validate if current approval status is `PENDING` (throw 409 if not).
   - Call `roomRepository.updateApprovalStatus(roomId, 'APPROVED', trx)`.
   - Call log repository to log: `user_id = adminId`, `action = 'ADMIN_APPROVED_ROOM: ' + roomId`.
   - Create notification payload for Host (`notification_type = 'SYSTEM'`, `title = 'Phòng đã được duyệt'`, `content = 'Bài đăng phòng của bạn đã được phê duyệt và đang hiển thị công khai.'`) and insert.
   - Commit transaction. Return updated data.

### 3. Controller Layer (`backend/controllers/admin/roomController.js`)
   - Extract `roomId` from `req.params.id`.
   - Extract `adminId` from `req.user.userId` (populated by auth middleware).
   - Call `roomService.approveRoom(roomId, adminId)`.
   - Return standard success response.

### 4. Route Layer (`backend/routes/admin/roomRoutes.js`)
   - Mount `PATCH /:id/approve`.
   - Add middlewares: `requireAuth`, `authorize('ADMIN')`.
   - Link to `roomController.approveRoom`.

### 5. Testing (Postman)
   - Use `ADMIN_TOKEN`.
   - Happy Path: Call API on a `PENDING` room -> 200 OK. Verify DB (approval status is APPROVED, notification generated, log written).
   - Conflict: Call again -> 409 Conflict.
   - Auth errors: Call with `HOST_TOKEN` -> 403 Forbidden.

## Timeline
- Code: 30-45 minutes
- Testing & Postman setup: 15-20 minutes
