import type { SupabaseClient } from "@supabase/supabase-js";

// Khóa VAPID công khai (an toàn để công khai). Có thể ghi đè bằng env.
export const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "BPuPTX6bwGd6v_wyTnBFU_oZJUWXKN-UVIvCdYCY-5bvFRGA2SzqPfxMzdooCZ8KlQHPm6KbKmEsNFlFoOHDIu4";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

// Đăng ký nhận Web Push cho người dùng hiện tại và lưu subscription vào DB.
// Gọi sau khi đã được cấp quyền thông báo.
export async function subscribeToPush(
  supabase: SupabaseClient,
  userId: string
) {
  try {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission !== "granted") return;
    if (!VAPID_PUBLIC_KEY) return;

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });
    }

    const json = sub.toJSON();
    if (!json.endpoint || !json.keys) return;

    await supabase.from("push_subscriptions").upsert(
      {
        endpoint: json.endpoint,
        user_id: userId,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      },
      { onConflict: "endpoint" }
    );
  } catch {
    // Bỏ qua nếu trình duyệt không hỗ trợ hoặc người dùng từ chối.
  }
}
