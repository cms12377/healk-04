-- th6688 parity: catalog odds/items for Mark Six zodiac, Lucky28 integrate, SSC two-side
-- Run in Supabase SQL Editor after game_betting.sql

-- ---------------------------------------------------------------------------
-- Mark Six: zodiac odds (tx vs zx differ on th6688)
-- ---------------------------------------------------------------------------
UPDATE play_items pi
SET odds = v.odds
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'tx'
CROSS JOIN (VALUES
  ('rat', 11.5), ('ox', 11.5), ('tiger', 11.5), ('rabbit', 11.5),
  ('dragon', 11.5), ('snake', 9.5), ('horse', 11.5), ('goat', 11.5),
  ('monkey', 11.5), ('rooster', 11.5), ('dog', 9.5), ('pig', 11.5)
) AS v(bet_content, odds)
WHERE g.code = 'xam_6'
  AND pi.games_id = g.id
  AND pi.group_id = pg.id
  AND pi.bet_content = v.bet_content;

UPDATE play_items pi
SET odds = v.odds
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'zx'
CROSS JOIN (VALUES
  ('rat', 1.92), ('ox', 1.92), ('tiger', 1.92), ('rabbit', 1.92),
  ('dragon', 1.92), ('snake', 1.76), ('horse', 1.92), ('goat', 1.92),
  ('monkey', 1.92), ('rooster', 1.92), ('dog', 1.92), ('pig', 1.92)
) AS v(bet_content, odds)
WHERE g.code = 'xam_6'
  AND pi.games_id = g.id
  AND pi.group_id = pg.id
  AND pi.bet_content = v.bet_content;

-- ---------------------------------------------------------------------------
-- Lucky 28 lm28: full 整合 tab (th6688 xy_28)
-- ---------------------------------------------------------------------------
INSERT INTO play_items (games_id, group_id, bet_content, label, odds)
SELECT g.id, pg.id, v.bet_content, v.label, v.odds
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'lm28'
CROSS JOIN (VALUES
  ('bigOdd', '大单', 4.22),
  ('bigEven', '大双', 3.99),
  ('smallEdd', '小单', 3.99),
  ('smallEven', '小双', 4.22),
  ('bigBig', '极大', 9.99),
  ('smallSmall', '极小', 9.99),
  ('baozi', '豹子', 90.0),
  ('shunzi', '顺子', 18.75),
  ('duizi', '对子', 3.61),
  ('dragon', '龙', 1.999),
  ('tiger', '虎', 1.999),
  ('he', '和', 9.0),
  ('red', '红波', 2.685),
  ('green', '绿波', 3.239),
  ('blue', '蓝波', 2.901)
) AS v(bet_content, label, odds)
WHERE g.code = 'xy_28'
  AND NOT EXISTS (
    SELECT 1 FROM play_items pi
    WHERE pi.games_id = g.id AND pi.group_id = pg.id AND pi.bet_content = v.bet_content
  );

UPDATE play_items pi SET status = 0
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'lm28'
WHERE g.code = 'xy_28' AND pi.games_id = g.id AND pi.group_id = pg.id
  AND pi.bet_content IN ('wave_red', 'wave_green', 'wave_blue');

-- Lucky 28 ball sides (第一/二/三球 大小单双)
INSERT INTO play_items (games_id, group_id, bet_content, label, odds)
SELECT g.id, pg.id, pg.code || '_' || v.side, v.label, 1.999
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code IN ('ball1', 'b2', 'b3')
CROSS JOIN (VALUES
  ('big', '大'), ('small', '小'), ('odd', '单'), ('even', '双')
) AS v(side, label)
WHERE g.code = 'xy_28'
  AND NOT EXISTS (
    SELECT 1 FROM play_items pi
    WHERE pi.games_id = g.id AND pi.group_id = pg.id AND pi.bet_content = pg.code || '_' || v.side
  );

-- Lucky 28 hz28 odds (th6688 sum 0–27)
UPDATE play_items pi SET odds = v.odds
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'hz28'
CROSS JOIN (VALUES
  (0, 940.0), (1, 313.0), (2, 155.0), (3, 90.0), (4, 64.0), (5, 44.0), (6, 33.0),
  (7, 26.0), (8, 20.9), (9, 17.1), (10, 14.92), (11, 13.5), (12, 12.8), (13, 12.5),
  (14, 12.5), (15, 12.8), (16, 13.5), (17, 14.92), (18, 17.1), (19, 20.9), (20, 26.0),
  (21, 33.0), (22, 44.0), (23, 64.0), (24, 90.0), (25, 155.0), (26, 313.0), (27, 940.0)
) AS v(n, odds)
WHERE g.code = 'xy_28'
  AND pi.games_id = g.id
  AND pi.group_id = pg.id
  AND pi.bet_content = 'sum_' || v.n;

-- ---------------------------------------------------------------------------
-- SSC: sum group (总和/龙虎) + ball two-side per rank
-- ---------------------------------------------------------------------------
INSERT INTO play_groups (games_id, code, name, sort)
SELECT g.id, 'sum', '总和', 0
FROM games g WHERE g.code = 'df_ssc'
ON CONFLICT (games_id, code) DO UPDATE SET name = EXCLUDED.name, sort = EXCLUDED.sort;

INSERT INTO play_items (games_id, group_id, bet_content, label, odds)
SELECT g.id, pg.id, v.bet_content, v.label, v.odds
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'sum'
CROSS JOIN (VALUES
  ('sum_big', '大', 1.999), ('sum_small', '小', 1.999),
  ('sum_odd', '单', 1.999), ('sum_even', '双', 1.999),
  ('sum_dragon', '龙', 1.99), ('sum_tiger', '虎', 1.99), ('sum_he', '和', 9.55)
) AS v(bet_content, label, odds)
WHERE g.code = 'df_ssc'
  AND NOT EXISTS (
    SELECT 1 FROM play_items pi
    WHERE pi.games_id = g.id AND pi.group_id = pg.id AND pi.bet_content = v.bet_content
  );

INSERT INTO play_items (games_id, group_id, bet_content, label, odds)
SELECT g.id, pg.id, pg.code || '_' || v.side, v.label, 1.999
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code IN ('ball1', 'b2', 'b3', 'b4', 'b5')
CROSS JOIN (VALUES
  ('big', '大'), ('small', '小'), ('odd', '单'), ('even', '双')
) AS v(side, label)
WHERE g.code = 'df_ssc'
  AND NOT EXISTS (
    SELECT 1 FROM play_items pi
    WHERE pi.games_id = g.id AND pi.group_id = pg.id AND pi.bet_content = pg.code || '_' || v.side
  );
