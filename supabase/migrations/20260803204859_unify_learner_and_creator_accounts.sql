create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  referred_by_code text := lower(trim(coalesce(new.raw_user_meta_data->>'referred_by_code', '')));
  parent_id uuid;
  display_name text := coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), nullif(new.raw_user_meta_data->>'name', ''), 'New member');
begin
  insert into public.profiles(id, full_name) values(new.id, display_name);
  insert into public.user_roles(user_id, role) values(new.id, 'learner');
  insert into public.user_roles(user_id, role) values(new.id, 'creator');

  if referred_by_code <> '' then
    select user_id into parent_id from public.affiliates where code = referred_by_code and status = 'approved';
  end if;

  insert into public.affiliates(user_id, code, status, parent_affiliate_id)
  values(new.id, private.affiliate_code_for_user(new.id, new.email), 'approved', parent_id);

  insert into public.creator_profiles(user_id, display_name, headline, verification_status, verified_at)
  values(new.id, display_name, 'Creator', 'verified', now());
  return new;
end;
$$;

insert into public.user_roles(user_id, role)
select id, 'creator' from public.profiles
on conflict do nothing;

insert into public.creator_profiles(user_id, display_name, headline, verification_status, verified_at)
select p.id, coalesce(nullif(p.full_name, ''), 'Creator'), 'Creator', 'verified', now()
from public.profiles p
left join public.creator_profiles cp on cp.user_id = p.id
where cp.user_id is null;

update public.creator_profiles
set verification_status = 'verified', verified_at = coalesce(verified_at, now())
where verification_status <> 'verified';
