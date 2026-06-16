# Hướng dẫn Test API: Từ chối bài đăng phòng (Admin)

Tính năng này cho phép Admin từ chối một bài đăng phòng đang ở trạng thái `PENDING` (chuyển sang `REJECTED`), bắt buộc phải cung cấp lý do từ chối để thông báo cho Host.

## 1. Chuẩn bị (Setup)
- **Công cụ:** Postman (hoặc công cụ test API tương đương).
- **Authentication:** Cần chuẩn bị 2 loại Token:
  - `ADMIN_TOKEN`: Token của tài khoản có role `ADMIN`.
  - `HOST_TOKEN`: Token của tài khoản có role `HOST` (Dùng để test bảo mật).
- **Data (Database):** Cần có ít nhất một phòng trong bảng `rooms` mà trạng thái trong bảng `room_approvals` đang là `PENDING`. Bạn có thể lấy danh sách ID phòng chờ duyệt qua API `GET /api/admin/rooms/pending`.

## 2. Các kịch bản kiểm thử (Test Cases)

### 2.1. Kịch bản thành công (Happy Path) - HTTP 200 OK
- **Method:** `PATCH`
- **URL:** `/api/admin/rooms/{roomId}/reject` *(Thay `{roomId}` bằng ID của phòng đang có trạng thái PENDING)*.
- **Headers:** 
  - `Authorization: Bearer <ADMIN_TOKEN>`
  - `Content-Type: application/json`
- **Body:**
  ```json
  {
    "reason": "Hình ảnh phòng quá mờ và mô tả chưa chính xác."
  }
  ```
- **Kết quả mong đợi:**
  - Status Code: `200 OK`
  - Response Body:
    ```json
    {
      "success": true,
      "message": "Từ chối bài đăng thành công.",
      "data": {
        "roomId": "<roomId đã truyền>",
        "approvalStatus": "REJECTED"
      }
    }
    ```
- **Kiểm tra Database sau khi chạy thành công:**
  1. Bảng `room_approvals`: Cột `approval_status` của `room_id` tương ứng phải chuyển thành `REJECTED`.
  2. Bảng `system_logs`: Phải có 1 record mới với `user_id` là ID của Admin và cột `action` có chứa `ADMIN_REJECTED_ROOM: <roomId>`.
  3. Bảng `notifications`: Phải có 1 record mới với `user_id` là ID của Host, nội dung (cột `content`) phải chứa lý do từ chối: `"Bài đăng của bạn bị từ chối với lý do: Hình ảnh phòng quá mờ và mô tả chưa chính xác."`.

### 2.2. Kịch bản lỗi: Thiếu lý do từ chối - HTTP 400 Bad Request
- **Method:** `PATCH`
- **URL:** `/api/admin/rooms/{roomId}/reject`
- **Headers:** 
  - `Authorization: Bearer <ADMIN_TOKEN>`
- **Body (Thiếu field reason hoặc reason rỗng):**
  ```json
  {} 
  // hoặc { "reason": "" }
  // hoặc { "reason": "   " }
  ```
- **Kết quả mong đợi:**
  - Status Code: `400 Bad Request`
  - Message báo lỗi: "Lý do từ chối không được để trống".

### 2.3. Kịch bản lỗi: Phòng không tồn tại - HTTP 404 Not Found
- **Method:** `PATCH`
- **URL:** `/api/admin/rooms/{fake-uuid-or-id}/reject` *(Sử dụng một ID không có thực)*.
- **Headers:** 
  - `Authorization: Bearer <ADMIN_TOKEN>`
- **Body:**
  ```json
  {
    "reason": "Test lỗi phòng không tồn tại"
  }
  ```
- **Kết quả mong đợi:**
  - Status Code: `404 Not Found`
  - Message báo lỗi: "Không tìm thấy phòng".

### 2.4. Kịch bản lỗi: Phòng không ở trạng thái PENDING - HTTP 409 Conflict
- **Method:** `PATCH`
- **URL:** `/api/admin/rooms/{roomId}/reject` 
  - *(Dùng lại `{roomId}` vừa thực hiện ở kịch bản 2.1 (đã bị Reject) hoặc ID phòng đã Approved).*
- **Headers:** 
  - `Authorization: Bearer <ADMIN_TOKEN>`
- **Body:**
  ```json
  {
    "reason": "Phòng đã duyệt/từ chối rồi nhưng vẫn test"
  }
  ```
- **Kết quả mong đợi:**
  - Status Code: `409 Conflict`
  - Message báo lỗi: "Phòng không ở trạng thái chờ duyệt".

### 2.5. Kịch bản lỗi: Sai phân quyền (Không phải Admin) - HTTP 403 / 401
- **Test 1: Dùng Host Token**
  - **Method:** `PATCH`
  - **URL:** `/api/admin/rooms/{roomId}/reject`
  - **Headers:** `Authorization: Bearer <HOST_TOKEN>`
  - **Body:** `{ "reason": "Host tự reject" }`
  - **Kết quả mong đợi:** Status Code `403 Forbidden`.
- **Test 2: Không truyền Token**
  - **Method:** `PATCH`
  - **URL:** `/api/admin/rooms/{roomId}/reject`
  - **Headers:** Không có Authorization.
  - **Body:** `{ "reason": "Guest tự reject" }`
  - **Kết quả mong đợi:** Status Code `401 Unauthorized`.
