-- Keep fresh databases aligned with the live Supabase schema and College course workflow.
-- Admin remains an account-management role; these policies grant access only to College owners.

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

revoke insert, update, delete on public.courses from anon;
revoke delete on public.courses from authenticated;
grant select, insert, update on public.courses to authenticated;

drop policy if exists "courses: college read own" on public.courses;
create policy "courses: college read own"
  on public.courses
  for select to authenticated
  using (public.has_role(auth.uid(), 'college') and college_id = auth.uid());

drop policy if exists "courses: college insert own" on public.courses;
create policy "courses: college insert own"
  on public.courses
  for insert to authenticated
  with check (public.has_role(auth.uid(), 'college') and college_id = auth.uid());

drop policy if exists "courses: college update own" on public.courses;
create policy "courses: college update own"
  on public.courses
  for update to authenticated
  using (public.has_role(auth.uid(), 'college') and college_id = auth.uid())
  with check (public.has_role(auth.uid(), 'college') and college_id = auth.uid());
