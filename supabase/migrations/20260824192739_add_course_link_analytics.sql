create table public.course_link_events (
  id bigint generated always as identity primary key,
  course_id uuid not null references public.courses(id) on delete cascade,
  affiliate_id uuid references public.affiliates(user_id) on delete set null,
  event_type text not null check (event_type in ('copy','visit')),
  created_at timestamptz not null default now()
);

alter table public.course_link_events enable row level security;
revoke all on table public.course_link_events from public, anon, authenticated;
grant select, insert on table public.course_link_events to service_role;
grant usage, select on sequence public.course_link_events_id_seq to service_role;
create index course_link_events_course_type_idx on public.course_link_events(course_id,event_type,created_at desc);
create index course_link_events_affiliate_type_idx on public.course_link_events(affiliate_id,event_type,created_at desc) where affiliate_id is not null;
