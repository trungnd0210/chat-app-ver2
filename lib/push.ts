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
// Trả về kết quả để hiển thị lỗi cho người dùng (đặc biệt hữu ích trên iOS).
export type PushResult = { ok: boolean; reason?: string };

export async function subscribeToPush(
  supabase: SupabaseClient,
  userId: string
): Promise<PushResult> {
  try {
    if (typeof window === "undefined") return { ok: false, reason: "no-window" };
    if (!("serviceWorker" in navigator))
      return { ok: false, reason: "Trình duyệt không hỗ trợ Service Worker." };
    if (!("PushManager" in window))
      return {
        ok: false,
        reason:
          "Trình duyệt chưa hỗ trợ Push. Trên iPhone: cần iOS 16.4+, hãy thêm app vào Màn hình chính rồi mở từ icon đó.",
      };
    if (Notification.permission !== "granted")
      return { ok: false, reason: "Chưa được cấp quyền thông báo." };

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });
    }

    const json = sub.toJSON();
    if (!json.endpoint || !json.keys)
      return { ok: false, reason: "Không lấy được thông tin subscription." };

    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        endpoint: json.endpoint,
        user_id: userId,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      },
      { onConflict: "endpoint" }
    );
    if (error)
      return { ok: false, reason: "Lỗi lưu subscription: " + error.message };

    return { ok: true };
  } catch (e) {
    return { ok: false, reason: (e as Error)?.message || "Lỗi không xác định." };
  }
}
