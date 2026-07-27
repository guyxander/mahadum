create policy "learners create own pending payments" on public.payments for insert to authenticated
with check(learner_id=(select auth.uid()) and status='pending' and provider_transaction_id is null and verified_at is null);

create policy "learners request own refunds" on public.refunds for insert to authenticated
with check(requested_by=(select auth.uid()) and status='pending' and exists(select 1 from public.payments p where p.id=payment_id and p.learner_id=(select auth.uid()) and p.status='successful'));

create policy "approved affiliates discoverable" on public.affiliates for select to authenticated
using(status='approved' or user_id=(select auth.uid()) or (select private.has_role('admin')));

create or replace function public.create_checkout(p_course_id uuid,p_tx_ref text,p_affiliate_code text default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_user uuid := auth.uid(); v_course public.courses; v_affiliate uuid; v_payment uuid;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  select * into v_course from public.courses where id=p_course_id and status='published';
  if not found then raise exception 'course not available'; end if;
  if exists(select 1 from public.enrollments where learner_id=v_user and course_id=p_course_id) then raise exception 'already enrolled'; end if;
  if p_affiliate_code is not null then select user_id into v_affiliate from public.affiliates where code=p_affiliate_code and status='approved' and user_id<>v_user; end if;
  insert into public.payments(learner_id,course_id,tx_ref,amount_minor,currency,affiliate_id)
  values(v_user,p_course_id,p_tx_ref,v_course.price_minor,v_course.currency,v_affiliate) returning id into v_payment;
  return jsonb_build_object('payment_id',v_payment,'course_id',v_course.id,'title',v_course.title,'amount_minor',v_course.price_minor,'currency',v_course.currency);
end; $$;
revoke all on function public.create_checkout(uuid,text,text) from public,anon;
grant execute on function public.create_checkout(uuid,text,text) to authenticated;

alter function public.finalize_verified_payment(text,text,text,integer,text,jsonb) security invoker;
revoke all on function public.finalize_verified_payment(text,text,text,integer,text,jsonb) from public,anon,authenticated;
grant execute on function public.finalize_verified_payment(text,text,text,integer,text,jsonb) to service_role;

alter function public.request_refund(uuid,integer,text) security invoker;
revoke all on function public.request_refund(uuid,integer,text) from public,anon;
grant execute on function public.request_refund(uuid,integer,text) to authenticated;
