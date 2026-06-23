# Khiếu nại phía Chủ phòng → "Về Khách thuê"

## Hiện trạng
- Modal khiếu nại (`ViolationReportModal`) dùng chung cho cả Khách thuê (Header) và Chủ phòng (HostSidebar).
- Backend chỉ cho **Khách thuê** gửi khiếu nại **về phòng / về chủ nhà**.
- Bảng `violation_reports`: `tenant_id` (người gửi, bắt buộc), `room_id`, `landlord_id` (đối tượng). **Không có** chỗ cho chủ phòng tố khách thuê.

## Cần quyết
1. **Phạm vi:**
   - [ ] Chỉ frontend (UI đổi, submit chưa chạy)
   - [ ] Frontend + backend tối thiểu (chạy được, chưa sửa admin)
   - [ ] Full-stack (UI + migration + API + admin)
2. **Khách thuê nào bị khiếu nại?**
   - [ ] Đã cọc thành công trên phòng của chủ
   - [ ] Mọi khách từng tương tác

## Câu hỏi cho bạn
> ...
