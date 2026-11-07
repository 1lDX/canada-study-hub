-- Link applications to the owning College when they are created.
-- Keep College visibility aligned with the existing Agent handoff workflow.

-- Backfill only legacy courses whose College name matches exactly one account.
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
