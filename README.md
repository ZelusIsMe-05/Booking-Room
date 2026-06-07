# Booking-Room - Hệ Thống Đặt Phòng 3 Bên

Hệ thống quản lý và đặt phòng 3 bên kết nối **Admin** (Quản trị viên), **Host** (Chủ nhà/Chủ phòng), và **Client** (Khách thuê phòng).

## 🚀 Công Nghệ Sử Dụng

- **Frontend:** Next.js (App Router, TypeScript, Tailwind CSS)
- **Backend (Sẽ tích hợp sau):** Express (Knex, PostgreSQL)

---

## 🛠️ Hướng Dẫn Thiết Lập & Chạy Frontend

Thực hiện các bước sau để chạy giao diện frontend trên máy local của bạn:

### 1. Yêu Cầu Cài Đặt
Đảm bảo bạn đã cài đặt:
- **Node.js** (Khuyến nghị phiên bản LTS mới nhất - v18 trở lên)
- **npm** (Đi kèm khi cài đặt Node.js)

### 2. Cài Đặt Dependencies (Thư viện)
Mở Terminal tại thư mục gốc của dự án (`Booking-Room`) và chạy lệnh sau để di chuyển vào thư mục `frontend` và cài đặt các thư viện cần thiết:

```bash
cd frontend
npm install
```

### 3. Chạy Development Server
Sau khi cài đặt thành công, khởi động dự án ở chế độ phát triển (Development Mode):

```bash
npm run dev
```

Hoặc nếu bạn đang đứng ở **thư mục gốc** (`Booking-Room`), bạn có thể chạy nhanh bằng lệnh:

```bash
npm run dev --prefix frontend
```

### 4. Truy Cập Giao Diện
Mở trình duyệt web của bạn và truy cập đường dẫn:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 📁 Cấu Trúc Thư Mục Frontend Chính

Giao diện được tổ chức theo cấu trúc App Router của Next.js:

```text
frontend/
├── app/                  # Các route/trang chính (Trang chủ, Login, Register,...)
│   ├── (auth)/           # Route group cho đăng nhập/đăng ký
│   ├── admin/            # Trang dành riêng cho Admin
│   ├── host/             # Trang dành riêng cho Chủ nhà
│   └── page.tsx          # Trang chủ công khai (guest)
├── components/           # Các component tái sử dụng
│   ├── common/           # Component chung toàn app (ví dụ: ChatWidget.tsx)
│   ├── guest/            # Component dành cho khách vãng lai (ví dụ: SearchFilter.tsx)
│   ├── admin/            # Component cho giao diện Admin
│   └── host/             # Component cho giao diện Host
└── public/               # Tài nguyên tĩnh (hình ảnh, icons,...)
```

---

## 🤖 Tính Năng Nổi Bật Hiện Tại (Mockup UI)
- **Thanh Tìm Kiếm Đa Năng (`SearchFilter`):** Nơi khách hàng chọn khu vực, tầm giá mong muốn và chọn loại phòng (Phòng trọ / Căn hộ) với dropdown tương tác mượt mà.
- **Trợ Lý Ảo AI (`ChatWidget`):** Hỗ trợ tư vấn tìm phòng ngay góc dưới màn hình, có bóng chat chào mừng có thể bật/tắt dễ dàng và khung chat riêng biệt.
