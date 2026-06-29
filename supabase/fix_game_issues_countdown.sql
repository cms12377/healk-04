-- Refresh countdown per game (verified vs th6688 laoadmin.top current_game API)
-- Run in Supabase SQL Editor when timers are wrong or stuck at 00:00 / ออกผล

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

SELECT g.code,
  gi.issue,
  v.secs AS cycle_seconds,
  gi.draw_time - EXTRACT(EPOCH FROM NOW())::BIGINT AS seconds_left
FROM game_issues gi
JOIN games g ON g.id = gi.games_id
JOIN (VALUES
  ('df_pk10', 600), ('df_pk10_3', 180), ('df_pk10_5', 300),
  ('df_k3', 60), ('xam_6', 300), ('xy_28', 300), ('df_ssc', 60)
) AS v(code, secs) ON v.code = g.code
WHERE gi.status = 0
ORDER BY g.sort;
