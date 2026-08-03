create or replace function private.affiliate_code_for_user(p_user_id uuid, p_email text)
returns text
language sql
immutable
set search_path = ''
as $$
  select left(
    coalesce(
      nullif(trim(both '-' from regexp_replace(split_part(lower(coalesce(p_email, '')), '@', 1), '[^a-z0-9]+', '-', 'g')), ''),
      'member'
    ),
    15
  ) || '-' || left(replace(p_user_id::text, '-', ''), 8);
$$;

revoke all on function private.affiliate_code_for_user(uuid, text) from public;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role text := coalesce(new.raw_user_meta_data->>'requested_role', 'learner');
begin
  insert into public.profiles(id, full_name)
  values(new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));

  insert into public.user_roles(user_id, role) values(new.id, 'learner');

  insert into public.affiliates(user_id, code, status)
  values(new.id, private.affiliate_code_for_user(new.id, new.email), 'approved');

  if requested_role = 'creator' then
    insert into public.user_roles(user_id, role) values(new.id, 'creator') on conflict do nothing;
    insert into public.creator_profiles(user_id, display_name, headline)
    values(new.id, coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), 'New creator'), 'Creator application pending review');
  end if;

  return new;
end;
$$;

insert into public.affiliates(user_id, code, status)
select
  p.id,
  private.affiliate_code_for_user(p.id, u.email),
  'approved'
from public.profiles p
join auth.users u on u.id = p.id
left join public.affiliates a on a.user_id = p.id
where a.user_id is null;

update public.affiliates
set status = 'approved'
where status = 'pending';
