-- Verify production schema (2026-06-21)
-- ════════════════════════════════════════
-- Run this in the Supabase SQL Editor on whichever project you plan to use for
-- production. It tells you which required tables/columns exist, so you know
-- whether any migration still needs to run. Read-only - changes nothing.

-- 1. Required tables --------------------------------------------------------
select t.name as required_table,
       case when c.table_name is not null then 'OK - exists'
            else 'MISSING - run the migration that creates it' end as status
from (values
  ('fantasy_rooms'), ('fantasy_room_members'), ('fantasy_picks'),
  ('fantasy_live_state'), ('match_player_points'), ('match_points_log'),
  ('player_prices'), ('user_profiles')
) as t(name)
left join information_schema.tables c
  on c.table_schema = 'public' and c.table_name = t.name
order by status desc, required_table;

-- 2. Clerk migration applied? host_id must be TEXT (not uuid), plus the
--    multi-team columns must exist on fantasy_rooms.
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name   = 'fantasy_rooms'
  and column_name in ('host_id', 'winner_id', 'room_code', 'max_players', 'status')
order by column_name;
