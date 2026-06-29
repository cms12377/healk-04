-- =============================================================================
-- Full play_groups + play_items catalog (th6688-style)
-- Run AFTER database.sql on Supabase SQL Editor:
--   \i supabase/play_items_full.sql
-- Idempotent: safe to re-run (skips existing rows).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- PK10: 冠军–第十名 (เลือกเลข 1–10 ต่ออันดับ)
-- ---------------------------------------------------------------------------
INSERT INTO play_groups (games_id, code, name, sort)
SELECT g.id, 'r' || r.i, r.cn, r.i + 2
FROM games g
CROSS JOIN (VALUES
  (1, '冠军'), (2, '亚军'), (3, '第三名'), (4, '第四名'), (5, '第五名'),
  (6, '第六名'), (7, '第七名'), (8, '第八名'), (9, '第九名'), (10, '第十名')
) AS r(i, cn)
WHERE g.code IN ('df_pk10', 'df_pk10_3', 'df_pk10_5')
ON CONFLICT (games_id, code) DO UPDATE SET name = EXCLUDED.name, sort = EXCLUDED.sort;

INSERT INTO play_items (games_id, group_id, bet_content, label, odds)
SELECT g.id, pg.id, 'n' || n.n, n.n::TEXT, 9.85
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code ~ '^r[0-9]+$'
CROSS JOIN generate_series(1, 10) AS n(n)
WHERE g.code IN ('df_pk10', 'df_pk10_3', 'df_pk10_5')
  AND NOT EXISTS (
    SELECT 1 FROM play_items pi
    WHERE pi.games_id = g.id AND pi.group_id = pg.id AND pi.bet_content = 'n' || n.n
  );

-- PK10: 冠亚季 (Top 3 sum / combo sides)
INSERT INTO play_groups (games_id, code, name, sort)
SELECT g.id, 'gyj', '冠亚季', 13
FROM games g WHERE g.code IN ('df_pk10', 'df_pk10_3', 'df_pk10_5')
ON CONFLICT (games_id, code) DO NOTHING;

INSERT INTO play_items (games_id, group_id, bet_content, label, odds)
SELECT g.id, pg.id, v.bet_content, v.label, v.odds
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'gyj'
CROSS JOIN (VALUES
  ('gyj_big', 'ใหญ่', 2.05), ('gyj_small', 'เล็ก', 2.05),
  ('gyj_odd', 'คี่', 2.05), ('gyj_even', 'คู่', 2.05)
) AS v(bet_content, label, odds)
WHERE g.code IN ('df_pk10', 'df_pk10_3', 'df_pk10_5')
  AND NOT EXISTS (
    SELECT 1 FROM play_items pi
    WHERE pi.games_id = g.id AND pi.group_id = pg.id AND pi.bet_content = v.bet_content
  );

-- PK10: 两面盘 per-rank (冠军–第十名 × 大小单双)
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

-- PK10: 两面盘 ranks 1–5 龙/虎
INSERT INTO play_items (games_id, group_id, category_id, bet_content, label, odds)
SELECT g.id, pg.id, pc.id, 'lm_r' || r.i || '_' || v.suffix, v.label, 1.98
FROM games g
CROSS JOIN (VALUES
  (1, '冠军'), (2, '亚军'), (3, '第三名'), (4, '第四名'), (5, '第五名')
) AS r(i, cn)
CROSS JOIN (VALUES
  ('dragon', 'มังกร'), ('tiger', 'เสือ')
) AS v(suffix, label)
JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'lm'
JOIN play_categories pc ON pc.games_id = g.id AND pc.name = r.cn
WHERE g.code IN ('df_pk10', 'df_pk10_3', 'df_pk10_5')
  AND NOT EXISTS (
    SELECT 1 FROM play_items pi
    WHERE pi.games_id = g.id AND pi.group_id = pg.id AND pi.category_id = pc.id
      AND pi.bet_content = 'lm_r' || r.i || '_' || v.suffix
  );

-- PK10: 冠亚军和 categories + sum 3–19 + side bets
INSERT INTO play_categories (games_id, name)
SELECT g.id, r.cn
FROM games g
CROSS JOIN (VALUES ('冠亚军和'), ('冠亚军和-大小单双')) AS r(cn)
WHERE g.code IN ('df_pk10', 'df_pk10_3', 'df_pk10_5')
  AND NOT EXISTS (
    SELECT 1 FROM play_categories pc WHERE pc.games_id = g.id AND pc.name = r.cn
  );

UPDATE play_items pi
SET category_id = pc.id
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'gy'
JOIN play_categories pc ON pc.games_id = g.id AND pc.name = '冠亚军和-大小单双'
WHERE pi.games_id = g.id AND pi.group_id = pg.id
  AND pi.bet_content IN ('gy_big', 'gy_small', 'gy_odd', 'gy_even')
  AND g.code IN ('df_pk10', 'df_pk10_3', 'df_pk10_5');

INSERT INTO play_items (games_id, group_id, category_id, bet_content, label, odds)
SELECT g.id, pg.id, pc.id, 'gy_sum_' || s.s, s.s::TEXT,
  CASE s.s
    WHEN 3 THEN 44.0  WHEN 19 THEN 44.0
    WHEN 4 THEN 39.0  WHEN 18 THEN 39.0
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
    WHERE pi.games_id = g.id AND pi.group_id = pg.id AND pi.bet_content = 'gy_sum_' || s.s
  );

-- ---------------------------------------------------------------------------
-- K3: 和值 3–18, 三同号, 三连号, 大小单双 (两面)
-- ---------------------------------------------------------------------------
INSERT INTO play_groups (games_id, code, name, sort)
SELECT g.id, v.code, v.name, v.sort
FROM games g
CROSS JOIN (VALUES
  ('sth', '三同号', 2),
  ('slh', '三连号', 3),
  ('k3lm', '两面', 4)
) AS v(code, name, sort)
WHERE g.code = 'df_k3'
ON CONFLICT (games_id, code) DO UPDATE SET name = EXCLUDED.name, sort = EXCLUDED.sort;

INSERT INTO play_items (games_id, group_id, bet_content, label, odds)
SELECT g.id, pg.id, 'sum_' || s.s, s.s::TEXT, CASE
  WHEN s.s IN (3, 18) THEN 180.0
  WHEN s.s IN (4, 17) THEN 60.0
  WHEN s.s IN (5, 16) THEN 30.0
  WHEN s.s IN (6, 15) THEN 18.0
  WHEN s.s IN (7, 14) THEN 12.0
  WHEN s.s IN (8, 13) THEN 8.0
  WHEN s.s IN (9, 12) THEN 6.0
  WHEN s.s IN (10, 11) THEN 5.0
  ELSE 6.0
END
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'hz'
CROSS JOIN generate_series(3, 18) AS s(s)
WHERE g.code = 'df_k3'
  AND NOT EXISTS (
    SELECT 1 FROM play_items pi
    WHERE pi.games_id = g.id AND pi.group_id = pg.id AND pi.bet_content = 'sum_' || s.s
  );

INSERT INTO play_items (games_id, group_id, bet_content, label, odds)
SELECT g.id, pg.id, 'triple_' || d.d, d.d::TEXT || d.d::TEXT || d.d::TEXT, 180.0
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'sth'
CROSS JOIN generate_series(1, 6) AS d(d)
WHERE g.code = 'df_k3'
  AND NOT EXISTS (
    SELECT 1 FROM play_items pi
    WHERE pi.games_id = g.id AND pi.group_id = pg.id AND pi.bet_content = 'triple_' || d.d
  );

INSERT INTO play_items (games_id, group_id, bet_content, label, odds)
SELECT g.id, pg.id, v.bet_content, v.label, v.odds
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'slh'
CROSS JOIN (VALUES
  ('straight', '三连号', 30.0), ('straight_all', '全顺', 120.0)
) AS v(bet_content, label, odds)
WHERE g.code = 'df_k3'
  AND NOT EXISTS (
    SELECT 1 FROM play_items pi
    WHERE pi.games_id = g.id AND pi.group_id = pg.id AND pi.bet_content = v.bet_content
  );

INSERT INTO play_items (games_id, group_id, bet_content, label, odds)
SELECT g.id, pg.id, v.bet_content, v.label, v.odds
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'k3lm'
CROSS JOIN (VALUES
  ('total_big', '总大', 1.98), ('total_small', '总小', 1.98),
  ('total_odd', '总单', 1.98), ('total_even', '总双', 1.98)
) AS v(bet_content, label, odds)
WHERE g.code = 'df_k3'
  AND NOT EXISTS (
    SELECT 1 FROM play_items pi
    WHERE pi.games_id = g.id AND pi.group_id = pg.id AND pi.bet_content = v.bet_content
  );

-- ---------------------------------------------------------------------------
-- Mark Six: 特码 1–49, 正码 1–49, 特肖, 正肖, 波色
-- ---------------------------------------------------------------------------
INSERT INTO play_groups (games_id, code, name, sort)
SELECT g.id, v.code, v.name, v.sort
FROM games g
CROSS JOIN (VALUES
  ('tm', '特码', 2),
  ('zm', '正码', 3),
  ('tx', '特肖', 4),
  ('zx', '正肖', 5),
  ('bs', '波色', 6)
) AS v(code, name, sort)
WHERE g.code = 'xam_6'
ON CONFLICT (games_id, code) DO UPDATE SET name = EXCLUDED.name, sort = EXCLUDED.sort;

INSERT INTO play_items (games_id, group_id, bet_content, label, odds)
SELECT g.id, pg.id, 'tm_' || n.n, lpad(n.n::TEXT, 2, '0'), 42.0
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'tm'
CROSS JOIN generate_series(1, 49) AS n(n)
WHERE g.code = 'xam_6'
  AND NOT EXISTS (
    SELECT 1 FROM play_items pi
    WHERE pi.games_id = g.id AND pi.group_id = pg.id AND pi.bet_content = 'tm_' || n.n
  );

INSERT INTO play_items (games_id, group_id, bet_content, label, odds)
SELECT g.id, pg.id, 'zm_' || n.n, lpad(n.n::TEXT, 2, '0'), 8.5
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'zm'
CROSS JOIN generate_series(1, 49) AS n(n)
WHERE g.code = 'xam_6'
  AND NOT EXISTS (
    SELECT 1 FROM play_items pi
    WHERE pi.games_id = g.id AND pi.group_id = pg.id AND pi.bet_content = 'zm_' || n.n
  );

INSERT INTO play_items (games_id, group_id, bet_content, label, odds)
SELECT g.id, pg.id, v.bet_content, v.label, v.odds
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code IN ('tx', 'zx')
CROSS JOIN (VALUES
  ('rat', '鼠', 12.0), ('ox', '牛', 12.0), ('tiger', '虎', 12.0),
  ('rabbit', '兔', 12.0), ('dragon', '龙', 12.0), ('snake', '蛇', 12.0),
  ('horse', '马', 12.0), ('goat', '羊', 12.0), ('monkey', '猴', 12.0),
  ('rooster', '鸡', 12.0), ('dog', '狗', 12.0), ('pig', '猪', 12.0)
) AS v(bet_content, label, odds)
WHERE g.code = 'xam_6'
  AND NOT EXISTS (
    SELECT 1 FROM play_items pi
    WHERE pi.games_id = g.id AND pi.group_id = pg.id AND pi.bet_content = v.bet_content
  );

INSERT INTO play_items (games_id, group_id, bet_content, label, odds)
SELECT g.id, pg.id, v.bet_content, v.label, v.odds
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'bs'
CROSS JOIN (VALUES
  ('red', '红波', 2.8), ('green', '绿波', 2.8), ('blue', '蓝波', 2.8)
) AS v(bet_content, label, odds)
WHERE g.code = 'xam_6'
  AND NOT EXISTS (
    SELECT 1 FROM play_items pi
    WHERE pi.games_id = g.id AND pi.group_id = pg.id AND pi.bet_content = v.bet_content
  );

INSERT INTO play_items (games_id, group_id, bet_content, label, odds)
SELECT g.id, pg.id, v.bet_content, v.label, v.odds
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'lm'
CROSS JOIN (VALUES
  ('total_big', '总大', 1.98), ('total_small', '总小', 1.98),
  ('total_odd', '总单', 1.98), ('total_even', '总双', 1.98)
) AS v(bet_content, label, odds)
WHERE g.code = 'xam_6'
  AND NOT EXISTS (
    SELECT 1 FROM play_items pi
    WHERE pi.games_id = g.id AND pi.group_id = pg.id AND pi.bet_content = v.bet_content
  );

-- ---------------------------------------------------------------------------
-- Lucky 28: 第一/二/三球 0–9, 和值, 波色
-- ---------------------------------------------------------------------------
INSERT INTO play_groups (games_id, code, name, sort)
SELECT g.id, v.code, v.name, v.sort
FROM games g
CROSS JOIN (VALUES
  ('b2', '第二球', 2), ('b3', '第三球', 3), ('hz28', '和值', 4)
) AS v(code, name, sort)
WHERE g.code = 'xy_28'
ON CONFLICT (games_id, code) DO UPDATE SET name = EXCLUDED.name, sort = EXCLUDED.sort;

INSERT INTO play_items (games_id, group_id, bet_content, label, odds)
SELECT g.id, pg.id, pg.code || '_' || n.n, n.n::TEXT, 9.8
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code IN ('ball1', 'b2', 'b3')
CROSS JOIN generate_series(0, 9) AS n(n)
WHERE g.code = 'xy_28'
  AND NOT EXISTS (
    SELECT 1 FROM play_items pi
    WHERE pi.games_id = g.id AND pi.group_id = pg.id AND pi.bet_content = pg.code || '_' || n.n
  );

INSERT INTO play_items (games_id, group_id, bet_content, label, odds)
SELECT g.id, pg.id, 'sum_' || s.s, s.s::TEXT, CASE
  WHEN s.s IN (0, 27) THEN 88.0
  WHEN s.s IN (1, 26) THEN 48.0
  WHEN s.s IN (2, 25) THEN 28.0
  WHEN s.s IN (3, 24) THEN 18.0
  ELSE 12.0
END
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'hz28'
CROSS JOIN generate_series(0, 27) AS s(s)
WHERE g.code = 'xy_28'
  AND NOT EXISTS (
    SELECT 1 FROM play_items pi
    WHERE pi.games_id = g.id AND pi.group_id = pg.id AND pi.bet_content = 'sum_' || s.s
  );

INSERT INTO play_items (games_id, group_id, bet_content, label, odds)
SELECT g.id, pg.id, v.bet_content, v.label, v.odds
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'lm28'
CROSS JOIN (VALUES
  ('wave_red', '红波', 2.8), ('wave_green', '绿波', 2.8), ('wave_blue', '蓝波', 2.8)
) AS v(bet_content, label, odds)
WHERE g.code = 'xy_28'
  AND NOT EXISTS (
    SELECT 1 FROM play_items pi
    WHERE pi.games_id = g.id AND pi.group_id = pg.id AND pi.bet_content = v.bet_content
  );

-- ---------------------------------------------------------------------------
-- SSC: 第一–第五球 0–9, 牛牛 (简化)
-- ---------------------------------------------------------------------------
INSERT INTO play_groups (games_id, code, name, sort)
SELECT g.id, v.code, v.name, v.sort
FROM games g
CROSS JOIN (VALUES
  ('b2', '第二球', 2), ('b3', '第三球', 3), ('b4', '第四球', 4), ('b5', '第五球', 5),
  ('nn', '牛牛', 6)
) AS v(code, name, sort)
WHERE g.code = 'df_ssc'
ON CONFLICT (games_id, code) DO UPDATE SET name = EXCLUDED.name, sort = EXCLUDED.sort;

INSERT INTO play_items (games_id, group_id, bet_content, label, odds)
SELECT g.id, pg.id, pg.code || '_' || n.n, n.n::TEXT, 9.8
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code IN ('ball1', 'b2', 'b3', 'b4', 'b5')
CROSS JOIN generate_series(0, 9) AS n(n)
WHERE g.code = 'df_ssc'
  AND NOT EXISTS (
    SELECT 1 FROM play_items pi
    WHERE pi.games_id = g.id AND pi.group_id = pg.id AND pi.bet_content = pg.code || '_' || n.n
  );

INSERT INTO play_items (games_id, group_id, bet_content, label, odds)
SELECT g.id, pg.id, v.bet_content, v.label, v.odds
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'nn'
CROSS JOIN (VALUES
  ('niuniu', '牛牛', 10.0), ('wuniu', '无牛', 2.5),
  ('niu1', '牛1', 3.0), ('niu2', '牛2', 3.5), ('niu3', '牛3', 4.0),
  ('niu4', '牛4', 4.5), ('niu5', '牛5', 5.0), ('niu6', '牛6', 5.5),
  ('niu7', '牛7', 6.0), ('niu8', '牛8', 7.0), ('niu9', '牛9', 8.0)
) AS v(bet_content, label, odds)
WHERE g.code = 'df_ssc'
  AND NOT EXISTS (
    SELECT 1 FROM play_items pi
    WHERE pi.games_id = g.id AND pi.group_id = pg.id AND pi.bet_content = v.bet_content
  );

-- ---------------------------------------------------------------------------
-- Sample draw history per game type (richer analyz_result)
-- ---------------------------------------------------------------------------
INSERT INTO draw_results (games_id, issue, result, analyz_result, createtime)
SELECT g.id, v.issue, v.result, v.analy::JSONB, v.ct
FROM games g
JOIN LATERAL (VALUES
  ('df_k3',     to_char(NOW(), 'YYYYMMDD') || '101', '4,5,6',
   '{"dx":"big","ds":"odd","result":"大,单,14"}', EXTRACT(EPOCH FROM NOW())::BIGINT - 3600),
  ('xam_6',     to_char(NOW(), 'YYYYMMDD') || '102', '12,24,36,08,19,33,41',
   '{"zodiac":"马,羊,马,狗,猪,鸡,牛","dx":"big","ds":"odd"}', EXTRACT(EPOCH FROM NOW())::BIGINT - 7200),
  ('xy_28',     to_char(NOW(), 'YYYYMMDD') || '103', '3,8,2',
   '{"dx":"小","ds":"单","wave":"绿"}', EXTRACT(EPOCH FROM NOW())::BIGINT - 10800),
  ('df_ssc',    to_char(NOW(), 'YYYYMMDD') || '104', '1,5,9,3,7',
   '{"dx":"big,small,big,small,big","ds":"odd,odd,odd,odd,odd","result":"niu3,small,odd,dragon"}',
   EXTRACT(EPOCH FROM NOW())::BIGINT - 14400)
) AS v(code, issue, result, analy, ct) ON g.code = v.code
WHERE NOT EXISTS (
  SELECT 1 FROM draw_results dr WHERE dr.games_id = g.id AND dr.issue = v.issue
);

-- Summary
SELECT g.code, g.name, COUNT(DISTINCT pg.id) AS groups, COUNT(pi.id) AS items
FROM games g
LEFT JOIN play_groups pg ON pg.games_id = g.id
LEFT JOIN play_items pi ON pi.games_id = g.id AND pi.status = 1
GROUP BY g.id, g.code, g.name
ORDER BY g.sort;
