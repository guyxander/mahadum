create table public.creator_contacts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  whatsapp_number text not null check (whatsapp_number ~ '^\+[1-9][0-9]{7,14}$'),
  updated_at timestamptz not null default now()
);

alter table public.creator_contacts enable row level security;
grant select, insert, update, delete on public.creator_contacts to authenticated;

create policy "members can view creator contacts" on public.creator_contacts
for select to authenticated using (true);
create policy "owners add creator contacts" on public.creator_contacts
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "owners update creator contacts" on public.creator_contacts
for update to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy "owners delete creator contacts" on public.creator_contacts
for delete to authenticated using ((select auth.uid()) = user_id);
