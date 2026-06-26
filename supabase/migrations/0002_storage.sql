-- ============================================================================
-- Storage bucket for uploaded PDFs.
-- Files are stored under "<user_id>/<document_id>.pdf". The API reads/writes
-- with the service role; these policies are defense-in-depth in case a client
-- ever accesses storage directly.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Authenticated users may only touch objects inside their own user-id folder.
drop policy if exists "pdf_read_own" on storage.objects;
create policy "pdf_read_own"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "pdf_insert_own" on storage.objects;
create policy "pdf_insert_own"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "pdf_update_own" on storage.objects;
create policy "pdf_update_own"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "pdf_delete_own" on storage.objects;
create policy "pdf_delete_own"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
