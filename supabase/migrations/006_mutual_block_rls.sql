-- Allow users to see blocks where they are the blocked party
-- Needed so fetchPeople can filter out people who blocked them
create policy "blocks_can_see_if_blocked" on blocks
  for select using (auth.uid() = blocked_user_id);

-- Allow admin (service role) to update report status
create policy "reports_admin_update" on reports
  for update using (auth.role() = 'service_role');

-- Allow admin (service role) to read all reports
create policy "reports_admin_read" on reports
  for select using (auth.role() = 'service_role');
