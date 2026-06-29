-- Refresh countdown for all open game issues (run when timer shows "ออกผล" / 00:00)
-- draw_time = unix seconds when current betting round closes

UPDATE game_issues gi
SET draw_time = EXTRACT(EPOCH FROM NOW())::BIGINT + v.secs
FROM games g
JOIN (VALUES
  ('df_pk10',   600),
  ('df_pk10_3', 180),
  ('df_pk10_5', 300),
  ('df_k3',     180),
  ('xam_6',     600),
  ('xy_28',     180),
  ('df_ssc',    300)
) AS v(code, secs) ON g.code = v.code
WHERE gi.games_id = g.id
  AND gi.status = 0;

-- Verify
SELECT g.code, gi.issue, gi.draw_time,
  gi.draw_time - EXTRACT(EPOCH FROM NOW())::BIGINT AS seconds_left
FROM game_issues gi
JOIN games g ON g.id = gi.games_id
WHERE gi.status = 0
ORDER BY g.sort;
