# 💬 Zalo Clone Chat

Ứng dụng web chat **1-1** clone giao diện Zalo, **đăng nhập bằng Google**, tin nhắn **realtime** mượt mà, lưu trữ trong database, và có **thông báo**. Thiết kế để **deploy 1 chạm lên Vercel**.

## ✨ Tính năng

- 🔐 Đăng nhập bằng tài khoản Google (Supabase Auth)
- 💬 Nhắn tin 1-1 thời gian thực (Supabase Realtime)
- 🗄️ Lưu lịch sử chat trong Postgres (Supabase)
- 🔔 Thông báo trình duyệt + âm thanh + badge tin chưa đọc
- 🟢 Trạng thái "đang hoạt động" / "hoạt động X phút trước"
- 📱 Giao diện kiểu Zalo, responsive cho cả điện thoại và máy tính
- 🔒 Bảo mật dữ liệu bằng Row Level Security (mỗi người chỉ đọc được tin của mình)

## 🧱 Công nghệ

| Thành phần | Công nghệ |
|---|---|
| Frontend & Backend | Next.js 14 (App Router), React, TypeScript |
| Giao diện | Tailwind CSS, lucide-react |
| Database / Realtime / Auth | Supabase (Postgres) |
| Deploy | Vercel |

---

## 🚀 Hướng dẫn cài đặt (làm 1 lần, ~10 phút)

### Bước 1 — Tạo project Supabase (miễn phí)

1. Vào [supabase.com](https://supabase.com) → **New project**.
2. Đặt tên, chọn region gần Việt Nam (vd: *Southeast Asia / Singapore*), đặt mật khẩu database.
3. Đợi project khởi tạo xong (~2 phút).

### Bước 2 — Tạo bảng và bảo mật

1. Trong Supabase, mở **SQL Editor** → **New query**.
2. Mở file [`supabase/schema.sql`](./supabase/schema.sql) trong repo này, **copy toàn bộ** và dán vào.
3. Nhấn **Run**. Lệnh sẽ tạo bảng, hàm, trigger, RLS và bật realtime.

### Bước 3 — Bật đăng nhập Google

**3a. Tạo OAuth Client trên Google:**

1. Vào [Google Cloud Console](https://console.cloud.google.com) → tạo project (hoặc dùng project có sẵn).
2. **APIs & Services → OAuth consent screen**: chọn *External*, điền tên app, email; thêm email của bạn vào *Test users* (nếu app ở chế độ Testing).
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**
   - **Authorized redirect URIs**: dán URL callback của Supabase, có dạng:
     ```
     https://<PROJECT_REF>.supabase.co/auth/v1/callback
     ```
     (Lấy chính xác trong Supabase → **Authentication → Providers → Google**.)
4. Lưu lại **Client ID** và **Client Secret**.

**3b. Khai báo vào Supabase:**

1. Supabase → **Authentication → Providers → Google** → bật **Enable**.
2. Dán **Client ID** và **Client Secret** vừa tạo → **Save**.
3. Supabase → **Authentication → URL Configuration**:
   - **Site URL**: `http://localhost:3000` (khi dev) hoặc domain Vercel (khi production).
   - **Redirect URLs**: thêm cả hai:
     ```
     http://localhost:3000/**
     https://<TÊN-APP-CỦA-BẠN>.vercel.app/**
     ```

### Bước 4 — Lấy khóa API của Supabase

Vào Supabase → **Project Settings → API**, copy:

- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 💻 Chạy ở máy local

```bash
# 1. Cài thư viện
npm install

# 2. Tạo file môi trường từ mẫu
cp .env.example .env.local
#    rồi điền NEXT_PUBLIC_SUPABASE_URL và NEXT_PUBLIC_SUPABASE_ANON_KEY

# 3. Chạy
npm run dev
```

Mở http://localhost:3000 và đăng nhập bằng Google.

> 💡 **Mẹo test chat 1-1:** mở thêm 1 cửa sổ ẩn danh, đăng nhập bằng một tài khoản Google khác, rồi nhắn qua lại để thấy realtime + thông báo hoạt động.

---

## ☁️ Deploy lên Vercel

1. Push code này lên GitHub (đã sẵn sàng).
2. Vào [vercel.com](https://vercel.com) → **Add New → Project** → chọn repo này.
3. Ở mục **Environment Variables**, thêm:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Nhấn **Deploy**.
5. Sau khi có domain `https://<app>.vercel.app`, quay lại **Supabase → Authentication → URL Configuration** cập nhật **Site URL** và **Redirect URLs** cho domain đó (xem Bước 3b).

Xong! 🎉

---

## 📁 Cấu trúc thư mục

```
app/
  ├─ login/                # Trang đăng nhập Google
  ├─ auth/callback/        # Xử lý callback OAuth
  ├─ chat/                 # Trang chat (server) + ChatApp (client, realtime)
  ├─ actions.ts            # Server action: đăng xuất
  └─ layout.tsx, page.tsx
components/                # Avatar, Sidebar, ChatWindow, MessageInput, NewChatModal
lib/
  ├─ supabase/             # Client cho browser / server / middleware
  ├─ hooks/                # useNotifications (thông báo + âm thanh)
  ├─ types.ts, utils.ts
supabase/schema.sql        # Toàn bộ schema database + RLS + realtime
middleware.ts              # Bảo vệ route theo trạng thái đăng nhập
```

## 🔧 Tùy biến nhanh

- **Màu sắc Zalo**: sửa trong `tailwind.config.ts` (mục `colors.zalo`).
- **Số tin nhắn tải mỗi lần**: sửa `.limit(500)` trong `app/chat/ChatApp.tsx`.
- **Emoji gợi ý**: sửa mảng `EMOJIS` trong `components/MessageInput.tsx`.

## ❓ Khắc phục sự cố

- **Đăng nhập xong bị lỗi / quay lại trang lỗi**: kiểm tra lại **Redirect URLs** trong Supabase và **Authorized redirect URI** trong Google Cloud có khớp không.
- **Không thấy người để chat**: người kia phải đăng nhập vào app ít nhất 1 lần để có hồ sơ.
- **Tin nhắn không realtime**: đảm bảo đã chạy 2 dòng `alter publication supabase_realtime ...` cuối file `schema.sql`.
- **Không có thông báo**: nhấn biểu tượng 🔔 trong app để cấp quyền; trình duyệt phải cho phép Notifications.
