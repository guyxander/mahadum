create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role text := coalesce(new.raw_user_meta_data->>'requested_role', 'learner');
  referred_by_code text := lower(trim(coalesce(new.raw_user_meta_data->>'referred_by_code', '')));
  parent_id uuid;
begin
  insert into public.profiles(id, full_name)
  values(new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));

  insert into public.user_roles(user_id, role) values(new.id, 'learner');

  if referred_by_code <> '' then
    select user_id into parent_id
    from public.affiliates
    where code = referred_by_code and status = 'approved';
  end if;

  insert into public.affiliates(user_id, code, status, parent_affiliate_id)
  values(new.id, private.affiliate_code_for_user(new.id, new.email), 'approved', parent_id);

  if requested_role = 'creator' then
    insert into public.user_roles(user_id, role) values(new.id, 'creator') on conflict do nothing;
    insert into public.creator_profiles(user_id, display_name, headline)
    values(new.id, coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), 'New creator'), 'Creator application pending review');
  end if;

  return new;
end;
$$;

alter table public.affiliates alter column level_one_bps set default 300;
alter table public.affiliates alter column level_two_bps set default 200;
update public.affiliates set level_one_bps = 300, level_two_bps = 200;
