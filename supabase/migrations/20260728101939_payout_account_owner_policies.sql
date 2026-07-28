create policy "owners create payout accounts" on public.payout_accounts
for insert to authenticated
with check(user_id=(select auth.uid()));

create policy "owners update payout accounts" on public.payout_accounts
for update to authenticated
using(user_id=(select auth.uid()))
with check(user_id=(select auth.uid()));
