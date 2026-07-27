grant insert, update on public.affiliates to authenticated;
grant delete on public.reviews to authenticated;
grant insert, update on public.platform_settings to authenticated;

create policy "users apply as affiliates" on public.affiliates for insert to authenticated
with check(user_id=(select auth.uid()) and status='pending');
create policy "owners or admins update affiliates" on public.affiliates for update to authenticated
using((user_id=(select auth.uid()) and status='pending') or (select private.has_role('admin')))
with check((user_id=(select auth.uid()) and status='pending') or (select private.has_role('admin')));
create policy "review owners delete reviews" on public.reviews for delete to authenticated
using(learner_id=(select auth.uid()));
create policy "admins insert settings" on public.platform_settings for insert to authenticated
with check((select private.has_role('admin')));
create policy "admins update settings" on public.platform_settings for update to authenticated
using((select private.has_role('admin'))) with check((select private.has_role('admin')));

create or replace function private.audit_marketplace_change()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
  values((select auth.uid()),lower(tg_op),tg_table_name,coalesce(new.id::text,old.id::text),jsonb_build_object('source','database_trigger'));
  return coalesce(new,old);
end; $$;
revoke all on function private.audit_marketplace_change() from public;
create trigger audit_courses after insert or update or delete on public.courses for each row execute function private.audit_marketplace_change();
create trigger audit_refunds after update on public.refunds for each row execute function private.audit_marketplace_change();
create trigger audit_payouts after update on public.payouts for each row execute function private.audit_marketplace_change();
