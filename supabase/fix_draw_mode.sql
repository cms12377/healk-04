-- Per-game draw mode: random (auto 24/7) vs manual (admin preset result)
-- Run in Supabase SQL Editor after game_betting.sql + fix_admin_cms.sql

BEGIN;

ALTER TABLE games ADD COLUMN IF NOT EXISTS draw_mode VARCHAR(16) NOT NULL DEFAULT 'random';
ALTER TABLE games ADD COLUMN IF NOT EXISTS next_draw_result TEXT;

DO $$ BEGIN
  ALTER TABLE games ADD CONSTRAINT games_draw_mode_check
    CHECK (draw_mode IN ('random', 'manual'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Validate preset draw result format per game type
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_normalize_draw_result(p_result TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(regexp_replace(COALESCE(p_result, ''), '[，、\s]+', ',', 'g'), ',');
$$;

CREATE OR REPLACE FUNCTION public.fn_validate_draw_result(p_game_code TEXT, p_result TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_norm TEXT;
  v_parts TEXT[];
  v_n INT;
  v_i INT;
  v_val INT;
  v_seen INT[];
BEGIN
  v_norm := fn_normalize_draw_result(p_result);
  IF v_norm = '' THEN RETURN FALSE; END IF;
  v_parts := string_to_array(v_norm, ',');
  IF v_parts IS NULL THEN RETURN FALSE; END IF;

  IF p_game_code IN ('df_pk10', 'df_pk10_3', 'df_pk10_5') THEN
    IF array_length(v_parts, 1) <> 10 THEN RETURN FALSE; END IF;
    v_seen := ARRAY[]::INT[];
    FOR v_i IN 1..10 LOOP
      IF v_parts[v_i] !~ '^[0-9]+$' THEN RETURN FALSE; END IF;
      v_val := v_parts[v_i]::INT;
      IF v_val < 1 OR v_val > 10 THEN RETURN FALSE; END IF;
      IF v_val = ANY (v_seen) THEN RETURN FALSE; END IF;
      v_seen := array_append(v_seen, v_val);
    END LOOP;
    RETURN TRUE;
  END IF;

  IF p_game_code = 'df_k3' THEN
    IF array_length(v_parts, 1) <> 3 THEN RETURN FALSE; END IF;
    FOR v_i IN 1..3 LOOP
      IF v_parts[v_i] !~ '^[0-9]+$' THEN RETURN FALSE; END IF;
      v_val := v_parts[v_i]::INT;
      IF v_val < 1 OR v_val > 6 THEN RETURN FALSE; END IF;
    END LOOP;
    RETURN TRUE;
  END IF;

  IF p_game_code = 'xam_6' THEN
    IF array_length(v_parts, 1) <> 7 THEN RETURN FALSE; END IF;
    v_seen := ARRAY[]::INT[];
    FOR v_i IN 1..7 LOOP
      IF v_parts[v_i] !~ '^[0-9]+$' THEN RETURN FALSE; END IF;
      v_val := v_parts[v_i]::INT;
      IF v_val < 1 OR v_val > 49 THEN RETURN FALSE; END IF;
      IF v_val = ANY (v_seen) THEN RETURN FALSE; END IF;
      v_seen := array_append(v_seen, v_val);
    END LOOP;
    RETURN TRUE;
  END IF;

  IF p_game_code = 'xy_28' THEN
    IF array_length(v_parts, 1) <> 3 THEN RETURN FALSE; END IF;
    FOR v_i IN 1..3 LOOP
      IF v_parts[v_i] !~ '^[0-9]+$' THEN RETURN FALSE; END IF;
      v_val := v_parts[v_i]::INT;
      IF v_val < 0 OR v_val > 9 THEN RETURN FALSE; END IF;
    END LOOP;
    RETURN TRUE;
  END IF;

  IF p_game_code = 'df_ssc' THEN
    IF array_length(v_parts, 1) <> 5 THEN RETURN FALSE; END IF;
    FOR v_i IN 1..5 LOOP
      IF v_parts[v_i] !~ '^[0-9]+$' THEN RETURN FALSE; END IF;
      v_val := v_parts[v_i]::INT;
      IF v_val < 0 OR v_val > 9 THEN RETURN FALSE; END IF;
    END LOOP;
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- Resolve result at draw time (random or preset)
CREATE OR REPLACE FUNCTION public.fn_resolve_draw_result(
  p_game_code TEXT,
  p_draw_mode TEXT,
  p_preset TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_norm TEXT;
BEGIN
  IF COALESCE(p_draw_mode, 'random') = 'manual' THEN
    v_norm := fn_normalize_draw_result(p_preset);
    IF v_norm = '' OR NOT fn_validate_draw_result(p_game_code, v_norm) THEN
      RETURN NULL;
    END IF;
    RETURN v_norm;
  END IF;
  RETURN fn_random_draw(p_game_code);
END;
$$;

-- ---------------------------------------------------------------------------
-- advance_game_round — honor draw_mode
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
  v_day_prefix TEXT;
  v_next_seq INT;
  v_used_fallback BOOLEAN := FALSE;
BEGIN
  v_now := EXTRACT(EPOCH FROM NOW())::BIGINT;

  SELECT id, code, name, draw_mode, next_draw_result
  INTO v_game
  FROM games WHERE id = p_games_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'game not found'; END IF;

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

  IF NOT EXISTS (
    SELECT 1 FROM draw_results WHERE games_id = p_games_id AND issue = v_issue.issue
  ) THEN
    IF COALESCE(v_game.draw_mode, 'random') = 'manual' THEN
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

  v_settled := fn_settle_issue_bets(p_games_id, v_issue.issue, v_result);

  UPDATE game_issues SET status = 1 WHERE id = v_issue.id;

  v_cycle := fn_game_cycle_seconds(v_game.code);
  v_day_prefix := to_char(NOW(), 'YYYYMMDD');

  SELECT COALESCE(MAX(SUBSTRING(issue FROM 9 FOR 3)::INT), 0) + 1
  INTO v_next_seq
  FROM game_issues
  WHERE games_id = p_games_id AND issue LIKE v_day_prefix || '%';

  LOOP
    v_new_issue := v_day_prefix || lpad(v_next_seq::TEXT, 3, '0');
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM game_issues gi2
      WHERE gi2.games_id = p_games_id AND gi2.issue = v_new_issue
    );
    v_next_seq := v_next_seq + 1;
  END LOOP;

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
    'draw_mode', COALESCE(v_game.draw_mode, 'random'),
    'manual_fallback', v_used_fallback,
    'fair_random', COALESCE(v_game.draw_mode, 'random') = 'random' OR v_used_fallback
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.advance_game_round(BIGINT) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Admin RPCs (patch admin_list_games + new setters)
-- ---------------------------------------------------------------------------
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

CREATE OR REPLACE FUNCTION public.admin_set_draw_mode(
  p_games_id BIGINT,
  p_mode TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM fn_assert_staff();
  IF fn_current_user_role() <> 'admin'::user_role THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  IF p_mode NOT IN ('random', 'manual') THEN
    RAISE EXCEPTION 'invalid draw mode';
  END IF;

  UPDATE games SET draw_mode = p_mode WHERE id = p_games_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'game not found'; END IF;

  RETURN admin_list_games();
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_next_draw_result(
  p_games_id BIGINT,
  p_result TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_norm TEXT;
BEGIN
  PERFORM fn_assert_staff();
  IF fn_current_user_role() <> 'admin'::user_role THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  SELECT code INTO v_code FROM games WHERE id = p_games_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'game not found'; END IF;

  v_norm := fn_normalize_draw_result(p_result);
  IF v_norm = '' THEN
    UPDATE games SET next_draw_result = NULL WHERE id = p_games_id;
    RETURN admin_list_games();
  END IF;

  IF NOT fn_validate_draw_result(v_code, v_norm) THEN
    RAISE EXCEPTION 'invalid draw result format for %', v_code;
  END IF;

  UPDATE games
  SET next_draw_result = v_norm, draw_mode = 'manual'
  WHERE id = p_games_id;

  RETURN admin_list_games();
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_draw_mode(BIGINT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_next_draw_result(BIGINT, TEXT) TO authenticated;

COMMIT;
