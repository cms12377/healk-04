-- PK10 full catalog parity with..vip
-- Run in Supabase SQL Editor AFTER database.sql + fix_pk10_categories.sql
-- Idempotent — safe to re-run

-- ---------------------------------------------------------------------------
-- 1) 冠亚军和 categories + sum 3–19 + re-link side bets
-- ---------------------------------------------------------------------------
INSERT INTO play_categories (games_id, name)
SELECT g.id, r.cn
FROM games g
CROSS JOIN (VALUES
  ('冠亚军和'),
  ('冠亚军和-大小单双')
) AS r(cn)
WHERE g.code IN ('df_pk10', 'df_pk10_3', 'df_pk10_5')
  AND NOT EXISTS (
    SELECT 1 FROM play_categories pc WHERE pc.games_id = g.id AND pc.name = r.cn
  );

-- Link existing gy side bets to 冠亚军和-大小单双
UPDATE play_items pi
SET category_id = pc.id
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'gy'
JOIN play_categories pc ON pc.games_id = g.id AND pc.name = '冠亚军和-大小单双'
WHERE pi.games_id = g.id
  AND pi.group_id = pg.id
  AND pi.bet_content IN ('gy_big', 'gy_small', 'gy_odd', 'gy_even')
  AND g.code IN ('df_pk10', 'df_pk10_3', 'df_pk10_5');

-- 冠亚军和 sum 3–19
INSERT INTO play_items (games_id, group_id, category_id, bet_content, label, odds)
SELECT g.id, pg.id, pc.id, 'gy_sum_' || s.s, s.s::TEXT,
  CASE s.s
    WHEN 3 THEN 100.0 WHEN 19 THEN 100.0
    WHEN 4 THEN 100.0 WHEN 18 THEN 100.0
    WHEN 5 THEN 22.0  WHEN 17 THEN 22.0
    WHEN 6 THEN 22.0  WHEN 16 THEN 22.0
    WHEN 7 THEN 14.7 WHEN 15 THEN 14.7
    WHEN 8 THEN 14.7 WHEN 14 THEN 14.7
    WHEN 9 THEN 11.0 WHEN 13 THEN 11.0
    WHEN 10 THEN 11.0 WHEN 12 THEN 11.0
    WHEN 11 THEN 8.8
    ELSE 11.0
  END
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'gy'
JOIN play_categories pc ON pc.games_id = g.id AND pc.name = '冠亚军和'
CROSS JOIN generate_series(3, 19) AS s(s)
WHERE g.code IN ('df_pk10', 'df_pk10_3', 'df_pk10_5')
  AND NOT EXISTS (
    SELECT 1 FROM play_items pi
    WHERE pi.games_id = g.id AND pi.group_id = pg.id
      AND pi.bet_content = 'gy_sum_' || s.s
  );

UPDATE play_items pi
SET odds = CASE substring(pi.bet_content from 'gy_sum_([0-9]+)$')::INT
  WHEN 3 THEN 100.0 WHEN 19 THEN 100.0
  WHEN 4 THEN 100.0 WHEN 18 THEN 100.0
  WHEN 5 THEN 22.0  WHEN 17 THEN 22.0
  WHEN 6 THEN 22.0  WHEN 16 THEN 22.0
  WHEN 7 THEN 14.7 WHEN 15 THEN 14.7
  WHEN 8 THEN 14.7 WHEN 14 THEN 14.7
  WHEN 9 THEN 11.0 WHEN 13 THEN 11.0
  WHEN 10 THEN 11.0 WHEN 12 THEN 11.0
  WHEN 11 THEN 8.8
  ELSE 11.0
END
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'gy'
WHERE pi.games_id = g.id
  AND pi.group_id = pg.id
  AND pi.bet_content ~ '^gy_sum_[0-9]+$'
  AND g.code IN ('df_pk10', 'df_pk10_3', 'df_pk10_5');

-- ---------------------------------------------------------------------------
-- 2) 两面盘 ranks 1–5: 龙/虎 (มังกร/เสือ)
-- ---------------------------------------------------------------------------
INSERT INTO play_items (games_id, group_id, category_id, bet_content, label, odds)
SELECT g.id, pg.id, pc.id, 'lm_r' || r.i || '_' || v.suffix, v.label, 1.98
FROM games g
CROSS JOIN (VALUES
  (1, '冠军'), (2, '亚军'), (3, '第三名'), (4, '第四名'), (5, '第五名')
) AS r(i, cn)
CROSS JOIN (VALUES
  ('dragon', 'มังกร'),
  ('tiger', 'เสือ')
) AS v(suffix, label)
JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'lm'
JOIN play_categories pc ON pc.games_id = g.id AND pc.name = r.cn
WHERE g.code IN ('df_pk10', 'df_pk10_3', 'df_pk10_5')
  AND NOT EXISTS (
    SELECT 1 FROM play_items pi
    WHERE pi.games_id = g.id AND pi.group_id = pg.id AND pi.category_id = pc.id
      AND pi.bet_content = 'lm_r' || r.i || '_' || v.suffix
  );

-- ---------------------------------------------------------------------------
-- 3) Quick bet chips (th6688: 1000 / 5000 / 10000 / 50000)
-- ---------------------------------------------------------------------------
UPDATE game_issues gi
SET bet_quick_amount = '["1000","5000","10000","50000"]'::JSONB
FROM games g
WHERE gi.games_id = g.id
  AND g.code IN ('df_pk10', 'df_pk10_3', 'df_pk10_5');

-- ---------------------------------------------------------------------------
-- Verify
-- ---------------------------------------------------------------------------
SELECT g.code,
  (SELECT COUNT(*) FROM play_items pi
   JOIN play_groups pg ON pg.id = pi.group_id AND pg.code = 'lm'
   JOIN play_categories pc ON pc.id = pi.category_id AND pc.name = '冠军'
   WHERE pi.games_id = g.id AND pi.status = 1) AS lm_r1_items,
  (SELECT COUNT(*) FROM play_items pi
   JOIN play_groups pg ON pg.id = pi.group_id AND pg.code = 'gy'
   JOIN play_categories pc ON pc.id = pi.category_id AND pc.name = '冠亚军和'
   WHERE pi.games_id = g.id AND pi.status = 1) AS gy_sum_items,
  (SELECT COUNT(*) FROM play_items pi
   JOIN play_groups pg ON pg.id = pi.group_id AND pg.code = 'gy'
   JOIN play_categories pc ON pc.id = pi.category_id AND pc.name = '冠亚军和-大小单双'
   WHERE pi.games_id = g.id AND pi.status = 1) AS gy_side_items
FROM games g
WHERE g.code IN ('df_pk10', 'df_pk10_3', 'df_pk10_5')
ORDER BY g.id;
