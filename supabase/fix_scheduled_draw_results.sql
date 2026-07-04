-- Admin bulk draw schedule: empty slots, random fill, per-round edits
-- Run after fix_th6688_fair_draw.sql (needs fn_next_issue_number, fn_validate_draw_result)
-- Priority at draw time: draw_results → scheduled_draw_results → manual → random

BEGIN;

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scheduled_draw_results (
  id              BIGSERIAL PRIMARY KEY,
  games_id        BIGINT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  issue           VARCHAR(64) NOT NULL,
  draw_time       BIGINT NOT NULL,
  result          TEXT,
  status          SMALLINT NOT NULL DEFAULT 0,
  created_by      BIGINT REFERENCES users(id) ON DELETE SET NULL,
  createtime      BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
  updated_at      BIGINT,
  UNIQUE (games_id, issue),
  UNIQUE (games_id, draw_time),
  CHECK (status IN (0, 1, 2))
);

CREATE INDEX IF NOT EXISTS idx_scheduled_draw_games_time
  ON scheduled_draw_results (games_id, draw_time);

CREATE INDEX IF NOT EXISTS idx_scheduled_draw_games_status
  ON scheduled_draw_results (games_id, status, draw_time);

ALTER TABLE scheduled_draw_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_read_scheduled_draws" ON scheduled_draw_results;
CREATE POLICY "staff_read_scheduled_draws" ON scheduled_draw_results
  FOR SELECT USING (fn_current_user_role() IN ('admin'::user_role, 'agent'::user_role));

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_issue_prefix_for_epoch(p_epoch BIGINT)
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT to_char(to_timestamp(p_epoch), 'YYYY') || '-' || to_char(to_timestamp(p_epoch), 'MMDD');
$$;

CREATE OR REPLACE FUNCTION public.fn_next_issue_seq_for_prefix(
  p_games_id BIGINT,
  p_prefix TEXT
)
RETURNS INT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_max INT := 0;
  v_part INT;
BEGIN
  FOR v_part IN
    SELECT COALESCE(MAX(SUBSTRING(issue FROM 12 FOR 3)::INT), 0)
    FROM game_issues
    WHERE games_id = p_games_id
      AND issue ~ ('^' || p_prefix || '-[0-9]{3}$')
  LOOP
    v_max := GREATEST(v_max, v_part);
  END LOOP;

  FOR v_part IN
    SELECT COALESCE(MAX(SUBSTRING(issue FROM 12 FOR 3)::INT), 0)
    FROM draw_results
    WHERE games_id = p_games_id
      AND issue ~ ('^' || p_prefix || '-[0-9]{3}$')
  LOOP
    v_max := GREATEST(v_max, v_part);
  END LOOP;

  FOR v_part IN
    SELECT COALESCE(MAX(SUBSTRING(issue FROM 12 FOR 3)::INT), 0)
    FROM scheduled_draw_results
    WHERE games_id = p_games_id
      AND issue ~ ('^' || p_prefix || '-[0-9]{3}$')
  LOOP
    v_max := GREATEST(v_max, v_part);
  END LOOP;

  RETURN v_max + 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_scheduled_draw_locked(p_games_id BIGINT, p_issue TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM bet_records
    WHERE games_id = p_games_id AND issue = p_issue
  )
  OR EXISTS (
    SELECT 1 FROM draw_results
    WHERE games_id = p_games_id AND issue = p_issue
  )
  OR EXISTS (
    SELECT 1 FROM scheduled_draw_results
    WHERE games_id = p_games_id AND issue = p_issue AND status = 1
  );
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
BEGIN
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
  SET status = 1, updated_at = EXTRACT(EPOCH FROM NOW())::BIGINT
  WHERE id = v_row.id;

  RETURN v_result;
END;
$$;

-- ---------------------------------------------------------------------------
-- advance_game_round — scheduled results before manual/random
-- ---------------------------------------------------------------------------
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
  v_scheduled_draw_time BIGINT;
  v_next_draw_time BIGINT;
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

  v_scheduled_draw_time := NULL;
  SELECT s.draw_time INTO v_scheduled_draw_time
  FROM scheduled_draw_results s
  WHERE s.games_id = p_games_id AND s.issue = v_new_issue AND s.status = 0
  LIMIT 1;

  -- Default: full cycle countdown. Only snap to scheduled wall-clock if still in the future.
  v_next_draw_time := v_now + v_cycle;
  IF v_scheduled_draw_time IS NOT NULL AND v_scheduled_draw_time > v_now THEN
    v_next_draw_time := v_scheduled_draw_time;
  END IF;

  INSERT INTO game_issues (games_id, issue, draw_time, status, bet_quick_amount)
  VALUES (
    p_games_id,
    v_new_issue,
    v_next_draw_time,
    0,
    COALESCE(v_issue.bet_quick_amount, '["1000","5000","10000","50000"]'::JSONB)
  );

  RETURN jsonb_build_object(
    'skipped', false,
    'drawn_issue', v_issue.issue,
    'result', v_result,
    'settled', v_settled,
    'new_issue', v_new_issue,
    'draw_time', v_next_draw_time,
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

-- ---------------------------------------------------------------------------
-- Admin RPCs
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_scheduled_draws(
  p_games_id BIGINT,
  p_from_time BIGINT DEFAULT NULL,
  p_to_time BIGINT DEFAULT NULL,
  p_filter TEXT DEFAULT 'all',
  p_page INT DEFAULT 1,
  p_limit INT DEFAULT 50
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offset INT;
  v_total INT;
  v_rows JSONB;
BEGIN
  PERFORM fn_assert_staff();
  IF fn_current_user_role() <> 'admin'::user_role THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  v_offset := GREATEST(0, (GREATEST(1, p_page) - 1) * GREATEST(1, LEAST(p_limit, 200)));

  SELECT COUNT(*)::INT INTO v_total
  FROM scheduled_draw_results s
  WHERE s.games_id = p_games_id
    AND (p_from_time IS NULL OR s.draw_time >= p_from_time)
    AND (p_to_time IS NULL OR s.draw_time <= p_to_time)
    AND (
      p_filter = 'all'
      OR (p_filter = 'pending' AND s.status = 0 AND s.result IS NULL)
      OR (p_filter = 'filled' AND s.status = 0 AND s.result IS NOT NULL)
      OR (p_filter = 'used' AND s.status = 1)
      OR (p_filter = 'cancelled' AND s.status = 2)
    );

  SELECT COALESCE(jsonb_agg(row_data ORDER BY draw_time_val), '[]'::JSONB)
  INTO v_rows
  FROM (
    SELECT
      s.draw_time AS draw_time_val,
      jsonb_build_object(
        'id', s.id,
        'games_id', s.games_id,
        'issue', s.issue,
        'draw_time', s.draw_time,
        'result', s.result,
        'status', s.status,
        'locked', fn_scheduled_draw_locked(s.games_id, s.issue),
        'createtime', s.createtime,
        'updated_at', s.updated_at
      ) AS row_data
    FROM scheduled_draw_results s
    WHERE s.games_id = p_games_id
      AND (p_from_time IS NULL OR s.draw_time >= p_from_time)
      AND (p_to_time IS NULL OR s.draw_time <= p_to_time)
      AND (
        p_filter = 'all'
        OR (p_filter = 'pending' AND s.status = 0 AND s.result IS NULL)
        OR (p_filter = 'filled' AND s.status = 0 AND s.result IS NOT NULL)
        OR (p_filter = 'used' AND s.status = 1)
        OR (p_filter = 'cancelled' AND s.status = 2)
      )
    ORDER BY s.draw_time
    OFFSET v_offset
    LIMIT GREATEST(1, LEAST(p_limit, 200))
  ) sub;

  RETURN jsonb_build_object(
    'data', v_rows,
    'total', v_total,
    'page', GREATEST(1, p_page),
    'limit', GREATEST(1, LEAST(p_limit, 200))
  );
END;
$$;

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
  v_prefix := fn_issue_prefix_for_epoch(p_start_time);
  v_seq := fn_next_issue_seq_for_prefix(p_games_id, v_prefix);

  v_t := p_start_time;
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
    ELSE
      v_skipped := v_skipped + 1;
    END IF;

    v_seq := v_seq + 1;
    v_t := v_t + v_cycle;

    IF fn_issue_prefix_for_epoch(v_t) <> v_prefix THEN
      v_prefix := fn_issue_prefix_for_epoch(v_t);
      v_seq := fn_next_issue_seq_for_prefix(p_games_id, v_prefix);
    END IF;
  END LOOP;

  UPDATE games SET draw_mode = 'manual' WHERE id = p_games_id;

  RETURN jsonb_build_object(
    'created', v_created,
    'skipped', v_skipped,
    'mode', p_mode,
    'cycle_seconds', v_cycle
  );
END;
$$;

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
BEGIN
  PERFORM fn_assert_staff();
  IF fn_current_user_role() <> 'admin'::user_role THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  SELECT code INTO v_code FROM games WHERE id = p_games_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'game not found'; END IF;

  v_user_id := fn_current_db_user_id();
  v_now := EXTRACT(EPOCH FROM NOW())::BIGINT;

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

    UPDATE games SET draw_mode = 'manual' WHERE id = p_games_id;

    RETURN jsonb_build_object('id', p_id, 'updated', true);
  END IF;

  IF p_draw_time IS NULL THEN
    RAISE EXCEPTION 'draw_time required';
  END IF;

  v_issue := COALESCE(NULLIF(trim(p_issue), ''), fn_issue_prefix_for_epoch(p_draw_time) || '-' ||
    lpad(fn_next_issue_seq_for_prefix(p_games_id, fn_issue_prefix_for_epoch(p_draw_time))::TEXT, 3, '0'));

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

  UPDATE games SET draw_mode = 'manual' WHERE id = p_games_id;

  RETURN jsonb_build_object('issue', v_issue, 'updated', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_scheduled_draw(p_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row RECORD;
BEGIN
  PERFORM fn_assert_staff();
  IF fn_current_user_role() <> 'admin'::user_role THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  SELECT * INTO v_row FROM scheduled_draw_results WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;
  IF v_row.status <> 0 THEN RAISE EXCEPTION 'cannot delete used row'; END IF;
  IF fn_scheduled_draw_locked(v_row.games_id, v_row.issue) THEN
    RAISE EXCEPTION 'issue already drawn or has bets';
  END IF;

  DELETE FROM scheduled_draw_results WHERE id = p_id;
  RETURN jsonb_build_object('deleted', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_scheduled_draws(BIGINT, BIGINT, BIGINT, TEXT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_generate_draw_schedule(BIGINT, BIGINT, BIGINT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_scheduled_draw(BIGINT, BIGINT, TEXT, TEXT, BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_scheduled_draw(BIGINT) TO authenticated;

DROP FUNCTION IF EXISTS public.admin_import_scheduled_draws(BIGINT, JSONB);

-- Repair open issues stuck with draw_time in the past (rapid-draw bug)
UPDATE game_issues gi
SET draw_time = EXTRACT(EPOCH FROM NOW())::BIGINT + fn_game_cycle_seconds(g.code)
FROM games g
WHERE gi.games_id = g.id
  AND gi.status = 0
  AND gi.draw_time <= EXTRACT(EPOCH FROM NOW())::BIGINT + 30;

COMMIT;
