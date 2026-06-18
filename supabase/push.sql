-- =============================================================
--  WEB PUSH — bảng lưu "push subscription" của người dùng
--  Chạy file này trong Supabase > SQL Editor (nếu đã chạy schema.sql
--  bản mới thì không cần chạy lại).
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
