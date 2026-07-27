drop policy if exists "public avatar reads" on storage.objects;

drop policy if exists "creator manages modules" on public.course_modules;
create policy "creator inserts modules" on public.course_modules for insert to authenticated
with check(exists(select 1 from public.courses c where c.id=course_id and (c.creator_id=(select auth.uid()) or (select private.has_role('admin')))));
create policy "creator updates modules" on public.course_modules for update to authenticated
using(exists(select 1 from public.courses c where c.id=course_id and (c.creator_id=(select auth.uid()) or (select private.has_role('admin')))))
with check(exists(select 1 from public.courses c where c.id=course_id and (c.creator_id=(select auth.uid()) or (select private.has_role('admin')))));
create policy "creator deletes modules" on public.course_modules for delete to authenticated
using(exists(select 1 from public.courses c where c.id=course_id and (c.creator_id=(select auth.uid()) or (select private.has_role('admin')))));

drop policy if exists "creator manages lessons" on public.lessons;
create policy "creator inserts lessons" on public.lessons for insert to authenticated
with check(exists(select 1 from public.course_modules m join public.courses c on c.id=m.course_id where m.id=module_id and (c.creator_id=(select auth.uid()) or (select private.has_role('admin')))));
create policy "creator updates lessons" on public.lessons for update to authenticated
using(exists(select 1 from public.course_modules m join public.courses c on c.id=m.course_id where m.id=module_id and (c.creator_id=(select auth.uid()) or (select private.has_role('admin')))))
with check(exists(select 1 from public.course_modules m join public.courses c on c.id=m.course_id where m.id=module_id and (c.creator_id=(select auth.uid()) or (select private.has_role('admin')))));
create policy "creator deletes lessons" on public.lessons for delete to authenticated
using(exists(select 1 from public.course_modules m join public.courses c on c.id=m.course_id where m.id=module_id and (c.creator_id=(select auth.uid()) or (select private.has_role('admin')))));
