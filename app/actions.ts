"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Đăng xuất rồi quay về trang đăng nhập.
export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
