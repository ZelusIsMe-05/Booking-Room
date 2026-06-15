# Backend API Testing Guide: Foundation + Auth/RBAC

This guide documents the backend API endpoints currently implemented for Postman testing.

Scope:
- Health checks
- Database health check
- Authentication
- Current user lookup
- Logout placeholder
- RBAC token/role behavior

Out of scope:
- Room APIs
- Booking/deposit APIs
- Payment APIs
- Chat APIs
- Admin/Host management APIs

## Base URL

Local backend:

```text
http://localhost:5000
```

Postman environment variables:

| Variable | Example | Description |
| --- | --- | --- |
| `base_url` | `http://localhost:5000` | Backend base URL. |
| `token` | JWT string from login/register | Bearer token for protected routes. |

## Common Response Format

Success:

```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "message": "Validation failed",
  "details": {}
}
```

## Authentication Header

Protected endpoints require:

```http
Authorization: Bearer {{token}}
```

## Seeded Test Accounts

After running `npm run seed`, these users exist:

| Role in API | Login Identifier | Password |
| --- | --- | --- |
| `ADMIN` | `admin` | `Password@123` |
| `HOST` | `landlord1` | `Password@123` |
| `HOST` | `landlord2` | `Password@123` |
| `TENANT` | `tenant1` | `Password@123` |
| `TENANT` | `tenant2` | `Password@123` |

Note: the database role for hosts is stored as `LANDLORD`, but API responses expose it as `HOST`.

## Recommended Postman Test Order

1. `GET /health`
2. `GET /health/db`
3. `POST /auth/login`
4. Save `data.token` into Postman variable `token`.
5. `GET /auth/me`
6. `POST /auth/logout`
7. Optional: `POST /auth/register` with a new email/phone.

## Health

### GET `/health`

Checks whether the Express app is running.

Postman:

```text
GET {{base_url}}/health
```

Headers: none.

Body: none.

Expected status: `200 OK`

Example response:

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "status": "ok",
    "uptime": 123.45,
    "timestamp": "2026-06-10T10:00:00.000Z"
  }
}
```

### GET `/health/db`

Checks whether the backend can connect to PostgreSQL/Neon.

Postman:

```text
GET {{base_url}}/health/db
```

Headers: none.

Body: none.

Expected status: `200 OK`

Example response:

```json
{
  "success": true,
  "message": "OK",
  "data": {
    "status": "ok",
    "database": "reachable",
    "result": 1
  }
}
```

Possible error:

| Status | Meaning |
| --- | --- |
| `500` | Backend cannot reach database, `DATABASE_URL` is wrong, Neon is unavailable, or migrations were not run. |

## Auth

### POST `/auth/register`

Creates a new user and returns a JWT.

Postman:

```text
POST {{base_url}}/auth/register
```

Headers:

```http
Content-Type: application/json
```

Body for tenant:

```json
{
  "fullName": "Nguyen Van A",
  "email": "nguyenvana@example.com",
  "phoneNumber": "0912345678",
  "username": "nguyenvana",
  "password": "Password@123",
  "confirmPassword": "Password@123",
  "role": "TENANT"
}
```

Body for host:

```json
{
  "fullName": "Tran Thi Host",
  "email": "host@example.com",
  "phoneNumber": "0912345679",
  "username": "hostexample",
  "password": "Password@123",
  "confirmPassword": "Password@123",
  "role": "HOST",
  "idCardFrontUrl": "https://example.com/cccd-front.jpg",
  "idCardBackUrl": "https://example.com/cccd-back.jpg"
}
```

Body fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `fullName` | string | Yes | Minimum 2 characters. |
| `email` | string | Yes | Must be unique and valid email format. |
| `phoneNumber` | string | Optional | If provided, must be 10-15 digits and unique. |
| `username` | string | Optional | If omitted, generated from email. Must be unique if provided. |
| `password` | string | Yes | Minimum 8 chars, uppercase, lowercase, number, special char. |
| `confirmPassword` | string | Yes | Must match `password`. |
| `role` | string | Optional | `TENANT` or `HOST`. Defaults to `TENANT`. |
| `idCardFrontUrl` | string | Required for `HOST` | URL to front ID card image. |
| `idCardBackUrl` | string | Required for `HOST` | URL to back ID card image. |

Expected status: `201 Created`

Example response:

```json
{
  "success": true,
  "message": "Registered successfully",
  "data": {
    "user": {
      "user_id": "uuid",
      "full_name": "Nguyen Van A",
      "email": "nguyenvana@example.com",
      "phone_number": "0912345678",
      "gender": "OTHER",
      "date_of_birth": null,
      "address": null,
      "avatar_url": null,
      "status": "ACTIVE",
      "username": "nguyenvana",
      "role_id": "uuid",
      "role": "TENANT"
    },
    "token": "jwt-token"
  }
}
```

Possible errors:

| Status | Meaning |
| --- | --- |
| `400` | Validation failed. |
| `409` | Email, phone number, or username already exists. |
| `500` | Server/config/database error. |

Postman test script to save token:

```js
const json = pm.response.json();
if (json?.data?.token) {
  pm.environment.set("token", json.data.token);
}
```

### POST `/auth/login`

Logs in using email, phone number, or username plus password.

Postman:

```text
POST {{base_url}}/auth/login
```

Headers:

```http
Content-Type: application/json
```

Body:

```json
{
  "identifier": "admin",
  "password": "Password@123"
}
```

Body fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `identifier` | string | Yes | Email, phone number, or username. |
| `password` | string | Yes | Plain password. |

Expected status: `200 OK`

Example response:

```json
{
  "success": true,
  "message": "Logged in successfully",
  "data": {
    "user": {
      "user_id": "uuid",
      "full_name": "System Admin",
      "email": "admin@booking.local",
      "phone_number": "0900000001",
      "gender": "OTHER",
      "date_of_birth": "1990-01-01T00:00:00.000Z",
      "address": null,
      "avatar_url": null,
      "status": "ACTIVE",
      "username": "admin",
      "role_id": "uuid",
      "role": "ADMIN"
    },
    "token": "jwt-token"
  }
}
```

Possible errors:

| Status | Meaning |
| --- | --- |
| `400` | `identifier` or `password` missing. |
| `401` | Invalid credentials or inactive account. |
| `423` | Account temporarily locked after too many failed attempts. |

Postman test script to save token:

```js
const json = pm.response.json();
if (json?.data?.token) {
  pm.environment.set("token", json.data.token);
}
```

### GET `/auth/me`

Returns the current authenticated user from the JWT.

Postman:

```text
GET {{base_url}}/auth/me
```

Headers:

```http
Authorization: Bearer {{token}}
```

Body: none.

Expected status: `200 OK`

Example response:

```json
{
  "success": true,
  "message": "Current user",
  "data": {
    "user": {
      "user_id": "uuid",
      "full_name": "System Admin",
      "email": "admin@booking.local",
      "phone_number": "0900000001",
      "gender": "OTHER",
      "date_of_birth": "1990-01-01T00:00:00.000Z",
      "address": null,
      "avatar_url": null,
      "status": "ACTIVE",
      "username": "admin",
      "role_id": "uuid",
      "role": "ADMIN"
    }
  }
}
```

Possible errors:

| Status | Meaning |
| --- | --- |
| `401` | Missing, invalid, or expired token. |

### POST `/auth/logout`

Logout endpoint for client-side token removal.

Important: JWT is stateless in the current implementation. This endpoint does not revoke tokens server-side. The client should delete the stored token after success.

Postman:

```text
POST {{base_url}}/auth/logout
```

Headers:

```http
Authorization: Bearer {{token}}
```

Body: none.

Expected status: `200 OK`

Example response:

```json
{
  "success": true,
  "message": "Logged out successfully",
  "data": null
}
```

Possible errors:

| Status | Meaning |
| --- | --- |
| `401` | Missing, invalid, or expired token. |

## Alternate Route Prefix

The same auth endpoints are also available under `/api/auth`.

Examples:

```text
POST {{base_url}}/api/auth/login
GET {{base_url}}/api/auth/me
POST {{base_url}}/api/auth/logout
POST {{base_url}}/api/auth/register
```

## RBAC Testing Notes

RBAC middleware exists for backend routes that need roles, but no protected room/admin/host APIs are implemented yet.

Allowed API role names:

| API Role | Database Role |
| --- | --- |
| `TENANT` | `TENANT` |
| `HOST` | `LANDLORD` |
| `ADMIN` | `ADMIN` |

Current auth endpoints do not require a specific role:

| Endpoint | Requires Login | Requires Role |
| --- | --- | --- |
| `GET /health` | No | No |
| `GET /health/db` | No | No |
| `POST /auth/register` | No | No |
| `POST /auth/login` | No | No |
| `GET /auth/me` | Yes | No |
| `POST /auth/logout` | Yes | No |

Future protected routes should use:

```js
authenticate
authorize('TENANT')
authorize('HOST')
authorize('ADMIN')
```

## Common Setup Problems

### Missing `JWT_SECRET`

Error on startup:

```text
Missing required environment variable(s): JWT_SECRET
```

Fix `backend/.env`:

```env
JWT_SECRET=your-long-random-secret
```

Generate one:

```powershell
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Login Fails For Seeded Users

If seeded users return `401 Invalid credentials`, rerun seed after pulling the latest seed changes:

```powershell
cd backend
npm run seed
```

Seeded password:

```text
Password@123
```

### Database Health Fails

Run migrations first:

```powershell
cd backend
npm run migrate
```

Then check `DATABASE_URL` in `backend/.env`.

## Full Postman Smoke Test

1. Start server:

```powershell
cd backend
npm start
```

2. `GET {{base_url}}/health`

Expected: `200`.

3. `GET {{base_url}}/health/db`

Expected: `200`.

4. `POST {{base_url}}/auth/login`

Body:

```json
{
  "identifier": "admin",
  "password": "Password@123"
}
```

Expected: `200`, save `data.token`.

5. `GET {{base_url}}/auth/me`

Header:

```http
Authorization: Bearer {{token}}
```

Expected: `200`, role `ADMIN`.

6. `POST {{base_url}}/auth/logout`

Header:

```http
Authorization: Bearer {{token}}
```

Expected: `200`.
