-- Mark Six UI parity with. (4 tabs: 特码 | 正码 | 特肖 | 正肖)
-- tm/zm get category sections like reference site

INSERT INTO play_categories (games_id, name)
SELECT g.id, v.name
FROM games g
CROSS JOIN (VALUES ('特码'), ('两面'), ('波色'), ('正码')) AS v(name)
WHERE g.code = 'xam_6'
  AND NOT EXISTS (
    SELECT 1 FROM play_categories pc
    WHERE pc.games_id = g.id AND pc.name = v.name
  );

-- tm numbers → 特码 category
UPDATE play_items pi
SET category_id = pc.id
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'tm'
JOIN play_categories pc ON pc.games_id = g.id AND pc.name = '特码'
WHERE g.code = 'xam_6'
  AND pi.games_id = g.id
  AND pi.group_id = pg.id
  AND pi.bet_content LIKE 'tm_%';

-- zm numbers → 正码 category
UPDATE play_items pi
SET category_id = pc.id
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'zm'
JOIN play_categories pc ON pc.games_id = g.id AND pc.name = '正码'
WHERE g.code = 'xam_6'
  AND pi.games_id = g.id
  AND pi.group_id = pg.id
  AND pi.bet_content LIKE 'zm_%';

-- tm 两面 (special ball big/small/odd/even)
INSERT INTO play_items (games_id, group_id, category_id, bet_content, label, odds)
SELECT g.id, pg.id, pc.id, v.bet_content, v.label, v.odds
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'tm'
JOIN play_categories pc ON pc.games_id = g.id AND pc.name = '两面'
CROSS JOIN (VALUES
  ('big', '大', 1.97), ('small', '小', 1.97),
  ('odd', '单', 1.97), ('even', '双', 1.97)
) AS v(bet_content, label, odds)
WHERE g.code = 'xam_6'
  AND NOT EXISTS (
    SELECT 1 FROM play_items pi
    WHERE pi.games_id = g.id AND pi.group_id = pg.id AND pi.bet_content = v.bet_content
  );

-- tm 波色 (special ball wave)
INSERT INTO play_items (games_id, group_id, category_id, bet_content, label, odds)
SELECT g.id, pg.id, pc.id, v.bet_content, v.label, v.odds
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'tm'
JOIN play_categories pc ON pc.games_id = g.id AND pc.name = '波色'
CROSS JOIN (VALUES
  ('red', '红波', 2.7), ('blue', '蓝波', 2.9), ('green', '绿波', 2.9)
) AS v(bet_content, label, odds)
WHERE g.code = 'xam_6'
  AND NOT EXISTS (
    SELECT 1 FROM play_items pi
    WHERE pi.games_id = g.id AND pi.group_id = pg.id
      AND pi.bet_content = v.bet_content AND pi.category_id = pc.id
  );

-- zm 两面 (sum of 6 regular balls)
INSERT INTO play_items (games_id, group_id, category_id, bet_content, label, odds)
SELECT g.id, pg.id, pc.id, v.bet_content, v.label, v.odds
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'zm'
JOIN play_categories pc ON pc.games_id = g.id AND pc.name = '两面'
CROSS JOIN (VALUES
  ('big', '大', 1.97), ('small', '小', 1.97),
  ('odd', '单', 1.97), ('even', '双', 1.97)
) AS v(bet_content, label, odds)
WHERE g.code = 'xam_6'
  AND NOT EXISTS (
    SELECT 1 FROM play_items pi
    WHERE pi.games_id = g.id AND pi.group_id = pg.id AND pi.bet_content = v.bet_content
  );

-- Hide legacy sidebar groups (items kept for old bets; UI uses tm/zm only)
UPDATE play_items pi SET status = 0
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code IN ('lm', 'bs')
WHERE g.code = 'xam_6' AND pi.games_id = g.id AND pi.group_id = pg.id;
