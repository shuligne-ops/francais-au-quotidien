create or replace view public.lessons_catalog
with (security_invoker = false)
as
select
  id,
  level,
  lesson_number,
  title_fr,
  title_ru,
  is_free_teaser,
  is_published
from public.lessons;

grant select on public.lessons_catalog to anon, authenticated;
