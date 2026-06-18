-- =============================================================
--  ZALO CLONE CHAT — Database schema cho Supabase (PostgreSQL)
--  Chạy toàn bộ file này trong: Supabase Dashboard > SQL Editor
-- =============================================================

-- -------------------------------------------------------------
-- 1) BẢNG PROFILES — hồ sơ người dùng (đồng bộ từ auth.users)
-- -------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  avatar_url  text,
  last_seen   timestamptz default now(),
  created_at  timestamptz default now()
);

-- -------------------------------------------------------------
-- 2) BẢNG CONVERSATIONS — mỗi dòng là 1 cuộc trò chuyện 1-1
-- -------------------------------------------------------------
create table if not exists public.conversations (
  id              uuid primary key default gen_random_uuid(),
  last_message    text,
  last_message_at timestamptz default now(),
  created_at      timestamptz default now()
);

-- -------------------------------------------------------------
-- 3) BẢNG CONVERSATION_PARTICIPANTS — ai thuộc cuộc trò chuyện nào
-- -------------------------------------------------------------
create table if not exists public.conversation_participants (
  conversation_id uuid references public.conversations(id) on delete cascade,
  user_id         uuid references public.profiles(id) on delete cascade,
  last_read_at    timestamptz default now(),
  primary key (conversation_id, user_id)
);

-- -------------------------------------------------------------
-- 4) BẢNG MESSAGES — nội dung tin nhắn
-- -------------------------------------------------------------
create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender_id       uuid references public.profiles(id) on delete cascade not null,
  content         text not null,
  created_at      timestamptz default now()
);

create index if not exists messages_conversation_idx
  on public.messages (conversation_id, created_at);
create index if not exists participants_user_idx
  on public.conversation_participants (user_id);

-- =============================================================
--  HÀM TIỆN ÍCH
-- =============================================================

-- Kiểm tra 1 user có thuộc 1 cuộc trò chuyện không.
-- SECURITY DEFINER để tránh đệ quy vô hạn khi dùng trong policy RLS.
create or replace function public.is_participant(conv_id uuid, uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.conversation_participants
    where conversation_id = conv_id and user_id = uid
  );
$$;

-- Tạo profile tự động khi có user mới đăng ký (qua Google).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  )
  on conflict (id) do update
    set email      = excluded.email,
        full_name  = excluded.full_name,
        avatar_url = excluded.avatar_url;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Cập nhật "tin nhắn cuối" mỗi khi có tin mới (để sắp xếp & hiển thị sidebar).
create or replace function public.handle_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set last_message    = new.content,
      last_message_at = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists on_message_created on public.messages;
create trigger on_message_created
  after insert on public.messages
  for each row execute function public.handle_new_message();

-- Tìm hoặc tạo cuộc trò chuyện 1-1 giữa người dùng hiện tại và 1 người khác.
create or replace function public.get_or_create_conversation(other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  conv_id uuid;
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Chưa đăng nhập';
  end if;
  if me = other_user_id then
    raise exception 'Không thể tự trò chuyện với chính mình';
  end if;

  -- Tìm cuộc trò chuyện 1-1 đã tồn tại (đúng 2 thành viên là me và other).
  select c.id into conv_id
  from public.conversations c
  join public.conversation_participants p1
    on p1.conversation_id = c.id and p1.user_id = me
  join public.conversation_participants p2
    on p2.conversation_id = c.id and p2.user_id = other_user_id
  where (
    select count(*) from public.conversation_participants p
    where p.conversation_id = c.id
  ) = 2
  limit 1;

  if conv_id is null then
    insert into public.conversations default values returning id into conv_id;
    insert into public.conversation_participants (conversation_id, user_id)
    values (conv_id, me), (conv_id, other_user_id);
  end if;

  return conv_id;
end;
$$;

-- Lấy danh sách hội thoại của người dùng hiện tại, kèm người đối diện + tin chưa đọc.
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
        and m.created_at > coalesce(myp.last_read_at, 'epoch'::timestamptz)
    ) as unread
  from public.conversations c
  join public.conversation_participants myp
    on myp.conversation_id = c.id and myp.user_id = auth.uid()
  join public.conversation_participants otherp
    on otherp.conversation_id = c.id and otherp.user_id <> auth.uid()
  join public.profiles op on op.id = otherp.user_id
  order by c.last_message_at desc nulls last;
$$;

-- =============================================================
--  ROW LEVEL SECURITY (RLS)
-- =============================================================
alter table public.profiles                  enable row level security;
alter table public.conversations             enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages                  enable row level security;

-- PROFILES: mọi người đã đăng nhập đều xem được hồ sơ (để tìm người chat),
-- nhưng chỉ sửa được hồ sơ của chính mình.
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

-- CONVERSATIONS: chỉ xem được hội thoại mình tham gia.
drop policy if exists "conversations_select" on public.conversations;
create policy "conversations_select" on public.conversations
  for select to authenticated using (public.is_participant(id, auth.uid()));

drop policy if exists "conversations_insert" on public.conversations;
create policy "conversations_insert" on public.conversations
  for insert to authenticated with check (true);

drop policy if exists "conversations_update" on public.conversations;
create policy "conversations_update" on public.conversations
  for update to authenticated using (public.is_participant(id, auth.uid()));

-- PARTICIPANTS: chỉ xem thành viên của hội thoại mình tham gia; sửa dòng của mình.
drop policy if exists "participants_select" on public.conversation_participants;
create policy "participants_select" on public.conversation_participants
  for select to authenticated using (public.is_participant(conversation_id, auth.uid()));

drop policy if exists "participants_insert" on public.conversation_participants;
create policy "participants_insert" on public.conversation_participants
  for insert to authenticated with check (true);

drop policy if exists "participants_update_own" on public.conversation_participants;
create policy "participants_update_own" on public.conversation_participants
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- MESSAGES: chỉ xem tin trong hội thoại mình tham gia; chỉ gửi tin với tư cách chính mình.
drop policy if exists "messages_select" on public.messages;
create policy "messages_select" on public.messages
  for select to authenticated using (public.is_participant(conversation_id, auth.uid()));

drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages
  for insert to authenticated
  with check (sender_id = auth.uid() and public.is_participant(conversation_id, auth.uid()));

-- =============================================================
--  REALTIME — bật phát sự kiện thay đổi cho bảng messages & conversations
-- =============================================================
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;

-- =============================================================
--  STORAGE — bucket "avatars" cho ảnh đại diện người dùng
-- =============================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- =============================================================
--  WEB PUSH — bảng lưu "push subscription" của người dùng
-- =============================================================
create table if not exists public.push_subscriptions (
  endpoint    text primary key,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz default now()
);

create index if not exists push_subs_user_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subs_select_own" on public.push_subscriptions;
create policy "push_subs_select_own" on public.push_subscriptions
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "push_subs_insert_own" on public.push_subscriptions;
create policy "push_subs_insert_own" on public.push_subscriptions
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "push_subs_update_own" on public.push_subscriptions;
create policy "push_subs_update_own" on public.push_subscriptions
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "push_subs_delete_own" on public.push_subscriptions;
create policy "push_subs_delete_own" on public.push_subscriptions
  for delete to authenticated using (user_id = auth.uid());

-- =============================================================
--  XÓA THEO TỪNG NGƯỜI — chỉ ẩn ở phía người nhấn xóa
-- =============================================================

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

-- Danh sách hội thoại: ẩn hội thoại đã xóa cho đến khi có tin mới hơn mốc xóa.
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

-- Lấy tin nhắn, bỏ qua tin đã ẩn ở phía mình và tin trước mốc xóa hội thoại.
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

-- HẾT. Sau khi chạy xong, ứng dụng đã sẵn sàng hoạt động.
