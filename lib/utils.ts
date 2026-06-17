import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import { vi } from "date-fns/locale";

// Ghép className có điều kiện (thay cho clsx, đủ dùng cho dự án nhỏ).
export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

// Lấy chữ cái đầu để hiển thị avatar khi không có ảnh.
export function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (
    parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
  ).toUpperCase();
}

// Tạo màu nền ổn định cho avatar dựa trên id/tên.
const AVATAR_COLORS = [
  "#0068FF", "#F6511D", "#7B61FF", "#00B894",
  "#E84393", "#FDA7DF", "#26A69A", "#EE5253",
];
export function colorFromString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// Định dạng thời gian cho danh sách hội thoại (ngắn gọn).
export function formatConversationTime(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date)) return "Hôm qua";
  return format(date, "dd/MM/yyyy");
}

// Định dạng thời gian chi tiết cho từng tin nhắn.
export function formatMessageTime(iso: string): string {
  return format(new Date(iso), "HH:mm");
}

// Trạng thái hoạt động dựa trên last_seen.
export function formatLastSeen(iso: string | null): string {
  if (!iso) return "Không hoạt động";
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60_000) return "Đang hoạt động";
  return `Hoạt động ${formatDistanceToNow(date, { locale: vi, addSuffix: false })} trước`;
}

export function isOnline(iso: string | null): boolean {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() < 60_000;
}
