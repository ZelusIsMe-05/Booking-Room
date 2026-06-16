# Plan: FR-6.2 — Reject Room (Admin)

Owner: Thi
Related API: `PATCH /api/admin/rooms/:id/reject`
Goal: Provide backend implementation for admin to reject a pending room listing with a mandatory reason.

## Principles and Conventions

- **Security & RBAC**: Only **Admin** role can access this endpoint. Enforce via `authorize('ADMIN')` and `requireAuth`.
- **Code Style**: Follow `CODEX.md` (no hardcoding, use `camelCase`, layered architecture, standard JSON response).
- **Error Handling**: Use custom `AppError` and proper HTTP status codes.
- **Transactions**: State changes involving multiple tables must be wrapped in a database transaction (`trx`).

## Database Context

- `rooms` table: We ensure the room exists and fetch `landlord_id`.
- `room_approvals` table: Target to update `approval_status` from `PENDING` to `REJECTED`.
- `system_logs` table: Log the admin action (`action: 'ADMIN_REJECTED_ROOM'`).
- `notifications` table: Send a notification to the Host (`user_id = room.landlord_id`) that the room is rejected, including the **reason provided by the Admin** in the `content` field.

## Acceptance Criteria (API Contract)

- **Request**: `PATCH /api/admin/rooms/:id/reject`
  - Auth required: Admin JWT token.
  - Body:
    ```json
    {
      "reason": "Hình ảnh quá mờ và không đúng thực tế."
    }
    ```
  
- **Success Response (200)**:
  ```json
  {
    "success": true,
    "message": "Từ chối bài đăng thành công.",
    "data": {
      "roomId": "uuid",
      "approvalStatus": "REJECTED"
    }
  }
  ```

- **Error Cases**:
  - `400 Bad Request`: Missing `reason` in the request body.
  - `401 Unauthorized`: Missing or invalid token.
  - `403 Forbidden`: Token belongs to Tenant/Host.
  - `404 Not Found`: Room does not exist.
  - `409 Conflict`: Room is not in PENDING state (already approved or rejected).

## Implementation Plan (Step-by-step)

### 1. Repository Layer (`backend/repositories/admin/roomRepository.js` or shared)
   - Re-use the `updateApprovalStatus(roomId, status, trx)` method.
   - Re-use `system_logs` and `notifications` insertion repositories.

### 2. Service Layer (`backend/services/admin/roomService.js`)
   - Create method `rejectRoom(roomId, adminId, reason)`.
   - Validate `reason` (throw 400 AppError if empty or missing).
   - Start a DB transaction (`db.transaction`).
   - Validate if room exists (throw 404 if not).
   - Validate if current approval status is `PENDING` (throw 409 if not).
   - Call `roomRepository.updateApprovalStatus(roomId, 'REJECTED', trx)`.
   - Call log repository to log: `user_id = adminId`, `action = 'ADMIN_REJECTED_ROOM: ' + roomId`.
   - Create notification payload for Host:
     - `notification_type = 'SYSTEM'`
     - `title = 'Bài đăng phòng bị từ chối'`
     - `content = 'Bài đăng của bạn bị từ chối với lý do: ' + reason`
   - Insert notification via repository.
   - Commit transaction. Return updated data.

### 3. Controller Layer (`backend/controllers/admin/roomController.js`)
   - Extract `roomId` from `req.params.id`.
   - Extract `adminId` from `req.user.userId`.
   - Extract `reason` from `req.body.reason`.
   - Validate `reason` early in the controller (optional but recommended for 400 errors).
   - Call `roomService.rejectRoom(roomId, adminId, reason)`.
   - Return standard success response.

### 4. Route Layer (`backend/routes/admin/roomRoutes.js`)
   - Mount `PATCH /:id/reject`.
   - Add middlewares: `requireAuth`, `authorize('ADMIN')`, and optional validation middleware for `reason`.
   - Link to `roomController.rejectRoom`.

### 5. Testing (Postman)
   - Use `ADMIN_TOKEN`.
   - Validation fail: Call without `reason` -> 400 Bad Request.
   - Happy Path: Call API with `reason` on a `PENDING` room -> 200 OK. Verify DB (approval status is REJECTED, notification is generated with the exact reason, log is written).
   - Conflict: Call again -> 409 Conflict.
   - Auth errors: Call with `HOST_TOKEN` -> 403 Forbidden.

## Timeline
- Code: 30-40 minutes (since many repositories are shared with approve Room)
- Testing & Postman setup: 15-20 minutes
