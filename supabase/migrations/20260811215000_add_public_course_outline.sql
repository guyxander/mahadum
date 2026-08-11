create or replace function public.get_public_course_outline(p_course_id uuid)
returns table (
  module_id uuid,
  module_title text,
  module_position integer,
  lesson_id uuid,
  lesson_title text,
  duration_seconds integer,
  is_free_preview boolean,
  lesson_position integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    m.id,
    m.title,
    m.position,
    l.id,
    l.title,
    l.duration_seconds,
    l.is_free_preview,
    l.position
  from public.course_modules m
  join public.courses c on c.id = m.course_id
  left join public.lessons l on l.module_id = m.id
  where m.course_id = p_course_id
    and c.status = 'published'
  order by m.position, l.position;
$$;

revoke all on function public.get_public_course_outline(uuid) from public;
grant execute on function public.get_public_course_outline(uuid) to anon, authenticated;
