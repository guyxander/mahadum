alter table public.courses
add column if not exists learning_outcomes text[] not null default '{}';

alter table public.courses
add constraint courses_learning_outcomes_limit
check (cardinality(learning_outcomes) <= 20) not valid;

alter table public.courses validate constraint courses_learning_outcomes_limit;
