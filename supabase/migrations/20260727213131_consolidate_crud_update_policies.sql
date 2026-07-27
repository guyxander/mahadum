drop policy "profile owner updates" on public.profiles;
drop policy "admins update profiles" on public.profiles;
create policy "owners or admins update profiles" on public.profiles for update to authenticated
using((select auth.uid())=id or (select private.has_role('admin')))
with check((select auth.uid())=id or (select private.has_role('admin')));

drop policy "creator profile owner updates" on public.creator_profiles;
drop policy "admins update creator profiles" on public.creator_profiles;
create policy "owners or admins update creator profiles" on public.creator_profiles for update to authenticated
using((select auth.uid())=user_id or (select private.has_role('admin')))
with check((select auth.uid())=user_id or (select private.has_role('admin')));
