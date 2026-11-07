-- K3 full catalog aligned with..vip (laoadmin df_k3)
-- Sidebar: ผลรวม | เรียง | ตอง | ไม่ซ้ำ 3 | คู่เดียวกัน | ไม่ซ้ำ 2 | คู่+เดี่ยว
-- Run in Supabase SQL Editor after database.sql / play_items_full.sql

DELETE FROM play_items pi
USING play_groups pg, games g
WHERE pi.group_id = pg.id AND pg.games_id = g.id AND g.code = 'df_k3' AND pg.code = 'k3lm';

DELETE FROM play_groups pg
USING games g
WHERE pg.games_id = g.id AND g.code = 'df_k3' AND pg.code = 'k3lm';

DELETE FROM play_items pi
USING play_groups pg, games g
WHERE pi.group_id = pg.id AND pg.games_id = g.id AND g.code = 'df_k3' AND pg.code = 'hz'
  AND pi.bet_content IN ('k3_big', 'k3_small', 'k3_odd', 'k3_even', 'total_big', 'total_small', 'total_odd', 'total_even');

DELETE FROM play_items pi
USING games g
WHERE pi.games_id = g.id AND g.code = 'df_k3'
  AND (
    pi.bet_content ~ '^sum_\d+$'
    OR pi.bet_content ~ '^triple_\d$'
    OR pi.bet_content IN ('straight', 'straight_all')
  );

INSERT INTO play_groups (games_id, code, name, sort)
SELECT g.id, v.code, v.name, v.sort
FROM games g
CROSS JOIN (VALUES
  ('hz',   'ผลรวม',           1),
  ('slh',  'เรียง',            2),
  ('sth',  'ตอง',              3),
  ('sbdh', 'ไม่ซ้ำ 3 ลูก',     4),
  ('eth',  'คู่เดียวกัน',      5),
  ('ebdh', 'ไม่ซ้ำ 2 ลูก',     6),
  ('etdx', 'คู่+เดี่ยว',       7)
) AS v(code, name, sort)
WHERE g.code = 'df_k3'
ON CONFLICT (games_id, code) DO UPDATE SET name = EXCLUDED.name, sort = EXCLUDED.sort;

INSERT INTO play_items (games_id, group_id, bet_content, label, odds)
SELECT g.id, pg.id, v.bet_content, v.label, v.odds
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'hz'
CROSS JOIN (VALUES
  ('big',   'ใหญ่', 1.99), ('small', 'เล็ก', 1.99),
  ('odd',   'คี่',  1.99), ('even',  'คู่',  1.99),
  ('3',  '3',  209.52), ('4',  '4',  69.84),
  ('5',  '5',  34.92), ('6',  '6',  20.95),
  ('7',  '7',  13.96), ('8',  '8',  9.97),
  ('9',  '9',  8.37),  ('10', '10', 7.76),
  ('11', '11', 7.76),  ('12', '12', 8.37),
  ('13', '13', 9.97),  ('14', '14', 13.96),
  ('15', '15', 20.95), ('16', '16', 34.92),
  ('17', '17', 69.84), ('18', '18', 209.52)
) AS v(bet_content, label, odds)
WHERE g.code = 'df_k3'
  AND NOT EXISTS (
    SELECT 1 FROM play_items pi
    WHERE pi.games_id = g.id AND pi.group_id = pg.id AND pi.bet_content = v.bet_content
  );

INSERT INTO play_items (games_id, group_id, bet_content, label, odds)
SELECT g.id, pg.id, v.bet_content, v.label, v.odds
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'slh'
CROSS JOIN (VALUES
  ('123', '123', 34.92), ('234', '234', 34.92),
  ('345', '345', 34.92), ('456', '456', 34.92)
) AS v(bet_content, label, odds)
WHERE g.code = 'df_k3'
  AND NOT EXISTS (
    SELECT 1 FROM play_items pi
    WHERE pi.games_id = g.id AND pi.group_id = pg.id AND pi.bet_content = v.bet_content
  );

INSERT INTO play_items (games_id, group_id, bet_content, label, odds)
SELECT g.id, pg.id, v.bet_content, v.label, v.odds
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'sth'
CROSS JOIN (VALUES
  ('111', '111', 209.52), ('222', '222', 209.52), ('333', '333', 209.52),
  ('444', '444', 209.52), ('555', '555', 209.52), ('666', '666', 209.52)
) AS v(bet_content, label, odds)
WHERE g.code = 'df_k3'
  AND NOT EXISTS (
    SELECT 1 FROM play_items pi
    WHERE pi.games_id = g.id AND pi.group_id = pg.id AND pi.bet_content = v.bet_content
  );

INSERT INTO play_items (games_id, group_id, bet_content, label, odds)
SELECT g.id, pg.id, d.d::TEXT || d.d::TEXT, d.d::TEXT || d.d::TEXT, 13.96
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'eth'
CROSS JOIN generate_series(1, 6) AS d(d)
WHERE g.code = 'df_k3'
  AND NOT EXISTS (
    SELECT 1 FROM play_items pi
    WHERE pi.games_id = g.id AND pi.group_id = pg.id AND pi.bet_content = d.d::TEXT || d.d::TEXT
  );

INSERT INTO play_items (games_id, group_id, bet_content, label, odds)
SELECT g.id, pg.id, v.bet_content, v.label, v.odds
FROM games g
CROSS JOIN (VALUES
  ('sbdh', '1,2,3,4,5,6', 'เลือก 3 ลูกไม่ซ้ำ', 31.86),
  ('ebdh', '1,2,3,4,5,6', 'เลือก 2 ลูกไม่ซ้ำ', 6.37),
  ('etdx', '11|1,22|2,33|3,44|4,55|5,66|6', 'คู่+เดี่ยว', 63.72)
) AS v(grp, bet_content, label, odds)
JOIN play_groups pg ON pg.games_id = g.id AND pg.code = v.grp
WHERE g.code = 'df_k3'
  AND NOT EXISTS (
    SELECT 1 FROM play_items pi
    WHERE pi.games_id = g.id AND pi.group_id = pg.id AND pi.bet_content = v.bet_content
  );

-- Sync Thai labels if rows were seeded earlier with Chinese text
UPDATE play_items pi
SET label = v.label
FROM games g
JOIN play_groups pg ON pg.games_id = g.id
CROSS JOIN (VALUES
  ('hz', 'big',   'ใหญ่'),
  ('hz', 'small', 'เล็ก'),
  ('hz', 'odd',   'คี่'),
  ('hz', 'even',  'คู่'),
  ('sbdh', '1,2,3,4,5,6', 'เลือก 3 ลูกไม่ซ้ำ'),
  ('ebdh', '1,2,3,4,5,6', 'เลือก 2 ลูกไม่ซ้ำ'),
  ('etdx', '11|1,22|2,33|3,44|4,55|5,66|6', 'คู่+เดี่ยว')
) AS v(grp, bet_content, label)
WHERE g.code = 'df_k3'
  AND pi.games_id = g.id
  AND pi.group_id = pg.id
  AND pg.code = v.grp
  AND pi.bet_content = v.bet_content;

-- Remove legacy / extra K3 play groups (keep. 7-tab sidebar only)
DELETE FROM play_items pi
USING play_groups pg, games g
WHERE pi.group_id = pg.id AND pg.games_id = g.id AND g.code = 'df_k3'
  AND pg.code NOT IN ('hz', 'slh', 'sth', 'sbdh', 'eth', 'ebdh', 'etdx');

DELETE FROM play_groups pg
USING games g
WHERE pg.games_id = g.id AND g.code = 'df_k3'
  AND pg.code NOT IN ('hz', 'slh', 'sth', 'sbdh', 'eth', 'ebdh', 'etdx');
