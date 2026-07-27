create extension if not exists pgcrypto;
create schema if not exists private;

create type public.app_role as enum ('learner','creator','affiliate','moderator','finance','admin');
create type public.course_status as enum ('draft','in_review','published','rejected','archived');
create type public.payment_status as enum ('pending','successful','failed','refunded');
create type public.payout_status as enum ('pending','approved','processing','paid','rejected');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  username text unique,
  avatar_url text,
  bio text,
  country_code char(2),
  is_suspended boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null,
  granted_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  primary key(user_id, role)
);
create table public.creator_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  display_name text not null,
  headline text,
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','rejected')),
  verified_at timestamptz,
  flutterwave_subaccount_id text,
  revenue_share_bps integer not null default 7000 check (revenue_share_bps between 0 and 10000)
);
create table public.categories (
  id uuid primary key default gen_random_uuid(), name text not null unique, slug text not null unique,
  description text, sort_order integer not null default 0, is_active boolean not null default true
);
create table public.courses (
  id uuid primary key default gen_random_uuid(), creator_id uuid not null references public.profiles(id),
  category_id uuid references public.categories(id), title text not null, slug text not null unique,
  short_description text not null, description text not null, thumbnail_path text, trailer_url text,
  price_minor integer not null check (price_minor >= 0), currency char(3) not null default 'NGN',
  status public.course_status not null default 'draft', is_featured boolean not null default false,
  rejection_reason text, published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.course_modules (
  id uuid primary key default gen_random_uuid(), course_id uuid not null references public.courses(id) on delete cascade,
  title text not null, position integer not null check(position >= 0), unique(course_id, position)
);
create table public.lessons (
  id uuid primary key default gen_random_uuid(), module_id uuid not null references public.course_modules(id) on delete cascade,
  title text not null, description text, video_url text, resource_path text, duration_seconds integer check(duration_seconds >= 0),
  position integer not null check(position >= 0), is_free_preview boolean not null default false, unique(module_id, position)
);
create table public.enrollments (
  id uuid primary key default gen_random_uuid(), learner_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id), payment_id uuid, enrolled_at timestamptz not null default now(), completed_at timestamptz,
  unique(learner_id, course_id)
);
create table public.lesson_progress (
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed_at timestamptz, progress_seconds integer not null default 0 check(progress_seconds >= 0), updated_at timestamptz not null default now(),
  primary key(enrollment_id, lesson_id)
);
create table public.reviews (
  id uuid primary key default gen_random_uuid(), course_id uuid not null references public.courses(id) on delete cascade,
  learner_id uuid not null references public.profiles(id) on delete cascade, rating smallint not null check(rating between 1 and 5),
  body text, is_visible boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(course_id, learner_id)
);
create table public.certificates (
  id uuid primary key default gen_random_uuid(), enrollment_id uuid not null unique references public.enrollments(id) on delete cascade,
  verification_code text not null unique default encode(gen_random_bytes(12),'hex'), issued_at timestamptz not null default now(), revoked_at timestamptz
);
create table public.affiliates (
  user_id uuid primary key references public.profiles(id) on delete cascade, code text not null unique,
  status text not null default 'pending' check(status in ('pending','approved','suspended','rejected')), parent_affiliate_id uuid references public.affiliates(user_id),
  level_one_bps integer not null default 1000 check(level_one_bps between 0 and 10000), level_two_bps integer not null default 300 check(level_two_bps between 0 and 10000)
);
create table public.referrals (
  id uuid primary key default gen_random_uuid(), affiliate_id uuid not null references public.affiliates(user_id),
  referred_user_id uuid references public.profiles(id), course_id uuid references public.courses(id), visitor_token_hash text not null,
  attributed_at timestamptz not null default now(), converted_at timestamptz
);
create table public.payments (
  id uuid primary key default gen_random_uuid(), learner_id uuid not null references public.profiles(id), course_id uuid not null references public.courses(id),
  provider text not null default 'flutterwave', provider_transaction_id text unique, tx_ref text not null unique,
  amount_minor integer not null check(amount_minor >= 0), currency char(3) not null, status public.payment_status not null default 'pending',
  affiliate_id uuid references public.affiliates(user_id), raw_verified_payload jsonb, created_at timestamptz not null default now(), verified_at timestamptz
);
alter table public.enrollments add constraint enrollments_payment_fk foreign key(payment_id) references public.payments(id);
create table public.ledger_entries (
  id uuid primary key default gen_random_uuid(), payment_id uuid references public.payments(id), owner_id uuid not null references public.profiles(id),
  entry_type text not null check(entry_type in ('sale','creator_earning','affiliate_commission','platform_fee','refund','payout')),
  amount_minor bigint not null, currency char(3) not null, created_at timestamptz not null default now(), idempotency_key text not null unique
);
create table public.payout_accounts (
  user_id uuid primary key references public.profiles(id) on delete cascade, provider text not null default 'flutterwave',
  account_name text not null, bank_code text not null, account_number_last4 char(4) not null, encrypted_account_token text not null, updated_at timestamptz not null default now()
);
create table public.payouts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id), amount_minor bigint not null check(amount_minor > 0),
  currency char(3) not null default 'NGN', status public.payout_status not null default 'pending', provider_transfer_id text unique,
  requested_at timestamptz not null default now(), processed_at timestamptz, rejection_reason text
);
create table public.refunds (
  id uuid primary key default gen_random_uuid(), payment_id uuid not null references public.payments(id), requested_by uuid not null references public.profiles(id),
  amount_minor integer not null check(amount_minor > 0), reason text not null, status text not null default 'pending' check(status in ('pending','approved','rejected','processed')),
  provider_refund_id text unique, created_at timestamptz not null default now()
);
create table public.webhook_events (
  provider text not null, provider_event_id text not null, payload jsonb not null, status text not null default 'received',
  received_at timestamptz not null default now(), processed_at timestamptz, primary key(provider, provider_event_id)
);
create table public.platform_settings (
  key text primary key, value jsonb not null, is_public boolean not null default false, updated_by uuid references public.profiles(id), updated_at timestamptz not null default now()
);
create table public.audit_logs (
  id bigint generated always as identity primary key, actor_id uuid references public.profiles(id), action text not null,
  entity_type text not null, entity_id text, metadata jsonb not null default '{}'::jsonb, ip_hash text, created_at timestamptz not null default now()
);

create index courses_creator_idx on public.courses(creator_id);
create index courses_marketplace_idx on public.courses(status, is_featured, published_at desc);
create index modules_course_idx on public.course_modules(course_id, position);
create index lessons_module_idx on public.lessons(module_id, position);
create index enrollments_learner_idx on public.enrollments(learner_id, enrolled_at desc);
create index enrollments_course_idx on public.enrollments(course_id);
create index progress_enrollment_idx on public.lesson_progress(enrollment_id);
create index payments_learner_idx on public.payments(learner_id, created_at desc);
create index ledger_owner_idx on public.ledger_entries(owner_id, created_at desc);
create index payouts_user_idx on public.payouts(user_id, requested_at desc);
create index referrals_affiliate_idx on public.referrals(affiliate_id, attributed_at desc);
create index audit_created_idx on public.audit_logs(created_at desc);

create function private.has_role(required_role public.app_role) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.user_roles where user_id=(select auth.uid()) and role=required_role)
$$;
revoke all on function private.has_role(public.app_role) from public;
grant execute on function private.has_role(public.app_role) to authenticated;

create function private.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.profiles(id,full_name) values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''));
  insert into public.user_roles(user_id,role) values(new.id,'learner');
  return new;
end; $$;
revoke all on function private.handle_new_user() from public;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user();

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.creator_profiles enable row level security;
alter table public.categories enable row level security;
alter table public.courses enable row level security;
alter table public.course_modules enable row level security;
alter table public.lessons enable row level security;
alter table public.enrollments enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.reviews enable row level security;
alter table public.certificates enable row level security;
alter table public.affiliates enable row level security;
alter table public.referrals enable row level security;
alter table public.payments enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.payout_accounts enable row level security;
alter table public.payouts enable row level security;
alter table public.refunds enable row level security;
alter table public.webhook_events enable row level security;
alter table public.platform_settings enable row level security;
alter table public.audit_logs enable row level security;

create policy "public profiles readable" on public.profiles for select to anon,authenticated using(not is_suspended);
create policy "profile owner updates" on public.profiles for update to authenticated using((select auth.uid())=id) with check((select auth.uid())=id);
create policy "own roles readable" on public.user_roles for select to authenticated using((select auth.uid())=user_id or (select private.has_role('admin')));
create policy "creator profiles readable" on public.creator_profiles for select to anon,authenticated using(verification_status='verified' or (select auth.uid())=user_id or (select private.has_role('admin')));
create policy "creator profile owner updates" on public.creator_profiles for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy "categories readable" on public.categories for select to anon,authenticated using(is_active or (select private.has_role('admin')));
create policy "published courses readable" on public.courses for select to anon,authenticated using(status='published' or creator_id=(select auth.uid()) or (select private.has_role('admin')) or (select private.has_role('moderator')));
create policy "creators insert courses" on public.courses for insert to authenticated with check(creator_id=(select auth.uid()) and (select private.has_role('creator')));
create policy "creators update courses" on public.courses for update to authenticated using(creator_id=(select auth.uid()) or (select private.has_role('admin')) or (select private.has_role('moderator'))) with check(creator_id=(select auth.uid()) or (select private.has_role('admin')) or (select private.has_role('moderator')));
create policy "modules readable with course" on public.course_modules for select to anon,authenticated using(exists(select 1 from public.courses c where c.id=course_id and (c.status='published' or c.creator_id=(select auth.uid()) or (select private.has_role('admin')))));
create policy "creator manages modules" on public.course_modules for all to authenticated using(exists(select 1 from public.courses c where c.id=course_id and (c.creator_id=(select auth.uid()) or (select private.has_role('admin'))))) with check(exists(select 1 from public.courses c where c.id=course_id and (c.creator_id=(select auth.uid()) or (select private.has_role('admin')))));
create policy "lessons readable when preview enrolled or owner" on public.lessons for select to anon,authenticated using(is_free_preview or exists(select 1 from public.course_modules m join public.courses c on c.id=m.course_id where m.id=module_id and (c.creator_id=(select auth.uid()) or exists(select 1 from public.enrollments e where e.course_id=c.id and e.learner_id=(select auth.uid())) or (select private.has_role('admin')))));
create policy "creator manages lessons" on public.lessons for all to authenticated using(exists(select 1 from public.course_modules m join public.courses c on c.id=m.course_id where m.id=module_id and (c.creator_id=(select auth.uid()) or (select private.has_role('admin'))))) with check(exists(select 1 from public.course_modules m join public.courses c on c.id=m.course_id where m.id=module_id and (c.creator_id=(select auth.uid()) or (select private.has_role('admin')))));
create policy "enrollment participants read" on public.enrollments for select to authenticated using(learner_id=(select auth.uid()) or exists(select 1 from public.courses c where c.id=course_id and c.creator_id=(select auth.uid())) or (select private.has_role('admin')));
create policy "learner progress read" on public.lesson_progress for select to authenticated using(exists(select 1 from public.enrollments e where e.id=enrollment_id and e.learner_id=(select auth.uid())));
create policy "learner progress insert" on public.lesson_progress for insert to authenticated with check(exists(select 1 from public.enrollments e where e.id=enrollment_id and e.learner_id=(select auth.uid())));
create policy "learner progress update" on public.lesson_progress for update to authenticated using(exists(select 1 from public.enrollments e where e.id=enrollment_id and e.learner_id=(select auth.uid()))) with check(exists(select 1 from public.enrollments e where e.id=enrollment_id and e.learner_id=(select auth.uid())));
create policy "visible reviews readable" on public.reviews for select to anon,authenticated using(is_visible or learner_id=(select auth.uid()) or (select private.has_role('moderator')));
create policy "enrolled learners review" on public.reviews for insert to authenticated with check(learner_id=(select auth.uid()) and exists(select 1 from public.enrollments e where e.course_id=reviews.course_id and e.learner_id=(select auth.uid())));
create policy "review owner updates" on public.reviews for update to authenticated using(learner_id=(select auth.uid())) with check(learner_id=(select auth.uid()));
create policy "certificates public verify" on public.certificates for select to anon,authenticated using(revoked_at is null);
create policy "own affiliate readable" on public.affiliates for select to authenticated using(user_id=(select auth.uid()) or (select private.has_role('admin')));
create policy "own referrals readable" on public.referrals for select to authenticated using(affiliate_id=(select auth.uid()) or referred_user_id=(select auth.uid()) or (select private.has_role('admin')));
create policy "own payments readable" on public.payments for select to authenticated using(learner_id=(select auth.uid()) or (select private.has_role('finance')) or (select private.has_role('admin')));
create policy "own ledger readable" on public.ledger_entries for select to authenticated using(owner_id=(select auth.uid()) or (select private.has_role('finance')) or (select private.has_role('admin')));
create policy "own payout account readable" on public.payout_accounts for select to authenticated using(user_id=(select auth.uid()) or (select private.has_role('finance')) or (select private.has_role('admin')));
create policy "own payouts readable" on public.payouts for select to authenticated using(user_id=(select auth.uid()) or (select private.has_role('finance')) or (select private.has_role('admin')));
create policy "own refunds readable" on public.refunds for select to authenticated using(requested_by=(select auth.uid()) or (select private.has_role('finance')) or (select private.has_role('admin')));
create policy "public settings readable" on public.platform_settings for select to anon,authenticated using(is_public or (select private.has_role('admin')));
create policy "admins read audit" on public.audit_logs for select to authenticated using((select private.has_role('admin')));

insert into public.categories(name,slug,description,sort_order) values
('Design & Creativity','design-creativity','Design, branding and creative practice',10),
('Business & Growth','business-growth','Business, marketing and entrepreneurship',20),
('Technology','technology','Software, data and technical skills',30),
('Media & Content','media-content','Storytelling, video and audience building',40);
