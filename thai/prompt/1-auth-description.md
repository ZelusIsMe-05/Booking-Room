# Đặc tả yêu cầu chức năng và Use Case

## FR-1: Đăng ký / Đăng nhập tài khoản người dùng

Trong hệ thống, đối tượng tham gia bao gồm:

* Người dùng mới
* Người dùng đã có tài khoản
* Người thuê
* Chủ phòng
* Quản trị viên

---

## FR-1.1: Đăng ký tài khoản

### Phương thức đăng ký

Hệ thống phải cho phép người dùng đăng ký tài khoản thông qua:

* Số điện thoại
* Email cá nhân
* OAuth2 qua Google/Facebook

### Thông tin cơ bản

Hệ thống yêu cầu người dùng cung cấp các trường thông tin tối thiểu để định danh bao gồm:

* Họ và tên
* Số điện thoại
* Email
* Mật khẩu

### Ràng buộc dữ liệu

* Số điện thoại và Email phải là duy nhất trên toàn bộ cơ sở dữ liệu của hệ thống.
* Số điện thoại phải đúng định dạng chuẩn, ví dụ: đủ 10 số, đúng đầu số hợp lệ.

### Bảo vệ mật khẩu

Mật khẩu phải tuân thủ chính sách độ phức tạp cao để không dễ dàng bị brute-force.

Yêu cầu tối thiểu:

* Ít nhất 8 ký tự
* Có chữ hoa
* Có chữ thường
* Có số
* Có ký tự đặc biệt

### Xác thực danh tính

Hệ thống phải phát sinh và gửi mã OTP qua SMS hoặc Email.

Quy định OTP:

* Mã OTP có hiệu lực tối đa 5 phút.
* Nếu OTP hợp lệ, tài khoản chuyển sang trạng thái `"Active"`.
* Nếu nhập sai quá 3 lần hoặc hết hạn, hệ thống từ chối và yêu cầu gửi lại mã mới.

### Quản lý luồng đăng ký rác

Hệ thống phải có cơ chế tự động dọn dẹp, xóa hoặc vô hiệu hóa các bản ghi đăng ký chưa được xác thực OTP sau 15 phút.

### Bảo mật dữ liệu lưu trữ

Hệ thống không được lưu trữ mật khẩu dưới dạng bản rõ.

Hệ thống phải sử dụng thuật toán an toàn như `bcrypt` trước khi lưu vào cơ sở dữ liệu để bảo vệ mật khẩu.

### Vai trò

#### Người thuê

Là vai trò mặc định sau khi đăng ký thành công.

#### Chủ phòng

Khi người dùng muốn đăng thông tin phòng, hệ thống yêu cầu nâng cấp tài khoản.

Người dùng cần cung cấp thêm thông tin định danh pháp lý:

* Ảnh chụp CMND/CCCD hai mặt
* Thông tin liên hệ chính thức
* Giấy tờ chứng minh sở hữu hoặc ủy quyền quản lý bất động sản, nếu có

### Phê duyệt

Quản trị viên hệ thống phải tiến hành kiểm duyệt thủ công hoặc bán tự động các thông tin định danh của vai trò `"Chủ phòng"` trước khi cấp quyền đăng bài, nhằm đảm bảo quản lý tài khoản và hạn chế lừa đảo.

---

## FR-1.2: Đăng nhập

### Phương thức đăng nhập

Hệ thống phải cho phép người dùng đăng nhập vào hệ thống bằng:

* Tên đăng nhập, gồm Email hoặc Số điện thoại
* Mật khẩu
* Single Sign-On qua Google/Facebook

### Xác thực và cảnh báo

* Hệ thống phải đối chiếu thông tin đăng nhập với cơ sở dữ liệu.
* Chỉ cấp quyền truy cập thông qua Session/JWT khi thông tin hoàn toàn trùng khớp.
* Hệ thống phải trả về thông báo lỗi chung chung, ví dụ: `"Tài khoản hoặc mật khẩu không chính xác"`, nhằm chống kỹ thuật dò quét tài khoản.

### Bảo vệ tài khoản

Hệ thống phải tạm khóa tài khoản trong 10 phút nếu người dùng đăng nhập sai quá 5 lần liên tiếp.

Đồng thời, hệ thống gửi Email/SMS cảnh báo bảo mật đến chủ tài khoản.

### Quản lý phiên làm việc

Hệ thống tự động đăng xuất nếu người dùng không có bất kỳ tương tác nào với hệ thống trong khoảng thời gian nhất định.

Ví dụ:

* 30 phút đối với thao tác tài chính như đặt cọc trực tuyến
* 7 ngày đối với thao tác lướt xem phòng

### Nhật ký kiểm toán

Hệ thống phải ghi nhận chi tiết lịch sử các phiên đăng nhập thành công và thất bại, bao gồm:

* Thời gian
* Địa chỉ IP
* Thông tin thiết bị User-Agent

Dữ liệu này giúp quản trị viên quản lý tài khoản và phát hiện các hành vi truy cập bất thường.

### Bảo mật đường truyền

Toàn bộ quá trình truyền tải thông tin đăng nhập từ Client lên Server phải được mã hóa qua giao thức HTTPS, bao gồm:

* Tài khoản
* Mật khẩu
* Token

Mục đích là để chống Man-in-the-middle attack.

---

# FR-2: Quản lý hồ sơ người dùng

## FR-2.1: Xem thông tin hồ sơ

### Hồ sơ cá nhân

Hệ thống phải hiển thị toàn bộ thông tin cá nhân của người dùng đang đăng nhập bao gồm:

* Ảnh đại diện
* Họ tên
* Số điện thoại
* Email
* Giới tính
* Ngày sinh
* Địa chỉ
* Trạng thái xác thực tài khoản

Khu vực này cũng đóng vai trò là Dashboard để người dùng điều hướng đến các tính năng khác như:

* Xem lịch sử các giao dịch đặt cọc và thanh toán
* Xem danh sách các phòng yêu thích

### Hồ sơ công khai

Khi người thuê nhấn vào xem thông tin của một Chủ phòng, hệ thống chỉ được phép hiển thị các thông tin công khai bao gồm:

* Tên chủ phòng
* Ảnh đại diện
* Số điện thoại

Hệ thống không hiển thị thông tin nhạy cảm cho người dùng khác xem, ví dụ:

* Email cá nhân
* Lịch sử giao dịch của chủ phòng

---

## FR-2.2: Cập nhật thông tin cá nhân

### Cập nhật thông tin cơ bản

Hệ thống cho phép người dùng thay đổi:

* Ảnh đại diện
* Họ tên
* Giới tính
* Ngày sinh

### Cập nhật thông tin định danh

Khi người dùng muốn thay đổi Số điện thoại hoặc Email, hệ thống phải thực hiện luồng xác minh 2 bước:

1. Yêu cầu nhập lại mật khẩu hiện tại.
2. Gửi mã OTP mới đến Số điện thoại hoặc Email mới.

Chỉ khi OTP hợp lệ, dữ liệu mới được cập nhật trên hệ thống.

---

## FR-2.3: Quản lý bảo mật cá nhân

### Đổi mật khẩu

Hệ thống phải cho phép người dùng thay đổi mật khẩu qua các bước:

1. Nhập mật khẩu cũ để xác thực danh tính tại thời điểm đó.
2. Nhập mật khẩu mới.
3. Nhập lại mật khẩu mới.

---

## FR-2.4: Xác thực danh tính Chủ phòng

Hệ thống phải cung cấp một biểu mẫu để người dùng tải lên:

* Hình ảnh Giấy tờ tùy thân CMND/CCCD
* Minh chứng quyền sở hữu phòng

Trạng thái hồ sơ sẽ chuyển sang `"Đang chờ duyệt"`.

Trong thời gian này, chủ phòng chưa thể đăng bài.

Thông tin này sẽ được chuyển đến phân hệ của Quản trị viên để tiến hành kiểm duyệt thủ công.

Sau khi Quản trị viên duyệt, tài khoản Chủ phòng sẽ được:

* Gắn huy hiệu `"Đã xác thực"` trên giao diện công khai
* Cấp quyền đăng phòng

---

# Use Case

## UC01: Đăng ký tài khoản

| Trường            | Nội dung                                                                                                       |
| ----------------- | -------------------------------------------------------------------------------------------------------------- |
| Use case ID       | UC01                                                                                                           |
| Use Case          | Đăng ký tài khoản                                                                                              |
| Brief Description | Là người dùng mới, tôi muốn tạo tài khoản trên hệ thống để có thể sử dụng các dịch vụ đặt phòng hoặc đăng tin. |
| Actor             | Người thuê Tenant/Guest, Chủ phòng Host                                                                        |
| Pre-Condition     | Người dùng chưa có tài khoản trên hệ thống.                                                                    |
| Result            | Tài khoản được tạo thành công, mật khẩu được băm hash và lưu trữ trong cơ sở dữ liệu PostgreSQL.               |

### Main Scenario

1. Người dùng chọn `"Đăng ký"` trên giao diện.
2. Hệ thống hiển thị form yêu cầu nhập:

   * Họ tên
   * Email
   * Số điện thoại
   * Mật khẩu
   * Chọn vai trò Người thuê/Chủ nhà
3. Người dùng nhập thông tin và nhấn `"Tạo tài khoản"`.
4. Hệ thống kiểm tra định dạng dữ liệu và tính duy nhất của Email/SĐT.
5. Hệ thống gửi mã OTP xác minh qua Email.
6. Người dùng nhập mã OTP.
7. Hệ thống xác thực OTP, tạo tài khoản và thông báo thành công.

### Alternative Scenarios

* **3a. Thiếu thông tin:** Hệ thống báo lỗi `"Vui lòng điền đầy đủ thông tin"`.
* **4a. Tài khoản đã tồn tại:** Hệ thống thông báo Email/SĐT đã được sử dụng và gợi ý đăng nhập.
* **6a. OTP hết hạn/sai:** Hệ thống yêu cầu gửi lại mã hoặc nhập lại.

### Non-Functional Constraints

* Mật khẩu phải tối thiểu 8 ký tự, bao gồm chữ cái, ký tự đặc biệt và số.
* Mã OTP hết hạn sau 10 phút.

---

## UC02: Đăng nhập

| Trường            | Nội dung                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------- |
| Use case ID       | UC02                                                                                        |
| Use Case          | Đăng nhập                                                                                   |
| Brief Description | Là người dùng đã có tài khoản, tôi muốn đăng nhập vào hệ thống để sử dụng các dịch vụ.      |
| Actor             | Người thuê Tenant/Guest, Chủ phòng Host, Quản trị viên Admin                                |
| Pre-Condition     | Người dùng đã có tài khoản hợp lệ trên hệ thống.                                            |
| Result            | Hệ thống cấp quyền truy cập qua JWT, chuyển hướng người dùng đến trang Dashboard tương ứng. |

### Main Scenario

1. Người dùng chọn `"Đăng nhập"`.
2. Người dùng nhập Email/Tên đăng nhập và Mật khẩu.
3. Hệ thống kiểm tra thông tin trong cơ sở dữ liệu.
4. Hệ thống xác thực thành công và thông báo `"Đăng nhập thành công"`.
5. Chuyển hướng người dùng vào hệ thống.

### Alternative Scenarios

* **3a. Sai thông tin:** Hệ thống báo lỗi `"Mật khẩu hoặc Email không chính xác"`.
* **3b. Quên mật khẩu:** Người dùng chọn `"Quên mật khẩu"` để bắt đầu quy trình khôi phục. Xem UC04.

### Non-Functional Constraints

* Khóa tài khoản tạm thời 10 phút nếu nhập sai quá 5 lần liên tiếp.
* Thời gian xác thực không quá 2 giây.

---

## UC03: Quản lý hồ sơ cá nhân

| Trường            | Nội dung                                                                   |
| ----------------- | -------------------------------------------------------------------------- |
| Use case ID       | UC03                                                                       |
| Use Case          | Quản lý hồ sơ cá nhân                                                      |
| Brief Description | Là người dùng đã có tài khoản, tôi muốn xem và cập nhật thông tin cá nhân. |
| Actor             | Người thuê Tenant/Guest, Chủ phòng Host                                    |
| Pre-Condition     | Người dùng đã đăng nhập vào hệ thống.                                      |
| Result            | Thông tin hồ sơ được cập nhật mới nhất trong hệ thống.                     |

### Main Scenario

1. Người dùng truy cập vào mục `"Hồ sơ cá nhân"`.
2. Hệ thống hiển thị thông tin hiện tại:

   * Họ tên
   * Email
   * Số điện thoại
3. Người dùng nhấn `"Chỉnh sửa"` và thay đổi các trường mong muốn.
4. Người dùng nhấn `"Lưu thay đổi"`.
5. Hệ thống kiểm tra tính hợp lệ và ghi đè dữ liệu mới vào DB.
6. Hệ thống thông báo `"Cập nhật thành công"`.

### Alternative Scenarios

* **5b. Email/SĐT trùng lặp:** Hệ thống báo lỗi nếu người dùng đổi sang Email đã có người khác sử dụng.

### Non-Functional Constraints

* Ảnh đại diện được lưu trữ trên AWS S3.
* Dữ liệu cá nhân được bảo mật theo tiêu chuẩn AES-128 hoặc tương đương.

---

## UC04: Đổi mật khẩu / Quên mật khẩu

| Trường            | Nội dung                                                                                              |
| ----------------- | ----------------------------------------------------------------------------------------------------- |
| Use case ID       | UC04                                                                                                  |
| Use Case          | Đổi mật khẩu / Quên mật khẩu                                                                          |
| Brief Description | Là người dùng đã có tài khoản, tôi muốn khôi phục mật khẩu khi quên hoặc thay đổi định kỳ để bảo mật. |
| Actor             | Người thuê Tenant, Chủ phòng Host                                                                     |
| Pre-Condition     | Người dùng đã có tài khoản đối với Quên mật khẩu hoặc đang đăng nhập đối với Đổi mật khẩu.            |
| Result            | Mật khẩu mới được thiết lập thành công và mã hóa an toàn.                                             |

### Main Scenario

1. Người dùng chọn `"Quên mật khẩu"` tại trang đăng nhập.
2. Nhập Email đã đăng ký.
3. Hệ thống kiểm tra Email và gửi mã OTP xác thực.
4. Người dùng nhập OTP và mã xác thực thành công.
5. Hệ thống hiển thị form nhập mật khẩu mới.
6. Người dùng nhập mật khẩu mới và nhấn `"Xác nhận"`.
7. Hệ thống cập nhật mật khẩu mới và thông báo thành công.

### Alternative Scenarios

* **3a. Email không tồn tại:** Hệ thống báo lỗi `"Tài khoản không tồn tại"`.
* **6a. Mật khẩu mới trùng mật khẩu cũ:** Hệ thống yêu cầu nhập mật khẩu khác để tăng tính bảo mật.

### Non-Functional Constraints

* Hệ thống gửi thông báo xác nhận thay đổi mật khẩu qua Email ngay lập tức.
* Thời gian xử lý luồng khôi phục không quá 1 phút.
