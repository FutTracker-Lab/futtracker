-- Sin vista por (player_id, season_year): el criterio de aceptación pide una
-- fila por club y por año, y el total anual entre clubes queda fuera de FUT-90.

create view public.season_stats
with (security_invoker = true)
as
select
  ms.player_id,
  ms.career_entry_id,
  extract(year from ms.match_date)::int as season_year,
  count(*) as matches_played,
  sum(ms.goals) as goals,
  sum(ms.assists) as assists,
  sum(ms.minutes_played) as minutes_played,
  sum(ms.yellow_cards) as yellow_cards,
  sum(ms.red_cards) as red_cards,
  count(*) filter (where ms.clean_sheet) as clean_sheets,
  count(*) filter (where ms.started) as matches_started
from public.match_stats ms
group by ms.player_id, ms.career_entry_id, extract(year from ms.match_date)::int;

create view public.player_career_totals
with (security_invoker = true)
as
select
  ms.player_id,
  count(*) as total_matches,
  sum(ms.goals) as total_goals,
  sum(ms.assists) as total_assists,
  sum(ms.minutes_played) as total_minutes,
  sum(ms.yellow_cards) as total_yellow,
  sum(ms.red_cards) as total_red,
  count(*) filter (where ms.clean_sheet) as total_clean_sheets,
  count(distinct extract(year from ms.match_date)::int) as seasons_count,
  count(distinct ms.career_entry_id) as clubs_count,
  round(sum(ms.goals)::numeric / nullif(count(*), 0), 2) as goals_per_match
from public.match_stats ms
group by ms.player_id;

grant select on table public.season_stats to authenticated;
grant select on table public.player_career_totals to authenticated;
