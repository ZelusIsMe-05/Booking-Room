# Guide — Host (Landlord/Chủ nhà) module

Tài liệu tổng hợp các thay đổi đã làm cho khu vực **Host** (Kênh Chủ Nhà) của Booking-Room.
Dùng để onboard nhanh cho lần làm việc sau (người hoặc AI).

> Quy ước chung
> - Backend: Node/Express + Knex + PostgreSQL (Neon, **dùng chung** giữa các thành viên).
> - Frontend: Next.js 16 (App Router) + Tailwind, gọi API qua `frontend/services/apiClient.ts`
>   (base `NEXT_PUBLIC_API_URL` mặc định `http://127.0.0.1:5000/api`), mọi response bọc `ApiResponse<T>` (`{ status, message, data }`).
> - Auth host: `requireAuth` + `authorize('LANDLORD')`. `req.user.userId` = landlord_id.
> - Tiền tệ: format `toLocaleString('vi-VN')`, hiển thị `…đ`.

---

## 0. Môi trường / gotcha quan trọng

- **`next` phải là `^16.2.7`** (React 19, App Router). Có lúc bị hạ nhầm xuống `9.3.3` → lỗi "Couldn't find a `pages` directory". Nếu gặp lại: sửa `frontend/package.json` rồi `npm install`.
- **DB migration drift:** DB Neon dùng chung; nhánh `develop` có thể thiếu file migration mà DB đã ghi nhận → `npm run migrate` báo *"migration directory is corrupt"*. Cần merge nhánh chứa file đó hoặc reconcile `knex_migrations` trước khi chạy migration mới. Migration mới đánh số `030+` để tránh trùng. (Xem `memory/db-migration-drift.md`.)
- Postgres: `ALTER TYPE ... ADD VALUE` phải đặt `exports.config = { transaction: false }` trong migration.

---

## 1. Trạng thái phòng & enum `room_status`

Giá trị: `AVAILABLE`, `RENTED`, `LOCKED` (migration 020), **`HIDDEN`** (migration `030_add_hidden_room_status.js`).
`approval_status` (bảng `room_approvals`): `PENDING | APPROVED | REJECTED` — **tách biệt** với `status`.

Vòng đời `LOCKED`/`RENTED` do luồng đặt cọc quản lý (không sửa tay):
- Tạo cọc → `AVAILABLE→LOCKED`; thanh toán fail / hết hạn 15' / host từ chối → về `AVAILABLE`;
  host duyệt (`ACCEPTED`) → `RENTED`.

### Tính năng Ẩn/Hiện tin (HIDDEN)
- Chỉ ẩn được phòng đang `AVAILABLE`; chặn nếu `LOCKED`/`RENTED` (trả 409). Bỏ ẩn: `HIDDEN→AVAILABLE`.
- Bộ lọc public chỉ lấy `status='AVAILABLE'` ⇒ phòng `HIDDEN` tự ẩn khỏi tìm kiếm + không tạo cọc được.
- Backend: `services/host/roomService.js` → `setRoomVisibility(landlordId, roomId, visible)`;
  controller `updateRoomStatus`; route **`PATCH /api/host/rooms/:roomId/status`** body `{ visible: boolean }` hoặc `{ action: 'show'|'hide' }`.
- **Lưu ý bảo mật:** `'status'` đã bị loại khỏi `allowed`/`buildPatch` của `updateRoom` (không cho set status tùy tiện qua PATCH sửa phòng). Nếu merge làm nó quay lại thì bỏ ra lần nữa.
- Frontend: `hostRoomService.setVisibility`; toggle thật trong `BookingManageCard`; `HostListingsPage` có handler optimistic + filter "Đã ẩn".

---

## 2. UI Host đồng bộ với Admin

- Nền `bg-slate-50`, card `bg-white border-slate-200 shadow-sm`, chữ slate, `font-sans`.
- `components/host/HostSidebar.tsx` viết lại theo `AdminSidebar` (trắng, viền slate, item `rounded-xl`, active `bg-booking-teal/20 text-booking-teal`, icon `lucide-react`), **giữ nguyên các mục** + profile + nút "Thêm phòng mới".
- Sidebar `lg:fixed left-0 w-64`; nội dung các trang offset bằng `lg:ml-64`.

---

## 3. API & các trang Host đã hoàn thiện

Tất cả route host nằm dưới `routes/host/*`, mount trong `backend/app.js`.
Pattern mỗi tính năng: `repositories/host/*` → `services/host/*` → `controllers/host/*` → `routes/host/*` → frontend `services/host*Service.ts` → component.

### 3.1 Tổng quan (Dashboard) — `/host`
- **`GET /api/host/rooms/overview?year=YYYY`** → `{ stats, revenue, featuredRooms }`.
  - `stats`: total / rented / available / pending / hidden / averageRating.
  - `revenue`: 12 tháng của `year` (doanh thu = SUCCESS transactions của landlord) + totalRevenue.
  - `featuredRooms`: top 3 theo `average_rating`, kèm `favorite_count`.
- Repo: `roomRepository.getLandlordStats / getLandlordMonthlyRevenue / findTopRatedByLandlord`.
- Service: `roomService.getOverview`. Frontend: `hostRoomService.getOverview`, `HostDashboardPage` (6 thẻ KPI, chọn tháng/năm xem doanh thu, 3 phòng nổi bật dùng `BookingManageCard`).

### 3.2 Tin đăng — `/host/listings`, `/host/listings/[id]`, `/host/listings/[id]/edit`
- `findByLandlord` trả thêm `average_rating` + `favorite_count` (join `favorites`).
  `mapToHostListing` gắn `rating`/`favoriteCount` ⇒ card Tin đăng giống card Phòng nổi bật.
- `BookingManageCard`: tên phòng 1 dòng riêng + **chữ chạy (marquee) chỉ khi hover cả khung**, rời chuột reset về trái (`group-hover:animate-marquee`, keyframe `marquee` trong `tailwind.config.js`). Giá hiển thị `9.700.000đ/tháng` (`formatExactPrice`). Hiện ⭐ rating + ❤️ favoriteCount khi có.
- **Trang chi tiết:** carousel 1 ảnh (ảnh bìa trước, nút ‹/›, đốm, **tự đổi mỗi 3s**), hiển thị tên/địa chỉ/trạng thái/sao/tim/giá/cọc/sức chứa/loại phòng/điện-nước-internet-dịch vụ/mô tả + **reviews** (gọi `GET /api/rooms/:id/reviews` qua `hostRoomService.getRoomReviews`).
- **Trang sửa (`HostEditRoomPage`):** "Giá & Chi phí" đặt **trên** "Vị trí"; input tiền format `6.500.000` (`formatMoneyInput`/`parseMoneyInput`); dropdown tìm địa chỉ nổi lên trên (cột trái `relative z-20`, section Vị trí `relative z-30`, đặt cuối).

### 3.3 Giao dịch — `/host/transactions`, `/host/transactions/[id]`
- "Giao dịch" = **deposit** trên phòng của host (+ transaction thanh toán).
- Endpoints (mount `/api/host/transactions`):
  - `GET /` (list: filter status/search/dateFrom + phân trang; trả thêm `rooms`, `pagination`)
  - `GET /summary` (3 thẻ: tổng/đang xử lý/thành công)
  - `GET /:id` (chi tiết: lines, subtotal, commission 10%, netPayout, customer, room, timeline)
- Map deposit status → UI: `PROCESSING→processing`, `CONFIRMED→pending`, `ACCEPTED→completed`, `REJECTED/CANCELLED/EXPIRED→cancelled`. Mã hiển thị `#BK-<8 hex>`.
- Files: `repositories/host/transactionRepository.js`, `services/host/transactionService.js`, `controllers/host/transactionController.js`, `routes/host/transactionRoutes.js`; FE `services/hostTransactionService.ts`.
- Đã **bỏ bộ lọc "Phòng"** ở trang list (theo yêu cầu).

### 3.4 Doanh thu — `/host/revenue`
- Endpoints (mount `/api/host/revenue`):
  - `GET /overview?range=month|quarter|year` → `{ summary, trend }`
    - `summary`: paidRevenue (net ACCEPTED), pendingSettlement (net CONFIRMED), completedOrders, growthRate (so kỳ trước).
    - `trend`: **6 tháng gần nhất** (revenue=gross, profit=net), đánh dấu tháng cao nhất.
  - `GET /settlements?page=&limit=&search=` → bảng đối soát (CONFIRMED/ACCEPTED), phí âm + thực nhận, status `completed|pending`.
- **Commission = 10%**, `net = gross * 0.9` (dùng nhất quán ở transactions + revenue).
- Files: `repositories/host/revenueRepository.js`, `services/host/revenueService.js`, `controllers/host/revenueController.js`, `routes/host/revenueRoutes.js`; FE `services/hostRevenueService.ts`. Bảng đối soát phân trang server-side + ô search hoạt động.

---

## 4. Còn TODO / đang là mock / chưa có endpoint

- Nút **"Xuất báo cáo"** (Transactions, Revenue) — **đã có API** xuất CSV:
  - `GET /api/host/transactions/export` (cùng filter `status/roomId/search/dateFrom`) → CSV (mã, khách, phòng, tiền cọc, hoa hồng 10%, thực nhận, trạng thái, ngày tạo/duyệt).
  - `GET /api/host/revenue/export?search=` → CSV đối soát (mã, phòng, khách, thời gian, doanh thu, phí 10%, thực nhận).
  - CSV kèm BOM UTF-8 (`utils/csvHelper.js`) để Excel đọc đúng tiếng Việt. FE tải qua `apiClient.downloadFile` (fetch blob + `<a download>`); wrapper `hostTransactionService.exportCsv` / `hostRevenueService.exportCsv`.
- Nút **"Export PDF"** (chi tiết Transaction) — chưa có API. (Nút "Tạo hóa đơn" đã được gỡ khỏi trang Giao dịch.)
- Nút **"Khiếu nại giao dịch" / "Liên hệ khách hàng"** — chưa nối.
- Trang **Tin nhắn** (`/host/messages`) và một số trang khác vẫn dùng mock (xem `memory/host-integration-status.md`).
- `data/hostTransactions.ts`, `data/hostTransactionDetails.ts`, `data/hostRevenue.ts`, `data/hostDashboard.ts`:
  còn export type/config UI đang dùng, nhưng phần **mock data** không còn được dùng (đã thay bằng API).
- Mô hình là **đặt cọc giữ phòng**, không phải thuê theo đêm ⇒ cột "đêm/khách", "Thời gian ở" mang tính tượng trưng (đêm/khách = 0).

---

## 5. Cách verify nhanh (không cần chạy server)

Backend chạy script tạm trong thư mục `backend/` (đọc DB thật, read-only):
```js
// _verify.js
const db = require('./config/db');
const svc = require('./services/host/<service>');
(async () => {
  const lr = await db('rooms').select('landlord_id').first(); // hoặc db('deposits')
  console.log(await svc.<fn>(lr.landlord_id, /* args */));
  await db.destroy();
})();
```
`node _verify.js` rồi xóa file. Frontend: `cd frontend && npx tsc --noEmit`.

---

## 6. File map (host)

Backend:
- `db/migrations/030_add_hidden_room_status.js`
- `repositories/roomRepository.js` (getLandlordStats, getLandlordMonthlyRevenue, findTopRatedByLandlord, findByLandlord +rating/favorite)
- `repositories/host/{transactionRepository,revenueRepository}.js`
- `services/host/{roomService,transactionService,revenueService}.js`
- `controllers/host/{roomController,transactionController,revenueController}.js`
- `routes/host/{roomRoutes,transactionRoutes,revenueRoutes}.js`
- `app.js` (mount `/api/host/transactions`, `/api/host/revenue`)

Frontend:
- `services/{hostRoomService,hostTransactionService,hostRevenueService}.ts`
- `components/host/{HostSidebar,HostDashboardPage,HostListingsPage,HostListingDetailPage,HostEditRoomPage,BookingManageCard,HostTransactionsPage,HostTransactionDetailPage,HostRevenuePage}.tsx`
- `tailwind.config.js` (keyframe `marquee`)
