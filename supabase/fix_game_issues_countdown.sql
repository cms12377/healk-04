-- Refresh countdown + bet chips for all 7 games (th6688 parity)
-- Run in Supabase SQL Editor, then: node scripts/audit-all-games.mjs
--
-- Step 0 advances overdue rounds first (K3/SSC 1-min games go stale without a browser).
-- Requires: supabase/advance_due_games.sql (run once if advance_all_due_games is missing)

BEGIN;

-- 0) Advance any open issues past draw_time (random mode settles; manual waits for preset)
SELECT advance_all_due_games();

-- 1) Reset countdown for issues still overdue OR any open issue (sync full cycle from now)
UPDATE game_issues gi
SET draw_time = EXTRACT(EPOCH FROM NOW())::BIGINT + v.secs
FROM games g
JOIN (VALUES
  ('df_pk10',   600),  -- 10 นาที
  ('df_pk10_3', 180),  -- 3 นาที
  ('df_pk10_5', 300),  -- 5 นาที
  ('df_k3',      60),  -- 1 นาที
  ('xam_6',     300),  -- 5 นาที
  ('xy_28',     300),  -- 5 นาที
  ('df_ssc',     60)   -- 1 นาที
) AS v(code, secs) ON g.code = v.code
WHERE gi.games_id = g.id
  AND gi.status = 0;

-- 2) Quick bet chips (th6688: 1000 / 5000 / 10000 / 50000)
UPDATE game_issues gi
SET bet_quick_amount = '["1000","5000","10000","50000"]'::JSONB
FROM games g
WHERE gi.games_id = g.id
  AND g.code IN ('df_pk10', 'df_pk10_3', 'df_pk10_5', 'df_k3', 'xam_6', 'xy_28', 'df_ssc')
  AND gi.status = 0;

COMMIT;

-- Verify
SELECT g.code,
  gi.issue,
  v.secs AS cycle_seconds,
  gi.draw_time - EXTRACT(EPOCH FROM NOW())::BIGINT AS seconds_left,
  gi.bet_quick_amount
FROM game_issues gi
JOIN games g ON g.id = gi.games_id
JOIN (VALUES
  ('df_pk10', 600), ('df_pk10_3', 180), ('df_pk10_5', 300),
  ('df_k3', 60), ('xam_6', 300), ('xy_28', 300), ('df_ssc', 60)
) AS v(code, secs) ON v.code = g.code
WHERE gi.status = 0
ORDER BY g.sort;
