(# Test Plan: U015 — PATCH /api/rooms/:id (Host update-room))

Mục tiêu: kiểm tra end-to-end hành vi của `PATCH /api/rooms/:id` do Host thực hiện, bao gồm cập nhật trường thương mại, cập nhật ảnh (multipart), reset approval về `PENDING` khi thay đổi nội dung quan trọng, và các trường hợp lỗi/permission.

Chuẩn bị môi trường
- Chạy migrations và seed (nếu cần) để có dữ liệu test.
- Cài dependencies ở thư mục `backend`:

```powershell
cd backend
npm install
```

- Đảm bảo `multer` đã được cài và `backend/config/multer` tồn tại. Nếu server chạy trong Docker, rebuild image sau khi cài.
- Khởi động server dev:

```powershell
npm run dev
# hoặc
node server.js
```

- Xác thực: cần token của một Host (landlord). Chuẩn bị một tài khoản Host đã tồn tại trong DB hoặc tạo mới qua endpoint đăng ký/đăng nhập. Lưu `Authorization: Bearer <token>` để dùng trong Postman/curl.

Endpoints tham chiếu
- `PATCH /api/rooms/:id` — cập nhật room (Host)
- `GET /api/rooms/my` — kiểm tra danh sách phòng của Host sau cập nhật
- DB tables: `rooms`, `room_images`, `room_approvals`

Test data mẫu
- Giả sử `roomId = 'room-uuid-123'` (thay bằng giá trị thực từ DB)
- Header chung: `Authorization: Bearer <HOST_TOKEN>`

Test cases (chi tiết từng bước và payload)

1) Smoke: update text fields only (price)
- Mục đích: đảm bảo update đơn giản thành công và tạo bản ghi approval mới nếu giá thay đổi.
- Request:
	- Method: `PATCH`
	- URL: `/api/rooms/{roomId}`
	- Headers: `Content-Type: application/json`, `Authorization: Bearer <HOST_TOKEN>`
	- Body JSON:

```json
{
	"monthly_rent": 3500000,
	"room_description": "Cập nhật mô tả ngắn"
}
```

- Kỳ vọng:
	- HTTP 200
	- Response body envelope: `{ success: true, message, data: { room, images, approval } }`
	- `data.room` chứa `monthly_rent` = 3500000
	- `data.approval` === `'PENDING'` (một record mới trong `room_approvals`)

2) Update images (replace) — multipart/form-data
- Mục đích: upload ảnh mới, kiểm tra files lưu vào `uploads/rooms/{roomId}/`, `room_images` bị thay thế, và approval reset.
- Request (Postman):
	- Method: `PATCH` `/api/rooms/{roomId}`
	- Authorization: Bearer token
	- Body type: `form-data`
		- Key `images` (type: File) — chọn nhiều file (≥3 recommended)
		- Optional other fields (e.g., `title` or `monthly_rent`)

- Curl example (single file shown; repeat `-F images=@...` per file):

```bash
curl -X PATCH "http://localhost:3000/api/rooms/{roomId}" \
	-H "Authorization: Bearer <HOST_TOKEN>" \
	-F "images=@/path/to/img1.jpg" \
	-F "images=@/path/to/img2.jpg" \
	-F "images=@/path/to/img3.jpg"
```

- Kỳ vọng:
	- HTTP 200
	- `data.images` trả về danh sách ảnh mới (sequence_number, image_url, is_cover)
	- Files tồn tại trên disk: `backend/uploads/rooms/{roomId}/<filenames>`
	- `room_images` DB rows count = số ảnh mới
	- `room_approvals` có bản ghi mới `PENDING`

3) Update status to `RENTED`
- Mục đích: kiểm tra Host có thể đổi `status` và room bị ẩn khỏi public queries nếu logic client/server dựa trên approval.
- Request JSON body:

```json
{ "status": "RENTED" }
```

- Kỳ vọng:
	- HTTP 200
	- `data.room.status` === `RENTED`
	- `GET /api/rooms` (guest listing) không trả về room này nếu guest endpoints chỉ show AVAILABLE.

4) Attempt update by another Host (authorization)
- Mục đích: kiểm tra guard ownership.
- Steps:
	- Đăng nhập bằng token của Host B (không phải owner)
	- PATCH `/api/rooms/{roomId}` change any field
- Kỳ vọng: HTTP 403 (Forbidden) và message rõ ràng.

5) Validation: publish without required fields
- Mục đích: nếu business rule yêu cầu >=3 images và price để public, test hành vi khi Host cố set `status=AVAILABLE` nhưng thiếu điều kiện.
- Steps:
	- Ensure room has <3 images (or remove images via DB for test)
	- PATCH body: `{ "status": "AVAILABLE" }` or update fields to attempt publish
- Kỳ vọng: HTTP 400 với lỗi `VALIDATION_ERROR` và message giải thích thiếu ảnh/giá.

6) Concurrency / atomicity
- Mục đích: đảm bảo update + images replacement + approval insert ở trong transaction.
- Steps (manual smoke):
	- Simulate uploading images and making field updates in a single PATCH request (multipart + form fields)
	- If server crashes mid-way, DB should not be left in inconsistent state (partial images rows with old room fields). Verify by examining `room_images` and `rooms` rows.

Checks trực tiếp trên DB & filesystem
- DB: kiểm tra table `room_approvals` cho `room_id` đó:

```sql
SELECT * FROM room_approvals WHERE room_id = '<roomId>' ORDER BY created_at DESC;
```

- DB: kiểm tra `room_images`:

```sql
SELECT sequence_number, image_url, is_cover FROM room_images WHERE room_id = '<roomId>' ORDER BY sequence_number;
```

- File system: kiểm tra folder `backend/uploads/rooms/{roomId}` tồn tại và chứa file mới.

Automated tests (suggestion)
- Add integration tests using Supertest + Mocha/Jest in `backend/test/` that:
	- Authenticate a Host and store token
	- Create a room (or use seed)
	- PATCH to update price and assert DB `room_approvals` increased by 1
	- PATCH with multipart images and assert `room_images` count and files created (can mock fs or use temp dir)

Postman collection notes
- Create requests for each test case above. Use environment variables:
	- `{{baseUrl}}`, `{{hostToken}}`, `{{roomId}}`
- For multipart, set Body to `form-data` and key `images` type `File` (select multiple files in Postman by adding multiple `images` keys).

Troubleshooting
- If you see `Error: Cannot find module 'multer'` → run `npm install multer` in `backend` and restart server.
- If server returns stub messages, ensure you rebuilt/restarted the node process and that code changes are mounted if running in Docker.
- If uploads not saved, check process permissions for `backend/uploads` and confirm `uploadMiddleware` uses `buffer` in memory (this project writes file.data from buffer).

Expected response examples
- Success (200):

```json
{
	"success": true,
	"message": "Host cập nhật phòng thành công",
	"data": {
		"room": { /* room fields */ },
		"images": [ { "sequence_number":1, "image_url":"/uploads/rooms/...", "is_cover":true } ],
		"approval": "PENDING"
	}
}
```

- Validation error (400):

```json
{
	"success": false,
	"message": "VALIDATION_ERROR",
	"errors": ["At least 3 images are required"]
}
```

---

Ghi chú: nếu bạn muốn, mình có thể tiếp tục và tạo một Postman collection tự động từ các kịch bản trên hoặc viết test code (Supertest + Jest) trong `backend/test/` — bạn muốn mình làm bước nào tiếp theo?

