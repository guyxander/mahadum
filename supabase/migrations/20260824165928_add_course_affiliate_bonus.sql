alter table public.courses
  add column affiliate_bonus_bps integer not null default 0
  check (affiliate_bonus_bps between 0 and 7000);

comment on column public.courses.affiliate_bonus_bps is
  'Extra level-one affiliate commission funded from the creator share, in basis points.';

create or replace function public.finalize_verified_payment(
  p_provider_event_id text,p_provider_transaction_id text,p_tx_ref text,p_amount_minor integer,p_currency text,p_verified_payload jsonb
) returns uuid language plpgsql security invoker set search_path='' as $$
declare
  v_payment public.payments; v_creator uuid; v_creator_bps integer; v_course_bonus_bps integer:=0;
  v_creator_amount bigint; v_bonus bigint:=0; v_l1 bigint:=0; v_l2 bigint:=0;
  v_parent uuid; v_platform bigint; v_enrollment uuid;
begin
  insert into public.webhook_events(provider,provider_event_id,payload,status) values('paystack',p_provider_event_id,p_verified_payload,'processing')
  on conflict(provider,provider_event_id) do nothing;
  if not found then select id into v_enrollment from public.enrollments where payment_id=(select id from public.payments where tx_ref=p_tx_ref); return v_enrollment; end if;
  select * into v_payment from public.payments where tx_ref=p_tx_ref for update;
  if not found or v_payment.amount_minor<>p_amount_minor or v_payment.currency<>p_currency then raise exception 'verified payment mismatch'; end if;
  if v_payment.status='successful' then select id into v_enrollment from public.enrollments where payment_id=v_payment.id; return v_enrollment; end if;
  update public.payments set status='successful',provider='paystack',provider_transaction_id=p_provider_transaction_id,raw_verified_payload=p_verified_payload,verified_at=now() where id=v_payment.id;
  insert into public.enrollments(learner_id,course_id,payment_id) values(v_payment.learner_id,v_payment.course_id,v_payment.id)
  on conflict(learner_id,course_id) do update set payment_id=excluded.payment_id returning id into v_enrollment;
  select c.creator_id,coalesce(cp.revenue_share_bps,7000),c.affiliate_bonus_bps
    into v_creator,v_creator_bps,v_course_bonus_bps
    from public.courses c left join public.creator_profiles cp on cp.user_id=c.creator_id where c.id=v_payment.course_id;
  v_creator_amount=(v_payment.amount_minor::bigint*v_creator_bps)/10000;
  if v_payment.affiliate_id is not null then
    select (v_payment.amount_minor::bigint*a.level_one_bps)/10000,a.parent_affiliate_id
      into v_l1,v_parent from public.affiliates a where a.user_id=v_payment.affiliate_id and a.status='approved';
    if found then
      v_bonus=(v_payment.amount_minor::bigint*least(v_course_bonus_bps,v_creator_bps))/10000;
      v_creator_amount=greatest(0,v_creator_amount-v_bonus);
      v_l1=v_l1+v_bonus;
      if v_parent is not null then select (v_payment.amount_minor::bigint*a.level_two_bps)/10000 into v_l2 from public.affiliates a where a.user_id=v_payment.affiliate_id; end if;
    end if;
  end if;
  v_platform=greatest(0,v_payment.amount_minor-v_creator_amount-v_l1-v_l2);
  insert into public.ledger_entries(payment_id,owner_id,entry_type,amount_minor,currency,idempotency_key) values
    (v_payment.id,v_creator,'creator_earning',v_creator_amount,v_payment.currency,'creator:'||v_payment.id),
    (v_payment.id,null,'platform_fee',v_platform,v_payment.currency,'platform:'||v_payment.id)
  on conflict(idempotency_key) do nothing;
  if v_l1>0 then insert into public.ledger_entries(payment_id,owner_id,entry_type,amount_minor,currency,idempotency_key) values(v_payment.id,v_payment.affiliate_id,'affiliate_commission',v_l1,v_payment.currency,'affiliate-l1:'||v_payment.id) on conflict(idempotency_key) do nothing; end if;
  if v_l2>0 then insert into public.ledger_entries(payment_id,owner_id,entry_type,amount_minor,currency,idempotency_key) values(v_payment.id,v_parent,'affiliate_commission',v_l2,v_payment.currency,'affiliate-l2:'||v_payment.id) on conflict(idempotency_key) do nothing; end if;
  update public.referrals set converted_at=now() where affiliate_id=v_payment.affiliate_id and referred_user_id=v_payment.learner_id and converted_at is null;
  update public.webhook_events set status='processed',processed_at=now() where provider='paystack' and provider_event_id=p_provider_event_id;
  return v_enrollment;
end; $$;

revoke all on function public.finalize_verified_payment(text,text,text,integer,text,jsonb) from public,anon,authenticated;
grant execute on function public.finalize_verified_payment(text,text,text,integer,text,jsonb) to service_role;
