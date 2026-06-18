import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Endpoint nhận Supabase Database Webhook khi có tin nhắn mới, rồi gửi Web Push
// tới người nhận. Cần các biến môi trường (đặt trên Vercel):
//   - VAPID_PRIVATE_KEY            (bắt buộc)
//   - SUPABASE_SERVICE_ROLE_KEY    (bắt buộc — secret key của Supabase)
//   - PUSH_WEBHOOK_SECRET          (tùy chọn — để xác thực webhook)

const VAPID_PUBLIC =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "BPuPTX6bwGd6v_wyTnBFU_oZJUWXKN-UVIvCdYCY-5bvFRGA2SzqPfxMzdooCZ8KlQHPm6KbKmEsNFlFoOHDIu4";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || "";
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://vngbsubvnofkyenjvkoq.supabase.co";
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const WEBHOOK_SECRET = process.env.PUSH_WEBHOOK_SECRET || "";

type MessageRecord = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
};

export async function POST(req: Request) {
  // Xác thực webhook nếu có cấu hình secret.
  if (WEBHOOK_SECRET) {
    const auth =
      req.headers.get("authorization") ||
      req.headers.get("x-webhook-secret") ||
      "";
    if (auth !== `Bearer ${WEBHOOK_SECRET}` && auth !== WEBHOOK_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  if (!VAPID_PRIVATE || !SERVICE_ROLE) {
    return new Response("Server chưa cấu hình VAPID_PRIVATE_KEY / SUPABASE_SERVICE_ROLE_KEY", {
      status: 500,
    });
  }

  webpush.setVapidDetails(
    "mailto:notifications@example.com",
    VAPID_PUBLIC,
    VAPID_PRIVATE
  );

  const body = await req.json().catch(() => null);
  const record: MessageRecord | undefined = body?.record;
  if (!record?.conversation_id || !record?.sender_id) {
    return new Response("Bỏ qua: không có dữ liệu tin nhắn", { status: 200 });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Người nhận = các thành viên còn lại trong hội thoại (trừ người gửi).
  const { data: parts } = await admin
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", record.conversation_id)
    .neq("user_id", record.sender_id);

  const recipientIds = (parts || []).map((p) => p.user_id);
  if (recipientIds.length === 0) {
    return new Response("Không có người nhận", { status: 200 });
  }

  // Thông tin người gửi để hiển thị thông báo.
  const { data: sender } = await admin
    .from("profiles")
    .select("full_name, email, avatar_url")
    .eq("id", record.sender_id)
    .single();

  const title = sender?.full_name || sender?.email || "New message";

  // Lấy tất cả subscription của những người nhận.
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .in("user_id", recipientIds);

  const payload = JSON.stringify({
    title,
    body: record.content || "",
    icon: sender?.avatar_url || undefined,
    tag: record.conversation_id,
    url: "/chat",
  });

  await Promise.all(
    (subs || []).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload
        );
      } catch (err: unknown) {
        // Subscription hết hạn -> xóa khỏi DB.
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await admin
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", s.endpoint);
        }
      }
    })
  );

  return new Response("ok", { status: 200 });
}
