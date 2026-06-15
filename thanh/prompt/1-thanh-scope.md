# Prompt/context for Thanh scope

User request:

```text
Xem qua cau truc cua thu muc thai, va khi code phai doc /thai/GUILD/day1-AI-read.md, hay implement cac cong viec can thiet cua thanh vien LE NHAT THANH trong TEAMWORK_CNPM.md, len plan truoc roi moi code
```

Follow-up request:

```text
hay viet folder thanh voi cau truc giong folder thai, de biet vua lam nhung gi chu
```

Important context:

- Must read `thai/GUILD/day1-AI-read.md` before coding.
- Must follow docs-first workflow and `TEAMWORK_CNPM.md`.
- LE NHAT THANH owns backend foundation, route mounting, shared middleware/utils, admin dashboard/logs, Postman/release QA.
- Do not edit frontend in this week backend scope.

Implemented result:

- Added request logging.
- Added `/health/db`.
- Mounted admin dashboard and system logs routes.
- Added admin role guard.
- Implemented dashboard overview.
- Implemented system logs listing with filters/pagination.
- Implemented admin user list/detail/lock/unlock/role/password-reset APIs.
- Added successful-login system log hook.
- Added Postman environment.

Verification result:

- App load check passed.
- Node syntax checks passed.
- `/health` passed.
- `/health/db` passed with DB network permission.
- Admin login/dashboard/system-logs smoke test passed with seed admin.
- Admin users smoke test passed with seed admin and tenant users.
- Non-admin admin-users access returned 403.
