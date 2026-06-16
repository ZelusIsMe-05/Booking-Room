# Database Setup Guide

Làm lần lượt từ trên xuống.

## 1. Cài dependencies

```
cd backend
npm install knex pg dotenv
```

## 2. Tạo file `.env`

Tạo `backend/.env`.

## 4. Chạy migration (tạo 19 bảng)

```
npx knex migrate:latest
```

## 5. Nạp dữ liệu mẫu (seed)

```
npx knex seed:run
```

## Lệnh kiểm tra (tuỳ chọn)

```
npx knex migrate:status      # xem migration nào đã chạy
npx knex migrate:rollback    # lùi lại 1 batch
```
