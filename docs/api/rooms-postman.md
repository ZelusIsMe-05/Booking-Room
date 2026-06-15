# Room API Testing Guide

This guide documents the Room APIs currently implemented for Postman/curl testing.

Scope:
- Public room list/detail
- Host room create/list/update/delete
- Admin pending room approval/rejection

Out of scope:
- Booking/deposit
- Payment
- S3/image upload
- Review creation
- Favorites

## Base URL

```text
http://localhost:5000
```

Postman environment variables:

| Variable | Example | Description |
| --- | --- | --- |
| `base_url` | `http://localhost:5000` | Backend base URL. |
| `tenant_token` | JWT | Token from tenant login. |
| `host_token` | JWT | Token from host login. |
| `admin_token` | JWT | Token from admin login. |
| `room_id` | UUID | Room id from create/list response. |

## Auth Setup

Run backend first:

```powershell
cd backend
npm start
```

Seeded test accounts after `npm run seed`:

| API Role | Login Identifier | Password |
| --- | --- | --- |
| `ADMIN` | `admin` | `Password@123` |
| `HOST` | `landlord1` | `Password@123` |
| `HOST` | `landlord2` | `Password@123` |
| `TENANT` | `tenant1` | `Password@123` |
| `TENANT` | `tenant2` | `Password@123` |

Login endpoint:

```text
POST {{base_url}}/auth/login
```

Host login body:

```json
{
  "identifier": "landlord1",
  "password": "Password@123"
}
```

Admin login body:

```json
{
  "identifier": "admin",
  "password": "Password@123"
}
```

Postman test script to save a token:

```js
const json = pm.response.json();
if (json?.data?.token) {
  pm.environment.set("host_token", json.data.token);
}
```

Use `admin_token` or `tenant_token` instead when logging in as those roles.

## Common Response Format

Success:

```json
{
  "success": true,
  "message": "Rooms fetched successfully",
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

## Public/Tenant APIs

### GET `/rooms`

Returns public rooms only.

Business rule:
- Room must be `AVAILABLE`.
- Room approval must be `APPROVED`.

Postman:

```text
GET {{base_url}}/rooms
```

Headers: none.

Query params:

| Param | Required | Example | Description |
| --- | --- | --- | --- |
| `page` | No | `1` | Page number. |
| `limit` | No | `12` | Page size, max 50. |
| `keyword` | No | `mini` | Searches title, description, address. |
| `q` | No | `mini` | Alias for `keyword`. |
| `location` | No | `Q10` | Filters address. |
| `roomType` | No | `Room` | Filters room type. |
| `room_type` | No | `Room` | Alias for `roomType`. |
| `minPrice` | No | `3000000` | Minimum monthly rent. |
| `min_price` | No | `3000000` | Alias for `minPrice`. |
| `maxPrice` | No | `7000000` | Maximum monthly rent. |
| `max_price` | No | `7000000` | Alias for `maxPrice`. |
| `sort` | No | `price_asc` | `price_asc`, `price_desc`, `rating_desc`, default newest. |

Example:

```text
GET {{base_url}}/rooms?page=1&limit=10&keyword=phòng&minPrice=3000000&maxPrice=7000000&sort=price_asc
```

Expected status: `200 OK`

Example response:

```json
{
  "success": true,
  "message": "Rooms fetched successfully",
  "data": {
    "items": [
      {
        "room_id": "uuid",
        "landlord_id": "uuid",
        "title": "Phòng trọ gần Đại học Bách Khoa",
        "room_type": "Room",
        "detailed_address": "45 Tô Hiến Thành, Q10, HCM",
        "max_capacity": 2,
        "monthly_rent": 3500000,
        "deposit_amount": 3500000,
        "status": "AVAILABLE",
        "approval_status": "APPROVED",
        "average_rating": 4.5,
        "cover_image_url": "https://cdn.booking.local/rooms/r1_1.jpg",
        "images": [],
        "host": {
          "user_id": "uuid",
          "full_name": "Nguyen Van Chu",
          "avatar_url": null,
          "phone_number": "0900000002"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "total_pages": 1
    }
  }
}
```

Possible errors:

| Status | Meaning |
| --- | --- |
| `400` | Invalid query value, such as non-numeric price. |

### GET `/rooms/:id`

Returns room detail.

Public behavior:
- Without token, only approved + available rooms are visible.

Authenticated behavior:
- Host owner can see their own pending/rejected rooms.
- Admin can see any room.

Postman:

```text
GET {{base_url}}/rooms/{{room_id}}
```

Headers:

```http
Authorization: Bearer {{host_token}}
```

Header is optional for public approved rooms.

Expected status: `200 OK`

Possible errors:

| Status | Meaning |
| --- | --- |
| `401` | Invalid token format/token expired when Authorization header is present. |
| `404` | Room does not exist, or caller is not allowed to view non-public room. |

## Host APIs

Host APIs require:

```http
Authorization: Bearer {{host_token}}
```

Only `HOST` can use these APIs.

Important:
- Host can only update/delete their own rooms.
- Host must be verified before creating room posts.
- In the current schema, a verified host means the user has a `landlords` row with both ID-card image URLs.
- New room posts default to approval `PENDING`.

### POST `/rooms`

Creates a room post as host.

Postman:

```text
POST {{base_url}}/rooms
```

Headers:

```http
Content-Type: application/json
Authorization: Bearer {{host_token}}
```

Body:

```json
{
  "title": "Phòng mới gần trung tâm",
  "room_type": "Room",
  "detailed_address": "123 Nguyễn Trãi, Q5, HCM",
  "max_capacity": 2,
  "monthly_rent": 4200000,
  "deposit_amount": 4200000,
  "electricity_cost": 4000,
  "water_cost": 25000,
  "internet_cost": 100000,
  "service_fee": 50000,
  "room_description": "Phòng sạch, có cửa sổ, giờ giấc tự do.",
  "longitude": 106.68,
  "latitude": 10.75,
  "images": [
    "https://example.com/room-1.jpg",
    "https://example.com/room-2.jpg"
  ]
}
```

Body fields:

| Field | Required | Notes |
| --- | --- | --- |
| `title` | Yes | Room title. |
| `room_type` / `roomType` | Yes | Example: `Room`, `Apartment`. |
| `detailed_address` / `detailedAddress` | Yes | Full address. |
| `max_capacity` / `maxCapacity` | Yes | Number >= 1. |
| `monthly_rent` / `monthlyRent` | Yes | Number >= 0. |
| `deposit_amount` / `depositAmount` | Yes | Number >= 0. |
| `electricity_cost` / `electricityCost` | Yes | Number >= 0. |
| `water_cost` / `waterCost` | Yes | Number >= 0. |
| `internet_cost` / `internetCost` | No | Defaults to 0. |
| `service_fee` / `serviceFee` | No | Defaults to 0. |
| `room_description` / `roomDescription` | No | Text description. |
| `longitude` | No | Between -180 and 180. |
| `latitude` | No | Between -90 and 90. |
| `images` | No | Array of image URL strings. |
| `image_url` | No | Single image URL alternative. |

Expected status: `201 Created`

Example response:

```json
{
  "success": true,
  "message": "Room submitted for approval",
  "data": {
    "room": {
      "room_id": "uuid",
      "status": "AVAILABLE",
      "approval_status": "PENDING",
      "title": "Phòng mới gần trung tâm"
    }
  }
}
```

Postman test script to save room id:

```js
const json = pm.response.json();
if (json?.data?.room?.room_id) {
  pm.environment.set("room_id", json.data.room.room_id);
}
```

Possible errors:

| Status | Meaning |
| --- | --- |
| `400` | Validation failed. |
| `401` | Missing/invalid token. |
| `403` | User is not `HOST`, or host is not verified. |

### GET `/rooms/my`

Returns rooms owned by the current host.

Postman:

```text
GET {{base_url}}/rooms/my
```

Headers:

```http
Authorization: Bearer {{host_token}}
```

Expected status: `200 OK`

Example response:

```json
{
  "success": true,
  "message": "Host rooms fetched successfully",
  "data": {
    "rooms": []
  }
}
```

Possible errors:

| Status | Meaning |
| --- | --- |
| `401` | Missing/invalid token. |
| `403` | User is not `HOST`. |

### PATCH `/rooms/:id`

Updates a room owned by the current host.

Business rule:
- Updating a room resets approval status to `PENDING`.

Postman:

```text
PATCH {{base_url}}/rooms/{{room_id}}
```

Headers:

```http
Content-Type: application/json
Authorization: Bearer {{host_token}}
```

Body:

```json
{
  "monthly_rent": 4500000,
  "room_description": "Cập nhật mô tả phòng.",
  "images": [
    "https://example.com/updated-room-1.jpg"
  ]
}
```

Expected status: `200 OK`

Possible errors:

| Status | Meaning |
| --- | --- |
| `400` | No fields to update or invalid values. |
| `401` | Missing/invalid token. |
| `403` | Room is not owned by current host. |
| `404` | Room not found. |

### DELETE `/rooms/:id`

Deletes a room owned by the current host.

Postman:

```text
DELETE {{base_url}}/rooms/{{room_id}}
```

Headers:

```http
Authorization: Bearer {{host_token}}
```

Expected status: `200 OK`

Example response:

```json
{
  "success": true,
  "message": "Room deleted successfully",
  "data": null
}
```

Possible errors:

| Status | Meaning |
| --- | --- |
| `401` | Missing/invalid token. |
| `403` | Room is not owned by current host. |
| `404` | Room not found. |

## Admin APIs

Admin APIs require:

```http
Authorization: Bearer {{admin_token}}
```

Only `ADMIN` can use these APIs.

### GET `/admin/rooms/pending`

Returns rooms waiting for admin approval.

Postman:

```text
GET {{base_url}}/admin/rooms/pending
```

Headers:

```http
Authorization: Bearer {{admin_token}}
```

Expected status: `200 OK`

Example response:

```json
{
  "success": true,
  "message": "Pending rooms fetched successfully",
  "data": {
    "rooms": []
  }
}
```

Possible errors:

| Status | Meaning |
| --- | --- |
| `401` | Missing/invalid token. |
| `403` | User is not `ADMIN`. |

### PATCH `/admin/rooms/:id/approve`

Approves a pending room.

Postman:

```text
PATCH {{base_url}}/admin/rooms/{{room_id}}/approve
```

Headers:

```http
Authorization: Bearer {{admin_token}}
```

Body: none.

Expected status: `200 OK`

Example response:

```json
{
  "success": true,
  "message": "Room approved successfully",
  "data": {
    "room": {
      "room_id": "uuid",
      "approval_status": "APPROVED"
    }
  }
}
```

Possible errors:

| Status | Meaning |
| --- | --- |
| `400` | Room is not pending. |
| `401` | Missing/invalid token. |
| `403` | User is not `ADMIN`. |
| `404` | Room not found. |

### PATCH `/admin/rooms/:id/reject`

Rejects a pending room.

Postman:

```text
PATCH {{base_url}}/admin/rooms/{{room_id}}/reject
```

Headers:

```http
Authorization: Bearer {{admin_token}}
```

Body: optional. The current implementation does not persist rejection reason because the existing schema has no rejection reason column.

```json
{
  "reason": "Thông tin phòng chưa đầy đủ"
}
```

Expected status: `200 OK`

Example response:

```json
{
  "success": true,
  "message": "Room rejected successfully",
  "data": {
    "room": {
      "room_id": "uuid",
      "approval_status": "REJECTED"
    }
  }
}
```

Possible errors:

| Status | Meaning |
| --- | --- |
| `400` | Room is not pending. |
| `401` | Missing/invalid token. |
| `403` | User is not `ADMIN`. |
| `404` | Room not found. |

## Alternate Route Prefixes

Room endpoints are also available under `/api`.

Examples:

```text
GET {{base_url}}/api/rooms
GET {{base_url}}/api/rooms/{{room_id}}
POST {{base_url}}/api/rooms
GET {{base_url}}/api/rooms/my
PATCH {{base_url}}/api/rooms/{{room_id}}
DELETE {{base_url}}/api/rooms/{{room_id}}
GET {{base_url}}/api/admin/rooms/pending
PATCH {{base_url}}/api/admin/rooms/{{room_id}}/approve
PATCH {{base_url}}/api/admin/rooms/{{room_id}}/reject
```

## Full Postman Test Flow

1. Login as host:

```json
{
  "identifier": "landlord1",
  "password": "Password@123"
}
```

Save token as `host_token`.

2. Create room:

```text
POST {{base_url}}/rooms
```

Save `data.room.room_id` as `room_id`.

Expected: `approval_status = PENDING`.

3. Check public list:

```text
GET {{base_url}}/rooms
```

Expected: new pending room is not visible.

4. Login as admin and save `admin_token`.

5. Check pending rooms:

```text
GET {{base_url}}/admin/rooms/pending
```

Expected: new room appears.

6. Approve room:

```text
PATCH {{base_url}}/admin/rooms/{{room_id}}/approve
```

Expected: `approval_status = APPROVED`.

7. Check public detail:

```text
GET {{base_url}}/rooms/{{room_id}}
```

Expected: `200 OK`.

8. Host updates room:

```text
PATCH {{base_url}}/rooms/{{room_id}}
```

Expected: room returns to `approval_status = PENDING`.

9. Admin rejects or approves again.

10. Host deletes room if needed:

```text
DELETE {{base_url}}/rooms/{{room_id}}
```
