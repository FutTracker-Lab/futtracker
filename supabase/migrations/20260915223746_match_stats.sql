create table public.match_stats (
  id uuid primary key default gen_random_uuid(),
  career_entry_id uuid not null references public.career_entries (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  match_date date not null,
  opponent text not null check (char_length(opponent) between 2 and 80),
  competition text,
  started boolean not null default true,
  minutes_played int not null default 0 check (minutes_played between 0 and 130),
  goals int not null default 0 check (goals between 0 and 20),
  assists int not null default 0 check (assists between 0 and 20),
  yellow_cards int not null default 0 check (yellow_cards between 0 and 2),
  red_cards int not null default 0 check (red_cards between 0 and 1),
  clean_sheet boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (career_entry_id, match_date, opponent)
);

create trigger match_stats_set_updated_at
before update on public.match_stats
for each row
execute function public.set_updated_at();

create index match_stats_player_id_match_date_idx
on public.match_stats (player_id, match_date desc);

create index match_stats_career_entry_id_match_date_idx
on public.match_stats (career_entry_id, match_date);

alter table public.match_stats enable row level security;

-- `if not found` deja pasar un `career_entry_id` inexistente: lo rechaza la FK
-- con su propio mensaje, en vez de uno de estos que no corresponde.
create function public.enforce_match_ownership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  entry_player_id uuid;
begin
  select ce.player_id into entry_player_id
  from public.career_entries ce
  where ce.id = new.career_entry_id;

  if not found then
    return new;
  end if;

  if new.player_id <> entry_player_id then
    raise exception 'El partido no pertenece al jugador de la etapa de trayectoria'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create function public.enforce_goalkeeper_clean_sheet()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  entry_position text;
begin
  if not new.clean_sheet then
    return new;
  end if;

  select ce.position into entry_position
  from public.career_entries ce
  where ce.id = new.career_entry_id;

  if not found then
    return new;
  end if;

  if entry_position is distinct from 'arquero' then
    raise exception 'Solo un arquero puede tener valla invicta'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create function public.enforce_match_date_in_range()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  entry_start date;
  entry_end date;
begin
  select ce.start_date, ce.end_date into entry_start, entry_end
  from public.career_entries ce
  where ce.id = new.career_entry_id;

  if not found then
    return new;
  end if;

  if new.match_date < entry_start
    or (entry_end is not null and new.match_date > entry_end) then
    raise exception 'La fecha del partido está fuera del período de la etapa (% a %)',
      entry_start, coalesce(entry_end::text, 'hoy')
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

-- Definer para que el conteo vea todos los partidos y no solo los que deje
-- pasar la RLS de `match_stats` a quien edita.
create function public.enforce_career_entry_still_valid()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  invalid_count int;
begin
  if new.start_date is distinct from old.start_date
    or new.end_date is distinct from old.end_date then
    select count(*) into invalid_count
    from public.match_stats ms
    where ms.career_entry_id = new.id
      and (
        ms.match_date < new.start_date
        or (new.end_date is not null and ms.match_date > new.end_date)
      );

    if invalid_count > 0 then
      raise exception 'El nuevo período deja % partido(s) fuera de rango', invalid_count
        using errcode = 'check_violation';
    end if;
  end if;

  if old.position = 'arquero' and new.position is distinct from 'arquero' then
    select count(*) into invalid_count
    from public.match_stats ms
    where ms.career_entry_id = new.id
      and ms.clean_sheet;

    if invalid_count > 0 then
      raise exception 'No se puede cambiar la posición: % partido(s) tienen valla invicta', invalid_count
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

create trigger match_stats_enforce_match_ownership
before insert or update on public.match_stats
for each row
execute function public.enforce_match_ownership();

create trigger match_stats_enforce_goalkeeper_clean_sheet
before insert or update on public.match_stats
for each row
execute function public.enforce_goalkeeper_clean_sheet();

create trigger match_stats_enforce_match_date_in_range
before insert or update on public.match_stats
for each row
execute function public.enforce_match_date_in_range();

create trigger career_entries_enforce_still_valid
before update on public.career_entries
for each row
execute function public.enforce_career_entry_still_valid();

create policy match_stats_select on public.match_stats
for select
to authenticated
using (true);

create policy match_stats_insert on public.match_stats
for insert
to authenticated
with check (player_id = (select auth.uid()));

create policy match_stats_update on public.match_stats
for update
to authenticated
using (player_id = (select auth.uid()))
with check (player_id = (select auth.uid()));

create policy match_stats_delete on public.match_stats
for delete
to authenticated
using (player_id = (select auth.uid()));

-- El select a `anon` es a propósito: sin policy para ese rol, una consulta
-- anónima devuelve 0 filas en vez de un 42501.
grant select on table public.match_stats to anon, authenticated;
grant delete on table public.match_stats to authenticated;

grant insert (
  career_entry_id, player_id, match_date, opponent, competition, started,
  minutes_played, goals, assists, yellow_cards, red_cards, clean_sheet
) on table public.match_stats to authenticated;

-- Sin `player_id`: un PATCH no puede endosarle el partido a otro jugador.
grant update (
  career_entry_id, match_date, opponent, competition, started,
  minutes_played, goals, assists, yellow_cards, red_cards, clean_sheet
) on table public.match_stats to authenticated;
