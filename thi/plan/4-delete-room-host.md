# Plan: U016 / FR-6.3 — Delete Room (Host)

## Mục tiêu
Cho phép Chủ phòng (Host) xóa một phòng của họ qua API: `DELETE /api/rooms/:id`.
Yêu cầu: Host token, response `200` khi xóa thành công (body: `{ success: true, message: 'deleted' }`).

## Tổng quan theo schema
- Xem migrations liên quan để tuân thủ ràng buộc: `backend/db/migrations/007_create_rooms.js`, `008_create_room_images.js`, `009_create_favorites.js`, `010_create_room_approvals.js`, `011_create_deposits.js`.
- Lưu ý quan trọng từ schema:
  - `room_images`, `favorites`, `room_approvals` đều có `ON DELETE CASCADE` từ `rooms` → xóa room sẽ tự động xóa ảnh, favorites, approval history.
  - `deposits.room_id` là `REFERENCES rooms ... ON DELETE RESTRICT` → nếu có bản ghi trong `deposits` tham chiếu tới room thì DB sẽ ngăn chặn xoá room.

=> Business rule chính: KHÔNG cho phép xóa room khi tồn tại bất kỳ `deposit` nào (tốt nhất: kiểm tra mọi deposit liên quan và từ chối xóa). Nếu yêu cầu nghiệp vụ cho phép xóa khi deposits đã được xử lý, phải xử lý deposits (và transactions) trước khi xóa — điều này cần approval của team tài chính; plan dưới đây chọn phương án an toàn: từ chối xóa khi có deposits.

## API spec (developer-facing)
- Method: `DELETE`
- Path: `/api/rooms/:id`
- Auth: Host token (JWT) — must be owner of the room
- Success: `200` — `{ success: true, message: 'deleted' }`
- Errors:
  - `401` Unauthorized (no/invalid token)
  - `403` Forbidden (user not owner or lacks HOST role)
  - `404` Not Found (room id not found)
  - `409` Conflict or `400` Bad Request (cannot delete because deposits exist)

## Implementation steps (chi tiết hành động)

1) Route
  - File: `backend/routes/host/roomRoutes.js`
  - Add route (or ensure it exists):
    - `router.delete('/:roomId', requireAuth, roleGuard('HOST'), roomController.deleteRoom);`
  - Use existing auth middleware (`requireAuth` / `authenticate`) and role guard (`roleGuard` / `authorizeHost`) consistent with project conventions.

2) Controller
  - File: `backend/controllers/host/roomController.js`
  - Implement `async deleteRoom(req, res, next)`:
    - Extract `roomId` from `req.params` and `userId` (landlord id) from `req.user` (populated by auth middleware).
    - Call `await roomService.deleteRoom(landlordId, roomId)`.
    - On success: `return sendSuccess(res, { message: 'deleted' })` with HTTP 200.
    - Map known AppError exceptions to proper status codes (use existing `AppError` and `errorHandler`).

3) Service (business logic)
  - File: `backend/services/roomService.js` or `backend/services/host/roomService.js` (follow existing file layout; 3-update-room-host used `host/roomService.js`).
  - Add `async deleteRoom(landlordId, roomId)` with these steps inside a DB transaction:
    a) Load the room by `roomId` (repository `findById(roomId, trx)` or equivalent). If not found -> throw `AppError('NOT_FOUND', 'Room not found', 404)`.
    b) Verify ownership: if `room.landlord_id !== landlordId` -> throw `AppError('FORBIDDEN', 'Not owner', 403)`.
    c) Query `deposits` table for any rows with `room_id = roomId` (use repository `depositRepository.countByRoomId(roomId)` or raw query). If count > 0 -> throw `AppError('CONFLICT', 'Room has active deposits; cannot delete', 409)`.
       - Note: consider business decision: count all deposits OR only deposits with statuses other than `CANCELLED`/`EXPIRED` — default to ANY deposit present forbids delete, and document this.
    d) If no deposits, call repository to delete room: `await roomRepository.deleteById(roomId, trx)` (this will issue `DELETE FROM rooms WHERE room_id = ?`, cascades will remove images/approvals/favorites).
    e) Optionally insert a system log record (`system_logs`) auditing the deletion (who/when/roomId) for traceability.
    f) Commit transaction and return.

4) Repository
  - File: `backend/repositories/roomRepository.js`
  - Add `async deleteById(roomId, trx)` which performs `return knex('rooms').transacting(trx).where({ room_id: roomId }).del();` or equivalent using existing DB helper.
  - Add (or reuse) `async findById(roomId, trx)` and `async existsDeposits(roomId)` (or use `depositRepository.countByRoomId`).

5) Deposit check helper
  - File: `backend/repositories/depositRepository.js` (or similar)
  - Add `async countByRoomId(roomId)` returning integer. Use it from service.

6) Error handling & messages
  - Reuse `AppError` class for consistent error payloads.
  - Return `409` with message `Room has active deposits; cannot delete` when deposits exist.

7) Tests & Postman
  - Postman requests to add:
    - Happy path: Host creates room (if not exist) → `DELETE /api/rooms/:id` -> expect `200` and room removed.
    - Not owner: other host or tenant token -> expect `403`.
    - Not found: random id -> expect `404`.
    - Conflict: create a deposit for the room (use `POST /api/bookings/deposits`) -> then `DELETE` -> expect `409`.
  - Integration tests (if present): cover service behavior including transaction rollback on unexpected error.

8) Edge cases & decisions
  - Soft delete vs hard delete: current schema has no `deleted_at`. This plan implements hard delete. If product requires soft deletes, add `deleted_at` column via migration and change repository accordingly.
  - If team prefers to allow deletion after admin/manual cleanup of deposits, change service to either reject only active deposits or perform deposit archival flow with explicit approvals.
  - If transactions/financial records must be preserved immutably, DO NOT delete `transactions` — `transactions` currently cascade to `deposits` on deposit delete; consult Thinh before deleting deposits.

9) Security & validation
  - Ensure route uses auth middleware and role guard.
  - Validate `roomId` is UUID format and return `400` if invalid input.

10) Logging & monitoring
  - Record an audit entry in `system_logs` (or `room_approvals` analog) for deletion attempts (success and failure reasons).

## Checklist (developer)
- [ ] Add route `DELETE /api/rooms/:id` in `backend/routes/host/roomRoutes.js`.
- [ ] Implement `deleteRoom` in `backend/controllers/host/roomController.js`.
- [ ] Implement `roomService.deleteRoom` in service layer with deposit check and transaction.
- [ ] Add `roomRepository.deleteById` and `depositRepository.countByRoomId` helpers.
- [ ] Add Postman tests and integration/unit tests for happy path and error cases.
- [ ] Add audit logging entry for deletions.

## Files referenced (for review)
- backend/db/migrations/007_create_rooms.js
- backend/db/migrations/008_create_room_images.js
- backend/db/migrations/009_create_favorites.js
- backend/db/migrations/010_create_room_approvals.js
- backend/db/migrations/011_create_deposits.js

---
End of plan.
