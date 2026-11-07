-- Mark Six (xam_6) parity with..vip aoLiu — categories, labels, odds
-- Reference: tm = 特码(49) + 两面(7 incl. wave) | zm = 正码(49) + 两面(总*) | tx/zx = 12 zodiac

INSERT INTO play_categories (games_id, name)
SELECT g.id, v.name
FROM games g
CROSS JOIN (VALUES ('特码'), ('正码'), ('两面'), ('波色')) AS v(name)
WHERE g.code = 'xam_6'
  AND NOT EXISTS (
    SELECT 1 FROM play_categories pc
    WHERE pc.games_id = g.id AND pc.name = v.name
  );

-- tm numbers → 特码
UPDATE play_items pi
SET category_id = pc.id
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'tm'
JOIN play_categories pc ON pc.games_id = g.id AND pc.name = '特码'
WHERE g.code = 'xam_6'
  AND pi.games_id = g.id
  AND pi.group_id = pg.id
  AND pi.bet_content LIKE 'tm_%';

-- zm numbers → 正码
UPDATE play_items pi
SET category_id = pc.id
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'zm'
JOIN play_categories pc ON pc.games_id = g.id AND pc.name = '正码'
WHERE g.code = 'xam_6'
  AND pi.games_id = g.id
  AND pi.group_id = pg.id
  AND pi.bet_content LIKE 'zm_%';

-- tm 两面 (big/small/odd/even)
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
    WHERE pi.games_id = g.id AND pi.group_id = pg.id
      AND pi.bet_content = v.bet_content AND pi.category_id = pc.id
  );

-- tm wave → 两面 (th6688 merges 波色 into 两面, not a separate tab section)
UPDATE play_items pi
SET category_id = pc_lm.id,
    odds = v.odds
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'tm'
JOIN play_categories pc_lm ON pc_lm.games_id = g.id AND pc_lm.name = '两面'
JOIN play_categories pc_bs ON pc_bs.games_id = g.id AND pc_bs.name = '波色'
CROSS JOIN (VALUES
  ('red', 2.7), ('blue', 2.9), ('green', 2.9)
) AS v(bet_content, odds)
WHERE g.code = 'xam_6'
  AND pi.games_id = g.id
  AND pi.group_id = pg.id
  AND pi.category_id = pc_bs.id
  AND pi.bet_content = v.bet_content;

INSERT INTO play_items (games_id, group_id, category_id, bet_content, label, odds)
SELECT g.id, pg.id, pc.id, v.bet_content, v.label, v.odds
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'tm'
JOIN play_categories pc ON pc.games_id = g.id AND pc.name = '两面'
CROSS JOIN (VALUES
  ('red', '红波', 2.7), ('blue', '蓝波', 2.9), ('green', '绿波', 2.9)
) AS v(bet_content, label, odds)
WHERE g.code = 'xam_6'
  AND NOT EXISTS (
    SELECT 1 FROM play_items pi
    WHERE pi.games_id = g.id AND pi.group_id = pg.id
      AND pi.bet_content = v.bet_content AND pi.category_id = pc.id
  );

-- zm 两面 — labels 总大/总小/总单/总双 (sum of 6 regular balls)
INSERT INTO play_items (games_id, group_id, category_id, bet_content, label, odds)
SELECT g.id, pg.id, pc.id, v.bet_content, v.label, v.odds
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'zm'
JOIN play_categories pc ON pc.games_id = g.id AND pc.name = '两面'
CROSS JOIN (VALUES
  ('big', '总大', 1.97), ('small', '总小', 1.97),
  ('odd', '总单', 1.97), ('even', '总双', 1.97)
) AS v(bet_content, label, odds)
WHERE g.code = 'xam_6'
  AND NOT EXISTS (
    SELECT 1 FROM play_items pi
    WHERE pi.games_id = g.id AND pi.group_id = pg.id
      AND pi.bet_content = v.bet_content AND pi.category_id = pc.id
  );

UPDATE play_items pi
SET label = v.label
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'zm'
JOIN play_categories pc ON pc.games_id = g.id AND pc.name = '两面'
CROSS JOIN (VALUES
  ('big', '总大'), ('small', '总小'), ('odd', '总单'), ('even', '总双')
) AS v(bet_content, label)
WHERE g.code = 'xam_6'
  AND pi.games_id = g.id
  AND pi.group_id = pg.id
  AND pi.category_id = pc.id
  AND pi.bet_content = v.bet_content;

--. odds
UPDATE play_items pi SET odds = 48.8
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'tm'
WHERE g.code = 'xam_6' AND pi.games_id = g.id AND pi.group_id = pg.id
  AND pi.bet_content LIKE 'tm_%';

UPDATE play_items pi SET odds = 7.21
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'zm'
WHERE g.code = 'xam_6' AND pi.games_id = g.id AND pi.group_id = pg.id
  AND pi.bet_content LIKE 'zm_%';

UPDATE play_items pi SET odds = v.odds
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

UPDATE play_items pi SET odds = v.odds
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'zx'
CROSS JOIN (VALUES
  ('rat', 1.92), ('ox', 1.92), ('tiger', 1.92), ('rabbit', 1.92),
  ('dragon', 1.92), ('snake', 1.76), ('horse', 1.92), ('goat', 1.92),
  ('monkey', 1.92), ('rooster', 1.92), ('dog', 1.76), ('pig', 1.92)
) AS v(bet_content, odds)
WHERE g.code = 'xam_6'
  AND pi.games_id = g.id
  AND pi.group_id = pg.id
  AND pi.bet_content = v.bet_content;

-- Hide legacy sidebar groups (lm, bs standalone)
UPDATE play_items pi SET status = 0
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code IN ('lm', 'bs')
WHERE g.code = 'xam_6' AND pi.games_id = g.id AND pi.group_id = pg.id;
