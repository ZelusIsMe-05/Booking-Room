# Booking-Room - WBS va ke hoach 1 tuan implement Backend API

Tai lieu nay duoc lap dua tren `TEAMWORK.md` mau va toan bo tai lieu trong `docs/` ngoai tru `docs/api/`. Gia dinh quan trong: **API backend chua implement bat cu thu gi**. Trong 1 tuan nay team chi lam backend, chua dung frontend, muc tieu la co REST API test duoc on dinh bang Postman/Insomnia.

## 1. Nguyen tac phan cong

- Moi thanh vien so huu mot nhom module rieng de giam conflict.
- Lam theo nhanh rieng: `feature/backend-<module>`, merge ve `dev` qua PR.
- Khong sua frontend trong tuan nay.
- Moi API phai co route, controller, service, model/repository, validation, auth/role guard neu can.
- Response JSON thong nhat:

```json
{
  "success": true,
  "message": "OK",
  "data": {}
}
```

Loi:

```json
{
  "success": false,
  "message": "Validation failed",
  "details": {
    "field": "error message"
  }
}
```

- Neu bi block qua 2 gio, bao trong daily sync va chuyen sang task doc lap cung module.
- `backend/app.js`, middleware dung chung, migration va seed la file co nguy co conflict cao. Chi integration owner merge route mount/migration tong hop sau daily sync.
- Moi module phai co Postman request mau, gom ca happy path va loi co ban.

## 2. Tech stack va kien truc can bam

| Layer | Cong nghe / quy uoc |
| --- | --- |
| Backend | Node.js, Express.js |
| Database | PostgreSQL, Knex.js migration/query builder |
| Auth | JWT, bcrypt cost >= 10 |
| Realtime | Socket.io/WebSocket co the lam MVP bang REST message API truoc |
| Payment | Sandbox/mock VNPAY/MOMO/BANK_TRANSFER |
| AI | Backend filter du lieu phong that truoc, AI/mock AI chi giai thich va xep hang |
| Architecture | Routes -> Middlewares -> Controllers -> Services -> Models/Repositories |

## 3. Ownership tong quan

| Thanh vien | Ownership chinh | File/folder chinh | Ket qua mong doi |
| --- | --- | --- | --- |
| Le Nhat Thanh | Lead backend, foundation, integration, admin dashboard/logs, release/Postman collection | `backend/app.js`, `middlewares/`, `utils/`, `routes/admin/dashboardRoutes.js`, `docs/Postman` neu tao | Server boot duoc, route mount thong nhat, QA flow E2E, dashboard/log API |
| Le Nguyen Quoc Thai | Auth, RBAC, Profile, Host verification | `routes/auth`, `routes/profile`, `controllers/auth`, `services/auth`, `models/User.js` | Dang ky/dang nhap/JWT/profile/password/host verification test duoc |
| Tran Dinh Thi | Room content, room images, public search, host room CRUD, admin room approval | `routes/rooms`, `controllers/*/roomController.js`, `services/*/roomService.js`, `models/Room.js` | Room lifecycle tu host tao bai -> admin duyet -> public search/detail |
| Dang Le Duc Thinh | Deposit booking, payment, transactions, host deposit handling | `routes/bookings`, `routes/payments`, `controllers/payment`, `models/Booking.js`, `models/Transaction.js` | Dat coc 15 phut, lock room, thanh toan mock, webhook, transaction history |
| Do Phuoc Vinh | Reviews, favorites, chat, notifications, support, violation reports, AI recommendation MVP | `routes/reviews`, `routes/favorites`, `routes/conversations`, `routes/support`, `routes/violation-reports`, `routes/ai` | Interaction APIs va user support/moderation APIs test duoc |

## 4. WBS tong quat

| WBS | Hang muc | Owner chinh | Ket qua mong doi |
| --- | --- | --- | --- |
| 1.0 | Backend foundation | Thanh | Express app, route mount convention, response/error helper, health API, Postman env |
| 2.0 | Database baseline va seed | Thanh + moi owner module | Migration/seed du cho roles, users, rooms, bookings, support data |
| 3.0 | Auth/RBAC/Profile | Thai | Register/login/me/logout, password, profile, host verification |
| 4.0 | Room/content | Thi | Public rooms, room detail, host CRUD, image records, admin approve/reject |
| 5.0 | Booking/payment | Thinh | Deposit session, room lock, transaction, mock webhook, transaction list |
| 6.0 | Interaction | Vinh | Review, favorite, conversation/message, notification |
| 7.0 | Governance/support/AI | Vinh + Thanh | Support ticket, violation report, admin dashboard/logs, AI recommendation MVP |
| 8.0 | Integration/Postman QA | Thanh + ca nhom | Full Postman collection, E2E flow pass |

## 5. Lich 1 tuan implement

Capacity goi y: moi nguoi 3-4 gio/ngay trong 7 ngay. Ngay 7 chi fix bug, khong them feature moi neu khong can.

### Ngay 1 - Foundation, database, API skeleton

Goal: Server chay duoc tu API trong, co khung module de moi nguoi code song song.

| Thanh vien | Nhiem vu | Gio | Output |
| --- | --- | ---: | --- |
| Thanh | Tao/chot convention route prefix `/api`, response envelope, error handler, AppError, request logging toi thieu. | 3h | `/health`, `/health/db`, response/error format thong nhat |
| Thanh | Tao Postman environment: `baseUrl`, `tenantToken`, `hostToken`, `adminToken`, `roomId`, `depositId`, `transactionId`. | 1h | File/huong dan bien Postman |
| Thai | Scaffold Auth/Profile module tu API trong: routes, controllers, services, user repository. | 4h | Route stub auth/profile tra 501 hoac skeleton service |
| Thi | Scaffold Room module: public rooms, host rooms, admin room approval. | 4h | Route stub rooms va admin rooms |
| Thinh | Scaffold Booking/Payment module: deposit routes, payment routes, transaction repository. | 4h | Route stub booking/payment |
| Vinh | Scaffold interaction/support module: reviews, favorites, conversations, notifications, support, reports, AI. | 4h | Route stub interaction/support/AI |

Definition of Done ngay 1:

- `npm start` backend boot duoc.
- `/health` tra `200`.
- Tat ca route skeleton duoc mount trong `backend/app.js` theo prefix `/api`.
- Khong co frontend change.

### Ngay 2 - Auth/RBAC, seed, room baseline

Goal: Co token cho Postman va co data room de cac module sau test.

| Thanh vien | Nhiem vu | Gio | Output |
| --- | --- | ---: | --- |
| Thanh | Chot seed roles ADMIN/LANDLORD/TENANT va seed admin account. Review migration gap can thiet. | 3h | Seed login duoc admin |
| Thai | Implement register/login/me/logout, bcrypt, JWT, login audit, lock 10 phut sau 5 lan sai. | 5h | Auth happy path va bad credentials pass |
| Thai | Implement role guard `authenticate`, `optionalAuthenticate`, `authorize`. | 2h | Protected route dung role |
| Thi | Implement room model/repository, create room, list my rooms, public list/detail basic. | 5h | Host tao room PENDING, public chua thay neu chua approve |
| Thinh | Implement deposit/payment repository interfaces, chua full logic; doc contract voi Room/Auth. | 2h | Service skeleton san sang ghep room/user |
| Vinh | Implement notification model/repository basic de module khac tao notification noi bo. | 3h | Tao/list notification basic |

Postman target ngay 2:

- Register tenant/host.
- Login tenant/host/admin.
- Host create room.
- Host list own rooms.

### Ngay 3 - Room lifecycle, profile, booking start

Goal: Room lifecycle test duoc tu host -> admin -> public.

| Thanh vien | Nhiem vu | Gio | Output |
| --- | --- | ---: | --- |
| Thanh | Integration checkpoint, resolve route conflicts, verify seed/migration. | 2h | Dev branch chay duoc sau merge checkpoint |
| Thai | Implement profile get/update, change password, forgot/reset password OTP mock. | 5h | Profile/password APIs test duoc |
| Thai | Implement host verification submit/update. | 2h | Host co CCCD URL va du dieu kien tao room |
| Thi | Implement admin pending/approve/reject room, reject reason neu schema co hoac log. | 4h | Admin approve xong public list/detail thay room |
| Thi | Implement filters: keyword, location, roomType, minPrice, maxPrice, sort, pagination. | 3h | Search API dung query |
| Thinh | Implement create deposit: tenant only, room approved/available, lock 15 phut, one processing per tenant/room. | 5h | Deposit PROCESSING, room LOCKED |
| Vinh | Implement favorites add/remove/list. | 3h | Tenant favorite approved room |

Postman target ngay 3:

- Admin approve room.
- Public list rooms co approved room.
- Tenant create deposit, room bi locked.
- Tenant favorite/unfavorite room.

### Ngay 4 - Payment, reviews, chat MVP, admin users

Goal: Deposit co transaction mock va cac interaction chinh co API.

| Thanh vien | Nhiem vu | Gio | Output |
| --- | --- | ---: | --- |
| Thanh | Implement admin dashboard overview basic: count users, rooms, pending rooms, transactions, support, reports. | 4h | `/api/admin/dashboard/overview` |
| Thai | Harden auth validation, duplicate email/phone, generic login error, role mapping HOST/LANDLORD. | 3h | Auth loi co ban pass |
| Thi | Implement room update/delete/status transition va ownership guard. | 4h | Host chi sua/xoa phong cua minh |
| Thinh | Implement create transaction + mock `payment_url`. | 3h | Transaction PENDING |
| Thinh | Implement payment webhook mock: success -> transaction SUCCESS, deposit CONFIRMED, room RENTED; fail -> FAILED/CANCELLED, release room. | 5h | Payment E2E pass |
| Vinh | Implement reviews: list room reviews, create/update review, update average rating. | 4h | Review chi tao khi deposit confirmed |
| Vinh | Implement conversations/messages REST MVP, mark read. | 4h | Chat qua Postman duoc |

Postman target ngay 4:

- Tenant create transaction.
- Webhook success confirm deposit.
- Tenant create review.
- Tenant/host create conversation va send message.

### Ngay 5 - Support, violation, admin governance, transactions

Goal: Hoan thien admin/governance va cac queue ho tro.

| Thanh vien | Nhiem vu | Gio | Output |
| --- | --- | ---: | --- |
| Thanh | Implement system logs API va helper ghi log cho login, room create/approve, deposit, payment. | 4h | `/api/admin/system-logs` |
| Thai | Support admin user management: lock/unlock, assign role, reset password. | 4h | Admin user APIs |
| Thi | Add room approval audit/log, verify public visibility rules, room not found behavior. | 3h | Public chi thay APPROVED + AVAILABLE |
| Thinh | Implement transaction detail, tenant transaction history, host deposit requests, admin transaction list. | 5h | Transaction management APIs |
| Vinh | Implement support tickets user/admin: create, list, detail, update status. | 4h | Support lifecycle OPEN -> IN_PROGRESS -> RESOLVED/CLOSED |
| Vinh | Implement violation reports user/admin: create, list, update status, sanction log. | 4h | Report lifecycle PENDING -> PROCESSING -> RESOLVED/DISMISSED |

Postman target ngay 5:

- Admin list users, lock/unlock user.
- User create support ticket, admin update status.
- Tenant create violation report, admin resolve.
- Admin list transactions.

### Ngay 6 - AI recommendation, notifications, integration test

Goal: Co MVP day du theo docs, AI khong hallucinate, notifications co du lieu.

| Thanh vien | Nhiem vu | Gio | Output |
| --- | --- | ---: | --- |
| Thanh | Gom Postman collection theo folder module, viet E2E order collection. | 4h | Collection chay theo thu tu |
| Thai | Fix auth/profile bugs tu integration, verify status/role forbidden cases. | 3h | 401/403 dung |
| Thi | Optimize room query/pagination, add indexes neu can, verify NFR search/detail < 2s voi seed nho. | 3h | Search on dinh |
| Thinh | Implement expire deposit job endpoint/manual admin-safe command cho Postman test timeout. | 4h | Expire PROCESSING -> EXPIRED, room AVAILABLE |
| Vinh | Implement notification hooks cho payment/chat/support/report. | 3h | User list/read notifications |
| Vinh | Implement AI recommendation MVP: parse filters don gian, query approved available rooms, return mock/LLM-ready explanation. | 4h | `/api/ai/room-recommendations` khong tao phong ao |

Postman target ngay 6:

- AI recommendation tra room co that trong DB.
- Notifications unread/read/read-all.
- Expire deposit release room.
- Full collection pass lan 1.

### Ngay 7 - Stabilization, bug bash, demo handoff

Goal: Dong bang scope backend, sua loi, dam bao test Postman on dinh.

| Thanh vien | Nhiem vu | Gio | Output |
| --- | --- | ---: | --- |
| Thanh | Dieu phoi bug bash P0/P1, merge final, viet README run backend/Postman. | 5h | Backend demo-ready |
| Thanh | Chay full E2E Postman flow va ghi ket qua pass/fail. | 3h | Test report ngan |
| Thai | Fix P0/P1 auth/profile/RBAC, review security checklist. | 4h | Auth stable |
| Thi | Fix P0/P1 rooms/approval/search, verify ownership. | 4h | Room APIs stable |
| Thinh | Fix P0/P1 booking/payment/transaction, verify no double payment/double confirm. | 4h | Payment flow stable |
| Vinh | Fix P0/P1 interaction/support/report/AI, verify notification hooks. | 4h | Interaction APIs stable |

Definition of Done ngay 7:

- Full Postman E2E flow pass.
- Khong con P0/P1.
- README hoac file huong dan co lenh migrate/seed/start.
- Moi endpoint co it nhat 1 happy path va 1 error case trong Postman.
- Khong merge frontend change.

## 6. Chi tiet module va API dau vao/dau ra mong muon

### 6.1 Auth/Profile - Owner: Thai

| API | Input mong muon | Output du kien |
| --- | --- | --- |
| `POST /api/auth/register` | `fullName`, `email`, `phoneNumber`, `username`, `password`, `confirmPassword`, `role`, host them `idCardFrontUrl`, `idCardBackUrl` | `201`, `data.user`, `data.token` |
| `POST /api/auth/login` | `identifier`, `password` | `200`, JWT va user public |
| `GET /api/auth/me` | Bearer token | `200`, current user |
| `POST /api/auth/logout` | Bearer token | `200`, logout success |
| `POST /api/auth/password/forgot` | `identifier` | `200`, `otp_id`, `expires_at` mock |
| `POST /api/auth/password/reset` | `otp_id`, `otp`, `newPassword`, `confirmPassword` | `200`, password reset |
| `PATCH /api/auth/password` | `currentPassword`, `newPassword`, `confirmPassword` | `200`, password changed |
| `GET /api/profile/me` | Bearer token | `200`, profile |
| `PATCH /api/profile/me` | `full_name`, `phone_number`, `gender`, `date_of_birth`, `address`, `avatar_url` | `200`, updated user |
| `POST /api/profile/host-verification` | `idCardFrontUrl`, `idCardBackUrl` | `200`, host verification submitted |

Loi can test:

- Register trung email/phone -> `409`.
- Password yeu -> `400`.
- Login sai qua 5 lan -> `423`.
- Tenant goi API host/admin -> `403`.

### 6.2 Rooms/Approval - Owner: Thi

| API | Input mong muon | Output du kien |
| --- | --- | --- |
| `GET /api/rooms` | Query `page`, `limit`, `keyword`, `location`, `roomType`, `minPrice`, `maxPrice`, `sort` | `200`, `items`, `pagination` |
| `GET /api/rooms/:id` | Room id public | `200`, room detail, images, host |
| `POST /api/rooms` | Host token, room fields, images | `201`, room `approval_status=PENDING` |
| `GET /api/rooms/my` | Host token | `200`, host rooms |
| `PATCH /api/rooms/:id` | Host token, partial room fields | `200`, updated room, approval reset PENDING |
| `DELETE /api/rooms/:id` | Host token | `200`, deleted |
| `PATCH /api/rooms/:id/status` | Host token, `status` | `200`, updated status |
| `GET /api/admin/rooms/pending` | Admin token | `200`, pending rooms |
| `PATCH /api/admin/rooms/:id/approve` | Admin token | `200`, approved room |
| `PATCH /api/admin/rooms/:id/reject` | Admin token, `reason` | `200`, rejected room |

Loi can test:

- Host tao room thieu title/price/images -> `400`.
- Tenant tao room -> `403`.
- Host sua room cua nguoi khac -> `403`.
- Public get room PENDING/REJECTED/LOCKED -> `404`.

### 6.3 Booking/Payment/Transactions - Owner: Thinh

| API | Input mong muon | Output du kien |
| --- | --- | --- |
| `POST /api/bookings/deposits` | Tenant token, `room_id`, `appointment_time` | `201`, deposit `PROCESSING`, `expired_at=created_at+15m` |
| `GET /api/bookings/deposits/my` | Tenant token, query `status` | `200`, deposits cua tenant |
| `GET /api/bookings/deposits/:id` | Tenant/host/admin token | `200`, deposit detail |
| `PATCH /api/bookings/deposits/:id/cancel` | Tenant token, `reason` | `200`, deposit `CANCELLED`, room release |
| `GET /api/host/bookings/deposits` | Host token | `200`, deposit requests cua host |
| `PATCH /api/host/bookings/deposits/:id/status` | Host token, `status`, `reason` | `200`, processed deposit |
| `POST /api/payments/transactions` | Tenant token, `deposit_id`, `payment_method`, `return_url` | `201`, transaction `PENDING`, `payment_url` |
| `POST /api/payments/webhook` | Gateway payload mock | `200`, transaction SUCCESS/FAILED, deposit updated |
| `GET /api/payments/transactions/:id` | Related user/admin token | `200`, transaction detail |
| `GET /api/admin/transactions` | Admin token, filters | `200`, read-only transaction list |

Loi can test:

- Tao deposit cho room chua approved -> `400/404`.
- Tao 2 deposit PROCESSING cung tenant -> `409`.
- Webhook duplicate -> van `200`, khong double confirm.
- Amount mismatch -> `400`.

### 6.4 Interaction/Support/AI - Owner: Vinh

| API | Input mong muon | Output du kien |
| --- | --- | --- |
| `GET /api/rooms/:roomId/reviews` | Public query `page`, `limit` | `200`, reviews |
| `POST /api/reviews` | Tenant token, `deposit_id`, `rating`, `comment` | `201`, review |
| `PATCH /api/reviews/:id` | Tenant token, `rating`, `comment` | `200`, updated review |
| `GET /api/favorites` | Tenant token | `200`, favorite rooms |
| `POST /api/favorites` | Tenant token, `room_id` | `201`, favorite |
| `DELETE /api/favorites/:roomId` | Tenant token | `200`, removed |
| `POST /api/conversations` | Tenant token, `landlord_id`, optional `room_id` | `200/201`, conversation |
| `GET /api/conversations` | Tenant/host token | `200`, conversations |
| `GET /api/conversations/:id/messages` | Tenant/host token | `200`, messages |
| `POST /api/conversations/:id/messages` | Tenant/host token, `content` | `201`, message `SENT` |
| `PATCH /api/conversations/:id/read` | Tenant/host token | `200`, updated count |
| `GET /api/notifications` | Any logged-in user | `200`, notifications |
| `PATCH /api/notifications/:id/read` | Owner token | `200`, notification READ |
| `POST /api/support/tickets` | Logged-in user, category/title/detail/evidence | `201`, ticket OPEN |
| `GET /api/support/tickets` | Logged-in user | `200`, own tickets |
| `GET /api/admin/support/tickets` | Admin token | `200`, all tickets |
| `PATCH /api/admin/support/tickets/:id/status` | Admin token, `status`, `resolution_note` | `200`, updated ticket |
| `POST /api/violation-reports` | Tenant token, room/host target, reason, evidence | `201`, report PENDING |
| `GET /api/admin/violation-reports` | Admin token | `200`, reports |
| `PATCH /api/admin/violation-reports/:id/status` | Admin token, status/resolution | `200`, updated report |
| `POST /api/ai/room-recommendations` | `message`, optional `filters` | `200`, reply + rooms from DB only |

Loi can test:

- Review khi deposit chua CONFIRMED -> `403/409`.
- Review duplicate deposit -> `409`.
- Message rong -> `400`.
- AI khong co room phu hop -> `200`, rooms `[]`, reply giai thich khong co ket qua.

### 6.5 Admin Dashboard/Logs - Owner: Thanh

| API | Input mong muon | Output du kien |
| --- | --- | --- |
| `GET /api/admin/dashboard/overview` | Admin token | `200`, KPI totals |
| `GET /api/admin/system-logs` | Admin token, filters | `200`, logs + pagination |
| `GET /api/admin/users` | Admin token, `role`, `status`, `keyword` | `200`, users |
| `GET /api/admin/users/:id` | Admin token | `200`, user detail |
| `PATCH /api/admin/users/:id/lock` | Admin token, `reason` | `200`, status BANNED |
| `PATCH /api/admin/users/:id/unlock` | Admin token | `200`, status ACTIVE |
| `PATCH /api/admin/users/:id/role` | Admin token, `role` | `200`, updated role |
| `POST /api/admin/users/:id/password-reset` | Admin token, `temporaryPassword` | `200`, password reset |

Loi can test:

- Non-admin goi admin API -> `403`.
- Lock user khong ton tai -> `404`.
- Assign role khong hop le -> `400`.

## 7. Postman flow bat buoc cuoi tuan

Chay theo dung thu tu de xac minh backend hoat dong khong can frontend:

1. `POST /api/auth/register` tenant.
2. `POST /api/auth/register` host.
3. `POST /api/auth/login` tenant, host, admin; luu token vao env.
4. Host `POST /api/rooms`.
5. Admin `PATCH /api/admin/rooms/:id/approve`.
6. Public `GET /api/rooms` va `GET /api/rooms/:id`.
7. Tenant `POST /api/bookings/deposits`.
8. Tenant `POST /api/payments/transactions`.
9. Mock gateway `POST /api/payments/webhook` success.
10. Tenant `POST /api/reviews`.
11. Tenant `POST /api/favorites`.
12. Tenant `POST /api/conversations`, sau do `POST /api/conversations/:id/messages`.
13. User `POST /api/support/tickets`.
14. Tenant `POST /api/violation-reports`.
15. Admin `GET /api/admin/dashboard/overview`.
16. Admin `GET /api/admin/transactions`, support, violation, system logs.

## 8. Definition of Done cho tuan

- Backend start duoc bang `npm start`.
- Migration va seed chay duoc bang `npm run migrate`, `npm run seed`.
- Tat ca module co route/controller/service/model hoac repository.
- Tat ca API trong scope tra dung response envelope.
- JWT auth va role guard ap dung dung.
- Public chi thay room `APPROVED` va `AVAILABLE`.
- Deposit lock 15 phut va release dung khi cancel/expire/payment fail.
- Payment webhook mock idempotent, khong confirm trung.
- Review chi tao duoc voi deposit confirmed va khong duplicate.
- Admin transaction data read-only.
- AI recommendation chi tra ve room co that trong DB.
- Postman full flow pass.
- Khong co thay doi frontend.

## 9. Ranh gioi de tranh conflict

- Thai so huu `User`, Auth/Profile. Cac module khac chi goi service/repository public, khong sua truc tiep auth validation.
- Thi so huu `Room`. Booking/review/favorite chi doc room qua API/service da expose, khong sua room approval logic.
- Thinh so huu `Deposit`, `Transaction`. Review chi validate deposit confirmed, khong sua payment logic.
- Vinh so huu interaction/support/report/AI. Admin dashboard chi query read-only tu cac bang nay.
- Thanh la integration owner cua `backend/app.js`, response helper, error handler, route mount tong hop va Postman E2E.
- Migration moi phai thong bao trong daily sync vi thu tu migration rat de conflict.

## 10. Ghi chu conflict tu tai lieu

- Password policy co conflict 6 ky tu vs 8 ky tu co complexity. Ke hoach nay chon 8 ky tu theo FR/NFR bao mat.
- OTP validity co conflict 5 phut vs 10 phut. Ke hoach nay chon 5 phut theo FR-1.1, neu giao vien/PO chot khac thi doi sau.
- Payment methods co conflict giua UI va class spec. Ke hoach nay dung `VNPAY`, `MOMO`, `BANK_TRANSFER` theo migration hien co va mock sandbox.
- Socket.io realtime co trong docs, nhung trong 1 tuan backend-first co the lam REST chat MVP truoc; neu con thoi gian moi them socket event.
- AI recommendation trong 1 tuan nen co fallback/mock response neu chua co OpenAI key, nhung bat buoc query room that tu DB.
