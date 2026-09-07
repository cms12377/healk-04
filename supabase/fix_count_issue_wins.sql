-- Count winning pending bets for an issue without settling.
-- Used by advance_game_round (result_wins). Missing from earlier SQL files;
-- original production DB already had this helper.
-- Run on a NEW project after the scheduled-draw chain.

BEGIN;

CREATE OR REPLACE FUNCTION public.fn_count_issue_wins(
  p_games_id BIGINT,
  p_issue VARCHAR,
  p_result TEXT
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bet RECORD;
  v_n INT := 0;
  v_group_code TEXT;
  v_game_code TEXT;
  v_bc TEXT;
BEGIN
  SELECT code INTO v_game_code FROM games WHERE id = p_games_id;
  IF v_game_code IS NULL THEN
    RETURN 0;
  END IF;

  FOR v_bet IN
    SELECT br.bet_content, br.play_item_id, pg.code AS group_code, pi.bet_content AS item_bc
    FROM bet_records br
    LEFT JOIN play_items pi ON pi.id = br.play_item_id
    LEFT JOIN play_groups pg ON pg.id = pi.group_id
    WHERE br.games_id = p_games_id
      AND br.issue = p_issue
      AND br.status = '0'
  LOOP
    v_group_code := COALESCE(v_bet.group_code, '');
    v_bc := regexp_replace(
      COALESCE(NULLIF(trim(v_bet.bet_content), ''), v_bet.item_bc, ''),
      '[,，、]',
      '',
      'g'
    );
    IF fn_evaluate_bet_win(v_game_code, v_group_code, v_bc, p_result) THEN
      v_n := v_n + 1;
    END IF;
  END LOOP;

  RETURN v_n;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_count_issue_wins(BIGINT, VARCHAR, TEXT) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
