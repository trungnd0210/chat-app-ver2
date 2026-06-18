-- =============================================================
--  XÓA THEO TỪNG NGƯỜI — chỉ ẩn ở phía người nhấn xóa
--  Chạy file này trong Supabase > SQL Editor.
--  (Thay thế cho cách xóa cứng trước đây.)
-- =============================================================

-- Gỡ quyền "xóa cứng" (nếu đã tạo từ deletes.sql trước đó) để tránh xóa
-- nhầm dữ liệu của cả hai phía.
drop policy if exists "messages_delete_own" on public.messages;
drop policy if exists "conversations_delete" on public.conversations;

-- Cột đánh dấu thời điểm người dùng ẩn (xóa) hội thoại ở phía họ.
alter table public.conversation_participants
  add column if not exists deleted_at timestamptz;

-- Bảng đánh dấu tin nhắn bị ẩn theo từng người.
create table if not exists public.message_deletions (
  message_id uuid references public.messages(id) on delete cascade,
  user_id    uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (message_id, user_id)
);

alter table public.message_deletions enable row level security;

drop policy if exists "msg_del_select_own" on public.message_deletions;
create policy "msg_del_select_own" on public.message_deletions
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "msg_del_insert_own" on public.message_deletions;
create policy "msg_del_insert_own" on public.message_deletions
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "msg_del_delete_own" on public.message_deletions;
create policy "msg_del_delete_own" on public.message_deletions
  for delete to authenticated using (user_id = auth.uid());

-- Danh sách hội thoại: ẩn hội thoại đã xóa cho đến khi có tin nhắn mới hơn mốc xóa.
create or replace function public.get_my_conversations()
returns table (
  conversation_id   uuid,
  last_message      text,
  last_message_at   timestamptz,
  other_id          uuid,
  other_full_name   text,
  other_avatar_url  text,
  other_email       text,
  other_last_seen   timestamptz,
  unread            bigint
)
language sql
security definer
stable
set search_path = public
as $$
  select
    c.id,
    c.last_message,
    c.last_message_at,
    op.id,
    op.full_name,
    op.avatar_url,
    op.email,
    op.last_seen,
    (
      select count(*) from public.messages m
      where m.conversation_id = c.id
        and m.sender_id <> auth.uid()
        and m.created_at > greatest(
          coalesce(myp.last_read_at, 'epoch'::timestamptz),
          coalesce(myp.deleted_at, 'epoch'::timestamptz)
        )
        and not exists (
          select 1 from public.message_deletions d
          where d.message_id = m.id and d.user_id = auth.uid()
        )
    ) as unread
  from public.conversations c
  join public.conversation_participants myp
    on myp.conversation_id = c.id and myp.user_id = auth.uid()
  join public.conversation_participants otherp
    on otherp.conversation_id = c.id and otherp.user_id <> auth.uid()
  join public.profiles op on op.id = otherp.user_id
  where myp.deleted_at is null or c.last_message_at > myp.deleted_at
  order by c.last_message_at desc nulls last;
$$;

-- Lấy tin nhắn của một hội thoại, bỏ qua tin đã ẩn ở phía mình và tin trước mốc xóa.
create or replace function public.get_messages(conv_id uuid)
returns setof public.messages
language sql
security definer
stable
set search_path = public
as $$
  select m.*
  from public.messages m
  join public.conversation_participants p
    on p.conversation_id = m.conversation_id and p.user_id = auth.uid()
  where m.conversation_id = conv_id
    and (p.deleted_at is null or m.created_at > p.deleted_at)
    and not exists (
      select 1 from public.message_deletions d
      where d.message_id = m.id and d.user_id = auth.uid()
    )
  order by m.created_at asc
  limit 500;
$$;
