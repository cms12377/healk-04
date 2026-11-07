-- Align admin schedule issue numbers with live open issue + fix generate start time
-- Run after fix_scheduled_draw_results.sql + fix_scheduled_draw_countdown.sql

BEGIN;

-- First schedulable seq = current open issue (if any today), else max+1 across tables
CREATE OR REPLACE FUNCTION public.fn_next_schedulable_issue_seq(
  p_games_id BIGINT,
  p_prefix TEXT
)
RETURNS INT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_open_issue TEXT;
BEGIN
  SELECT gi.issue INTO v_open_issue
  FROM game_issues gi
  WHERE gi.games_id = p_games_id
    AND gi.status = 0
    AND gi.issue ~ ('^' || p_prefix || '-[0-9]{3}$')
  ORDER BY gi.draw_time DESC
  LIMIT 1;

  IF v_open_issue IS NOT NULL THEN
    RETURN SUBSTRING(v_open_issue FROM 12 FOR 3)::INT;
  END IF;

  RETURN fn_next_issue_seq_for_prefix(p_games_id, p_prefix);
END;
$$;

-- Keep live advance in sync with schedule + draw_results max seq
CREATE OR REPLACE FUNCTION public.fn_next_issue_number(p_games_id BIGINT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_prefix TEXT;
  v_next_seq INT;
  v_new_issue TEXT;
BEGIN
  v_prefix := to_char(NOW(), 'YYYY') || '-' || to_char(NOW(), 'MMDD');
  v_next_seq := fn_next_issue_seq_for_prefix(p_games_id, v_prefix);

  LOOP
    v_new_issue := v_prefix || '-' || lpad(v_next_seq::TEXT, 3, '0');
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM game_issues gi2
      WHERE gi2.games_id = p_games_id AND gi2.issue = v_new_issue
    );
    v_next_seq := v_next_seq + 1;
  END LOOP;

  RETURN v_new_issue;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_next_issue_number(BIGINT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_generate_draw_schedule(
  p_games_id BIGINT,
  p_start_time BIGINT,
  p_end_time BIGINT,
  p_mode TEXT DEFAULT 'empty'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_cycle INT;
  v_t BIGINT;
  v_prefix TEXT;
  v_seq INT;
  v_issue TEXT;
  v_result TEXT;
  v_user_id BIGINT;
  v_created INT := 0;
  v_skipped INT := 0;
  v_now BIGINT;
  v_row_count INT;
  v_effective_start BIGINT;
  v_first_issue TEXT;
  v_last_issue TEXT;
  v_open_issue TEXT;
BEGIN
  PERFORM fn_assert_staff();
  IF fn_current_user_role() <> 'admin'::user_role THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  IF p_start_time IS NULL OR p_end_time IS NULL OR p_end_time < p_start_time THEN
    RAISE EXCEPTION 'invalid time range';
  END IF;

  IF p_mode NOT IN ('empty', 'random') THEN
    RAISE EXCEPTION 'mode must be empty or random';
  END IF;

  SELECT code INTO v_code FROM games WHERE id = p_games_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'game not found'; END IF;

  v_cycle := fn_game_cycle_seconds(v_code);
  v_user_id := fn_current_db_user_id();
  v_now := EXTRACT(EPOCH FROM NOW())::BIGINT;

  SELECT gi.issue INTO v_open_issue
  FROM game_issues gi
  WHERE gi.games_id = p_games_id AND gi.status = 0
  ORDER BY gi.draw_time DESC
  LIMIT 1;

  -- Skip past wall-clock slots; first row aligns with next drawable issue
  v_effective_start := GREATEST(p_start_time, v_now + v_cycle);
  IF v_effective_start > p_end_time THEN
    RETURN jsonb_build_object(
      'created', 0,
      'skipped', 0,
      'mode', p_mode,
      'cycle_seconds', v_cycle,
      'open_issue', v_open_issue,
      'warning', 'no_future_slots_in_range'
    );
  END IF;

  v_prefix := fn_issue_prefix_for_epoch(v_effective_start);
  v_seq := fn_next_schedulable_issue_seq(p_games_id, v_prefix);
  v_t := v_effective_start;

  WHILE v_t <= p_end_time LOOP
    v_issue := v_prefix || '-' || lpad(v_seq::TEXT, 3, '0');

    IF p_mode = 'random' THEN
      v_result := fn_random_draw(v_code);
    ELSE
      v_result := NULL;
    END IF;

    INSERT INTO scheduled_draw_results (games_id, issue, draw_time, result, status, created_by, createtime)
    VALUES (p_games_id, v_issue, v_t, v_result, 0, v_user_id, v_now)
    ON CONFLICT (games_id, issue) DO NOTHING;

    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    IF v_row_count > 0 THEN
      v_created := v_created + 1;
      IF v_first_issue IS NULL THEN
        v_first_issue := v_issue;
      END IF;
      v_last_issue := v_issue;
    ELSE
      v_skipped := v_skipped + 1;
    END IF;

    v_seq := v_seq + 1;
    v_t := v_t + v_cycle;

    IF fn_issue_prefix_for_epoch(v_t) <> v_prefix THEN
      v_prefix := fn_issue_prefix_for_epoch(v_t);
      v_seq := fn_next_schedulable_issue_seq(p_games_id, v_prefix);
    END IF;
  END LOOP;

  UPDATE games SET draw_mode = 'manual' WHERE id = p_games_id;

  RETURN jsonb_build_object(
    'created', v_created,
    'skipped', v_skipped,
    'mode', p_mode,
    'cycle_seconds', v_cycle,
    'open_issue', v_open_issue,
    'first_issue', v_first_issue,
    'last_issue', v_last_issue,
    'effective_start', v_effective_start
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_generate_draw_schedule(BIGINT, BIGINT, BIGINT, TEXT) TO authenticated;

COMMIT;
