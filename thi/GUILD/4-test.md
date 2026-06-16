# Test Plan: U016 — Delete Room (Host)

Mục tiêu: kiểm tra endpoint `DELETE /api/rooms/:id` theo plan `thi/plan/4-delete-room.md`.

1) Chuẩn bị môi trường
- Chạy migration & seed nếu cần:

```bash
# từ thư mục backend
npm run migrate
npm run seed
npm start
```

- Mở Postman/Insomnia hoặc dùng `curl`.
- Cần token của Host (Bearer). Tạo tài khoản Host hoặc dùng seeded host; lấy token bằng `POST /api/auth/login`.

2) Kiểm tra Happy Path — xóa room khi KHÔNG có deposit
- Steps:
  1. Tạo một room bằng Host token (POST `/api/rooms`), hoặc dùng room có sẵn và xác nhận không có deposit liên quan.
  2. Gọi `DELETE /api/rooms/:id` với header `Authorization: Bearer <host_token>`.

- Expected:
  - HTTP 200
  - Response body: `{ success: true, message: 'deleted' }`
  - DB: `SELECT * FROM rooms WHERE room_id = '<id>'` → 0 rows
  - DB: `SELECT * FROM room_images WHERE room_id = '<id>'` → 0 rows (cascade)
  - DB: `SELECT * FROM room_approvals WHERE room_id = '<id>'` → 0 rows (cascade)
  - DB: `SELECT * FROM favorites WHERE room_id = '<id>'` → 0 rows (cascade)
  - Audit: `SELECT * FROM system_logs WHERE action = 'DELETE_ROOM:<id>'` → at least one row (if logging worked)

3) Kiểm tra Conflict — không xóa khi có deposit
- Steps:
  1. Tạo room (Host) and note `room_id`.
  2. Tạo tenant và tạo deposit cho room (POST `/api/bookings/deposits`), hoặc insert deposit via DB for test.
  3. Gọi `DELETE /api/rooms/:id` với Host token.

- Expected:
  - HTTP 409
  - Response error message: `Room has active deposits; cannot delete` (consistent with `AppError`)
  - DB: room vẫn tồn tại

4) Kiểm tra Authorization/Ownership
- Cases:
  - Caller is different Host (not owner) → expect HTTP 403.
  - Caller is Tenant (non-host) → expect HTTP 403 or 401 depending on auth guard.

5) Kiểm tra Not Found
- Case: Use a non-existent UUID (random) → expect HTTP 404.

6) Kiểm tra Input Validation
- Case: invalid UUID format for `:id` → expect HTTP 400 (validate input in controller/service). If backend doesn't validate format, expect 404.

7) DB-level sanity checks
- Verify `deposits.room_id` has `ON DELETE RESTRICT` by attempting to delete via DB (should fail if deposit exists). Example SQL check:

```sql
-- count deposits
SELECT count(*) FROM deposits WHERE room_id = '<id>';

-- ensure rooms row removed after API delete
SELECT * FROM rooms WHERE room_id = '<id>';
```

8) Postman collection snippets
- Request: Delete room (Host)
  - Method: DELETE
  - URL: `{{baseUrl}}/api/rooms/{{roomId}}`
  - Headers: `Authorization: Bearer {{hostToken}}`, `Content-Type: application/json`
  - Body: none
  - Tests (Postman):

```javascript
pm.test('Status is 200', () => pm.response.to.have.status(200));
pm.test('Body message is deleted', () => {
  const j = pm.response.json();
  pm.expect(j.message).to.eql('deleted');
});
```

9) Automation / integration test suggestions
- Unit test the `roomService.deleteRoom` logic with mocked `depositRepository` and `roomRepository`:
  - Mock `countByRoomId` -> 0 → expect `remove` called and resolved
  - Mock `countByRoomId` -> >0 → expect `AppError` thrown with 409

- Integration test (runs against test DB):
  - create host, room, ensure no deposit -> call API -> assert room removed
  - create room + deposit -> call API -> assert 409 and room present

10) Cleanup steps after tests
- If using persistent DB with seeds, re-run migrations/seed or manually delete test rows to restore state.

11) Debug tips
- If deletion returns 200 but DB row remains: check for transaction errors in server logs and whether `roomRepository.remove` used transaction param.
- If audit log missing: check `system_logs` migration and ensure `user_id` used exists in `users` table (seeding may use `landlords`/`users` mismatch). If `system_logs` insert fails, service swallows error — check server logs.

---
Follow this document to validate the feature; tôi có thể tạo sẵn Postman requests hoặc viết integration tests nếu bạn muốn — chọn tiếp theo?
