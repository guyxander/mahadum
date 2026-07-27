insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values
  ('avatars','avatars',true,5242880,array['image/jpeg','image/png','image/webp']),
  ('course-assets','course-assets',false,52428800,array['image/jpeg','image/png','image/webp','application/pdf','application/zip'])
on conflict(id) do update set
  public=excluded.public,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

create policy "public avatar reads"
on storage.objects for select to anon,authenticated
using(bucket_id='avatars');

create policy "users upload own avatars"
on storage.objects for insert to authenticated
with check(bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);

create policy "users update own avatars"
on storage.objects for update to authenticated
using(bucket_id='avatars' and owner_id=(select auth.uid()::text))
with check(bucket_id='avatars' and owner_id=(select auth.uid()::text));

create policy "users delete own avatars"
on storage.objects for delete to authenticated
using(bucket_id='avatars' and owner_id=(select auth.uid()::text));

create policy "creators upload own course assets"
on storage.objects for insert to authenticated
with check(
  bucket_id='course-assets'
  and (storage.foldername(name))[1]=(select auth.uid())::text
  and exists(
    select 1 from public.courses c
    where c.id::text=(storage.foldername(name))[2]
      and c.creator_id=(select auth.uid())
  )
);

create policy "course asset participants read"
on storage.objects for select to authenticated
using(
  bucket_id='course-assets'
  and exists(
    select 1 from public.courses c
    where c.id::text=(storage.foldername(name))[2]
      and (
        c.creator_id=(select auth.uid())
        or exists(select 1 from public.enrollments e where e.course_id=c.id and e.learner_id=(select auth.uid()))
        or (select private.has_role('admin'))
        or (select private.has_role('moderator'))
      )
  )
);

create policy "creators update own course assets"
on storage.objects for update to authenticated
using(bucket_id='course-assets' and owner_id=(select auth.uid()::text))
with check(bucket_id='course-assets' and owner_id=(select auth.uid()::text));

create policy "creators delete own course assets"
on storage.objects for delete to authenticated
using(bucket_id='course-assets' and owner_id=(select auth.uid()::text));
