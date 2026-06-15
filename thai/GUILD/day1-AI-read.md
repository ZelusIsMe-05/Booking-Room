# Day 1 — Auth cho AI agent / dev module khác

Tóm tắt cách tái sử dụng Auth đã có. Đọc file nguồn khi cần chi tiết, đừng tự dựng lại.

## Muốn làm gì thì đọc file nào

| Mục đích | File |
| --- | --- |
| Bảo vệ 1 route (bắt đăng nhập) | `backend/middlewares/authMiddleware.js` |
| Rút UUID / ký / verify token | `backend/utils/jwt.js` |
| Logic login, refresh, lấy user | `backend/services/auth/authService.js` |
| Hằng số role/status, lockout | `backend/config/authConstants.js` |
| Truy vấn DB liên quan auth | `backend/repositories/auth/authRepository.js` |
| Cấu hình secret / thời hạn token | `backend/.env` + `backend/config/env.js` |
| Đặc tả endpoint | `thai/AI-output/1.4-login.md`, `1.5-current-user.md` |

## Bảo vệ một route

```js
const { requireAuth } = require('../middlewares/authMiddleware');
router.get('/something', requireAuth, controller.handler);
```

Sau `requireAuth`, controller có sẵn:

```js
req.user = { userId, role, status }; // userId = UUID lấy từ JWT `sub`
```

→ Lấy UUID của user đang đăng nhập: `req.user.userId`. Không tự verify token trong controller.

## Rút UUID từ token ở nơi khác (ngoài middleware)

```js
const { verifyAccessToken, getUserIdFromPayload } = require('../utils/jwt');
const payload = verifyAccessToken(token); // throw nếu sai/hết hạn/sai type
const userId = getUserIdFromPayload(payload); // UUID (claim `sub`)
```

## Quy ước bắt buộc

- Layering: `route → controller → service → repository`. Không query DB trong controller.
- Lỗi nghiệp vụ: `throw new AppError(code, message, status, data?)` (`utils/AppError.js`); errorHandler tự bắt.
- Response: dùng `sendSuccess` / `sendError` (`utils/responseHelper.js`), không tự `res.json`.
- Token: **access** đi kèm mọi request tài nguyên; **refresh** chỉ gửi tới `POST /api/auth/refresh`. Stateless, không rotation.
- Không hard-code role/status string — dùng `config/authConstants.js`.

## Endpoint auth đã có

| Method | Path | Auth |
| --- | --- | --- |
| POST | `/api/auth/login` | Không |
| POST | `/api/auth/refresh` | Không (cần refresh token trong body) |
| GET | `/api/auth/me` | Bearer access token |
