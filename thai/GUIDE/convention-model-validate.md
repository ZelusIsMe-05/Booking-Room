# Convention: Model + Validate request/response

> Mục tiêu: thống nhất **shape dữ liệu (model/DTO)** và **cách validate request/response**
> cho toàn bộ backend, để mỗi người làm một module nhưng code ra giống nhau.
>
> Stack thực tế: **Express + Knex (PostgreSQL)**. Không dùng ORM, query bằng Knex trong
> tầng `repositories/`. Đề xuất dùng **Zod** cho validate (nhẹ, không cần khai báo type riêng).

---

## 1. Vấn đề hiện tại (lý do có tài liệu này)

- `models/*.js` đang **rỗng** → không có nơi định nghĩa "một User/Room... trông như thế nào".
- `middlewares/validateMiddleware.js` đang **rỗng** → mỗi controller tự `if (!x)` check tay,
  rời rạc, dễ sót field (xem `controllers/auth/auth.controller.js`).
- Response mới thống nhất phần "vỏ" (`utils/responseHelper.js`), còn "ruột" `data` thì mỗi
  service tự nặn (ví dụ `toPublicUser()` trong `auth.service.js`) → dễ lệch field giữa các endpoint.

---

## 2. Kiến trúc 1 request (bắt buộc theo đúng thứ tự lớp)

```
route  ──►  validate middleware  ──►  controller  ──►  service  ──►  repository (Knex)
                  │                        │              │
              (Zod schema)            (điều phối)     (nghiệp vụ)        (DB, snake_case)
                  │
              lỗi 400 ──► errorHandler ──► sendError
```

Quy tắc trách nhiệm từng lớp (giữ nguyên như hiện tại):

| Lớp | Được phép | KHÔNG được |
|-----|-----------|------------|
| `routes/` | khai báo path + gắn middleware | chứa logic |
| `middlewares/validate` | check & ép kiểu input theo schema | gọi DB |
| `controllers/` | đọc req, gọi service, `sendSuccess` | viết SQL / logic nghiệp vụ |
| `services/` | nghiệp vụ, ném `AppError` | biết tên cột/bảng |
| `repositories/` | chỉ Knex, trả row `snake_case` | biết về HTTP |
| `models/` | định nghĩa schema + map `snake_case → camelCase` | gọi DB |

---

## 3. Cài thư viện

```bash
cd backend
npm install zod
```

---

## 4. `middlewares/validateMiddleware.js` (viết 1 lần, dùng chung)

```js
const { ZodError } = require('zod');
const AppError = require('../utils/AppError');

/**
 * Validate request theo schema Zod cho từng phần (body/params/query).
 * Dùng: router.post('/login', validate({ body: loginSchema }), controller.login)
 *
 * - Parse thành công: GHI ĐÈ req.body/params/query bằng dữ liệu đã ép kiểu + trim.
 * - Thất bại: ném AppError 400 (errorHandler sẽ trả về envelope chuẩn).
 */
function validate(schemas) {
  return (req, res, next) => {
    try {
      for (const part of ['body', 'params', 'query']) {
        if (schemas[part]) {
          req[part] = schemas[part].parse(req[part]);
        }
      }
      return next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        }));
        return next(new AppError('VALIDATION_ERROR', 'Dữ liệu không hợp lệ.', 400, { errors: details }));
      }
      return next(err);
    }
  };
}

module.exports = { validate };
```

> Lưu ý: `errorHandler` hiện đã biết đọc `AppError.data` và đưa vào `data` của response,
> nên client sẽ nhận được `data.errors` liệt kê field sai. Không cần sửa errorHandler.

---

## 5. `models/` — định nghĩa shape dữ liệu

`models/<Tên>.js` chứa **schema request** (Zod) cho các endpoint liên quan.

Ví dụ `models/User.js`:

```js
const { z } = require('zod');

// ---- Request schemas ----
// Đặt `error` ở cấp string để khi field thiếu/sai kiểu vẫn ra message tiếng Việt.
// Nếu chỉ để message ở .min(), khi field undefined Zod báo lỗi kiểu mặc định
// ("Invalid input: expected string, received undefined") thay vì message của mình.
const loginSchema = z.object({
  identifier: z.string({ error: 'Vui lòng nhập tài khoản.' }).trim().min(1, 'Vui lòng nhập tài khoản.'),
  password: z.string({ error: 'Vui lòng nhập mật khẩu.' }).min(1, 'Vui lòng nhập mật khẩu.'),
});

const refreshSchema = z.object({
  refreshToken: z.string({ error: 'Thiếu refresh token.' }).trim().min(1, 'Thiếu refresh token.'),
});

module.exports = { loginSchema, refreshSchema };
```

> Vì dự án dùng Knex (không ORM), "model" ở đây = **schema validate**, KHÔNG phải class ánh xạ bảng.
> Việc truy vấn bảng vẫn nằm ở `repositories/`. Tên cột phải bám
> `backend/db/migrations/` (xem ghi chú cuối file).

---

## 6. Áp dụng vào route (ví dụ auth)

`routes/auth/auth.route.js`:

```js
const { validate } = require('../../middlewares/validateMiddleware');
const { loginSchema, refreshSchema } = require('../../models/User');

router.post('/login',   validate({ body: loginSchema }),   authController.login);
router.post('/refresh', validate({ body: refreshSchema }), authController.refresh);
router.get('/me',       requireAuth,                       authController.getMe);
```

Controller **bỏ phần check tay**, chỉ còn điều phối (vì validate đã lo input + đã trim):

```js
async function login(req, res, next) {
  try {
    const { identifier, password } = req.body; // đã được validate + trim
    const { user, tokens } = await authService.login({
      identifier, password,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
    });
    return sendSuccess(res, { status: 200, message: 'Đăng nhập thành công.', data: { ...tokens, user } });
  } catch (err) {
    return next(err);
  }
}
```

Service tự khai báo `toPublicUser` (vì hiện chỉ auth dùng). Khi có thêm module khác
cũng trả User, hãy nâng DTO lên `models/User.js` theo mục 5.1.

---

## 7. Validate response (tùy chọn, khuyến khích ở môi trường dev)

Mục đích: bắt lỗi khi service trả thiếu/sai field so với hợp đồng API.

- **Cách nhẹ nhất (đủ dùng cho đồ án):** luôn đi qua `toPublicX()` để response có shape cố định.
  Không tự `res.json(row)` bằng row thô từ DB.
- **Cách chặt hơn:** khai báo thêm `userResponseSchema` trong model và `schema.parse(data)`
  trước khi `sendSuccess` (chỉ bật khi `NODE_ENV !== 'production'` để khỏi ảnh hưởng hiệu năng).

---

## 8. Checklist khi làm 1 module mới (Room / Booking / Review...)

- [ ] Trong `models/<Tên>.js`: khai báo schema cho từng endpoint (body/params/query).
- [ ] Trong `routes/...`: gắn `validate({ body|params|query })` trước controller.
- [ ] Controller: KHÔNG check tay nữa, chỉ đọc `req.body` đã validate.
- [ ] Service: viết `toPublic<Tên>()` ngay trong service; nâng lên `models/` khi ≥2 nơi dùng (mục 5.1). Ném `AppError` cho lỗi nghiệp vụ.
- [ ] Repository: chỉ Knex, bám đúng tên cột trong `backend/db/migrations/`.

---

## 9. Quy ước chốt

- Tên cột DB: **snake_case** (đúng migrations). Field trả ra API: **camelCase** (qua `toPublicX`).
- Mọi lỗi nghiệp vụ ném `AppError(code, message, status, data?)` — KHÔNG `res.status().json()` thủ công trong service.
- Response luôn qua `sendSuccess` / `sendError` (không tự gọi `res.json`).
- Lỗi validate luôn là `400` với `data.errors = [{ field, message }]`.
