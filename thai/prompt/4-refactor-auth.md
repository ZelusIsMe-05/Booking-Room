# Bối cảnh

- Code hiện tại: 
    - Khi 1 user đăng ký -> họ sẽ chọn đăng ký với tư cách là gì Tenant/Landlord -> Landlord sẽ chờ duyệt từ Admim
    - API POST /regist đang sử dụng rẻ nhánh để xử lý riêng lẻ đăng ký của Tenant/Landlord tại validate + controller + service

- Muốn thay đổi:
    - API POST /regist sẽ chỉ thực hiện đăng ký các thông tin như nhánh Tenant hiện tại dành cho cả Tenant lẫn Landlord
    - Việc upload ảnh trước + sau của Landlord sẽ được thực hiện ở API khác
# Yêu cầu
- Hãy đánh giá/đề xuất cách giải quyết hợp lý dựa trên code hiện tại và yêu cầu.
- Viết vào 1.14-plan-landlord-regist.md kế hoạch thực hiện súc tích nhưng đầy đủ
