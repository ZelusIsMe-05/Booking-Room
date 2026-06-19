# 1 - DONE
- Tôi thấy hiện tại đường dẫn URL của backend và frontend ở host đang khác nhau
- Ví dụ:
    - Ở backend là http://localhost:3000/api/host/rooms/my
    - Ở frontend lại là http://localhost:3000/host/listings
- Tôi nghĩ do điều này nên gây ra vẫn đề ở #3
- Nếu thay đổi thì có ảnh hưởng đến các API khác đã có của Admin, tenant thì thôi không cần sửa.

# 2 - DONE
- Hiện tại người dùng có vai trò là LANDLORD sau khi đăng nhập xong sẽ được điều hướng tới http://localhost:3000/
- Hãy cập nhật người dùng có vai trò là LANDLORD sau khi đăng nhập xong sẽ được điều hướng tới http://localhost:3000/host/

# 3 - DONE
- Tại http://localhost:3000/host/listings
- Không thấy danh sách phòng đã đăng mà chỉ hiển thị "Đã xảy ra lỗi."

# 4 - DONE
- Tại http://localhost:3000/host/listings/new
- Thêm phòng đã ổn tôi xem trên Neon đã có thông tin của phòng

# 5 - DONE
- Vì không thấy danh sách phòng của bản thân nên hiện tại API chỉnh sửa phòng vẫn chưa được test

# 6 - DONE
- Khi ấn vào một tin đăng nhất định ở Tin đăng, nó không điều hướng đến URL xem bài đăng của mình dù đã có API cho edit

# 7 - DONE
- Lượt bớt UX ở tin nhắn, cần bỏ:
    - Icon điện thoại ở góc trên bên phải
    - Icon video call ở góc trên bên phải
    - Các dòng: PHẢN HỒI NHANH, GỬI YÊU CẦU THANH TOÁN, CHIA SẺ VỊ TRÍ
    - Icon đính kèm tệp ở khung tin nhắn
    - Icon đính kèm ảnh ở khung tin nhắn
    - Icon cảm xúc mặt cười ở khung tin nhắn
    - Icon chấm hỏi ở góc trên bên phải
# 8 - DONE
- Ở backend lẫn frontend đều đã có API cho Tin nhắn, bạn hãy tích hợp thử.
- Nếu có gì vướng mắt và khó khăn hãy báo tôi

# 9 