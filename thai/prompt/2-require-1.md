# Yêu cầu
Trong thai/prompts/:
    - Tăng đăng nhập/đăng ký qua JWT (refresh token/ access token) được mô tả tổng quát trong file @1-auth-description.md 
    - Chúng ta sẽ thực hiện tính năng đăng nhập được mô tả trong 1.4-login.md trong AI-output/
    - 
Nhớ:
    - hãy kiểm tra có sai sót gì trong các file plan hoặc file có sẵn tôi đã cung cấp thì báo lên.
# Hướng dẫn 

- File hướng dẫn tổng quát @1.md trong AI-output/
- Các file hướng dẫn nhỏ hơn trong AI-output/, từ 1.1 đến 1.7 sẽ hướng dẫn chi tiết 
- Đọc thư mục @backend/db/migrations/ để biết rõ schema
- Cấu hình thời gian hiệu lực của refresh token và access token trong .env

# Đầu ra kỳ vọng

- Có thể rút trích UUID từ JWT để các module khác sử dụng
- Có thể đăng nhập bằng Account trong seed qua Postman và lấy về Access Token, Refresh Token.