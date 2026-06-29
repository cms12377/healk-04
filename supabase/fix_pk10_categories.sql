-- Fix PK10 "สองด้าน" tab — adds play_categories + per-rank lm items (th6688-style)
-- Run in Supabase SQL Editor AFTER database.sql (and optional play_items_full.sql)
-- Safe to re-run (idempotent)

-- 1) Categories: 冠军–第十名 per game
INSERT INTO play_categories (games_id, name)
SELECT g.id, r.cn
FROM games g
CROSS JOIN (VALUES
  ('冠军'), ('亚军'), ('第三名'), ('第四名'), ('第五名'),
  ('第六名'), ('第七名'), ('第八名'), ('第九名'), ('第十名')
) AS r(cn)
WHERE g.code IN ('df_pk10', 'df_pk10_3', 'df_pk10_5')
  AND NOT EXISTS (
    SELECT 1 FROM play_categories pc WHERE pc.games_id = g.id AND pc.name = r.cn
  );

-- 2) Per-rank 两面 items (สูง/ต่ำ/คี่/คู่) under lm group
INSERT INTO play_items (games_id, group_id, category_id, bet_content, label, odds)
SELECT g.id, pg.id, pc.id, 'lm_r' || r.i || '_' || v.suffix, v.label, 1.98
FROM games g
CROSS JOIN (VALUES
  (1, '冠军'), (2, '亚军'), (3, '第三名'), (4, '第四名'), (5, '第五名'),
  (6, '第六名'), (7, '第七名'), (8, '第八名'), (9, '第九名'), (10, '第十名')
) AS r(i, cn)
CROSS JOIN (VALUES
  ('big', 'สูง'), ('small', 'ต่ำ'),
  ('odd', 'คี่'), ('even', 'คู่')
) AS v(suffix, label)
JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'lm'
JOIN play_categories pc ON pc.games_id = g.id AND pc.name = r.cn
WHERE g.code IN ('df_pk10', 'df_pk10_3', 'df_pk10_5')
  AND NOT EXISTS (
    SELECT 1 FROM play_items pi
    WHERE pi.games_id = g.id AND pi.group_id = pg.id AND pi.category_id = pc.id
      AND pi.bet_content = 'lm_r' || r.i || '_' || v.suffix
  );

-- 3) Disable legacy flat lm items (6 rows: ใหญ่/เล็ก/คี่/คู่/มังกร/เสือ without category)
UPDATE play_items pi
SET status = 0
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'lm'
WHERE pi.games_id = g.id
  AND pi.group_id = pg.id
  AND pi.category_id IS NULL
  AND g.code IN ('df_pk10', 'df_pk10_3', 'df_pk10_5')
  AND pi.bet_content IN ('big', 'small', 'odd', 'even', 'dragon', 'tiger');

-- Verify (expect 10 categories, 40 active lm items per PK10 game)
SELECT g.code,
  (SELECT COUNT(*) FROM play_categories pc WHERE pc.games_id = g.id) AS categories,
  (SELECT COUNT(*) FROM play_items pi
   JOIN play_groups pg ON pg.id = pi.group_id AND pg.code = 'lm'
   WHERE pi.games_id = g.id AND pi.status = 1 AND pi.category_id IS NOT NULL) AS lm_categorized
FROM games g
WHERE g.code IN ('df_pk10', 'df_pk10_3', 'df_pk10_5')
ORDER BY g.id;
