update public.platform_settings
set value=jsonb_set(value,'{settlement_hold_days}','0'::jsonb),updated_at=now()
where key='finance.payout_policy';

create or replace function public.request_payout(p_amount_minor bigint)
returns uuid language plpgsql security invoker set search_path='' as $$
declare v_user uuid:=auth.uid(); v_available bigint; v_payout uuid;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if p_amount_minor<1000000 then raise exception 'minimum payout is NGN 10,000'; end if;
  if not exists(select 1 from public.payout_accounts where user_id=v_user) then raise exception 'payout account required'; end if;
  select coalesce(sum(amount_minor),0) into v_available from public.ledger_entries where owner_id=v_user;
  v_available=v_available-coalesce((select sum(amount_minor) from public.payouts where user_id=v_user and status in ('pending','approved','processing','paid')),0);
  if p_amount_minor>v_available then raise exception 'insufficient available balance'; end if;
  insert into public.payouts(user_id,amount_minor,currency) values(v_user,p_amount_minor,'NGN') returning id into v_payout;
  return v_payout;
end; $$;

revoke all on function public.request_payout(bigint) from public,anon;
grant execute on function public.request_payout(bigint) to authenticated;
