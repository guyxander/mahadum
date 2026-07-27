alter table public.ledger_entries alter column owner_id drop not null;

create or replace function private.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
declare requested_role text := coalesce(new.raw_user_meta_data->>'requested_role','learner');
begin
  insert into public.profiles(id,full_name) values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''));
  insert into public.user_roles(user_id,role) values(new.id,'learner');
  if requested_role='creator' then
    insert into public.user_roles(user_id,role) values(new.id,'creator') on conflict do nothing;
    insert into public.creator_profiles(user_id,display_name,headline)
    values(new.id,coalesce(nullif(new.raw_user_meta_data->>'full_name',''),'New creator'),'Creator application pending review');
  end if;
  return new;
end; $$;

create or replace function private.set_updated_at() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now(); return new; end; $$;

create trigger profiles_updated_at before update on public.profiles for each row execute function private.set_updated_at();
create trigger courses_updated_at before update on public.courses for each row execute function private.set_updated_at();
create trigger progress_updated_at before update on public.lesson_progress for each row execute function private.set_updated_at();
create trigger reviews_updated_at before update on public.reviews for each row execute function private.set_updated_at();
create trigger payout_accounts_updated_at before update on public.payout_accounts for each row execute function private.set_updated_at();
create trigger settings_updated_at before update on public.platform_settings for each row execute function private.set_updated_at();

create or replace function public.create_checkout(p_course_id uuid,p_tx_ref text,p_affiliate_code text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid := auth.uid(); v_course public.courses; v_affiliate uuid; v_payment uuid;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  select * into v_course from public.courses where id=p_course_id and status='published' for share;
  if not found then raise exception 'course not available'; end if;
  if exists(select 1 from public.enrollments where learner_id=v_user and course_id=p_course_id) then raise exception 'already enrolled'; end if;
  if p_affiliate_code is not null then select user_id into v_affiliate from public.affiliates where code=p_affiliate_code and status='approved' and user_id<>v_user; end if;
  insert into public.payments(learner_id,course_id,tx_ref,amount_minor,currency,affiliate_id)
  values(v_user,p_course_id,p_tx_ref,v_course.price_minor,v_course.currency,v_affiliate) returning id into v_payment;
  return jsonb_build_object('payment_id',v_payment,'course_id',v_course.id,'title',v_course.title,'amount_minor',v_course.price_minor,'currency',v_course.currency,'email',(select email from auth.users where id=v_user));
end; $$;
revoke all on function public.create_checkout(uuid,text,text) from public;
grant execute on function public.create_checkout(uuid,text,text) to authenticated;

create or replace function public.finalize_verified_payment(
  p_provider_event_id text,p_provider_transaction_id text,p_tx_ref text,p_amount_minor integer,p_currency text,p_verified_payload jsonb
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_payment public.payments; v_creator uuid; v_creator_bps integer; v_creator_amount bigint; v_l1 bigint:=0; v_l2 bigint:=0; v_parent uuid; v_platform bigint; v_enrollment uuid;
begin
  insert into public.webhook_events(provider,provider_event_id,payload,status) values('flutterwave',p_provider_event_id,p_verified_payload,'processing')
  on conflict(provider,provider_event_id) do nothing;
  if not found then select id into v_enrollment from public.enrollments where payment_id=(select id from public.payments where tx_ref=p_tx_ref); return v_enrollment; end if;
  select * into v_payment from public.payments where tx_ref=p_tx_ref for update;
  if not found or v_payment.amount_minor<>p_amount_minor or v_payment.currency<>p_currency then raise exception 'verified payment mismatch'; end if;
  if v_payment.status='successful' then select id into v_enrollment from public.enrollments where payment_id=v_payment.id; return v_enrollment; end if;
  update public.payments set status='successful',provider_transaction_id=p_provider_transaction_id,raw_verified_payload=p_verified_payload,verified_at=now() where id=v_payment.id;
  insert into public.enrollments(learner_id,course_id,payment_id) values(v_payment.learner_id,v_payment.course_id,v_payment.id)
  on conflict(learner_id,course_id) do update set payment_id=excluded.payment_id returning id into v_enrollment;
  select c.creator_id,coalesce(cp.revenue_share_bps,7000) into v_creator,v_creator_bps from public.courses c left join public.creator_profiles cp on cp.user_id=c.creator_id where c.id=v_payment.course_id;
  v_creator_amount=(v_payment.amount_minor::bigint*v_creator_bps)/10000;
  if v_payment.affiliate_id is not null then
    select (v_payment.amount_minor::bigint*a.level_one_bps)/10000,a.parent_affiliate_id into v_l1,v_parent from public.affiliates a where a.user_id=v_payment.affiliate_id and a.status='approved';
    if v_parent is not null then select (v_payment.amount_minor::bigint*a.level_two_bps)/10000 into v_l2 from public.affiliates a where a.user_id=v_payment.affiliate_id; end if;
  end if;
  v_platform=greatest(0,v_payment.amount_minor-v_creator_amount-v_l1-v_l2);
  insert into public.ledger_entries(payment_id,owner_id,entry_type,amount_minor,currency,idempotency_key) values
    (v_payment.id,v_creator,'creator_earning',v_creator_amount,v_payment.currency,'creator:'||v_payment.id),
    (v_payment.id,null,'platform_fee',v_platform,v_payment.currency,'platform:'||v_payment.id)
  on conflict(idempotency_key) do nothing;
  if v_l1>0 then insert into public.ledger_entries(payment_id,owner_id,entry_type,amount_minor,currency,idempotency_key) values(v_payment.id,v_payment.affiliate_id,'affiliate_commission',v_l1,v_payment.currency,'affiliate-l1:'||v_payment.id) on conflict(idempotency_key) do nothing; end if;
  if v_l2>0 then insert into public.ledger_entries(payment_id,owner_id,entry_type,amount_minor,currency,idempotency_key) values(v_payment.id,v_parent,'affiliate_commission',v_l2,v_payment.currency,'affiliate-l2:'||v_payment.id) on conflict(idempotency_key) do nothing; end if;
  update public.referrals set converted_at=now() where affiliate_id=v_payment.affiliate_id and referred_user_id=v_payment.learner_id and converted_at is null;
  update public.webhook_events set status='processed',processed_at=now() where provider='flutterwave' and provider_event_id=p_provider_event_id;
  return v_enrollment;
end; $$;
revoke all on function public.finalize_verified_payment(text,text,text,integer,text,jsonb) from public;
grant execute on function public.finalize_verified_payment(text,text,text,integer,text,jsonb) to service_role;

create or replace function public.request_refund(p_payment_id uuid,p_amount_minor integer,p_reason text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_refund uuid;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  if p_amount_minor<=0 or length(trim(p_reason))<10 then raise exception 'invalid refund request'; end if;
  if not exists(select 1 from public.payments where id=p_payment_id and learner_id=v_user and status='successful' and amount_minor>=p_amount_minor) then raise exception 'payment not refundable'; end if;
  insert into public.refunds(payment_id,requested_by,amount_minor,reason) values(p_payment_id,v_user,p_amount_minor,trim(p_reason)) returning id into v_refund;
  return v_refund;
end; $$;
revoke all on function public.request_refund(uuid,integer,text) from public;
grant execute on function public.request_refund(uuid,integer,text) to authenticated;
