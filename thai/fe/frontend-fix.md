# 1
- Hãy chỉnh sửa lại UI của Landlord cho giống với Admin về:
    - Màu nền
    - Font chữ
    - Tương ứng về cỡ chữ
    - Thiết kế thanh bên: 
        - Tại Landlord giữ nguyên các mục thông tin nhưng sẽ chuyển đổi thiết kế, màu nền, font chữ sao cho giống với Admin.
    - Thiết kế trang thông tin chính
        - Font chữ  + màu nền sao cho giống Admin

# 2
- Thêm tính năng Hiển thị/Tạm ẩn bài đăng cho chủ phòng?
- Tìm hiểu xem các trạng thái LOCKED của phòng có khi nào?
- Có nên thêm constant trường HIDDED ở status phòng trên database ko?
- Hãy tạo kế hoạch thực hiện ngay bên dưới

---

## 📋 PHÂN TÍCH & KẾ HOẠCH THỰC HIỆN (#2)

### A. Trạng thái `LOCKED` của phòng xuất hiện khi nào?

Enum `room_status` trong DB hiện có **3 giá trị**:
- `AVAILABLE`, `RENTED` — định nghĩa ở migration `007_create_rooms.js`
- `LOCKED` — bổ sung sau ở migration `020_required_database_fixes.js` (`ALTER TYPE room_status ADD VALUE 'LOCKED'`)

**`LOCKED` là trạng thái KHÓA TẠM do hệ thống tự quản lý trong luồng đặt cọc/thanh toán — KHÔNG phải do chủ nhà chủ động bật.** Vòng đời:

| Sự kiện | File xử lý | Chuyển status |
|---|---|---|
| Tenant tạo đơn cọc (giữ phòng, hạn 15 phút) | `depositRepository.createDeposit` | `AVAILABLE → LOCKED` |
| Thanh toán webhook **SUCCESS** (cọc → CONFIRMED, chờ chủ nhà duyệt) | `transactionRepository.processWebhookUpdate` | giữ `LOCKED` |
| Thanh toán webhook **FAILED** | `transactionRepository.processWebhookUpdate` | `LOCKED → AVAILABLE` |
| Đơn cọc hết hạn 15 phút | `depositRepository.expireDeposits` | `LOCKED → AVAILABLE` |
| Chủ nhà **duyệt** đơn cọc (ACCEPTED) | `depositRepository.updateDepositDecisionByHost` | `LOCKED → RENTED` |
| Chủ nhà **từ chối** đơn cọc (REJECTED) | `depositRepository.updateDepositDecisionByHost` | `LOCKED → AVAILABLE` |

➡️ **Kết luận:** `LOCKED` = phòng đang trong giao dịch dở dang. Tính năng Ẩn/Hiện của chủ nhà **không được phép đụng vào phòng đang `LOCKED` hoặc `RENTED`** (đang có khách/giao dịch).

### B. Có nên thêm constant `HIDDEN` vào status phòng không?

**👉 NÊN — bổ sung giá trị `HIDDEN` vào enum `room_status` (cách nhất quán nhất với codebase hiện tại).**

Lý do:
- Bộ lọc tin công khai chỉ dùng `rooms.status = 'AVAILABLE'` (hàm `applyPublicRoomFilter`). Phòng `HIDDEN` sẽ **tự động biến mất** khỏi tìm kiếm/chi tiết công khai mà không phải sửa thêm logic lọc.
- Phân biệt rõ "chủ nhà chủ động tạm ẩn" với `RENTED`. **Hiện tại UI đang dùng sai:** `BookingManageCard` hiển thị nhãn "Tạm ẩn" cho phòng `RENTED`, và toggle chỉ là **giao diện tĩnh — chưa có onClick / chưa gọi API** (xem `hostRoomService.ts` → `listingStatusMeta`).
- Đã có tiền lệ thêm enum value bằng migration (`LOCKED` ở migration 020) → làm tương tự, rủi ro thấp.

**Phương án thay thế (ghi nhận):** dùng cột boolean riêng `is_hidden` để tách bạch "tình trạng" và "hiển thị". Sạch hơn lâu dài (một phòng có thể vừa `RENTED` vừa ẩn) nhưng phải sửa bộ lọc công khai thành `status='AVAILABLE' AND is_hidden=false` và nhiều điểm chạm hơn. → **Không chọn** cho phạm vi hiện tại; ưu tiên `HIDDEN` enum.

**Quy tắc nghiệp vụ cho `HIDDEN`:**
- Chỉ cho phép ẩn khi phòng đang `AVAILABLE` (chặn ẩn nếu `LOCKED`/`RENTED`).
- Bỏ ẩn: `HIDDEN → AVAILABLE`.
- Có thể ẩn phòng đang chờ duyệt (status vẫn `AVAILABLE`, approval riêng) — cho phép, nhưng vẫn không lên public do chưa APPROVED.

### C. Kế hoạch triển khai

**1. Database** (`backend/db/migrations/`)
- [ ] Tạo migration mới `0xx_add_hidden_room_status.js`:
  - `up`: `ALTER TYPE room_status ADD VALUE IF NOT EXISTS 'HIDDEN'` (Postgres không cho ADD VALUE trong transaction → dùng `knex.raw` ngoài transaction).
  - `down`: ghi chú Postgres không hỗ trợ DROP VALUE → để no-op + comment.

**2. Backend**
- [ ] `services/host/roomService.js`: thêm hàm `setRoomVisibility(landlordId, roomId, visible)`:
  - Kiểm tra quyền sở hữu (`landlord_id === userId`), nếu không → `FORBIDDEN`.
  - Bật ẩn mà status ≠ `AVAILABLE` → `CONFLICT` ("Không thể ẩn phòng đang có giao dịch/đã cho thuê").
  - `visible=false`: `AVAILABLE → HIDDEN`; `visible=true`: `HIDDEN → AVAILABLE`.
  - **Không** reset approval.
- [ ] `controllers/host/roomController.js`: hiện thực hàm stub `updateRoomStatus` (đang rỗng) → đọc body `{ visible: boolean }`, gọi service, trả `sendSuccess` kèm status mới.
- [ ] Route `PATCH /host/rooms/:roomId/status` đã tồn tại — giữ nguyên (đã có `requireApprovedLandlord`).
- [ ] **Siết `updateRoom`:** bỏ `'status'` khỏi mảng `allowed` (dòng ~99) để chủ nhà không set status tùy tiện qua endpoint sửa phòng; mọi đổi visibility đi qua endpoint riêng có validation.
- [ ] Xác nhận `roomRepository.findByLandlord` vẫn trả về phòng `HIDDEN` (host list không áp public filter).

**3. Frontend**
- [ ] `services/hostRoomService.ts`:
  - Mở rộng `HostListingStatus` thêm `'hidden'`; cập nhật `toListingStatus` (`HIDDEN → hidden`) và `listingStatusMeta` (nhãn "Đã ẩn"/"Hiển thị").
  - Sửa mapping: bỏ gán "Tạm ẩn" cho `rented` (đặt đúng nhãn "Đã cho thuê").
  - Thêm hàm `setVisibility(roomId, visible)` gọi `apiClient.patch('/host/rooms/:id/status', { visible })`.
- [ ] `components/host/BookingManageCard.tsx`:
  - Biến toggle tĩnh thành nút thật: thêm prop `onToggleVisibility` + trạng thái loading.
  - Disable toggle khi `status === 'rented'`/`'pending'` kèm tooltip giải thích.
  - Thêm style cho trạng thái `hidden` trong `statusStyles`.
- [ ] `components/host/HostListingsPage.tsx`: truyền handler gọi `hostRoomService.setVisibility`, cập nhật optimistic + refetch khi lỗi; thêm bộ lọc "Đã ẩn".
- [ ] (Tùy chọn) `HostListingDetailPage.tsx`: thêm nút Ẩn/Hiện ở trang chi tiết.

**4. Kiểm thử**
- [ ] Ẩn phòng `AVAILABLE` → biến mất khỏi tìm kiếm công khai (`GET /rooms`), vẫn hiện trong danh sách host với nhãn "Đã ẩn".
- [ ] Bỏ ẩn → quay lại public.
- [ ] Chặn ẩn khi phòng `LOCKED`/`RENTED` (trả 409).
- [ ] Phòng `HIDDEN` không tạo được đơn cọc (`findRoomForDeposit`/`depositService` từ chối status ≠ AVAILABLE).

# 3
- Thực hiện tính năng Hiển thị thông tin tổng quan của Landlord tại UI tổng quan.
- Bổ sung các API phần Backend nếu cần.
- Thông tin cần hiển thị:
    - Tổng số phòng 
    - Đã cho thuê
    - Đang trống
    - Chờ duyệt
    - Đang ẩn
    - Số sao trung bình của tất cả các phòng
    - Doanh thu theo tháng:
        - Không cần chi tiết từng tuần
        - Chủ phòng có thể lựa chọn xem từng tháng trong năm
    - Danh sách phòng nổi bật:
        - Phần này chỉ hiển thị 3 phòng có đánh giá cao nhất
        - Từng khung chứa phòng có chức năng tương tự như khung phòng bên "Tin đăng":
            - Có thể ấn vô để xem
            - Có các chức năng chỉ sửa giống khung phòng bên "Tin đăng"
        - Bổ sung thêm thông tin số lượt yêu thích + số sao ở các khung

# 4 
- Ở trang "Tin đăng"
- Cập nhật khung thông tin phòng giống với khung thông tin phòng nổi bật ở "Tổng quan"
- Dịch dòng chữ Manage your property listings efficiently. sang tiếng việt
- Ở API http://localhost:3000/host/listings/mã phòng:
    - Hiển thị ảnh:
        - Mỗi lần chỉ hiển thị được 1 ảnh
        - Ảnh chính mặc định sẽ hiển thị đầu tiên
        - Các ảnh kế sẽ có nút điều hướng để xuay tới
        - Hiển thị các đốm để biết hiện tại đang ở ảnh thứ mấy
    - Thông tin cần thể hiện:
        - Tên phòng
        - Địa chỉ cụ thể
        - Trạng thái
        - Số sao
        - Số tim
        - Giá thuê, giá thuê, tiền cọc, sức chứa
        - Tiền điện, tiền nước, internet, dịch vụ
        - Mô tả
        - Các lượt review
- Ở API http://localhost:3000/host/listings/mã phòng/edit
    - Đặt Giá & Chi phí lên trên Vị trí: format nhập giá 6.500.000
    - Anh tìm kiếm địa chỉ khi liệt kê ra danh sách sẽ nổi lên trên layer trên

# 5
- Ở trang "Giao dịch"
- Hãy tạo API phục vụ cho UI hiện tại