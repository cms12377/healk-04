-- Quick patch: add test_force_advance for scripts/test-all-7-games.mjs
-- Run in Supabase SQL Editor, then: node scripts/test-all-7-games.mjs

CREATE OR REPLACE FUNCTION public.test_force_advance(p_games_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_bet_win TEXT;
BEGIN
  UPDATE game_issues
  SET draw_time = EXTRACT(EPOCH FROM NOW())::BIGINT - 1
  WHERE games_id = p_games_id AND status = 0;

  v_result := advance_game_round(p_games_id);

  IF (v_result->>'skipped')::BOOLEAN THEN
    RETURN v_result;
  END IF;

  SELECT CASE WHEN COUNT(*) FILTER (WHERE is_win = '1') > 0 THEN '1' ELSE '0' END
  INTO v_bet_win
  FROM bet_records
  WHERE games_id = p_games_id AND issue = v_result->>'drawn_issue' AND status = '1';

  RETURN v_result || jsonb_build_object('bet_win', v_bet_win);
END;
$$;

GRANT EXECUTE ON FUNCTION public.test_force_advance(BIGINT) TO anon, authenticated;
