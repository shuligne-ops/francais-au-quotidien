alter table public.lessons
  add column if not exists is_free_teaser boolean not null default false,
  add column if not exists is_published   boolean not null default true;

update public.lessons
set is_free_teaser = true
where lesson_number = 1
  and level in ('A1', 'A2', 'B1', 'B2', 'C1');
