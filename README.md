# Booking-Room - Hệ Thống Đặt Phòng 3 Bên

Hệ thống quản lý và đặt phòng 3 bên kết nối **Admin** (Quản trị viên), **Host** (Chủ nhà/Chủ phòng), và **Tenant/Client** (Khách thuê phòng). Dự án được thiết kế hiện đại, hỗ trợ tìm kiếm phòng, chat thời gian thực, trợ lý ảo AI hỗ trợ tìm phòng, và quy trình xác minh danh tính chủ nhà bảo mật.

---

## 🛠️ Công Nghệ Sử Dụng

### Frontend
*   **Framework:** Next.js (App Router, React 19, TypeScript)
*   **Styling:** Tailwind CSS (Giao diện đáp ứng - Responsive)
*   **Bản đồ:** Leaflet (Hiển thị vị trí phòng trọ trực quan)
*   **Real-time:** Socket.io-client (Kết nối chat trực tiếp)
*   **UI Helpers:** Lucide React (Icons), React Hot Toast (Thông báo nổi)

### Backend
*   **Runtime:** Node.js + Express
*   **Database:** PostgreSQL (Neon DB Cloud) + Knex.js Query Builder
*   **Caching & OTP:** Redis (Upstash Cloud)
*   **Real-time:** Socket.io Server (Quản lý kết nối chat thời gian thực)
*   **Trợ lý ảo AI:** Google Gemini API (`@google/generative-ai`)
*   **Lưu trữ đám mây:** AWS S3 (Lưu trữ ảnh CCCD/tài liệu nhạy cảm của Host)
*   **Xác thực:** JWT (Access Token 15 phút, Refresh Token 7 ngày) & Nodemailer (Gửi mã OTP qua Email)

---

## ✨ Tính Năng Nổi Bật

1.  **Hệ thống Đăng nhập / Đăng ký Đa Dạng:**
    *   Xác thực bằng Email + Mật khẩu kết hợp mã OTP gửi về Email để kích hoạt tài khoản.
    *   Đăng nhập nhanh qua bên thứ ba (OAuth 2.0): Google, Facebook, Github.
    *   Bảo mật Token qua cơ chế JWT Access Token (Lưu trong memory/state) và Refresh Token (Lưu trong HttpOnly Cookie).
2.  **Quản lý Tìm Kiếm & Đặt Phòng:**
    *   Bộ lọc tìm kiếm đa năng theo khu vực, khoảng giá, loại phòng (phòng trọ, căn hộ).
    *   Tích hợp bản đồ Leaflet giúp Tenant dễ dàng tìm phòng theo vị trí.
3.  **Hệ Thống Trò Chuyện Thời Gian Thực (Real-time Chat):**
    *   Cho phép Tenant nhắn tin trực tiếp với Host để thương lượng hoặc hỏi thêm thông tin phòng.
4.  **Trợ Lý Ảo AI Thông Minh (AI Assistant):**
    *   Tích hợp Gemini AI giúp tư vấn nhanh về giá cả, loại phòng và gợi ý phòng phù hợp cho khách thuê.
5.  **Xác Minh Danh Tính Chủ Nhà Bảo Mật:**
    *   Host khi đăng ký cần tải ảnh CCCD để Admin duyệt. Các tệp này được lưu trữ an toàn trên AWS S3 thay vì lưu trực tiếp trong mã nguồn.

---

## 🚀 Hướng Dẫn Thiết Lập & Khởi Chạy

### 1. Cài đặt Backend

1.  Di chuyển vào thư mục backend:
    ```bash
    cd backend
    ```
2.  Cài đặt các thư viện:
    ```bash
    npm install
    ```
3.  Cấu hình biến môi trường:
    *   Sao chép file `.env.example` thành `.env`:
        ```bash
        cp .env.example .env
        ```
    *   Mở file `.env` mới tạo và điền các thông số kết nối của bạn (Neon PostgreSQL URL, Upstash Redis URL, Gmail SMTP Credentials, OAuth Keys, AWS Keys, và Gemini API Key).
4.  Chạy Database Migration và Seed dữ liệu mẫu (nếu có):
    ```bash
    npm run migrate
    npm run seed
    ```
5.  Khởi động server phát triển (Development Mode):
    ```bash
    npm run dev
    ```
    *Backend sẽ chạy tại cổng `http://localhost:5000`.*

---

### 2. Cài đặt Frontend

1.  Di chuyển vào thư mục frontend:
    ```bash
    cd ../frontend
    ```
2.  Cài đặt các thư viện:
    ```bash
    npm install
    ```
3.  Cấu hình biến môi trường:
    *   Sao chép file `.env.local.example` thành `.env.local`:
        ```bash
        cp .env.local.example .env.local
        ```
    *   Mở file `.env.local` và tùy chỉnh địa chỉ API Backend (mặc định là `http://127.0.0.1:5000/api`) cùng các Client ID nếu cần.
4.  Khởi động server phát triển:
    ```bash
    npm run dev
    ```
    *Frontend sẽ chạy tại địa chỉ `http://localhost:3000`.*

---

## 📁 Cấu Trúc Thư Mục Dự Án Chính

```text
Booking-Room/
├── backend/                 # Mã nguồn Express Server
│   ├── config/              # Cấu hình Database, S3, Redis...
│   ├── controllers/         # Xử lý logic nghiệp vụ API
│   ├── db/                  # Chứa các file Migrations và Seeds của Knex
│   ├── middlewares/         # Middleware bảo mật, check Auth, upload...
│   ├── models/              # Định nghĩa cấu trúc dữ liệu
│   ├── routes/              # Định nghĩa các endpoint API (auth, rooms, bookings,...)
│   ├── services/            # Tích hợp dịch vụ ngoài (Gemini AI, S3, Mail...)
│   ├── server.js            # Điểm khởi chạy backend & socket server
│   └── .env.example         # File môi trường mẫu cho backend
│
├── frontend/                # Mã nguồn Next.js Client
│   ├── app/                 # App Router (pages, layout, routing)
│   │   ├── (auth)/          # Các trang Đăng ký, Đăng nhập, OTP
│   │   ├── admin/           # Dashboard quản trị viên
│   │   ├── host/            # Dashboard quản lý của Chủ phòng
│   │   └── page.tsx         # Trang chủ công khai dành cho Tenant
│   ├── components/          # Các component tái sử dụng (Chat, Filters...)
│   ├── context/             # Quản lý State toàn cục (AuthContext, SocketContext)
│   ├── public/              # Tài nguyên tĩnh (ảnh, icons)
│   └── .env.local.example   # File môi trường mẫu cho frontend
│
└── .gitignore               # Cấu hình loại trừ của Git
```
