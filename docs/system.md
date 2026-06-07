# Tài Liệu Tổng Quan Hệ Thống Booking Room

## 1. Giới thiệu bài toán
Hệ thống Booking Room được xây dựng nhằm số hóa quy trình tìm kiếm và đặt phòng trọ. Hệ thống giải quyết bài toán kết nối giữa Người thuê phòng và Chủ trọ, tập trung mạnh vào 3 yếu tố cốt lõi:
- **Tính tương tác cao**: Hỗ trợ Realtime-chat giữa người thuê và chủ nhà.
- **Sự tiện lợi**: Bộ lọc và thanh tìm kiếm thông tin phòng trọ thông minh, trực quan.
- **Sự an toàn & rõ ràng**: Hệ thống đặt phòng 3 bên được quản lý chặt chẽ bởi bên thứ ba (Admin) nhằm phê duyệt bài đăng và giám sát giao dịch.

## 2. Đối tượng sử dụng (Hệ thống 3 bên)
- **Guest / Client (Người thuê phòng)**: Bất kỳ ai cũng có thể vào website để tham quan, xem danh sách và chi tiết phòng công khai. Tuy nhiên, khi thực hiện hành động **Đặt phòng** hoặc **Chat với chủ phòng**, người dùng bắt buộc phải đăng nhập (trở thành Client).
- **Host (Chủ trọ)**: Đăng tải thông tin phòng, quản lý trạng thái phòng trọ và tương tác trực tiếp với người thuê.
- **Admin (Quản trị viên)**: Phê duyệt/Từ chối các bài đăng từ chủ trọ, quản lý giao dịch và điều phối toàn bộ hệ thống để đảm bảo tính an toàn thông tin.

## 3. Công nghệ sử dụng (Tech Stack)
- **Frontend**: 
  - Thư viện React phối hợp với Framework Next.js (Sử dụng kiến trúc App Router, Route Groups).
  - TypeScript (`.tsx`, `.ts`).
  - CSS Utility: Tailwind CSS.
- **Backend**:
  - Môi trường: Node.js.
  - Framework: Express.
  - Cơ sở dữ liệu: PostgreSQL.
  - Query Builder & Migration: Thư viện Knex (Hỗ trợ viết query và quản lý cấu trúc database qua migration/seed).
- **Giao tiếp & Bảo mật**:
  - Xác thực người dùng bằng JSON Web Token (JWT).
  - Mật khẩu người dùng bắt buộc phải được băm (hash) trước khi lưu trữ xuống cơ sở dữ liệu.
  - Nhắn tin thời gian thực (Real-time chat) kết nối qua Socket.

## 4. Quy ước kiến trúc thư mục Frontend (Next.js App Router)
Frontend sử dụng tính năng **Route Groups** để quản lý phân quyền truy cập:
- `app/auth/`: Quản lý các trang xác thực công khai (`/login`, `/register`).
- `app/guest/`: Quản lý các trang xem thông tin công khai (`/` trang chủ, `/rooms`, `/rooms/[id]`). Ai cũng có thể vào được.
- `app/client/`: Quản lý các trang yêu cầu trạng thái đăng nhập của người thuê (`/bookings`, `/profile`).
- `app/host/`: Không gian quản lý dành riêng cho chủ nhà.
- `app/admin/`: Không gian quản lý dành riêng cho Admin.