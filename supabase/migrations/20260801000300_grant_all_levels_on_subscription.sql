-- A paid subscription grants access to every course level, including A1.
create or replace function public.grant_level_access()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  lvl text;
  paid_levels text[] := array['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
begin
  -- Run only when the subscription becomes active.
  if new.status = 'active' and (old.status is null or old.status <> 'active') then
    foreach lvl in array paid_levels loop
      insert into public.user_level_access (user_id, level, active, expires_at)
      values (new.user_id, lvl, true, new.expires_at)
      on conflict (user_id, level) do update
        set active = true,
            expires_at = greatest(public.user_level_access.expires_at, excluded.expires_at);
    end loop;
  end if;
  return new;
end;
$function$;
