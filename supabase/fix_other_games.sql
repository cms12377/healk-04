-- Fix missing play_groups / quick chips for non-PK10 games (run in Supabase SQL Editor)

-- Lucky 28: ensure ball1 group exists (items reference ball1 but group was missing)
INSERT INTO play_groups (games_id, code, name, sort)
SELECT g.id, 'ball1', '第一球', 1
FROM games g
WHERE g.code = 'xy_28'
ON CONFLICT (games_id, code) DO UPDATE SET name = EXCLUDED.name, sort = EXCLUDED.sort;

-- Lucky 28: backfill ball1 items 0–9 if missing
INSERT INTO play_items (games_id, group_id, bet_content, label, odds)
SELECT g.id, pg.id, pg.code || '_' || n.n, n.n::TEXT, 9.8
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'ball1'
CROSS JOIN generate_series(0, 9) AS n(n)
WHERE g.code = 'xy_28'
  AND NOT EXISTS (
    SELECT 1 FROM play_items pi
    WHERE pi.games_id = g.id AND pi.group_id = pg.id AND pi.bet_content = pg.code || '_' || n.n
  );

-- bet_quick_amount on current issue (th6688 chips: 1000/5000/10000/50000)
UPDATE game_issues gi
SET bet_quick_amount = '["1000","5000","10000","50000"]'::JSONB
FROM games g
WHERE gi.games_id = g.id
  AND g.code IN ('df_pk10', 'df_pk10_3', 'df_pk10_5', 'df_k3', 'xam_6', 'xy_28', 'df_ssc')
  AND gi.status = 0;

-- Sample draw_results for pk10_3 / pk10_5 if missing
INSERT INTO draw_results (games_id, issue, result, analyz_result, createtime)
SELECT g.id, v.issue, v.result, v.analyz::JSONB, v.createtime
FROM games g
CROSS JOIN (VALUES
  ('df_pk10_3', to_char(NOW(), 'YYYYMMDD') || '201', '3,7,1,9,5,2,8,4,10,6',
   '{"dx":"big","ds":"odd"}', EXTRACT(EPOCH FROM NOW())::BIGINT - 1800),
  ('df_pk10_5', to_char(NOW(), 'YYYYMMDD') || '301', '2,4,6,8,10,1,3,5,7,9',
   '{"dx":"small","ds":"even"}', EXTRACT(EPOCH FROM NOW())::BIGINT - 900)
) AS v(game_code, issue, result, analyz, createtime)
WHERE g.code = v.game_code
  AND NOT EXISTS (
    SELECT 1 FROM draw_results dr
    WHERE dr.games_id = g.id AND dr.issue = v.issue
  );
