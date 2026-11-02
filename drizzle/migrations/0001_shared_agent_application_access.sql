-- Treat active agents as a shared application queue. Keep agent_id as the
-- primary/legacy assignment while allowing every active agent to work the case.

create or replace function public.is_active_agent(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.agents a
    where a.account_id = _user_id
      and a.agent_status = 'active'
      and public.has_role(_user_id, 'agent')
  );
$$;

revoke execute on function public.is_active_agent(uuid) from public, anon;
grant execute on function public.is_active_agent(uuid) to authenticated;

create or replace function public.is_party_on(p_application_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.applications a
    where a.id = p_application_id
      and (
        a.student_id = auth.uid()
        or a.college_id = auth.uid()
        or public.is_active_agent(auth.uid())
      )
  );
$$;

create or replace function public.post_notification(_application_id uuid, _user_id uuid, _title text, _body text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.applications;
begin
  select * into a from public.applications where id = _application_id;
  if not found then
    raise exception 'application not found';
  end if;
  if not (
    a.student_id = auth.uid()
    or a.college_id = auth.uid()
    or public.is_active_agent(auth.uid())
  ) then
    raise exception 'caller is not a party on this application';
  end if;
  if not (
    _user_id = a.student_id
    or _user_id = a.college_id
    or public.is_active_agent(_user_id)
  ) then
    raise exception 'recipient is not a party on this application';
  end if;
  insert into public.notifications (user_id, title, body) values (_user_id, _title, _body);
end;
$$;

drop policy if exists "profiles: staff read linked students" on public.profiles;
create policy "profiles: staff read linked students" on public.profiles
  for select to authenticated using (
    exists (
      select 1 from public.applications a
      where a.student_id = profiles.id
        and (
          a.college_id = auth.uid()
          or a.agent_id = auth.uid()
          or public.is_active_agent(auth.uid())
        )
    )
  );

drop policy if exists "study_interests: staff read" on public.study_interests;
create policy "study_interests: staff read" on public.study_interests
  for select to authenticated using (
    exists (
      select 1 from public.applications a
      where a.student_id = study_interests.user_id
        and (
          a.college_id = auth.uid()
          or a.agent_id = auth.uid()
          or public.is_active_agent(auth.uid())
        )
    )
  );

drop policy if exists "language_tests: staff read" on public.language_tests;
create policy "language_tests: staff read" on public.language_tests
  for select to authenticated using (
    exists (
      select 1 from public.applications a
      where a.student_id = language_tests.user_id
        and (
          a.college_id = auth.uid()
          or a.agent_id = auth.uid()
          or public.is_active_agent(auth.uid())
        )
    )
  );

drop policy if exists "applications: agent read" on public.applications;
create policy "applications: agent read" on public.applications
  for select to authenticated using (public.is_active_agent(auth.uid()));

drop policy if exists "applications: parties update" on public.applications;
create policy "applications: parties update" on public.applications
  for update to authenticated
  using (student_id = auth.uid() or college_id = auth.uid() or public.is_active_agent(auth.uid()))
  with check (student_id = auth.uid() or college_id = auth.uid() or public.is_active_agent(auth.uid()));

drop policy if exists "results: staff read" on storage.objects;
create policy "results: staff read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'results'
    and exists (
      select 1 from public.applications a
      where a.student_id::text = (storage.foldername(name))[1]
        and (
          a.college_id = auth.uid()
          or a.agent_id = auth.uid()
          or public.is_active_agent(auth.uid())
        )
    )
  );
