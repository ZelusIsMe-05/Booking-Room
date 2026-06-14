# CODEX.md

## 1. Project Overview

Tên dự án: `BookingRoom`

Mục tiêu dự án:

* Hệ thống hỗ trợ tìm và đặt phòng
* Cung cấp sự tiện lợi cho người mua và người bán trong quá trình đặt
* Tentant, Host, Admin

Tech stack chính:

- **Frontend:** Next.js (App Router, TypeScript, Tailwind CSS)
- **Backend:** Express (Knex, PostgreSQL, Redis)

---

## 2. Repository Structure

```txt
.
├── backend/
│   ├── config/       
│   ├── controllers/  
│   ├── db/
│   ├── middlewares/
│   │   ├── auth.controller.js/
│   │   ├── auth.router.js/
│   │   ├── auth.service.js/
│   │   ├── auth.repository.js/
│   │   ├── auth.util.js/
│   ├── models/      
│   ├── routes/
│   ├── services/
│   ├── models/  
│   ├── repository/                  
├── frontend/
├── docs/                 
```

Quy ước:

* Không tự ý đổi cấu trúc thư mục lớn nếu chưa có lý do rõ ràng.
* Nếu cần thêm module mới, đặt đúng layer tương ứng.
* Không đặt logic nghiệp vụ vào controller/router.
* Không đặt query database trực tiếp trong UI.

---

## 4. Coding Rules

### 4.1 General Rules

* Ưu tiên code rõ ràng hơn code “thông minh”.
* Không lặp logic nghiệp vụ ở nhiều nơi.
* Không hard-code magic number, status string, role name, permission name.
* Không nuốt lỗi bằng `catch` rỗng.
* Không thêm dependency mới nếu chưa thật sự cần.
* Không sửa file không liên quan đến task hiện tại.
* NHƯNG: nếu cần thiết hãy đề xuất

### 4.2 Naming Convention

* Tên biến/hàm: `camelCase`
* Tên class/type/interface: `PascalCase`
* Tên constant: `UPPER_SNAKE_CASE`
* Tên file TypeScript: `kebab-case.ts`
* Tên test file: `<target>.test.ts` hoặc `<target>.spec.ts`

---

## 5. Architecture Rules

### 5.1 Layering

Luồng xử lý chuẩn:

```txt
Route / Controller
        ↓
Service
        ↓
Repository
        ↓
Database / External Service
```

Quy tắc:

* Route/controller chỉ nhận request, validate input, gọi service và trả response.
* Service chứa business logic.
* Repository chỉ phụ trách truy vấn dữ liệu.
* Không để repository biết HTTP request/response.
* Không để controller thao tác trực tiếp database.

### 5.2 Error Handling

* Dùng error class riêng cho từng domain nếu cần.
* Error phải có `code`, `message`, và HTTP status tương ứng.
* Không expose stack trace cho client.
* Log lỗi nội bộ ở server.

Ví dụ:

```ts
throw new InventoryError(
  "INSUFFICIENT_STOCK",
  "Not enough tickets available",
  409
);
```

---

## 9. Security Rules

* Không commit secret, token, private key, `.env`.
* Không log password, access token, refresh token, OTP, payment secret.
* Password phải hash bằng thuật toán phù hợp, không lưu plain text.
* API cần authorization rõ ràng theo role/permission.
* Không tin dữ liệu từ client.
* Với webhook/payment callback: phải verify signature hoặc checksum.
* Với SQL: dùng parameterized query hoặc ORM an toàn.
