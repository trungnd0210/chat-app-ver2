import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import ChatApp from "./ChatApp";

// Trang chat: kiểm tra đăng nhập ở server, lấy hồ sơ rồi giao cho client xử lý realtime.
export default async function ChatPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Lấy hồ sơ của chính mình (đã được trigger tạo khi đăng nhập lần đầu).
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url, last_seen")
    .eq("id", user.id)
    .single();

  const me: Profile = profile ?? {
    id: user.id,
    email: user.email ?? null,
    full_name:
      (user.user_metadata?.full_name as string) ?? user.email ?? "Me",
    avatar_url: (user.user_metadata?.avatar_url as string) ?? null,
    last_seen: new Date().toISOString(),
  };

  return <ChatApp me={me} />;
}
