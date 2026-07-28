insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('course-thumbnails','course-thumbnails',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy "public course thumbnail reads" on storage.objects for select to anon,authenticated
using(bucket_id='course-thumbnails');

create policy "creators upload course thumbnails" on storage.objects for insert to authenticated
with check(bucket_id='course-thumbnails' and (storage.foldername(name))[2]=(select auth.uid())::text and exists(select 1 from public.courses c where c.id::text=(storage.foldername(name))[3] and c.creator_id=(select auth.uid())));

create policy "creators update course thumbnails" on storage.objects for update to authenticated
using(bucket_id='course-thumbnails' and owner_id=(select auth.uid()::text))
with check(bucket_id='course-thumbnails' and owner_id=(select auth.uid()::text));

create policy "creators delete course thumbnails" on storage.objects for delete to authenticated
using(bucket_id='course-thumbnails' and owner_id=(select auth.uid()::text));
