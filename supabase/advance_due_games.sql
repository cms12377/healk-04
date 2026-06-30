-- Advance every game whose open issue is past draw_time (server-side, no browser needed)
-- Run in Supabase SQL Editor, or schedule via pg_cron every minute
-- Also called at the start of fix_game_issues_countdown.sql

BEGIN;

CREATE OR REPLACE FUNCTION public.advance_all_due_games(p_max_passes INT DEFAULT 10)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game RECORD;
  v_result JSONB;
  v_passes INT;
  v_now BIGINT;
  v_log JSONB := '[]'::JSONB;
BEGIN
  v_now := EXTRACT(EPOCH FROM NOW())::BIGINT;

  FOR v_game IN
    SELECT DISTINCT g.id, g.code
    FROM games g
    JOIN game_issues gi ON gi.games_id = g.id AND gi.status = 0
    WHERE gi.draw_time <= v_now
    ORDER BY g.id
  LOOP
    v_passes := 0;
    WHILE v_passes < GREATEST(1, p_max_passes) LOOP
      IF NOT EXISTS (
        SELECT 1 FROM game_issues
        WHERE games_id = v_game.id AND status = 0 AND draw_time <= v_now
      ) THEN
        EXIT;
      END IF;

      v_result := advance_game_round(v_game.id);
      v_log := v_log || jsonb_build_array(
        jsonb_build_object(
          'code', v_game.code,
          'games_id', v_game.id,
          'pass', v_passes + 1,
          'advance', v_result
        )
      );

      IF COALESCE((v_result->>'skipped')::BOOLEAN, FALSE) THEN
        EXIT;
      END IF;

      v_passes := v_passes + 1;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object('entries', v_log, 'count', jsonb_array_length(v_log));
END;
$$;

GRANT EXECUTE ON FUNCTION public.advance_all_due_games(INT) TO anon, authenticated;

COMMIT;

-- Quick run + verify:
-- SELECT advance_all_due_games();
-- Then: node scripts/audit-all-games.mjs
