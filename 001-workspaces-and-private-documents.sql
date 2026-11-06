-- Run once in your own Supabase SQL Editor. No access to AMS Firebase is needed.
create table if not exists public.followup_workspaces (
  owner_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  payload jsonb not null,
  revision bigint not null default 1,
  updated_at timestamptz not null default now(),
  primary key (owner_id, id),
  constraint valid_workspace_payload check (
    jsonb_typeof(payload) = 'object' and
    payload->'config'->>'id' = id and
    jsonb_typeof(payload->'records') = 'array'
  )
);
alter table public.followup_workspaces enable row level security;
drop policy if exists "Owner reads own workspaces" on public.followup_workspaces;
create policy "Owner reads own workspaces" on public.followup_workspaces
  for select to authenticated using ((select auth.uid()) = owner_id);
drop policy if exists "Owner inserts own workspaces" on public.followup_workspaces;
create policy "Owner inserts own workspaces" on public.followup_workspaces
  for insert to authenticated with check ((select auth.uid()) = owner_id);
drop policy if exists "Owner updates own workspaces" on public.followup_workspaces;
create policy "Owner updates own workspaces" on public.followup_workspaces
  for update to authenticated using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
grant select, insert, update on public.followup_workspaces to authenticated;
revoke all on public.followup_workspaces from anon;

create or replace function public.save_followup_workspace(
  workspace_id text, workspace_payload jsonb, expected_revision bigint
) returns bigint language plpgsql security invoker set search_path = '' as $$
declare saved_revision bigint;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if workspace_payload->'config'->>'id' is distinct from workspace_id then
    raise exception 'Workspace ID mismatch';
  end if;
  if expected_revision = 0 then
    insert into public.followup_workspaces(owner_id, id, payload)
    values (auth.uid(), workspace_id, workspace_payload)
    on conflict (owner_id, id) do nothing returning revision into saved_revision;
  else
    update public.followup_workspaces
    set payload = workspace_payload, revision = revision + 1, updated_at = now()
    where owner_id = auth.uid() and id = workspace_id and revision = expected_revision
    returning revision into saved_revision;
  end if;
  if saved_revision is null then raise exception 'Cloud conflict: reload the latest workspace'; end if;
  return saved_revision;
end;
$$;
revoke all on function public.save_followup_workspace(text, jsonb, bigint) from public, anon;
grant execute on function public.save_followup_workspace(text, jsonb, bigint) to authenticated;


-- V2 migration: authenticated private original documents and owner-scoped deletion.
drop policy if exists "Owner deletes own workspaces" on public.followup_workspaces;
create policy "Owner deletes own workspaces" on public.followup_workspaces for delete to authenticated using ((select auth.uid()) = owner_id);
grant delete on public.followup_workspaces to authenticated;
insert into storage.buckets (id, name, public, file_size_limit)
values ('followup-documents', 'followup-documents', false, 15728640)
on conflict (id) do update set public = false, file_size_limit = 15728640;
drop policy if exists "Followup private documents" on storage.objects;
create policy "Followup private documents" on storage.objects for all to authenticated
using (bucket_id = 'followup-documents' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'followup-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
