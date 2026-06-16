# Test Plan: Create Room (Host)

## Mục tiêu
Kiểm tra flow Host tạo bài đăng phòng: upload ít nhất 3 ảnh, lưu `rooms` và khởi tạo `room_approvals` = PENDING. Sau admin approve, phòng xuất hiện ở danh sách public.

## Tiền đề
- Server backend chạy (ví dụ `http://localhost:3000`).
- Migrations & seeds đã chạy (seed admin nếu cần).
- Có token của Host (`HOST_TOKEN`) và Admin (`ADMIN_TOKEN`).

## Endpoints chính
- POST `/api/rooms` (multipart/form-data) — tạo phòng (field `images[]`)
- PATCH `/api/admin/rooms/:roomId/approve` — admin duyệt
- GET `/api/rooms` — public list

## 1. Happy path — Host tạo phòng thành công
Request (curl):

```bash
curl -X POST http://localhost:3000/api/rooms \
  -H "Authorization: Bearer $HOST_TOKEN" \
  -F "title=Phòng test" \
  -F "room_type=Phòng trọ" \
  -F "detailed_address=123 Đường A, Quận B" \
  -F "max_capacity=2" \
  -F "monthly_rent=5000000" \
  -F "deposit_amount=1000000" \
  -F "images[]=@/path/to/img1.jpg" \
  -F "images[]=@/path/to/img2.jpg" \
  -F "images[]=@/path/to/img3.jpg"
```

Expected response (201):

```json
{
  "success": true,
  "message": "Host tạo phòng thành công",
  "data": { "roomId": "<uuid>", "approval": "PENDING" }
}
```

Verify:
- Response 201, có `roomId`.
- Image files saved under `/uploads/rooms/<roomId>/` and accessible via `http://localhost:3000/uploads/rooms/<roomId>/<file>`.

## 2. Error cases
- Thiếu ảnh (<3): gửi chỉ 1-2 ảnh → Expect 400 + message `At least 3 images are required`.
- Ảnh quá lớn (>5MB): Expect 400 (multer error) hoặc validation error.
- Thiếu trường bắt buộc (vd. `monthly_rent`): Expect 400 + validation message.

## 3. Approve flow
1. Admin approve:

```bash
curl -X PATCH http://localhost:3000/api/admin/rooms/<roomId>/approve \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

Expected: 200 success.

2. Public list should include room:

```bash
curl http://localhost:3000/api/rooms
```

Verify the returned list contains `roomId` (room must be visible only after approve).

## 4. Postman
- Tạo folder `Host - Rooms` với requests: `Create Room (multipart)`, `Get Rooms`, `Admin Approve`.
- Thêm tests in Postman to assert status codes and response body keys.

## Chú ý test tự động
- Run these scenarios in order: Create → Verify pending not in public → Approve → Verify visible.
- Clean up: xóa room bằng endpoint host delete (nếu cần) để giữ DB sạch.

