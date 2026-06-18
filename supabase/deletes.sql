-- =============================================================
--  QUYỀN XÓA — cho phép xóa tin nhắn & hội thoại
--  Chạy file này trong Supabase > SQL Editor (nếu đã chạy schema.sql
--  bản mới thì không cần chạy lại).
-- =============================================================

-- Cho phép người dùng xóa TIN NHẮN của chính mình.
drop policy if exists "messages_delete_own" on public.messages;
create policy "messages_delete_own" on public.messages
  for delete to authenticated using (sender_id = auth.uid());

-- Cho phép xóa HỘI THOẠI mà mình tham gia (kéo theo xóa tin nhắn nhờ cascade).
drop policy if exists "conversations_delete" on public.conversations;
create policy "conversations_delete" on public.conversations
  for delete to authenticated using (public.is_participant(id, auth.uid()));

-- Gửi đủ dữ liệu khi xóa để realtime đồng bộ việc xóa tin nhắn giữa 2 người.
alter table public.messages replica identity full;
