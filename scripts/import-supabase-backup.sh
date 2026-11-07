#!/usr/bin/env bash
set -euo pipefail

# Imports the Lovable/Supabase PostgreSQL custom dump into the owned Supabase
# project without replacing Supabase-managed auth/storage schemas.
#
# Usage:
#   ./scripts/import-supabase-backup.sh /path/to/canada-study-hub.backup

BACKUP_PATH="${1:-}"
if [[ -z "$BACKUP_PATH" || ! -f "$BACKUP_PATH" ]]; then
  echo "Usage: $0 /path/to/postgresql.custom.backup" >&2
  exit 2
fi

# The project's direct endpoint is IPv6-only; use Supabase's free IPv4 session
# pooler so the import also works on networks without IPv6 DNS/connectivity.
DB_URL="${SUPABASE_DB_URL:-postgresql://postgres.ghcwlreulopzvvmcoojx@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=require}"
PG_BIN="${PG_BIN:-/opt/homebrew/opt/postgresql@18/bin}"
PG_RESTORE="${PG_RESTORE:-$PG_BIN/pg_restore}"
PSQL="${PSQL:-$PG_BIN/psql}"

if [[ ! -x "$PG_RESTORE" || ! -x "$PSQL" ]]; then
  echo "pg_restore/psql not found. Install PostgreSQL 18 client tools or set PG_BIN." >&2
  exit 1
fi

read -r -s -p "Supabase database password: " PGPASSWORD
echo
export PGPASSWORD

if [[ "$($PSQL "$DB_URL" -Atqc "select to_regclass('public.profiles') is not null")" == "t" ]]; then
  echo "public.profiles already exists; use a fresh Supabase project to avoid duplicate imports." >&2
  exit 1
fi

echo "Importing existing Auth users..."
"$PG_RESTORE" --exit-on-error --single-transaction --data-only \
  --schema=auth --table=users --no-owner --no-privileges \
  --dbname="$DB_URL" "$BACKUP_PATH"
"$PG_RESTORE" --exit-on-error --single-transaction --data-only \
  --schema=auth --table=identities --no-owner --no-privileges \
  --dbname="$DB_URL" "$BACKUP_PATH"

echo "Importing public schema and application data..."
"$PG_RESTORE" --exit-on-error --single-transaction --schema=public \
  --no-owner --no-privileges --dbname="$DB_URL" "$BACKUP_PATH"

echo "Importing Storage bucket definitions (file bytes are not part of pg_dump)..."
"$PG_RESTORE" --exit-on-error --single-transaction --data-only \
  --schema=storage --table=buckets --no-owner --no-privileges \
  --dbname="$DB_URL" "$BACKUP_PATH"

echo "Applying application privileges and Storage RLS policies..."
"$PSQL" -v ON_ERROR_STOP=1 --single-transaction "$DB_URL" <<'SQL'
alter type public.app_role add value if not exists 'admin';

alter table public.courses
  add column if not exists college_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where c.conname = 'courses_college_id_fkey'
      and t.relname = 'courses'
      and n.nspname = 'public'
  ) then
    alter table public.courses
      add constraint courses_college_id_fkey
      foreign key (college_id) references public.colleges (account_id);
  end if;
end;
$$;

create index if not exists courses_college_idx on public.courses (college_id);

-- Link legacy courses when their College name maps to exactly one account.
with matches as (
  select
    c.id as course_id,
    col.account_id as college_id,
    count(*) over (partition by c.id) as match_count
  from public.courses c
  join public.colleges col
    on lower(trim(col.college_name)) = lower(trim(c.college_name))
  where c.college_id is null
)
update public.courses c
set college_id = matches.college_id
from matches
where matches.course_id = c.id
  and matches.match_count = 1;

update public.applications a
set college_id = c.college_id
from public.courses c
where a.college_id is null
  and a.course_id = c.id
  and c.college_id is not null;

-- Keep application data inaccessible to anon and governed by the existing RLS
-- policies. The admin role is intentionally not granted special case-data access.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

grant select, update on public.profiles to authenticated;
grant select on public.user_roles, public.agents, public.colleges,
  public.application_statuses, public.payment_statuses to authenticated;
grant select on public.courses to anon;
grant select, insert, update on public.courses to authenticated;
grant select, insert, update, delete on public.study_interests to authenticated;
grant select, insert, update on public.language_tests to authenticated;
grant select, insert, update on public.applications to authenticated;
grant select, insert, update, delete on public.application_documents to authenticated;
grant select, insert on public.application_history to authenticated;
grant select, insert, update on public.offers, public.invoices, public.payments to authenticated;
grant select, update on public.notifications to authenticated;
grant usage, select on public.application_code_seq, public.payment_code_seq to authenticated;

grant all on public.profiles, public.user_roles, public.agents, public.colleges,
  public.application_statuses, public.payment_statuses, public.courses,
  public.study_interests, public.language_tests, public.applications,
  public.application_documents, public.application_history, public.offers,
  public.invoices, public.payments, public.notifications to service_role;
grant all on public.application_code_seq, public.payment_code_seq to service_role;

revoke execute on function public.level_rank(text) from public, anon;
grant execute on function public.level_rank(text) to authenticated;
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
revoke execute on function public.my_role() from public, anon;
grant execute on function public.my_role() to authenticated;
revoke execute on function public.is_party_on(uuid) from public, anon;
grant execute on function public.is_party_on(uuid) to authenticated;
revoke execute on function public.is_active_agent(uuid) from public, anon;
grant execute on function public.is_active_agent(uuid) to authenticated;
revoke execute on function public.post_notification(uuid, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.post_notification(uuid, uuid, text, text) to authenticated;
revoke execute on function public.enforce_language_level() from public, anon, authenticated;

drop policy if exists "courses: college read own" on public.courses;
drop policy if exists "courses: college insert own" on public.courses;
drop policy if exists "courses: college update own" on public.courses;
create policy "courses: college read own"
  on public.courses
  for select to authenticated
  using (public.has_role(auth.uid(), 'college') and college_id = auth.uid());
create policy "courses: college insert own"
  on public.courses
  for insert to authenticated
  with check (public.has_role(auth.uid(), 'college') and college_id = auth.uid());
create policy "courses: college update own"
  on public.courses
  for update to authenticated
  using (public.has_role(auth.uid(), 'college') and college_id = auth.uid())
  with check (public.has_role(auth.uid(), 'college') and college_id = auth.uid());

drop policy if exists "applications: college read" on public.applications;
create policy "applications: college read"
  on public.applications
  for select to authenticated
  using (college_id = auth.uid() and status <> 'รอตรวจสอบ');

drop policy if exists "applications: student insert" on public.applications;
create policy "applications: student insert"
  on public.applications
  for insert to authenticated
  with check (
    student_id = auth.uid()
    and public.has_role(auth.uid(), 'student')
    and status = 'รอตรวจสอบ'
    and exists (
      select 1
      from public.courses c
      where c.id = applications.course_id
        and c.is_active
        and c.college_id = applications.college_id
    )
  );

drop policy if exists "documents: upload by party" on storage.objects;
drop policy if exists "documents: read by party" on storage.objects;
drop policy if exists "documents: replace by party" on storage.objects;
drop policy if exists "documents: delete by party" on storage.objects;
drop policy if exists "offers: upload by party" on storage.objects;
drop policy if exists "offers: read by party" on storage.objects;
drop policy if exists "invoices: upload by party" on storage.objects;
drop policy if exists "invoices: read by party" on storage.objects;
drop policy if exists "payments: upload by party" on storage.objects;
drop policy if exists "payments: read by party" on storage.objects;
drop policy if exists "results: own upload" on storage.objects;
drop policy if exists "results: own read" on storage.objects;
drop policy if exists "results: staff read" on storage.objects;
drop policy if exists "documents: own staging insert" on storage.objects;
drop policy if exists "documents: own staging read" on storage.objects;
drop policy if exists "documents: own staging replace" on storage.objects;
drop policy if exists "documents: own staging delete" on storage.objects;
drop policy if exists "results: own delete" on storage.objects;
drop policy if exists "results: own replace" on storage.objects;

create policy "documents: upload by party" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documents' and public.is_party_on(((storage.foldername(name))[1])::uuid));
create policy "documents: read by party" on storage.objects
  for select to authenticated
  using (bucket_id = 'documents' and public.is_party_on(((storage.foldername(name))[1])::uuid));
create policy "documents: replace by party" on storage.objects
  for update to authenticated
  using (bucket_id = 'documents' and public.is_party_on(((storage.foldername(name))[1])::uuid))
  with check (bucket_id = 'documents' and public.is_party_on(((storage.foldername(name))[1])::uuid));
create policy "documents: delete by party" on storage.objects
  for delete to authenticated
  using (bucket_id = 'documents' and public.is_party_on(((storage.foldername(name))[1])::uuid));
create policy "offers: upload by party" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'offers' and public.is_party_on(((storage.foldername(name))[1])::uuid));
create policy "offers: read by party" on storage.objects
  for select to authenticated
  using (bucket_id = 'offers' and public.is_party_on(((storage.foldername(name))[1])::uuid));
create policy "invoices: upload by party" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'invoices' and public.is_party_on(((storage.foldername(name))[1])::uuid));
create policy "invoices: read by party" on storage.objects
  for select to authenticated
  using (bucket_id = 'invoices' and public.is_party_on(((storage.foldername(name))[1])::uuid));
create policy "payments: upload by party" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'payments' and public.is_party_on(((storage.foldername(name))[1])::uuid));
create policy "payments: read by party" on storage.objects
  for select to authenticated
  using (bucket_id = 'payments' and public.is_party_on(((storage.foldername(name))[1])::uuid));
create policy "results: own upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'results' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "results: own read" on storage.objects
  for select to authenticated
  using (bucket_id = 'results' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "results: staff read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'results'
    and exists (
      select 1 from public.applications a
      where a.student_id::text = (storage.foldername(name))[1]
        and (a.college_id = auth.uid() or a.agent_id = auth.uid() or public.is_active_agent(auth.uid()))
    )
  );
create policy "documents: own staging insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (storage.foldername(name))[2] = 'staging');
create policy "documents: own staging read" on storage.objects
  for select to authenticated
  using (bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (storage.foldername(name))[2] = 'staging');
create policy "documents: own staging replace" on storage.objects
  for update to authenticated
  using (bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (storage.foldername(name))[2] = 'staging')
  with check (bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (storage.foldername(name))[2] = 'staging');
create policy "documents: own staging delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (storage.foldername(name))[2] = 'staging');
create policy "results: own delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'results' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "results: own replace" on storage.objects
  for update to authenticated
  using (bucket_id = 'results' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'results' and (storage.foldername(name))[1] = auth.uid()::text);
SQL

unset PGPASSWORD
echo "Supabase import completed."
