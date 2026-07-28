grant insert, delete on table public.user_roles to authenticated;

create policy "admins can add account roles"
on public.user_roles
for insert
to authenticated
with check ((select private.has_role('admin')));

create policy "admins can remove account roles"
on public.user_roles
for delete
to authenticated
using ((select private.has_role('admin')));
