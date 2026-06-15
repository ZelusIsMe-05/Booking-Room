# Day 1 - Backend foundation/admin notes for AI agents

Read this before touching Thanh-owned backend foundation files.

## Scope owner

Owner: LE NHAT THANH

Primary ownership from `TEAMWORK_CNPM.md`:

- Backend foundation and integration.
- `backend/app.js` route mounting convention.
- Shared middleware and utility conventions.
- Admin dashboard/log APIs.
- Postman environment / backend QA flow.

Do not change frontend for this week scope.

## Files changed/created in this pass

Foundation:

- `backend/app.js`
- `backend/middlewares/requestLogger.js`
- `backend/middlewares/roleMiddleware.js`

Admin dashboard:

- `backend/routes/admin/dashboardRoutes.js`
- `backend/controllers/admin/dashboardController.js`
- `backend/services/admin/dashboardService.js`

System logs:

- `backend/routes/admin/systemLogRoutes.js`
- `backend/controllers/admin/systemLogController.js`
- `backend/services/admin/systemLogService.js`

Auth integration:

- `backend/services/auth/authService.js`

Postman:

- `docs/Postman/booking-room.postman_environment.json`

## API routes now mounted

Base backend URL:

```text
http://localhost:5000
```

Routes:

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/health` | none | Liveness probe |
| GET | `/health/db` | none | PostgreSQL readiness probe |
| POST | `/api/auth/login` | none | Login and issue tokens |
| POST | `/api/auth/refresh` | none | Refresh access token |
| GET | `/api/auth/me` | Bearer token | Current user |
| GET | `/api/admin/dashboard/overview` | ADMIN token | Dashboard KPI overview |
| GET | `/api/admin/system-logs` | ADMIN token | System logs with filters/pagination |

## Conventions to preserve

- Layering: route -> controller -> service -> repository/database.
- Controllers must not query DB directly.
- Use `sendSuccess` / `sendError` response envelope.
- Use `AppError` for business/auth errors.
- Protected routes use `requireAuth`.
- Admin-only routes use `authorizeRoles('ADMIN')` after `requireAuth`.
- Route mount prefix stays under `/api`.

## Admin dashboard output shape

`GET /api/admin/dashboard/overview` returns:

```json
{
  "success": true,
  "message": "Lay tong quan dashboard thanh cong.",
  "data": {
    "users": { "total": 0 },
    "rooms": { "total": 0, "pendingApproval": 0 },
    "transactions": { "total": 0, "today": 0, "todayAmount": 0 },
    "support": { "totalTickets": 0, "totalViolationReports": 0 },
    "logs": { "total": 0 }
  }
}
```

## System logs query params

`GET /api/admin/system-logs`

Supported filters:

- `page`
- `limit` (max 100)
- `userId`
- `action`
- `from`
- `to`

## Auth/log integration

Successful login now writes a row into `system_logs`:

```text
action = AUTH_LOGIN_SUCCESS
```

This is in addition to the existing `login_audit_logs` behavior.

## Verification already run

Syntax/load checks:

```text
node -e "require('./app'); console.log('app loaded')"
node -c app.js
node -c middlewares\roleMiddleware.js
node -c middlewares\requestLogger.js
node -c services\admin\dashboardService.js
node -c services\admin\systemLogService.js
node -c controllers\admin\dashboardController.js
node -c controllers\admin\systemLogController.js
node -c routes\admin\dashboardRoutes.js
node -c routes\admin\systemLogRoutes.js
node -c services\auth\authService.js
```

Smoke tests:

- `/health` returned 200.
- `/health/db` returned 200 when run with DB network permission.
- Admin seed login returned 200.
- `/api/admin/dashboard/overview` returned 200 with admin token.
- `/api/admin/system-logs?limit=3` returned 200 with admin token.

Seed admin used for smoke test:

```text
identifier: admin@booking.local
password: Password@123
```

## Important note

The admin smoke test wrote one real row into `system_logs` with action `AUTH_LOGIN_SUCCESS`.

## Day 1 update - Admin users completed

Additional files now active:

- `backend/routes/admin/userRoutes.js`
- `backend/controllers/admin/userController.js`
- `backend/services/admin/userService.js`

Additional routes:

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/admin/users` | ADMIN token | User list with filters/pagination |
| GET | `/api/admin/users/:id` | ADMIN token | User detail |
| PATCH | `/api/admin/users/:id/lock` | ADMIN token | Set user status `BANNED` |
| PATCH | `/api/admin/users/:id/unlock` | ADMIN token | Set user status `ACTIVE` |
| PATCH | `/api/admin/users/:id/role` | ADMIN token | Assign role by existing `roles.role_name` |
| POST | `/api/admin/users/:id/password-reset` | ADMIN token | Hash and set temporary password |

`GET /api/admin/users` filters:

- `page`
- `limit` (max 100)
- `role`
- `status`
- `keyword`

Admin actions logged to `system_logs`:

- `ADMIN_LOCK_USER`
- `ADMIN_UNLOCK_USER`
- `ADMIN_CHANGE_USER_ROLE`
- `ADMIN_RESET_USER_PASSWORD`

Verification added:

- `/api/admin/users?role=TENANT&limit=2` returned 200 with admin token.
- `/api/admin/users/:id` returned 200 with admin token.
- `/api/admin/users/:id/lock` returned 200 for an existing tenant and 404 for a missing user.
- `/api/admin/users/:id/unlock` returned 200 for an existing tenant.
- `/api/admin/users/:id/role` returned 200 for `TENANT` and 400 for invalid role.
- `/api/admin/users/:id/password-reset` returned 200 for a valid temporary password.
- `/api/admin/users` returned 403 with a tenant token.

Important assumption:

- Assigning `LANDLORD` only updates `users.role_id`; it does not create a `landlords` row because that table requires CCCD URLs and this API contract only accepts `role`.
