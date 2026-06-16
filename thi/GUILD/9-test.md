# Test Plan: Admin Pending Rooms List
# Feature ID: FR-6.2

## Mục tiêu
Kiểm tra toàn bộ luồng (flow) cho phép Admin fetch (truy xuất) danh sách các phòng đang chờ duyệt.
Mục tiêu cốt lõi là xác minh:
1. Chỉ Admin mới có thể truy cập được endpoint này (Authorization).
2. API trả về đúng các phòng có trạng thái duyệt là PENDING và phòng đang ở trạng thái AVAILABLE.
3. Dữ liệu trả về phải đầy đủ (tên phòng, địa chỉ, chủ nhà, thông tin liên hệ, hình ảnh) và được phân trang đúng cách.

## Tiền đề (Prerequisites)
- Server backend phải đang chạy.
- Tất cả các migrations liên quan đến `rooms` và `room_approvals` phải được áp dụng.
- Cần các token sau:
    - `ADMIN_TOKEN`: JWT token của tài khoản có vai trò **Admin**.
    - `HOST_TOKEN`: JWT token của Host/Landlord (để kiểm tra các trường hợp quyền truy cập).

## Endpoints chính
- `GET /api/admin/rooms/pending`
  - Query Params: `page` (default 1), `limit` (default 20, max 50).
  - Headers: `Authorization: Bearer $ADMIN_TOKEN`.

## Các trường hợp kiểm thử (Test Scenarios)

### 1. Happy Path (Thành công)
**Mô tả**: Admin gọi API với token hợp lệ và tham số mặc định, hệ thống trả về danh sách các phòng chờ duyệt.
**Steps**:
1. Gửi request:
   ```bash
   curl -v -H "Authorization: Bearer $ADMIN_TOKEN" "http://localhost:3000/api/admin/rooms/pending?page=1&limit=20"
   ```
2. **Expected Response (200 OK)**:
   - Response body phải là cấu trúc JSON với `success: true`.
   - `data.items` là một mảng các phòng, mỗi phòng chứa đủ các trường: `roomId`, `title`, `detailedAddress`, `monthlyRent`, `depositAmount`, `status: AVAILABLE`, `host: {...}`, `coverImageUrl: "..."`, `approvalId: "..."`, `approvalCreatedAt: "..."`.
   - `pagination.total` phải là tổng số phòng đang chờ duyệt trong DB.

### 2. Pagination và Sorting
**Mô tả**: Kiểm tra khả năng phân trang và sắp xếp theo thời gian tạo approval.
**Steps**:
1. **Limit test**: Set `limit=10`, và xác nhận `items.length` khớp với `limit` (trừ khi tổng số < 10).
2. **Page jump**: Request `page=2`, xác nhận nội dung danh sách là các phòng khác với page 1.
3. **Sorting**: Sử dụng tham số `sortBy=approvalCreatedAt&order=desc` để xác nhận phòng được duyệt gần nhất xuất hiện đầu danh sách.

### 3. Error và Validation Cases (Kiểm tra lỗi)
**Mô tả**: Đảm bảo API trả về mã lỗi và thông báo rõ ràng khi không đáp ứng điều kiện.
**Steps**:
1. **Authentication Failure (401)**: Gửi request với token rỗng hoặc không hợp lệ.
   - **Expect**: 401 Unauthorized.
2. **Authorization Failure (403)**: Gửi request với token của người dùng có vai trò *Host* hoặc *Guest* (không phải Admin).
   - **Expect**: 403 Forbidden.
3. **Validation Failure (400)**: Gửi `page` hoặc `limit` là giá trị không hợp lệ (ví dụ: `page=abc`, `limit=-10`).
   - **Expect**: 400 Bad Request, kèm theo message lỗi xác thực.

### 4. Edge Cases (Các trường hợp biên)
**Mô tả**: Các tình huống không thường xảy ra nhưng phải được xử lý mượt mà.
**Steps**:
1. **No Pending Rooms**: Không có phòng nào có `room_approvals.approval_status = 'PENDING'`.
   - **Expect**: 200 OK, nhưng `data.items` phải là `[]` và `pagination.total` là `0`.
2. **Room status mix**: Kiểm tra một phòng đã được `APPROVED` hoặc `REJECTED`.
   - **Expect**: Phòng đó không bao giờ xuất hiện trong danh sách kết quả.
3. **Missing optional data**: Kiểm tra phòng không có `cover_image_url` hoặc `host.avatar_url`.
   - **Expect**: Các trường này phải trả về `null` trong DTO mà không gây lỗi API.

## Postman / Collection Setup
1. Tạo một collection mới: `Admin - Pending Rooms`.
2. Thêm request: `GET Pending Rooms List` (Sử dụng `ADMIN_TOKEN` trong Header).
3. Thêm tests để kiểm tra các trường hợp:
   - `pm.response.to.have.status(200)` (Happy Path)
   - `pm.expect(pm.response.json().data.items).to.be.an('array')`
   - Xây dựng một test case cho 403 Unauthorized để xác nhận quyền Admin.

## Tệp được cập nhật
- `backend/repositories/admin/roomRepository.js`
- `backend/services/admin/roomService.js`
- `backend/controllers/admin/roomController.js`
- `backend/routes/admin/roomRoutes.js`
- `thi/GUILD/9-test.md` (File này)


