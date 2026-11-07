-- Game catalog + core data verification (th6688 parity)
-- Run in Supabase SQL Editor — read-only checks, safe anytime

-- ---------------------------------------------------------------------------
-- 1) Global row counts
-- ---------------------------------------------------------------------------
SELECT '=== GLOBAL COUNTS ===' AS section, '' AS detail, '' AS status;

SELECT
  check_name,
  actual::TEXT AS actual,
  expected::TEXT AS expected,
  CASE WHEN actual >= expected THEN 'PASS' ELSE 'FAIL' END AS status
FROM (
  SELECT 'games' AS check_name, COUNT(*)::INT AS actual, 7 AS expected FROM games
  UNION ALL SELECT 'games_active', COUNT(*)::INT, 7 FROM games WHERE status = 1
  UNION ALL SELECT 'open_issues', COUNT(*)::INT, 7 FROM game_issues WHERE status = 0
  UNION ALL SELECT 'vip_tiers', COUNT(*)::INT, 6 FROM vip_tiers
  UNION ALL SELECT 'activities', COUNT(*)::INT, 4 FROM activities WHERE status = 1
  UNION ALL SELECT 'user_notices', COUNT(*)::INT, 3 FROM user_notices
  UNION ALL SELECT 'recharge_channels', COUNT(*)::INT, 2 FROM recharge_channels WHERE status = 1
) t
ORDER BY check_name;

-- ---------------------------------------------------------------------------
-- 2) Per-game play_groups count
-- ---------------------------------------------------------------------------
SELECT '=== PLAY GROUPS PER GAME ===' AS section, '' AS detail, '' AS status;

SELECT
  g.code,
  COUNT(pg.id)::TEXT AS groups,
  CASE g.code
    WHEN 'df_pk10' THEN '13'
    WHEN 'df_pk10_3' THEN '13'
    WHEN 'df_pk10_5' THEN '13'
    WHEN 'df_k3' THEN '7'
    WHEN 'xam_6' THEN '5'
    WHEN 'xy_28' THEN '5'
    WHEN 'df_ssc' THEN '7'
    ELSE '?'
  END AS expected_min,
  CASE
    WHEN g.code IN ('df_pk10', 'df_pk10_3', 'df_pk10_5') AND COUNT(pg.id) >= 13 THEN 'PASS'
    WHEN g.code = 'df_k3' AND COUNT(pg.id) = 7 THEN 'PASS'
    WHEN g.code = 'xam_6' AND COUNT(pg.id) >= 5 THEN 'PASS'
    WHEN g.code = 'xy_28' AND COUNT(pg.id) >= 5 THEN 'PASS'
    WHEN g.code = 'df_ssc' AND COUNT(pg.id) >= 7 THEN 'PASS'
    ELSE 'FAIL'
  END AS status
FROM games g
LEFT JOIN play_groups pg ON pg.games_id = g.id
GROUP BY g.id, g.code
ORDER BY g.sort, g.id;

-- ---------------------------------------------------------------------------
-- 3) PK10 catalog depth (×3 games)
-- ---------------------------------------------------------------------------
SELECT '=== PK10 CATALOG ===' AS section, '' AS detail, '' AS status;

SELECT
  g.code,
  'gy_sum_3_19' AS metric,
  COUNT(*) FILTER (WHERE pi.bet_content LIKE 'gy_sum_%')::TEXT AS actual,
  '17' AS expected,
  CASE WHEN COUNT(*) FILTER (WHERE pi.bet_content LIKE 'gy_sum_%') >= 17 THEN 'PASS' ELSE 'FAIL' END AS status
FROM games g
LEFT JOIN play_items pi ON pi.games_id = g.id AND pi.status = 1
WHERE g.code IN ('df_pk10', 'df_pk10_3', 'df_pk10_5')
GROUP BY g.code
UNION ALL
SELECT g.code, 'gyj_sides',
  COUNT(*) FILTER (WHERE pi.bet_content LIKE 'gyj_%')::TEXT, '4',
  CASE WHEN COUNT(*) FILTER (WHERE pi.bet_content LIKE 'gyj_%') >= 4 THEN 'PASS' ELSE 'FAIL' END
FROM games g LEFT JOIN play_items pi ON pi.games_id = g.id AND pi.status = 1
WHERE g.code IN ('df_pk10', 'df_pk10_3', 'df_pk10_5') GROUP BY g.code
UNION ALL
SELECT g.code, 'lm_rank_sides',
  COUNT(*) FILTER (WHERE pi.bet_content LIKE 'lm_r%')::TEXT, '40',
  CASE WHEN COUNT(*) FILTER (WHERE pi.bet_content LIKE 'lm_r%') >= 40 THEN 'PASS' ELSE 'FAIL' END
FROM games g LEFT JOIN play_items pi ON pi.games_id = g.id AND pi.status = 1
WHERE g.code IN ('df_pk10', 'df_pk10_3', 'df_pk10_5') GROUP BY g.code
UNION ALL
SELECT g.code, 'rank_pick_n1_10',
  COUNT(*) FILTER (WHERE pi.bet_content ~ '^n[0-9]+$')::TEXT, '100',
  CASE WHEN COUNT(*) FILTER (WHERE pi.bet_content ~ '^n[0-9]+$') >= 100 THEN 'PASS' ELSE 'FAIL' END
FROM games g LEFT JOIN play_items pi ON pi.games_id = g.id AND pi.status = 1
WHERE g.code IN ('df_pk10', 'df_pk10_3', 'df_pk10_5') GROUP BY g.code
ORDER BY code, metric;

-- ---------------------------------------------------------------------------
-- 4) K3 catalog
-- ---------------------------------------------------------------------------
SELECT '=== K3 CATALOG ===' AS section, '' AS detail, '' AS status;

SELECT
  'df_k3' AS code,
  metric,
  actual::TEXT,
  expected::TEXT,
  CASE WHEN actual >= expected THEN 'PASS' ELSE 'FAIL' END AS status
FROM (
  SELECT 'groups' AS metric, COUNT(DISTINCT pg.code)::INT AS actual, 7 AS expected
  FROM games g JOIN play_groups pg ON pg.games_id = g.id WHERE g.code = 'df_k3'
  UNION ALL
  SELECT 'hz_items', COUNT(*)::INT, 20
  FROM games g
  JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'hz'
  JOIN play_items pi ON pi.group_id = pg.id AND pi.status = 1
  WHERE g.code = 'df_k3'
  UNION ALL
  SELECT 'sth_triples', COUNT(*)::INT, 6
  FROM games g
  JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'sth'
  JOIN play_items pi ON pi.group_id = pg.id AND pi.status = 1
  WHERE g.code = 'df_k3'
) k;

-- ---------------------------------------------------------------------------
-- 5) Mark Six catalog
-- ---------------------------------------------------------------------------
SELECT '=== MARK SIX CATALOG ===' AS section, '' AS detail, '' AS status;

SELECT metric, actual::TEXT, expected::TEXT,
  CASE WHEN actual >= expected THEN 'PASS' ELSE 'FAIL' END AS status
FROM (
  SELECT 'tm_numbers' AS metric, COUNT(*)::INT AS actual, 49 AS expected
  FROM games g
  JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'tm'
  JOIN play_items pi ON pi.group_id = pg.id AND pi.status = 1
  WHERE g.code = 'xam_6' AND pi.bet_content LIKE 'tm_%'
  UNION ALL
  SELECT 'zm_numbers', COUNT(*)::INT, 49
  FROM games g
  JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'zm'
  JOIN play_items pi ON pi.group_id = pg.id AND pi.status = 1
  WHERE g.code = 'xam_6' AND pi.bet_content LIKE 'zm_%'
  UNION ALL
  SELECT 'zodiac_groups', COUNT(DISTINCT pg.code)::INT, 2
  FROM games g JOIN play_groups pg ON pg.games_id = g.id
  WHERE g.code = 'xam_6' AND pg.code IN ('tx', 'zx')
) m;

-- ---------------------------------------------------------------------------
-- 6) Lucky 28 catalog (needs fix_ssc_lucky28_th6688_catalog.sql)
-- ---------------------------------------------------------------------------
SELECT '=== LUCKY 28 CATALOG ===' AS section, '' AS detail, '' AS status;

SELECT metric, actual::TEXT, expected::TEXT,
  CASE WHEN actual >= expected THEN 'PASS' ELSE 'FAIL' END AS status
FROM (
  SELECT 'lm28_combos' AS metric, COUNT(*)::INT AS actual, 16 AS expected
  FROM games g
  JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'lm28'
  JOIN play_items pi ON pi.group_id = pg.id AND pi.status = 1
  WHERE g.code = 'xy_28'
  UNION ALL
  SELECT 'ball_sides', COUNT(*)::INT, 12
  FROM games g
  JOIN play_items pi ON pi.games_id = g.id AND pi.status = 1
  WHERE g.code = 'xy_28'
    AND pi.bet_content ~ '^(ball1|b2|b3)_(big|small|odd|even)$'
  UNION ALL
  SELECT 'hz28_sum', COUNT(*)::INT, 28
  FROM games g
  JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'hz28'
  JOIN play_items pi ON pi.group_id = pg.id AND pi.status = 1
  WHERE g.code = 'xy_28'
) l;

-- ---------------------------------------------------------------------------
-- 7) SSC catalog (needs fix_ssc_lucky28_th6688_catalog.sql)
-- ---------------------------------------------------------------------------
SELECT '=== SSC CATALOG ===' AS section, '' AS detail, '' AS status;

SELECT metric, actual::TEXT, expected::TEXT,
  CASE WHEN actual >= expected THEN 'PASS' ELSE 'FAIL' END AS status
FROM (
  SELECT 'sum_group' AS metric, COUNT(*)::INT AS actual, 7 AS expected
  FROM games g
  JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'sum'
  JOIN play_items pi ON pi.group_id = pg.id AND pi.status = 1
  WHERE g.code = 'df_ssc'
  UNION ALL
  SELECT 'ball_sides', COUNT(*)::INT, 20
  FROM games g
  JOIN play_items pi ON pi.games_id = g.id AND pi.status = 1
  WHERE g.code = 'df_ssc'
    AND pi.bet_content ~ '^(ball1|b[2-5])_(big|small|odd|even)$'
  UNION ALL
  SELECT 'niuniu', COUNT(*)::INT, 11
  FROM games g
  JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'nn'
  JOIN play_items pi ON pi.group_id = pg.id AND pi.status = 1
  WHERE g.code = 'df_ssc'
) s;

-- ---------------------------------------------------------------------------
-- 8) Game engine columns (draw_mode)
-- ---------------------------------------------------------------------------
SELECT '=== GAME ENGINE ===' AS section, '' AS detail, '' AS status;

SELECT
  check_name,
  actual::TEXT,
  expected::TEXT,
  CASE WHEN actual >= expected THEN 'PASS' ELSE 'FAIL' END AS status
FROM (
  SELECT 'games_with_draw_mode' AS check_name,
    COUNT(*) FILTER (WHERE draw_mode IN ('random', 'manual'))::INT AS actual, 7 AS expected
  FROM games
) e;

-- ---------------------------------------------------------------------------
-- 9) Missing groups summary (quick fix hints)
-- ---------------------------------------------------------------------------
SELECT '=== MISSING GROUP HINTS ===' AS section, '' AS detail, '' AS status;

SELECT g.code, 'missing_group:' || v.grp AS hint
FROM games g
CROSS JOIN LATERAL (
  VALUES
    ('df_pk10', 'gyj'), ('df_pk10_3', 'gyj'), ('df_pk10_5', 'gyj'),
    ('df_k3', 'hz'), ('df_k3', 'slh'),
    ('xam_6', 'tm'), ('xam_6', 'zm'),
    ('xy_28', 'hz28'), ('xy_28', 'ball1'),
    ('df_ssc', 'sum'), ('df_ssc', 'nn')
) AS v(game_code, grp)
WHERE g.code = v.game_code
  AND NOT EXISTS (
    SELECT 1 FROM play_groups pg
    WHERE pg.games_id = g.id AND pg.code = v.grp
  )
ORDER BY g.code, hint;

-- ---------------------------------------------------------------------------
-- 10) RPC existence (bonus + betting)
-- ---------------------------------------------------------------------------
SELECT '=== RPC FUNCTIONS ===' AS section, '' AS detail, '' AS status;

SELECT
  proname AS rpc,
  CASE WHEN proname IS NOT NULL THEN 'PASS' ELSE 'FAIL' END AS status
FROM (
  VALUES
    ('submit_bets'),
    ('advance_game_round'),
    ('admin_list_games'),
    ('admin_list_activities'),
    ('admin_list_vip_tiers'),
    ('admin_list_user_notices')
) AS required(name)
LEFT JOIN pg_proc p ON p.proname = required.name AND p.pronamespace = 'public'::regnamespace
ORDER BY required.name;
