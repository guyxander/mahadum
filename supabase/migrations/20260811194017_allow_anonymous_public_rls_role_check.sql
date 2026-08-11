-- Public-read policies call this function to extend visibility for staff.
-- Anonymous sessions have no auth.uid(), so the function safely returns false.
grant execute on function private.has_role(public.app_role) to anon;
