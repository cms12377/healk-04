-- Issue-gap schedule: open 020 + admin preset 025-029 → random 021-024, preset 025-029, random 030+
-- Root fixes:
--   1) fn_resolve matches live issue only (no draw_time gate — gaps are "no row → random")
--   2) admin_generate maps wall-clock slots to issue # via open-issue timeline offset
-- Run after fix_scheduled_draw_issue_align.sql (or replaces its resolve/generate logic)

BEGIN;

CREATE OR REPLACE FUNCTION public.fn_scheduled_issue_for_slot(
  p_open_issue TEXT,
  p_open_draw_time BIGINT,
  p_slot_time BIGINT,
  p_cycle INT
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_open_prefix TEXT;
  v_slot_prefix TEXT;
  v_open_seq INT;
  v_offset INT;
  v_seq INT;
BEGIN
  IF p_open_issue IS NULL OR p_open_draw_time IS NULL OR p_cycle IS NULL OR p_cycle <= 0 THEN
    RETURN fn_issue_prefix_for_epoch(p_slot_time) || '-001';
  END IF;

  v_open_prefix := SUBSTRING(p_open_issue FROM 1 FOR 9);
  v_slot_prefix := fn_issue_prefix_for_epoch(p_slot_time);
  v_open_seq := SUBSTRING(p_open_issue FROM 12 FOR 3)::INT;
  v_offset := GREATEST(0, (p_slot_time - p_open_draw_time) / p_cycle);
  v_seq := v_open_seq + v_offset;

  IF v_slot_prefix = v_open_prefix THEN
    RETURN v_slot_prefix || '-' || lpad(v_seq::TEXT, 3, '0');
  END IF;

  -- Cross-day slot: issue seq restarts under that day's prefix
  RETURN v_slot_prefix || '-' || lpad(
    GREATEST(1, (p_slot_time - EXTRACT(EPOCH FROM date_trunc('day', to_timestamp(p_slot_time)))::BIGINT) / p_cycle + 1)::INT,
    3,
    '0'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_resolve_scheduled_draw(
  p_games_id BIGINT,
  p_issue TEXT,
  p_draw_time BIGINT
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_row RECORD;
  v_result TEXT;
  v_now BIGINT;
BEGIN
  v_now := EXTRACT(EPOCH FROM NOW())::BIGINT;
  PERFORM fn_purge_used_scheduled_draws(p_games_id);

  -- Exact live issue match only. No row for 021-024 → caller random. Row for 025-029 → preset.
  SELECT id, result INTO v_row
  FROM scheduled_draw_results
  WHERE games_id = p_games_id
    AND issue = p_issue
    AND status = 0
    AND result IS NOT NULL
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_result := fn_normalize_draw_result(v_row.result);

  UPDATE scheduled_draw_results
  SET status = 1, updated_at = v_now
  WHERE id = v_row.id;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.advance_game_round(p_games_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game RECORD;
  v_issue RECORD;
  v_result TEXT;
  v_settled INT;
  v_new_issue TEXT;
  v_now BIGINT;
  v_cycle INT;
  v_bet_count INT;
  v_win_count INT;
  v_mode TEXT;
  v_used_fallback BOOLEAN := FALSE;
  v_used_scheduled BOOLEAN := FALSE;
BEGIN
  v_now := EXTRACT(EPOCH FROM NOW())::BIGINT;

  SELECT id, code, name, draw_mode, next_draw_result
  INTO v_game
  FROM games WHERE id = p_games_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'game not found'; END IF;

  v_mode := COALESCE(v_game.draw_mode, 'random');
  IF v_mode NOT IN ('random', 'manual') THEN
    v_mode := 'random';
  END IF;

  SELECT * INTO v_issue FROM game_issues
  WHERE games_id = p_games_id AND status = 0
  ORDER BY draw_time DESC LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'no open issue'; END IF;

  IF v_issue.draw_time > v_now THEN
    RETURN jsonb_build_object(
      'skipped', true,
      'reason', 'not_due',
      'seconds_left', v_issue.draw_time - v_now
    );
  END IF;

  SELECT COUNT(*)::INT INTO v_bet_count
  FROM bet_records
  WHERE games_id = p_games_id AND issue = v_issue.issue AND status = '0';

  IF NOT EXISTS (
    SELECT 1 FROM draw_results WHERE games_id = p_games_id AND issue = v_issue.issue
  ) THEN
    v_result := fn_resolve_scheduled_draw(p_games_id, v_issue.issue, v_issue.draw_time);
    IF v_result IS NOT NULL THEN
      v_used_scheduled := TRUE;
    ELSIF v_mode = 'manual' THEN
      v_result := fn_resolve_draw_result(v_game.code, 'manual', v_game.next_draw_result);
      IF v_result IS NULL THEN
        v_result := fn_random_draw(v_game.code);
        v_used_fallback := TRUE;
      ELSE
        UPDATE games SET next_draw_result = NULL WHERE id = p_games_id;
      END IF;
    ELSE
      v_result := fn_random_draw(v_game.code);
    END IF;

    INSERT INTO draw_results (games_id, issue, result, createtime)
    VALUES (p_games_id, v_issue.issue, v_result, v_now);
  ELSE
    SELECT result INTO v_result FROM draw_results
    WHERE games_id = p_games_id AND issue = v_issue.issue LIMIT 1;
  END IF;

  v_win_count := fn_count_issue_wins(p_games_id, v_issue.issue, v_result);
  v_settled := fn_settle_issue_bets(p_games_id, v_issue.issue, v_result);

  UPDATE game_issues SET status = 1 WHERE id = v_issue.id;

  v_cycle := fn_game_cycle_seconds(v_game.code);
  v_new_issue := fn_next_issue_number(p_games_id);

  INSERT INTO game_issues (games_id, issue, draw_time, status, bet_quick_amount)
  VALUES (
    p_games_id,
    v_new_issue,
    v_now + v_cycle,
    0,
    COALESCE(v_issue.bet_quick_amount, '["1000","5000","10000","50000"]'::JSONB)
  );

  RETURN jsonb_build_object(
    'skipped', false,
    'drawn_issue', v_issue.issue,
    'result', v_result,
    'settled', v_settled,
    'new_issue', v_new_issue,
    'draw_time', v_now + v_cycle,
    'draw_mode', v_mode,
    'manual_fallback', v_used_fallback,
    'scheduled', v_used_scheduled,
    'fair_random', (v_mode = 'random' OR v_used_fallback) AND NOT v_used_scheduled,
    'pending_bets', v_bet_count,
    'result_wins', v_win_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.advance_game_round(BIGINT) TO anon, authenticated;

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
  v_issue TEXT;
  v_result TEXT;
  v_user_id BIGINT;
  v_created INT := 0;
  v_skipped INT := 0;
  v_now BIGINT;
  v_row_count INT;
  v_first_issue TEXT;
  v_last_issue TEXT;
  v_open_issue TEXT;
  v_open_draw_time BIGINT;
  v_effective_start BIGINT;
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

  SELECT gi.issue, gi.draw_time
  INTO v_open_issue, v_open_draw_time
  FROM game_issues gi
  WHERE gi.games_id = p_games_id AND gi.status = 0
  ORDER BY gi.draw_time DESC
  LIMIT 1;

  IF p_end_time < v_now THEN
    RETURN jsonb_build_object(
      'created', 0,
      'skipped', 0,
      'mode', p_mode,
      'cycle_seconds', v_cycle,
      'open_issue', v_open_issue,
      'warning', 'no_future_slots_in_range'
    );
  END IF;

  -- Align first slot to game cycle grid anchored at open issue draw time
  IF v_open_draw_time IS NOT NULL THEN
    v_t := v_open_draw_time;
    WHILE v_t < p_start_time LOOP
      v_t := v_t + v_cycle;
    END LOOP;
  ELSE
    v_t := p_start_time;
  END IF;

  v_effective_start := v_t;

  WHILE v_t <= p_end_time LOOP
    v_issue := fn_scheduled_issue_for_slot(v_open_issue, v_open_draw_time, v_t, v_cycle);

    IF p_mode = 'random' THEN
      v_result := fn_random_draw(v_code);
    ELSE
      v_result := NULL;
    END IF;

    INSERT INTO scheduled_draw_results (games_id, issue, draw_time, result, status, created_by, createtime)
    VALUES (p_games_id, v_issue, v_t, v_result, 0, v_user_id, v_now)
    ON CONFLICT (games_id, issue) DO UPDATE
      SET draw_time = EXCLUDED.draw_time,
          result = EXCLUDED.result,
          updated_at = v_now,
          status = 0
    WHERE scheduled_draw_results.status = 0
      AND NOT fn_scheduled_draw_locked(scheduled_draw_results.games_id, scheduled_draw_results.issue);

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

    v_t := v_t + v_cycle;
  END LOOP;

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

CREATE OR REPLACE FUNCTION public.admin_upsert_scheduled_draw(
  p_games_id BIGINT,
  p_draw_time BIGINT,
  p_result TEXT DEFAULT NULL,
  p_issue TEXT DEFAULT NULL,
  p_id BIGINT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_norm TEXT;
  v_issue TEXT;
  v_row RECORD;
  v_user_id BIGINT;
  v_now BIGINT;
  v_open_issue TEXT;
  v_open_draw_time BIGINT;
  v_cycle INT;
BEGIN
  PERFORM fn_assert_staff();
  IF fn_current_user_role() <> 'admin'::user_role THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  SELECT code INTO v_code FROM games WHERE id = p_games_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'game not found'; END IF;

  v_cycle := fn_game_cycle_seconds(v_code);
  v_user_id := fn_current_db_user_id();
  v_now := EXTRACT(EPOCH FROM NOW())::BIGINT;

  SELECT gi.issue, gi.draw_time
  INTO v_open_issue, v_open_draw_time
  FROM game_issues gi
  WHERE gi.games_id = p_games_id AND gi.status = 0
  ORDER BY gi.draw_time DESC
  LIMIT 1;

  IF p_id IS NOT NULL THEN
    SELECT * INTO v_row FROM scheduled_draw_results WHERE id = p_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'schedule row not found'; END IF;
    IF v_row.games_id <> p_games_id THEN RAISE EXCEPTION 'game mismatch'; END IF;
    IF v_row.status <> 0 THEN RAISE EXCEPTION 'cannot edit used or cancelled row'; END IF;
    IF fn_scheduled_draw_locked(p_games_id, v_row.issue) THEN
      RAISE EXCEPTION 'issue already drawn or has bets';
    END IF;

    v_norm := NULL;
    IF p_result IS NOT NULL AND trim(p_result) <> '' THEN
      v_norm := fn_normalize_draw_result(p_result);
      IF NOT fn_validate_draw_result(v_code, v_norm) THEN
        RAISE EXCEPTION 'invalid draw result format for %', v_code;
      END IF;
    END IF;

    UPDATE scheduled_draw_results
    SET result = v_norm, updated_at = v_now
    WHERE id = p_id;

    RETURN jsonb_build_object('id', p_id, 'updated', true);
  END IF;

  IF p_draw_time IS NULL THEN
    RAISE EXCEPTION 'draw_time required';
  END IF;

  v_issue := COALESCE(
    NULLIF(trim(p_issue), ''),
    fn_scheduled_issue_for_slot(v_open_issue, v_open_draw_time, p_draw_time, v_cycle)
  );

  v_norm := NULL;
  IF p_result IS NOT NULL AND trim(p_result) <> '' THEN
    v_norm := fn_normalize_draw_result(p_result);
    IF NOT fn_validate_draw_result(v_code, v_norm) THEN
      RAISE EXCEPTION 'invalid draw result format for %', v_code;
    END IF;
  END IF;

  IF fn_scheduled_draw_locked(p_games_id, v_issue) THEN
    RAISE EXCEPTION 'issue already drawn or has bets';
  END IF;

  INSERT INTO scheduled_draw_results (games_id, issue, draw_time, result, status, created_by, createtime)
  VALUES (p_games_id, v_issue, p_draw_time, v_norm, 0, v_user_id, v_now)
  ON CONFLICT (games_id, issue) DO UPDATE
    SET result = EXCLUDED.result,
        draw_time = EXCLUDED.draw_time,
        updated_at = v_now
  WHERE scheduled_draw_results.status = 0
    AND NOT fn_scheduled_draw_locked(scheduled_draw_results.games_id, scheduled_draw_results.issue);

  RETURN jsonb_build_object('issue', v_issue, 'updated', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_upsert_scheduled_draw(BIGINT, BIGINT, TEXT, TEXT, BIGINT) TO authenticated;

UPDATE games SET draw_mode = 'random' WHERE draw_mode = 'manual';

COMMIT;
