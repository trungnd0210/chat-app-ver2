// Cấu hình kết nối Supabase.
//
// URL và "publishable/anon key" của Supabase được THIẾT KẾ để công khai ở phía
// client — dữ liệu được bảo vệ bằng Row Level Security (RLS), nên để key tại đây
// là an toàn. (Tuyệt đối KHÔNG đặt "secret key"/"service_role" vào đây.)
//
// Có thể ghi đè bằng biến môi trường NEXT_PUBLIC_SUPABASE_URL /
// NEXT_PUBLIC_SUPABASE_ANON_KEY (ví dụ trên Vercel) — giá trị env được ưu tiên.

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://vngbsubvnofkyenjvkoq.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_n5jbs2e7qq84xNo4jopefw_LPCSBGMy";

// Nếu gặp lỗi "Invalid API key", thử thay publishable key ở trên bằng legacy
// anon key (JWT) lấy trong Supabase > Settings > API Keys > Legacy:
// eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuZ2JzdWJ2bm9ma3llbmp2a29xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MjMwNDMsImV4cCI6MjA5NzI5OTA0M30.vRc68sSaUM8rwMzDgoMNjk2yKg6G3ZESPMORtkXRJSI
