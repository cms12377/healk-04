-- SSC + Lucky28 play catalog parity with. (two-side / integrate tabs)
-- Run after play_items_full.sql and fix_other_games.sql

BEGIN;

-- ---------------------------------------------------------------------------
-- SSC: sum group (รวม/มังกร-เสือ) + per-ball sides (ball1_big … b5_even)
-- ---------------------------------------------------------------------------
INSERT INTO play_groups (games_id, code, name, sort)
SELECT g.id, 'sum', 'รวม/มังกร-เสือ', 0
FROM games g
WHERE g.code = 'df_ssc'
ON CONFLICT (games_id, code) DO UPDATE SET name = EXCLUDED.name, sort = EXCLUDED.sort;

INSERT INTO play_items (games_id, group_id, bet_content, label, odds)
SELECT g.id, pg.id, v.bet_content, v.label, v.odds
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'sum'
CROSS JOIN (VALUES
  ('sum_big',    'รวมใหญ่', 1.98),
  ('sum_small',  'รวมเล็ก', 1.98),
  ('sum_odd',    'รวมคี่', 1.98),
  ('sum_even',   'รวมคู่', 1.98),
  ('sum_dragon', 'มังกร', 2.0),
  ('sum_tiger',  'เสือ', 2.0),
  ('sum_he',     'เสมอ', 9.0)
) AS v(bet_content, label, odds)
WHERE g.code = 'df_ssc'
  AND NOT EXISTS (
    SELECT 1 FROM play_items pi
    WHERE pi.games_id = g.id AND pi.group_id = pg.id AND pi.bet_content = v.bet_content
  );

-- Disable legacy bare ball1 sides (UI uses ball1_big format)
UPDATE play_items pi SET status = 0
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'ball1'
WHERE g.code = 'df_ssc'
  AND pi.games_id = g.id
  AND pi.group_id = pg.id
  AND pi.bet_content IN ('big', 'small', 'odd', 'even');

INSERT INTO play_items (games_id, group_id, bet_content, label, odds)
SELECT g.id, pg.id, pg.code || '_' || v.side, v.label, 1.98
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code IN ('ball1', 'b2', 'b3', 'b4', 'b5')
CROSS JOIN (VALUES
  ('big', 'ใหญ่'), ('small', 'เล็ก'), ('odd', 'คี่'), ('even', 'คู่')
) AS v(side, label)
WHERE g.code = 'df_ssc'
  AND NOT EXISTS (
    SELECT 1 FROM play_items pi
    WHERE pi.games_id = g.id AND pi.group_id = pg.id AND pi.bet_content = pg.code || '_' || v.side
  );

-- ---------------------------------------------------------------------------
-- Lucky 28: lm28 integrate combos + per-ball sides
-- ---------------------------------------------------------------------------
INSERT INTO play_items (games_id, group_id, bet_content, label, odds)
SELECT g.id, pg.id, v.bet_content, v.label, v.odds
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'lm28'
CROSS JOIN (VALUES
  ('bigOdd',      'ใหญ่+คี่', 3.5),
  ('bigEven',     'ใหญ่+คู่', 3.5),
  ('smallEdd',    'เล็ก+คี่', 3.5),
  ('smallEven',   'เล็ก+คู่', 3.5),
  ('bigBig',      'สูงมาก', 15.0),
  ('smallSmall',  'ต่ำมาก', 15.0),
  ('baozi',       'ตอง', 50.0),
  ('duizi',       'คู่', 3.2),
  ('shunzi',      'เรียง', 8.0),
  ('dragon',      'มังกร', 2.0),
  ('tiger',       'เสือ', 2.0),
  ('he',          'เสมอ', 9.0)
) AS v(bet_content, label, odds)
WHERE g.code = 'xy_28'
  AND NOT EXISTS (
    SELECT 1 FROM play_items pi
    WHERE pi.games_id = g.id AND pi.group_id = pg.id AND pi.bet_content = v.bet_content
  );

INSERT INTO play_items (games_id, group_id, bet_content, label, odds)
SELECT g.id, pg.id, pg.code || '_' || v.side, v.label, 1.98
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code IN ('ball1', 'b2', 'b3')
CROSS JOIN (VALUES
  ('big', 'ใหญ่'), ('small', 'เล็ก'), ('odd', 'คี่'), ('even', 'คู่')
) AS v(side, label)
WHERE g.code = 'xy_28'
  AND NOT EXISTS (
    SELECT 1 FROM play_items pi
    WHERE pi.games_id = g.id AND pi.group_id = pg.id AND pi.bet_content = pg.code || '_' || v.side
  );

-- อัปเดต label ภาษาไทย (กรณีรันสคริปต์เวอร์ชันเก่าที่เป็น中文 แล้ว)
UPDATE play_items pi
SET label = map.label
FROM (
  SELECT g.id AS games_id, pg.id AS group_id, v.bet_content, v.label
  FROM (VALUES
    ('df_ssc', 'sum', 'sum_big',    'รวมใหญ่'),
    ('df_ssc', 'sum', 'sum_small',  'รวมเล็ก'),
    ('df_ssc', 'sum', 'sum_odd',    'รวมคี่'),
    ('df_ssc', 'sum', 'sum_even',   'รวมคู่'),
    ('df_ssc', 'sum', 'sum_dragon', 'มังกร'),
    ('df_ssc', 'sum', 'sum_tiger',  'เสือ'),
    ('df_ssc', 'sum', 'sum_he',     'เสมอ'),
    ('xy_28', 'lm28', 'bigOdd',      'ใหญ่+คี่'),
    ('xy_28', 'lm28', 'bigEven',     'ใหญ่+คู่'),
    ('xy_28', 'lm28', 'smallEdd',    'เล็ก+คี่'),
    ('xy_28', 'lm28', 'smallEven',   'เล็ก+คู่'),
    ('xy_28', 'lm28', 'bigBig',      'สูงมาก'),
    ('xy_28', 'lm28', 'smallSmall',  'ต่ำมาก'),
    ('xy_28', 'lm28', 'baozi',       'ตอง'),
    ('xy_28', 'lm28', 'duizi',       'คู่'),
    ('xy_28', 'lm28', 'shunzi',      'เรียง'),
    ('xy_28', 'lm28', 'dragon',      'มังกร'),
    ('xy_28', 'lm28', 'tiger',       'เสือ'),
    ('xy_28', 'lm28', 'he',          'เสมอ')
  ) AS v(game_code, group_code, bet_content, label)
  INNER JOIN games g ON g.code = v.game_code
  INNER JOIN play_groups pg ON pg.games_id = g.id AND pg.code = v.group_code
) AS map
WHERE pi.games_id = map.games_id
  AND pi.group_id = map.group_id
  AND pi.bet_content = map.bet_content;

UPDATE play_items pi
SET label = map.label
FROM (
  SELECT g.id AS games_id, pg.id AS group_id, pg.code || '_' || v.side AS bet_content, v.label
  FROM games g
  INNER JOIN play_groups pg ON pg.games_id = g.id
  CROSS JOIN (VALUES
    ('big', 'ใหญ่'), ('small', 'เล็ก'), ('odd', 'คี่'), ('even', 'คู่')
  ) AS v(side, label)
  WHERE g.code = 'df_ssc'
    AND pg.code IN ('ball1', 'b2', 'b3', 'b4', 'b5')
) AS map
WHERE pi.games_id = map.games_id
  AND pi.group_id = map.group_id
  AND pi.bet_content = map.bet_content;

UPDATE play_items pi
SET label = map.label
FROM (
  SELECT g.id AS games_id, pg.id AS group_id, pg.code || '_' || v.side AS bet_content, v.label
  FROM games g
  INNER JOIN play_groups pg ON pg.games_id = g.id
  CROSS JOIN (VALUES
    ('big', 'ใหญ่'), ('small', 'เล็ก'), ('odd', 'คี่'), ('even', 'คู่')
  ) AS v(side, label)
  WHERE g.code = 'xy_28'
    AND pg.code IN ('ball1', 'b2', 'b3')
) AS map
WHERE pi.games_id = map.games_id
  AND pi.group_id = map.group_id
  AND pi.bet_content = map.bet_content;

UPDATE play_groups
SET name = 'รวม/มังกร-เสือ'
WHERE games_id = (SELECT id FROM games WHERE code = 'df_ssc')
  AND code = 'sum';

COMMIT;
