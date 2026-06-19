# Báo cáo: Tích hợp Frontend ↔ Backend cho phần Host (Chủ nhà)

**Nhánh:** `develop`
**Ngày:** 2026-06-19
**Phạm vi đã chốt:** Phase 0–3 — chỉ tích hợp các chức năng đã có sẵn backend, hạn chế tối đa đụng vào logic của Admin / Guest / Tenant.

---

## 1. Mục tiêu

Thay thế dữ liệu mock (`frontend/data/host*.ts`) bằng các lời gọi API thật cho khu vực Host, dựa trên các endpoint backend đã có sẵn.

---

## 2. Tổng quan kết quả

| Trang / Chức năng | Trạng thái | Endpoint backend sử dụng |
|---|---|---|
| Danh sách tin đăng (`HostListingsPage`) | ✅ Đã nối API | `GET /api/host/rooms/my` |
| Tạo phòng (`HostCreateRoomPage`) | ✅ Đã nối API | `POST /api/host/rooms` |
| Sửa phòng (`HostEditRoomPage`) | ✅ Đã nối API | `PATCH /api/host/rooms/:roomId` |
| Dashboard — thống kê + danh sách phòng | ✅ Đã nối API | `GET /api/host/rooms/my` |
| Dashboard — yêu cầu cần duyệt + Duyệt/Từ chối | ✅ Đã nối API | `GET /api/host/bookings/deposits`, `PATCH /api/host/bookings/deposits/:id/status` |
| Giao dịch (`HostTransactionsPage` + chi tiết) | ⏸ Vẫn mock | (chưa có endpoint list giao dịch cho host) |
| Doanh thu (`HostRevenuePage`, biểu đồ dashboard) | ⏸ Vẫn mock | (chưa có endpoint tổng hợp doanh thu) |
| Tin nhắn (`HostMessagesPage`) | ⏸ Vẫn mock | (có thể tái dùng `/api/conversations` sau) |

---

## 3. Chi tiết các thay đổi

### 3.1. Service layer (mới)

Tạo 2 file service riêng cho Host để **không sửa** `roomService.ts` / `bookingService.ts` (vốn dùng chung cho Guest/Tenant):

- **`frontend/services/hostRoomService.ts`**
  - `listMyRooms(params)` — danh sách phòng của chủ nhà.
  - `getMyRoomById(roomId)` — lấy 1 phòng (resolve từ danh sách; **không** tạo route `GET /:id` vì sẽ xung đột với route public `GET /api/rooms/:id` do cùng router còn được mount tại `/api/rooms`).
  - `createRoom(FormData)`, `updateRoom(roomId, FormData)`, `deleteRoom(roomId)`.
  - Mapper: `mapToHostListing`, `mapToDashboardRoom`, `formatCompactPrice`.

- **`frontend/services/hostBookingService.ts`**
  - `listDeposits({ status })` — danh sách đơn đặt cọc theo chủ nhà.
  - `updateDepositDecision(depositId, 'ACCEPTED' | 'REJECTED', reason?)`.
  - Mapper: `mapToPendingRequest`.

### 3.2. Trang Listings (`HostListingsPage.tsx`)
- Lấy phòng thật, map trạng thái theo `room.status` + `approval_status`.
- Search / filter / phân trang tính trên dữ liệu thật; số đếm theo từng filter chính xác.
- Có trạng thái loading / rỗng / lỗi.

### 3.3. Trang Tạo phòng (`HostCreateRoomPage.tsx`)
- **Bổ sung section "Giá & Chi phí"** (theo schema backend bắt buộc): giá thuê/tháng, tiền cọc, phí điện/nước/internet/dịch vụ.
- Thêm ô **Mô tả phòng** (`room_description`).
- **Upload ảnh thật**: chọn nhiều ảnh, xem trước, xoá, ràng buộc tối thiểu 3 ảnh.
- Submit `multipart/form-data` → tạo phòng → điều hướng về danh sách. Có validate phía client khớp với backend.

### 3.4. Trang Sửa phòng (`HostEditRoomPage.tsx`)
- Load dữ liệu phòng thật và prefill toàn bộ trường (gồm cả giá & chi phí).
- Cho phép tải ảnh mới (lưu ý: ảnh mới **thay thế toàn bộ** ảnh cũ — đúng hành vi backend).
- Trạng thái loading / không tìm thấy phòng.

### 3.5. Trang Dashboard (`HostDashboardPage.tsx`)
- **Thống kê nhanh:** Tổng số phòng + Tỷ lệ lấp đầy (số phòng `RENTED` / tổng).
- **Danh sách phòng:** lấy từ API; nút sửa trỏ đến trang Edit.
- **Yêu cầu cần duyệt:** lấy đơn cọc trạng thái `CONFIRMED` (khách đã thanh toán), nút **Duyệt/Từ chối** gọi API thật.
- Biểu đồ doanh thu vẫn dùng mock (ngoài phạm vi).

### 3.6. Backend (1 thay đổi nhỏ, additive, chỉ ảnh hưởng hàm host-only)
- `backend/repositories/roomRepository.js` → `findByLandlord`: trả thêm `approval_status` (bản ghi duyệt mới nhất) + các trường `electricity_cost / water_cost / internet_cost / service_fee / room_description / longitude / latitude`.
- Lý do: để filter "Chờ duyệt" hoạt động và để trang Edit prefill đầy đủ. Hàm này **chỉ** được `host roomService.listMyRooms` dùng → không ảnh hưởng Admin/Guest/Tenant.

---

## 4. Lưu ý nghiệp vụ quan trọng
- Chủ nhà chỉ Duyệt/Từ chối được đơn cọc khi đơn ở trạng thái `CONFIRMED` (khách đã thanh toán cọc).
- Backend `createRoom` bắt buộc: ≥ 3 ảnh, `monthly_rent`, `deposit_amount`.
- `room_type` được lưu dưới dạng chuỗi nhãn tiếng Việt.

---

## 5. Kiểm thử
- `npx tsc --noEmit` (frontend): **PASS** (exit 0).
- `node -e "require('./repositories/roomRepository')"` (backend): **OK** (không lỗi cú pháp).
- Chưa chạy kiểm thử end-to-end với server thật.

---

## 6. Việc còn lại (đề xuất phase tiếp theo)
1. **Transactions:** viết endpoint host-specific `GET /api/host/transactions` (repo `findTransactionsByLandlord`), nối `HostTransactionsPage` + trang chi tiết (dùng `GET /api/payments/transactions/:id` đã sẵn).
2. **Revenue:** viết endpoint tổng hợp doanh thu cho host.
3. **Messages:** nối `HostMessagesPage` vào `/api/conversations` (đã sẵn, chỉ yêu cầu đăng nhập).
