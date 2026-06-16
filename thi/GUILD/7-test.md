# Hướng dẫn Test API: Phê duyệt bài đăng phòng (Admin)

Tính năng này cho phép Admin duyệt một phòng đang ở trạng thái `PENDING` sang trạng thái `APPROVED`.

## 1. Chuẩn bị (Setup)
- **Công cụ:** Postman (hoặc bất kỳ API Client nào).
- **Authentication:** Cần chuẩn bị 2 loại Token:
  - `ADMIN_TOKEN`: Token của tài khoản có role `ADMIN`.
  - `HOST_TOKEN`: Token của tài khoản có role `HOST` (Dùng để test bảo mật - phân quyền).
- **Data (Database):** Cần có ít nhất một phòng trong bảng `rooms` mà trạng thái trong bảng `room_approvals` tương ứng đang là `PENDING`. (Có thể sử dụng ID từ API `GET /api/admin/rooms/pending`).

## 2. Các kịch bản kiểm thử (Test Cases)

### 2.1. Kịch bản thành công (Happy Path) - HTTP 200 OK
- **Method:** `PATCH`
- **URL:** `/api/admin/rooms/{roomId}/approve` *(Thay `{roomId}` bằng ID của phòng đang có trạng thái PENDING)*.
- **Headers:** 
  - `Authorization: Bearer <ADMIN_TOKEN>`
- **Body:** Bỏ trống (Không yêu cầu).
- **Kết quả mong đợi:**
  - Status Code: `200 OK`
  - Response Body:
    ```json
    {
      "success": true,
      "message": "Phê duyệt bài đăng thành công.",
      "data": {
        "roomId": "<roomId đã truyền>",
        "approvalStatus": "APPROVED"
      }
    }
    ```
- **Kiểm tra Database sau khi chạy thành công:**
  1. Bảng `room_approvals`: `approval_status` của `room_id` này phải chuyển thành `APPROVED`.
  2. Bảng `system_logs`: Phải có 1 record mới với `user_id` là ID của Admin và `action` chứa chuỗi `ADMIN_APPROVED_ROOM: <roomId>`.
  3. Bảng `notifications`: Phải có 1 record thông báo mới được gửi đến `user_id` là ID của Host sở hữu phòng đó (landlord_id), nội dung cho biết phòng đã được duyệt.

### 2.2. Kịch bản lỗi: Phòng không tồn tại - HTTP 404 Not Found
- **Method:** `PATCH`
- **URL:** `/api/admin/rooms/{fake-uuid-or-id}/approve` *(Sử dụng một ID không có thực trong DB)*.
- **Headers:** 
  - `Authorization: Bearer <ADMIN_TOKEN>`
- **Kết quả mong đợi:**
  - Status Code: `404 Not Found`
  - Message báo lỗi "Không tìm thấy phòng".

### 2.3. Kịch bản lỗi: Phòng không ở trạng thái PENDING - HTTP 409 Conflict
- **Method:** `PATCH`
- **URL:** `/api/admin/rooms/{roomId}/approve`
  - *(Thay `{roomId}` bằng ID của phòng vừa mới được approve thành công ở kịch bản 2.1, hoặc một phòng đã REJECTED/APPROVED trước đó)*.
- **Headers:** 
  - `Authorization: Bearer <ADMIN_TOKEN>`
- **Kết quả mong đợi:**
  - Status Code: `409 Conflict`
  - Message báo lỗi "Phòng không ở trạng thái chờ duyệt".

### 2.4. Kịch bản lỗi: Sai phân quyền (Không phải Admin) - HTTP 403 Forbidden / HTTP 401 Unauthorized
- **Test 1: Dùng Host Token**
  - **Method:** `PATCH`
  - **URL:** `/api/admin/rooms/{roomId}/approve`
  - **Headers:** `Authorization: Bearer <HOST_TOKEN>`
  - **Kết quả mong đợi:** Status Code `403 Forbidden`.
- **Test 2: Không truyền Token**
  - **Method:** `PATCH`
  - **URL:** `/api/admin/rooms/{roomId}/approve`
  - **Headers:** Không có Authorization.
  - **Kết quả mong đợi:** Status Code `401 Unauthorized`.
