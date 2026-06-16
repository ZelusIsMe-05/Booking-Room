# Chuẩn bị
- Thi kêu nó đọc những file cần thiết để hiểu ngữ cảnh
    - File CODEX.md tổng quan dự án
    - File TEAMWORK_CNPM.md để nó nắm tình hình + Thi cũng phải nói đang ở ngày mấy
    - File dayX-AI-read.md của Thai, Thanh, Vinh, Thinh để nắm tình hình

- Về nghiệp vụ:
    - Ví dụ khi làm tính năng đăng ký đăng nhập:
        - Lên google Google Doc
        - template1
        - COPY Phần Requirement + Usecase liên quan đến đăng nhập và tổng hợp vào 1 file ví dụ: auth-require.md
        - Kêu nó đọc file auth-require.md (QUAN TRỌNG).

# Tạo thư mục cho vibe code
- Thu tự tạo thư mục Thi/GUILD+plan+prompt
    - prompt: được dùng để thi viết yêu cầu -> Thi kêu chat đọc yêu cầu từ đây
    - plan: 
        - đọc yêu cầu xong Thi kêu nó lên Plan tổng quát (gồm nhiều phase)- 1 file
        - sau đó lên plan chi tiết cho từng Phase - mỗi file là 1 phase

- Sau khi có plan thì Thi kêu nó thực hiện lần lượt từng Phase -> mỗi phase sẽ có "báo cáo ngắn nhưng đủ" 

- Sau khi code xong Thi kêu nó tạo 2 file:
    - dayX-AI-read.md: người khác sẽ cho AI đọc file này để hiểu Thi đã làm gì.
    - dayX-human-read.md: chứa hướng dẫn thao tác với Postman cho người khác

# Lưu ý
- Thi kêu nó bám sát schema các bảng trong database trong thư mục backend/db/migrations 