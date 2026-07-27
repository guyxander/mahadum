-- Explicit Data API privileges for the 2026 default where new relations are not auto-exposed.
grant select on public.profiles, public.creator_profiles, public.categories, public.courses,
  public.course_modules, public.lessons, public.reviews, public.certificates, public.platform_settings
  to anon, authenticated;
grant select on public.user_roles, public.enrollments, public.lesson_progress, public.affiliates,
  public.referrals, public.payments, public.ledger_entries, public.payout_accounts, public.payouts,
  public.refunds, public.audit_logs to authenticated;
grant insert, update on public.profiles, public.creator_profiles, public.courses, public.course_modules,
  public.lessons, public.lesson_progress, public.reviews, public.payout_accounts to authenticated;
grant delete on public.courses, public.course_modules, public.lessons to authenticated;
grant insert on public.payments, public.refunds, public.payouts to authenticated;
grant insert, update on public.categories to authenticated;
grant update on public.refunds, public.payouts to authenticated;

create policy "admins update profiles" on public.profiles for update to authenticated
using((select private.has_role('admin'))) with check((select private.has_role('admin')));
create policy "admins update creator profiles" on public.creator_profiles for update to authenticated
using((select private.has_role('admin'))) with check((select private.has_role('admin')));
create policy "admins insert categories" on public.categories for insert to authenticated
with check((select private.has_role('admin')));
create policy "admins update categories" on public.categories for update to authenticated
using((select private.has_role('admin'))) with check((select private.has_role('admin')));
create policy "finance updates refunds" on public.refunds for update to authenticated
using((select private.has_role('admin')) or (select private.has_role('finance')))
with check((select private.has_role('admin')) or (select private.has_role('finance')));
create policy "finance updates payouts" on public.payouts for update to authenticated
using((select private.has_role('admin')) or (select private.has_role('finance')))
with check((select private.has_role('admin')) or (select private.has_role('finance')));

create or replace function private.issue_certificate_after_completion()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_total integer; v_complete integer;
begin
  if new.completed_at is null then return new; end if;
  select count(*) into v_total from public.lessons l
    join public.course_modules m on m.id=l.module_id
    join public.enrollments e on e.course_id=m.course_id
    where e.id=new.enrollment_id;
  select count(*) into v_complete from public.lesson_progress
    where enrollment_id=new.enrollment_id and completed_at is not null;
  if v_total>0 and v_complete>=v_total then
    update public.enrollments set completed_at=coalesce(completed_at,now()) where id=new.enrollment_id;
    insert into public.certificates(enrollment_id) values(new.enrollment_id) on conflict(enrollment_id) do nothing;
  end if;
  return new;
end; $$;
revoke all on function private.issue_certificate_after_completion() from public;
create trigger issue_certificate_after_progress after insert or update of completed_at on public.lesson_progress
for each row execute function private.issue_certificate_after_completion();
