---
name: host-revenue-disbursement-flow
description: Quy ước tính doanh thu/thực nhận của Host và luồng đặt cọc → duyệt → giải ngân
metadata:
  type: project
---

Luồng tiền (2 trục độc lập, đừng trộn):
1. Vòng đời đơn cọc (`deposits.status`): PROCESSING → (khách trả tiền, transaction SUCCESS) → CONFIRMED → (CHỦ TRỌ duyệt, `updateDepositByLandlord`) → ACCEPTED. Cột "Chờ duyệt/Đã hoàn tất" ở /host/transactions phản ánh trục này — do HOST duyệt, KHÔNG phải admin.
2. Giải ngân (`processDisbursement` ở repositories/payment/transactionRepository.js): admin duyệt SAU khi chủ trọ đồng ý → ghi `admin_incomes` (hoa hồng) + `host_incomes` (PENDING→RECEIVED, income=phần còn lại) + `transactions.is_disbursed=true` + `disbursement_logs`. KHÔNG đụng `deposits.status`.

Định nghĩa Host (do user chốt, áp ở backend/services|repositories/host/revenue*):
- **Doanh thu (gross)** = tổng `transactions.amount` của giao dịch ĐÃ giải ngân (`host_incomes.status='RECEIVED'`) — KHÔNG phải mọi SUCCESS.
- **Thực nhận (net)** = tổng `host_incomes.income` (RECEIVED).
- Hoa hồng = 10% (hằng `COMMISSION_RATE`, khớp `disburseTransaction` phía admin); rate thực lưu ở `disbursement_logs.commission_rate`.
- "Đang đối soát" = gross của `host_incomes` còn PENDING (chờ admin phân phối).

Quy ước chung với API admin (`findAdminIncomes`): anchor truy vấn trên bảng income ledger, totals trả kèm trong response. Xem [[host-revenue-api-implementation]] nếu có.
