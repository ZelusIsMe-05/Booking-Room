# Bối cảnh

- Code hiện tại: Khi 1 user đăng ký -> auto là người thuê -> muốn lên host -> phải gọi API duyệt từ Admin.
- Muốn sửa đổi: Khi 1 user đăng ký -> họ sẽ chọn đăng ký với tư cách là gì Tenant/Landlord -> Landlord sẽ chờ duyệt từ Admim
- Code hiện tại luồng đăng ký đang mặc định cho Tenant tại API '/register' của file @auth.route.js hãy:
    - Đổi API này thành '/register-tenant' thực hiện đăng ký cho người thuê.
    - Thêm API mới '/register-landlord' thực hiện đăng ký cho chủ nhà.
- Về API '/register-landlord' sẽ nhận thêm 2 thông so với người thuê là hình ảnh id_card_front và id_card_back (ảnh trước và sau của CCCD) để làm thông tin cho admin xét duyệt.

# Yêu cầu
- Hãy đánh giá/đề xuất cách giải quyết hợp lý dựa trên code hiện tại và yêu cầu.
- Viết vào 1.10-plan-landlord-regist.md kế hoạch thực hiện súc tích nhưng đầy đủ
