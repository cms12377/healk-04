-- PK10 ผลรวม: ขอบ 3, 4, 18, 19 → odds 100 (เลขสีฟ้า 3/4/18/19 คู่กับเลขแดง 100)
-- ตัวกลาง 5–17 คงอัตราเดิม (22, 14.7, 11, 8.8 …)
-- Run in Supabase SQL Editor — idempotent (แก้ได้แม้เคยรันเวอร์ชัน "ทุกตัว 100" แล้ว)

BEGIN;

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

COMMIT;
