-- Remove duplicate SSC ball1 bare side bets (use ball1_big etc. + sum group instead)
UPDATE play_items pi SET status = 0
FROM games g
JOIN play_groups pg ON pg.games_id = g.id AND pg.code = 'ball1'
WHERE g.code = 'df_ssc'
  AND pi.games_id = g.id
  AND pi.group_id = pg.id
  AND pi.bet_content IN ('big', 'small', 'odd', 'even');
