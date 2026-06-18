-- =============================================================
--  STORAGE — bucket "avatars" để người dùng tải ảnh đại diện
--  Chạy file này MỘT LẦN trong Supabase > SQL Editor (nếu bạn đã
--  chạy schema.sql trước đó thì chỉ cần chạy thêm file này).
-- =============================================================

-- 1) Tạo bucket công khai tên "avatars"
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 2) Ai cũng xem được avatar (bucket public)
drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

-- 3) Người dùng đăng nhập chỉ được tải lên thư mục mang id của chính mình
--    (đường dẫn dạng: avatars/<user_id>/<tên_file>)
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
