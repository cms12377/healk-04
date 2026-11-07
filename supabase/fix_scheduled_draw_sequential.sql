-- Fix: member continues sequentially (033, 034, ...) ignoring schedule gaps
-- Root cause: fn_next_issue_number counted MAX from scheduled_draw_results → jumped over gaps
-- Run after fix_scheduled_draw_issue_gap.sql

BEGIN;

-- Next live issue = MAX(game_issues, draw_results) + 1 ONLY (ignore schedule presets)
CREATE OR REPLACE FUNCTION public.fn_next_issue_number(p_games_id BIGINT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_prefix TEXT;
  v_max INT := 0;
  v_part INT;
  v_new_issue TEXT;
BEGIN
  v_prefix := to_char(NOW(), 'YYYY') || '-' || to_char(NOW(), 'MMDD');

  -- Only count actually-drawn issues (game_issues + draw_results)
  FOR v_part IN
    SELECT COALESCE(MAX(SUBSTRING(issue FROM 12 FOR 3)::INT), 0)
    FROM game_issues
    WHERE games_id = p_games_id
      AND issue ~ ('^' || v_prefix || '-[0-9]{3}$')
  LOOP
    v_max := GREATEST(v_max, v_part);
  END LOOP;

  FOR v_part IN
    SELECT COALESCE(MAX(SUBSTRING(issue FROM 12 FOR 3)::INT), 0)
    FROM draw_results
    WHERE games_id = p_games_id
      AND issue ~ ('^' || v_prefix || '-[0-9]{3}$')
  LOOP
    v_max := GREATEST(v_max, v_part);
  END LOOP;

  -- Do NOT count scheduled_draw_results → allows gap-random (021-024 random even if 025-029 preset exists)
  v_new_issue := v_prefix || '-' || lpad((v_max + 1)::TEXT, 3, '0');

  -- Collision check (should never happen with sequential advance)
  WHILE EXISTS (
    SELECT 1 FROM game_issues WHERE games_id = p_games_id AND issue = v_new_issue
  ) LOOP
    v_max := v_max + 1;
    v_new_issue := v_prefix || '-' || lpad((v_max + 1)::TEXT, 3, '0');
  END LOOP;

  RETURN v_new_issue;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_next_issue_number(BIGINT) TO authenticated;

COMMIT;
