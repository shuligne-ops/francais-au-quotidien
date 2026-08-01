alter table public.lessons enable row level security;

drop policy if exists "Admins can read all lessons" on public.lessons;
create policy "Admins can read all lessons"
  on public.lessons
  for select
  to authenticated
  using (is_admin());

drop policy if exists "Anyone can read A1 lessons" on public.lessons;
create policy "Anyone can read A1 lessons"
  on public.lessons
  for select
  to anon, authenticated
  using ((level = 'A1'::text));

drop policy if exists "Subscribers can read their level lessons" on public.lessons;
create policy "Subscribers can read their level lessons"
  on public.lessons
  for select
  to authenticated
  using ((EXISTS ( SELECT 1
   FROM user_level_access ula
  WHERE ((ula.user_id = auth.uid()) AND (ula.level = lessons.level) AND (ula.active = true) AND ((ula.expires_at IS NULL) OR (ula.expires_at > now()))))));

drop policy if exists anon_read_free_teaser_lessons on public.lessons;
create policy anon_read_free_teaser_lessons
  on public.lessons
  for select
  to anon, authenticated
  using (is_free_teaser = true);
