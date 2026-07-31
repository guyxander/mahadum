update public.courses
set status = 'published',
    published_at = coalesce(published_at, now()),
    rejection_reason = null
where status = 'in_review';
