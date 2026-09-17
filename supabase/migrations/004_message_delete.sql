-- Allow users to delete their own messages
create policy "messages_own_delete" on messages
  for delete using (auth.uid() = sender_id);
