# Day 1 - Huong dan test nhanh phan Thanh

Huong dan nay de test nhanh backend foundation, admin dashboard va system logs.

## 0. Chuan bi

Chay backend trong thu muc `backend/`:

```bash
npm start
```

Hoac khi dev:

```bash
npm run dev
```

Base URL:

```text
http://localhost:5000
```

Tai khoan seed admin:

| Role | identifier | password |
| --- | --- | --- |
| ADMIN | `admin@booking.local` | `Password@123` |

## 1. Health check

### Liveness

```http
GET http://localhost:5000/health
```

Ket qua mong doi:

```json
{
  "success": true,
  "message": "OK"
}
```

### Database readiness

```http
GET http://localhost:5000/health/db
```

Ket qua mong doi:

```json
{
  "success": true,
  "message": "Database connection OK"
}
```

Neu DB/network bi chan, endpoint co the tra 500 qua error handler chung.

## 2. Dang nhap admin lay token

```http
POST http://localhost:5000/api/auth/login
Content-Type: application/json
```

Body:

```json
{
  "identifier": "admin@booking.local",
  "password": "Password@123"
}
```

Copy `data.accessToken` trong response.

Luu y: login thanh cong se ghi mot dong `AUTH_LOGIN_SUCCESS` vao `system_logs`.

## 3. Test admin dashboard

```http
GET http://localhost:5000/api/admin/dashboard/overview
Authorization: Bearer <adminAccessToken>
```

Ket qua mong doi:

```json
{
  "success": true,
  "message": "Lay tong quan dashboard thanh cong.",
  "data": {
    "users": {
      "total": 6
    },
    "rooms": {
      "total": 2,
      "pendingApproval": 1
    },
    "transactions": {
      "total": 1,
      "today": 0,
      "todayAmount": 0
    },
    "support": {
      "totalTickets": 1,
      "totalViolationReports": 1
    },
    "logs": {
      "total": 3
    }
  }
}
```

So lieu co the thay doi tuy theo DB hien tai.

## 4. Test system logs

```http
GET http://localhost:5000/api/admin/system-logs?limit=3
Authorization: Bearer <adminAccessToken>
```

Ket qua mong doi:

```json
{
  "success": true,
  "message": "Lay danh sach system logs thanh cong.",
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "limit": 3,
      "total": 0,
      "totalPages": 0
    }
  }
}
```

`items` se co du lieu neu seed/system log da ton tai.

## 5. Loi can test

Khong gui token:

```http
GET http://localhost:5000/api/admin/dashboard/overview
```

Ket qua mong doi:

```json
{
  "success": false,
  "message": "Ban can dang nhap de thuc hien thao tac nay."
}
```

Dung token khong phai admin:

```text
HTTP 403
message: Ban khong co quyen thuc hien thao tac nay.
```

## 6. Postman environment

Da tao file:

```text
docs/Postman/booking-room.postman_environment.json
```

Bien chinh:

- `baseUrl`
- `tenantToken`
- `hostToken`
- `adminToken`
- `roomId`
- `depositId`
- `transactionId`

## 7. Test admin user management

All requests below need:

```text
Authorization: Bearer <adminAccessToken>
```

### List users

```http
GET http://localhost:5000/api/admin/users?role=TENANT&status=ACTIVE&keyword=tenant&limit=10
```

### User detail

```http
GET http://localhost:5000/api/admin/users/c0000000-0000-0000-0000-000000000005
```

### Lock user

```http
PATCH http://localhost:5000/api/admin/users/c0000000-0000-0000-0000-000000000005/lock
Content-Type: application/json
```

Body:

```json
{
  "reason": "Manual admin test"
}
```

### Unlock user

```http
PATCH http://localhost:5000/api/admin/users/c0000000-0000-0000-0000-000000000005/unlock
```

### Assign role

```http
PATCH http://localhost:5000/api/admin/users/c0000000-0000-0000-0000-000000000005/role
Content-Type: application/json
```

Body:

```json
{
  "role": "TENANT"
}
```

Valid seed roles:

- `ADMIN`
- `LANDLORD`
- `TENANT`

### Reset password

```http
POST http://localhost:5000/api/admin/users/c0000000-0000-0000-0000-000000000005/password-reset
Content-Type: application/json
```

Body:

```json
{
  "temporaryPassword": "Password@123"
}
```

## 8. Admin user error cases

| Case | Expected |
| --- | --- |
| Tenant token calls `/api/admin/users` | `403` |
| Lock missing user | `404` |
| Assign invalid role | `400` |
| Temporary password shorter than 8 chars | `400` |

## 9. Side effects

- Lock user sets `users.status = BANNED`.
- Unlock user sets `users.status = ACTIVE` and resets login lock counters.
- Password reset hashes the temporary password with bcrypt.
- Each admin user action writes one `system_logs` row.
