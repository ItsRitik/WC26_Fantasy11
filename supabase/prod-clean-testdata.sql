-- Clean test gameplay data for a production launch (2026-06-21)
-- ═══════════════════════════════════════════════════════════════
-- WARNING: irreversible. This wipes all rooms / entries / scores so real users
-- start on a clean slate. It KEEPS the schema and the player_prices cache.
-- Run ONLY on the database you are promoting to production, when you are ready.

truncate table
  fantasy_picks,
  fantasy_live_state,
  fantasy_room_members,
  match_points_log,
  match_player_points,
  fantasy_rooms
restart identity cascade;

-- Optional extras (uncomment if you want them too):

-- Cached player credit values - safe to keep; they rebuild from the API on
-- demand. Only clear if you want prices recomputed fresh.
-- truncate table player_prices;

-- Test user profiles. Production uses a SEPARATE Clerk instance, so old test
-- profiles are orphaned anyway. Clear them for a clean user list.
-- truncate table user_profiles cascade;
