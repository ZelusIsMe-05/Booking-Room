# Hướng dẫn làm Frontend theo Figma — Dự án Booking-Room (Host Portal)

> Tài liệu này tóm tắt kinh nghiệm làm việc thực tế từ session implement 4 trang Host Portal theo thiết kế Figma. Dành cho AI agent tiếp theo tiếp nhận task.

---

## 1. Stack & Quy ước dự án

| Mục | Chi tiết |
|---|---|
| Framework | Next.js 16 (App Router) |
| Ngôn ngữ | TypeScript |
| Styling | Tailwind CSS v3 |
| Font | Be Vietnam Pro (Google Fonts, đã import trong `globals.css`) |
| Màu custom | Định nghĩa trong `tailwind.config.js` dưới namespace `booking-*` |
| Dev server | `npm run dev` tại `frontend/` → `http://localhost:3000` |

### Màu hệ thống quan trọng

```
#FAF8FF  — booking-surface (nền trang)
#191B23  — booking-text (chữ chính)
#434655  — booking-muted (chữ phụ)
#C3C6D7  — booking-border (viền)
#004AC6  — booking-primary (xanh dương chính)
#006A61  — booking-teal (xanh teal)
#F3F3FE  — nền sidebar, input, filter bar
#86F2E4  — highlight active nav item
```

---

## 2. Cấu trúc thư mục Frontend

```
frontend/
├── app/
│   └── host/
│       ├── page.tsx              → /host (Dashboard Tổng quan)
│       ├── listings/page.tsx     → /host/listings (Tin đăng)
│       ├── transactions/page.tsx → /host/transactions (Giao dịch)
│       └── messages/page.tsx     → /host/messages (Tin nhắn)
├── components/
│   └── host/
│       ├── HostSidebar.tsx           (dùng chung)
│       ├── HostDashboardPage.tsx
│       ├── HostListingsPage.tsx
│       ├── HostTransactionsPage.tsx
│       └── HostMessagesPage.tsx
└── data/
    ├── hostDashboard.ts
    ├── hostListings.ts
    ├── hostTransactions.ts
    └── hostMessages.ts
```

---

## 3. Sidebar — `HostSidebar.tsx`

Sidebar dùng chung cho tất cả trang host. Nhận prop `activePage` để highlight đúng mục.

```tsx
// Các giá trị hợp lệ của activePage:
type HostActivePage = 'overview' | 'listings' | 'transactions' | 'revenue' | 'messages';

<HostSidebar user={user} onLogout={handleLogout} activePage="transactions" />
```

**Quy tắc active item:**
- Active: `bg-[#86F2E4]`, text `#006F66`, font-size `text-base`
- Inactive: no bg, text `#434655`, font `text-xs tracking-[0.6px]`

---

## 4. Quy trình implement 1 trang mới

### Bước 1 — Tạo data file
`frontend/data/host<Feature>.ts`

- Định nghĩa đầy đủ TypeScript interfaces (mirror API response)
- Đặt mock data tĩnh
- Export helper `formatVND(amount)` nếu cần format tiền

### Bước 2 — Tạo component
`frontend/components/host/Host<Feature>Page.tsx`

```tsx
'use client';
// Import HostSidebar, useAuth, useRouter
// Sub-components nhỏ định nghĩa trong cùng file (không cần tách nếu đơn giản)
// activePage="<key>" truyền vào HostSidebar
```

**Layout chuẩn:**
```tsx
<main className="flex min-h-screen bg-[#FAF8FF]">
  <HostSidebar ... />
  <div className="flex flex-1 flex-col lg:ml-[272px]">
    {/* content */}
  </div>
</main>
```

> `lg:ml-[272px]` = sidebar width 260px + left offset 16px = 276px (dùng 272px thực tế)

### Bước 3 — Tạo route
`frontend/app/host/<feature>/page.tsx`

```tsx
import Host<Feature>Page from '@/components/host/Host<Feature>Page';
export default function <Feature>Route() {
  return <Host<Feature>Page />;
}
```

### Bước 4 — Verify
Mở `http://localhost:3000/host/<feature>` và chụp ảnh màn hình bằng browser subagent.

---

## 5. Pattern chung cho từng UI element

### Stat Card
```tsx
// bg trắng, border #C3C6D7, border-radius 12px, shadow sm
// Icon circle + label uppercase tracking + value text-2xl
```

### Status Badge
```tsx
// rounded-full, px-2 py-1, text-xs font-semibold
// completed → bg rgba(134,242,228,0.2) text #006A61
// cancelled → bg rgba(186,26,26,0.1) text #BA1A1A uppercase
// pending   → bg rgba(148,55,0,0.1) text #943700 uppercase
// processing→ bg rgba(0,74,198,0.1) text #004AC6
```

### Table
```tsx
// thead: bg-[#F3F3FE], border-b, th text-xs font-bold tracking-[0.6px] uppercase text-[#434655]
// tbody row: border-b border-[#C3C6D7], hover:bg-[#F3F3FE]/50
```

### Chat Bubble
```tsx
// Tenant (trái): bg #E7E7F3, border-radius 20px 20px 20px 4px
// Host (phải):   bg #004AC6, border-radius 20px 20px 4px 20px, text white
```

### Filter Bar
```tsx
// rounded-xl border bg-white px-4 py-[18px] shadow-sm
// Các select dùng appearance-none + SVG chevron overlay
```

---

## 6. Lưu ý quan trọng

1. **Data chỉ là minh họa** — Figma chứa số liệu placeholder. Không cần dùng đúng số, chỉ cần đúng cấu trúc giao diện.

2. **Không dùng ảnh thật từ Figma** — Dùng ảnh có sẵn trong `/public/images/booking/` hoặc avatar initial-letter tự render bằng CSS.

3. **Avatar initial-letter** — Khi không có ảnh thật, dùng `<span>` với màu nền + chữ cái đầu tên. Mỗi người nên có màu riêng biệt.

4. **TODO comments cho API** — Mọi nơi cần gọi API thật sau này, để comment:
   ```ts
   // TODO: call API POST /bookings/:id/approve
   ```

5. **Màu hardcode là OK** — Tailwind custom colors (`booking-*`) đã có nhưng đôi khi phải dùng hex trực tiếp khi màu rất cụ thể từ Figma. Không cần thêm vào config.

6. **Kiểm tra active state sidebar** — Mỗi page mới phải truyền đúng `activePage` vào `HostSidebar`.

7. **`lg:ml-[272px]`** — Luôn dùng margin này cho main content để tránh bị che bởi sidebar fixed.

---

## 7. Các trang đã hoàn thành

| Route | Trang | activePage |
|---|---|---|
| `/host` | Tổng quan kinh doanh | `overview` |
| `/host/listings` | Quản lý tin đăng | `listings` |
| `/host/transactions` | Lịch sử giao dịch | `transactions` |
| `/host/messages` | Tin nhắn | `messages` |

## 8. Trang chưa làm (TODO)

| Route | Trang | activePage |
|---|---|---|
| `/host/revenue` | Doanh thu chi tiết | `revenue` |
| `/host/listings/new` | Thêm phòng mới | `listings` |
| `/host/settings` | Cài đặt | — |
