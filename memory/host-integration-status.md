---
name: host-integration-status
description: What of the Host (landlord) UX is wired to the backend vs still on mock data
metadata:
  type: project
---

Host UX (branch `develop`) frontend↔backend integration, done 2026-06-19 (Phase 0–3 of the agreed scope).

**Wired to real API:**
- `frontend/services/hostRoomService.ts` — listMyRooms / getMyRoomById (resolved from the list; no GET-by-id route because a bare `GET /:id` on the host router would collide with the public `GET /api/rooms/:id`, since that router is also mounted at `/api/rooms`) / createRoom / updateRoom / deleteRoom, plus `mapToHostListing` & `mapToDashboardRoom`.
- `frontend/services/hostBookingService.ts` — listDeposits + updateDepositDecision (ACCEPTED/REJECTED), `mapToPendingRequest`.
- Pages: `HostListingsPage`, `HostCreateRoomPage` (added a Giá&Chi phí section + real upload), `HostEditRoomPage`, `HostDashboardPage` (stats + room list + pending approvals).
- One additive backend tweak: `roomRepository.findByLandlord` returns effective `approval_status` + cost/description fields (host-only function).
- `HostListingDetailPage` (`/host/listings/[id]`) wired to real data via `getMyRoomById`; listing cards (image + title) now link to it.
- Messages (`HostMessagesPage`) wired to shared `/api/conversations` via new `frontend/services/conversationService.ts` (listConversations / getMessages / sendMessage / markAsRead). Also trimmed UX per request: removed phone/video/help icons, quick-action row, attach-file/image/emoji buttons.
- Login redirect: `AuthContext.login` returns the User; `app/auth/login/page.tsx` routes LANDLORD → `/host`, others → `/` (both password + OAuth).

**Still on MOCK (deferred — need NEW host-specific backend):**
- Transactions (`HostTransactionsPage`, transaction detail) — backend has no host transaction LIST endpoint, only tenant `/my` and admin all.
- Revenue (`HostRevenuePage` + dashboard RevenueChart) — no aggregation endpoint exists.

**Gotchas:**
- `room_approvals.approval_id` is a UUID (no orderable/timestamp column) — never use `MAX(approval_id)` (PG has no `max(uuid)`, throws). `findByLandlord` derives effective status with `bool_or` priority PENDING>APPROVED>REJECTED.
- Host deposit approval only works when deposit.status === 'CONFIRMED' (tenant already paid). Backend createRoom requires ≥3 images + monthly_rent + deposit_amount. room_type is stored as the Vietnamese label string.
- Conversation message `sender_id` === `users.user_id`; frontend compares to `user.userId` to tell own vs peer. Backend `/api/conversations` returns peer_name/peer_avatar/last_message/unread_count; messages come newest-first (reverse for display).
