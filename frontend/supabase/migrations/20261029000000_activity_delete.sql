-- Complete activity CRUD while preserving ownership enforcement.
grant delete on public.activities to authenticated;
create policy "Users can delete their own activities"
  on public.activities for delete to authenticated
  using (user_id = (select auth.uid()));
