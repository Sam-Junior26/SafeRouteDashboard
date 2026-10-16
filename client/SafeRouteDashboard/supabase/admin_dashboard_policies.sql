-- Review before running in the existing SafeRoute Supabase project.
-- This adds admin-only write policies for campus locations. Existing active-location
-- SELECT policy remains in place. These policies do not expose the service-role key.

create policy "campus_locations_insert_admin"
on public.campus_locations
for insert to authenticated
with check (public.is_administrator());

create policy "campus_locations_update_admin"
on public.campus_locations
for update to authenticated
using (public.is_administrator())
with check (public.is_administrator());

-- Soft-deactivation is an UPDATE and is covered by the policy above.
-- Do not add public registration or allow users to change their own role.
