# Test: Host "List My Rooms" (`GET /api/rooms/my`)

Purpose: Verify the Host can retrieve all rooms they own (including drafts/unapproved), with pagination and images.

Prerequisites
- Backend running (local or Docker). Confirm base URL and port (example `http://localhost:3000`).
- Migrations & seeds run so there is at least one host account and some rooms (or create via API beforehand).
- A valid Host JWT token (`HOST_TOKEN`). The token must authenticate to the same backend instance.

Quick sanity checks
1. Confirm server is running and listening on expected port by checking logs or hitting `/health`:

```bash
curl http://localhost:3000/health
```

2. Confirm your token is valid (optional):

```bash
curl -H "Authorization: Bearer $HOST_TOKEN" http://localhost:3000/api/auth/me
```

Test steps

1) Happy path — list first page

Request:

```bash
curl -v -H "Authorization: Bearer $HOST_TOKEN" \
  "http://localhost:3000/api/rooms/my?page=1&limit=10"
```

Expected response (200): JSON envelope with `items` and `pagination`:

```json
{
  "success": true,
  "message": "Danh sách phòng của tôi",
  "data": {
    "items": [
      {
        "room_id": "<uuid>",
        "title": "...",
        "room_type": "...",
        "detailed_address": "...",
        "max_capacity": 2,
        "monthly_rent": "5000000.00",
        "status": "AVAILABLE",
        "created_at": "...",
        "updated_at": "...",
        "cover_image_url": "/uploads/rooms/<roomId>/<file>",
        "images": [ { "sequence_number": 1, "image_url": "..." }, ... ]
      }
    ],
    "pagination": { "page": 1, "limit": 10, "total": 3 }
  }
}
```

Assertions:
- HTTP 200
- `data.items` is an array
- Each item has `room_id`, `title`, `monthly_rent`, `status` and `images`
- `pagination.total` is a non-negative integer

2) Pagination behavior

Create enough rooms for the host (e.g., 25), then request page 2 with limit 10:

```bash
curl -H "Authorization: Bearer $HOST_TOKEN" "http://localhost:3000/api/rooms/my?page=2&limit=10"
```

Expect `items.length <= 10` and `pagination.page === 2`.

3) Sort and filter

Request with `sortBy=monthly_rent&order=asc` to verify sorting:

```bash
curl -H "Authorization: Bearer $HOST_TOKEN" \
  "http://localhost:3000/api/rooms/my?page=1&limit=10&sortBy=monthly_rent&order=asc"
```

If `status` filter supported, test `status=RENTED` returns only rented rooms.

4) Unauthorized access

Call endpoint without token or with an invalid token:

```bash
curl -v http://localhost:3000/api/rooms/my
```

Expected: 401 Unauthorized (or 403 depending on project convention).

5) Edge cases
- Invalid pagination: `page=0` or `limit=0` should return 400 validation error.
- Large `limit` should be capped by server (if implemented) — expect either 400 or truncated results.

Troubleshooting
- If response still returns the old stub message:
  - Restart server (nodemon: `rs` or stop/start). If Docker, rebuild image and restart container.
  - Confirm the running server source matches the workspace: `docker exec -it <container> cat /app/backend/controllers/host/roomController.js` and ensure it contains the new implementation.
- If `items` array is empty but DB has rooms:
  - Verify `rooms.landlord_id` values match the `userId` in your token. If not, adjust seed or service mapping.
  - Verify migrations/seeds ran on the same DB instance the backend connects to (check `DATABASE_URL` and container env).

Postman checklist
- Create a Postman request: `GET {{baseUrl}}/api/rooms/my` with `Authorization: Bearer {{hostToken}}` header.
- Add tests in Postman to assert `pm.response.to.have.status(200)` and `pm.expect(pm.response.json().data.items).to.be.an('array')`.

Automation (optional)
- Implement a simple integration test script (Node/Jest) that seeds DB, obtains a host token, creates rooms, calls `GET /api/rooms/my` and asserts response. I can scaffold this if you want.

Files updated by feature
- `backend/repositories/roomRepository.js`
- `backend/services/host/roomService.js`
- `backend/controllers/host/roomController.js`

If you want, I can add the Postman request and the integration test next — which one first?
