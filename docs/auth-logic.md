# Tài Liệu Yêu Cầu Logic - Trang Đăng Nhập & Đăng Ký

## 1. Phạm vi áp dụng
Tài liệu này dùng làm ngữ cảnh để AI Agent triển khai toàn bộ logic xử lý cho tính năng Đăng nhập (Login) và Đăng ký (Register) thuộc thư mục `frontend/app/(auth)/`.

## 2. Yêu cầu chi tiết về mặt Logic

### A. Trang Đăng Ký (Register) - `app/(auth)/register/page.tsx`
- **Form đầu vào**: Họ và tên, Email, Số điện thoại, Mật khẩu, Nhập lại mật khẩu, Vai trò (Chọn giữa Người thuê phòng hoặc Chủ trọ).
- **Xử lý phía Frontend**:
  - Kiểm tra tính hợp lệ dữ liệu (Validate) cơ bản: Email đúng định dạng, Mật khẩu tối thiểu 6 ký tự, Mật khẩu nhập lại phải trùng khớp.
  - Gửi dữ liệu qua API POST tới backend.
- **Xử lý phía Backend mong muốn**:
  - Kiểm tra xem Email hoặc Số điện thoại đã tồn tại trong database PostgreSQL chưa (Sử dụng Knex để query).
  - Băm mật khẩu (Hash password) trước khi thực hiện câu lệnh chèn (Insert) vào database.

### B. Trang Đăng Nhập (Login) - `app/(auth)/login/page.tsx`
- **Form đầu vào**: Email, Mật khẩu.
- **Xử lý phía Frontend**:
  - Gửi yêu cầu API POST chứa thông tin đăng nhập tới backend.
  - Nhận phản hồi (Response) từ backend: Nếu thành công, backend sẽ trả về thông tin user cùng một chuỗi **JWT Token**.
  - **Lưu trữ Token**: Lưu chuỗi JWT này vào `localStorage`, `cookie` hoặc quản lý thông qua State toàn cục (`context`, `store` có sẵn trong thư mục dự án) để duy trì trạng thái đăng nhập.
  - **Chuyển hướng (Redirect)**: Sau khi đăng nhập thành công, chuyển hướng người dùng quay trở lại Trang chủ công khai (`app/(guest)/page.tsx`) hoặc trang họ vừa bị chặn trước đó.

## 3. Các file cấu trúc liên quan cần lưu ý khi sinh code
Khi AI Agent viết code cho tính năng này, cần tuân thủ việc bóc tách logic vào đúng các thư mục hiện tại của dự án Frontend:
- **`frontend/types/`**: Nơi khai báo các Interface TypeScript (Ví dụ: `User`, `LoginInput`, `AuthResponse`).
- **`frontend/services/`**: Nơi viết các hàm call API bằng `fetch` hoặc `axios` (Ví dụ: tạo file `auth.service.ts` chứa các hàm `loginAPI`, `registerAPI`).
- **`frontend/context/` hoặc `frontend/store/`**: Nơi quản lý State đăng nhập toàn cục (Ví dụ: `AuthContext` để lưu trữ thông tin user hiện tại và hàm `logout`).