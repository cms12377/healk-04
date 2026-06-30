-- Casino / house-edge model: operator always favored over members
-- Random mode: biased draw targets random_win_rate (default 30% bet wins per issue)
-- Manual mode: operator sets exact result (full control)
-- Run after fix_draw_mode.sql + fix_random_win_rate.sql

BEGIN;

-- Stricter house algorithm: never exceed target wins when a better option exists
CREATE OR REPLACE FUNCTION public.fn_biased_random_draw(
  p_games_id BIGINT,
  p_issue TEXT,
  p_game_code TEXT,
  p_win_rate NUMERIC DEFAULT 0.30,
  p_attempts INT DEFAULT 200
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bet_count INT;
  v_rate NUMERIC;
  v_floor INT;
  v_frac NUMERIC;
  v_target INT;
  v_candidate TEXT;
  v_wins INT;
  v_i INT;
  v_best_under_result TEXT;
  v_best_under_wins INT;
  v_best_under_diff INT := 999999;
  v_min_wins INT := 999999;
  v_min_wins_result TEXT;
BEGIN
  v_rate := LEAST(0.50, GREATEST(0.05, COALESCE(p_win_rate, 0.30)));

  SELECT COUNT(*)::INT INTO v_bet_count
  FROM bet_records
  WHERE games_id = p_games_id
    AND issue = p_issue
    AND status = '0';

  IF v_bet_count = 0 THEN
    RETURN fn_random_draw(p_game_code);
  END IF;

  v_floor := FLOOR(v_bet_count * v_rate)::INT;
  v_frac := (v_bet_count * v_rate) - v_floor;
  v_target := v_floor + CASE WHEN random() < v_frac THEN 1 ELSE 0 END;
  v_target := LEAST(v_bet_count, GREATEST(0, v_target));

  FOR v_i IN 1..GREATEST(1, p_attempts) LOOP
    v_candidate := fn_random_draw(p_game_code);
    v_wins := fn_count_issue_wins(p_games_id, p_issue, v_candidate);

    IF v_wins < v_min_wins THEN
      v_min_wins := v_wins;
      v_min_wins_result := v_candidate;
    END IF;

    IF v_wins <= v_target THEN
      IF ABS(v_wins - v_target) < v_best_under_diff
         OR (ABS(v_wins - v_target) = v_best_under_diff
             AND (v_best_under_wins IS NULL OR v_wins < v_best_under_wins))
      THEN
        v_best_under_diff := ABS(v_wins - v_target);
        v_best_under_wins := v_wins;
        v_best_under_result := v_candidate;
        IF v_best_under_diff = 0 THEN EXIT; END IF;
      END IF;
    END IF;
  END LOOP;

  IF v_best_under_result IS NOT NULL THEN
    RETURN v_best_under_result;
  END IF;

  RETURN COALESCE(v_min_wins_result, fn_random_draw(p_game_code));
END;
$$;

-- admin_list_games: expose random_win_rate for operator panel
CREATE OR REPLACE FUNCTION public.admin_list_games()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM fn_assert_staff();

  RETURN jsonb_build_object(
    'data',
    COALESCE(
      (
        SELECT jsonb_agg(row_data ORDER BY sort_val, id_val)
        FROM (
          SELECT
            g.sort AS sort_val,
            g.id AS id_val,
            jsonb_build_object(
              'id', g.id,
              'code', g.code,
              'name', g.name,
              'game_type', g.game_type,
              'status', g.status,
              'sort', g.sort,
              'draw_mode', COALESCE(g.draw_mode, 'random'),
              'random_win_rate', COALESCE(g.random_win_rate, 0.30),
              'next_draw_result', g.next_draw_result,
              'issue', gi.issue,
              'draw_time', gi.draw_time,
              'seconds_left',
                CASE
                  WHEN gi.draw_time IS NOT NULL THEN
                    GREATEST(0, gi.draw_time - EXTRACT(EPOCH FROM NOW())::BIGINT)
                  ELSE NULL
                END,
              'last_issue', dr.issue,
              'last_result', dr.result
            ) AS row_data
          FROM games g
          LEFT JOIN LATERAL (
            SELECT issue, draw_time
            FROM game_issues
            WHERE games_id = g.id AND status = 0
            ORDER BY draw_time DESC
            LIMIT 1
          ) gi ON TRUE
          LEFT JOIN LATERAL (
            SELECT issue, result
            FROM draw_results
            WHERE games_id = g.id
            ORDER BY createtime DESC
            LIMIT 1
          ) dr ON TRUE
          ORDER BY g.sort, g.id
        ) sub
      ),
      '[]'::JSONB
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_random_win_rate(
  p_games_id BIGINT,
  p_rate NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate NUMERIC;
BEGIN
  PERFORM fn_assert_staff();
  IF fn_current_user_role() <> 'admin'::user_role THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  v_rate := LEAST(0.50, GREATEST(0.05, COALESCE(p_rate, 0.30)));

  UPDATE games SET random_win_rate = v_rate WHERE id = p_games_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'game not found'; END IF;

  RETURN admin_list_games();
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_random_win_rate(BIGINT, NUMERIC) TO authenticated;

COMMIT;
