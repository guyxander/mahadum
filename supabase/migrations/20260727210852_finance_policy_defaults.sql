alter table public.affiliates alter column level_one_bps set default 300;
alter table public.affiliates alter column level_two_bps set default 200;
update public.affiliates set level_one_bps=300,level_two_bps=200;
alter table public.creator_profiles alter column revenue_share_bps set default 7000;

insert into public.platform_settings(key,value,is_public) values
('finance.revenue_split',jsonb_build_object('creator_bps',7000,'platform_bps',2500,'affiliate_level_one_bps',300,'affiliate_level_two_bps',200,'unallocated_affiliate_share','retained_by_platform'),true),
('finance.refund_policy',jsonb_build_object('window_days',7,'eligibility','subject_to_consumption_and_policy review'),true),
('finance.payout_policy',jsonb_build_object('minimum_minor',1000000,'currency','NGN','schedule','weekly_friday','settlement_hold_days',7),true),
('support.contact',jsonb_build_object('email','ngbridz@gmail.com','response_target_hours',48),true)
on conflict(key) do update set value=excluded.value,is_public=excluded.is_public,updated_at=now();

create or replace function public.request_refund(p_payment_id uuid,p_amount_minor integer,p_reason text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare v_user uuid:=auth.uid(); v_refund uuid;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if p_amount_minor<=0 or length(trim(p_reason))<10 then raise exception 'invalid refund request'; end if;
  if not exists(select 1 from public.payments where id=p_payment_id and learner_id=v_user and status='successful' and amount_minor>=p_amount_minor and verified_at>=now()-interval '7 days') then raise exception 'payment is outside the refund window or not refundable'; end if;
  insert into public.refunds(payment_id,requested_by,amount_minor,reason) values(p_payment_id,v_user,p_amount_minor,trim(p_reason)) returning id into v_refund;
  return v_refund;
end; $$;
revoke all on function public.request_refund(uuid,integer,text) from public,anon;
grant execute on function public.request_refund(uuid,integer,text) to authenticated;

create or replace function public.request_payout(p_amount_minor bigint)
returns uuid language plpgsql security invoker set search_path='' as $$
declare v_user uuid:=auth.uid(); v_available bigint; v_payout uuid;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if p_amount_minor<1000000 then raise exception 'minimum payout is NGN 10,000'; end if;
  if not exists(select 1 from public.payout_accounts where user_id=v_user) then raise exception 'payout account required'; end if;
  select coalesce(sum(amount_minor),0) into v_available from public.ledger_entries where owner_id=v_user and created_at<=now()-interval '7 days';
  v_available=v_available-coalesce((select sum(amount_minor) from public.payouts where user_id=v_user and status in ('pending','approved','processing','paid')),0);
  if p_amount_minor>v_available then raise exception 'insufficient settled balance'; end if;
  insert into public.payouts(user_id,amount_minor,currency) values(v_user,p_amount_minor,'NGN') returning id into v_payout;
  return v_payout;
end; $$;
revoke all on function public.request_payout(bigint) from public,anon;
grant execute on function public.request_payout(bigint) to authenticated;

create policy "users request own payouts" on public.payouts for insert to authenticated
with check(user_id=(select auth.uid()) and status='pending' and amount_minor>=1000000);
