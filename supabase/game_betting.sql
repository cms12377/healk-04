-- Game betting engine: hardened submit + settle + auto round advance
-- Run in Supabase SQL Editor after database.sql + submit_bet.sql
-- Then: node scripts/test-bet-flow.mjs

BEGIN;

-- ---------------------------------------------------------------------------
-- Evaluate single bet win (mirrors src/lib/betEvaluation.ts)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_evaluate_bet_win(
  p_game_code TEXT,
  p_group_code TEXT,
  p_bet_content TEXT,
  p_result TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  nums INT[];
  n INT;
  sum_val INT;
  rank_i INT;
  side TEXT;
  pick INT;
  dice INT[];
  special INT;
  niu INT;
BEGIN
  SELECT ARRAY(
    SELECT NULLIF(trim(x), '')::INT
    FROM unnest(string_to_array(p_result, ',')) AS x
    WHERE trim(x) ~ '^\d+$'
  ) INTO nums;

  IF nums IS NULL OR array_length(nums, 1) IS NULL THEN
    RETURN FALSE;
  END IF;

  -- PK10
  IF p_game_code IN ('df_pk10', 'df_pk10_3', 'df_pk10_5') THEN
    IF p_bet_content ~ '^lm_r(\d+)_(big|small|odd|even|dragon|tiger)$' THEN
      rank_i := substring(p_bet_content from '^lm_r(\d+)_')::INT;
      side := substring(p_bet_content from '_(big|small|odd|even|dragon|tiger)$');
      n := nums[rank_i];
      IF n IS NULL THEN RETURN FALSE; END IF;
      IF side = 'big' THEN RETURN n >= 6;
      ELSIF side = 'small' THEN RETURN n <= 5;
      ELSIF side = 'odd' THEN RETURN n % 2 = 1;
      ELSIF side = 'even' THEN RETURN n % 2 = 0;
      ELSIF side = 'dragon' THEN RETURN n > nums[11 - rank_i];
      ELSIF side = 'tiger' THEN RETURN n < nums[11 - rank_i];
      END IF;
    END IF;

    IF p_bet_content ~ '^gy_sum_(\d+)$' THEN
      RETURN nums[1] + nums[2] = substring(p_bet_content from '(\d+)$')::INT;
    END IF;

    IF p_bet_content LIKE 'gy_%' THEN
      sum_val := nums[1] + nums[2];
      IF p_bet_content = 'gy_big' THEN RETURN sum_val >= 12;
      ELSIF p_bet_content = 'gy_small' THEN RETURN sum_val <= 11;
      ELSIF p_bet_content = 'gy_odd' THEN RETURN sum_val % 2 = 1;
      ELSIF p_bet_content = 'gy_even' THEN RETURN sum_val % 2 = 0;
      END IF;
    END IF;

    IF p_bet_content LIKE 'gyj_%' THEN
      sum_val := nums[1] + nums[2] + nums[3];
      IF p_bet_content = 'gyj_big' THEN RETURN sum_val >= 17;
      ELSIF p_bet_content = 'gyj_small' THEN RETURN sum_val <= 16;
      ELSIF p_bet_content = 'gyj_odd' THEN RETURN sum_val % 2 = 1;
      ELSIF p_bet_content = 'gyj_even' THEN RETURN sum_val % 2 = 0;
      END IF;
    END IF;

    IF p_bet_content ~ '^n(\d+)$' AND p_group_code ~ '^r\d+$' THEN
      pick := substring(p_bet_content from '(\d+)$')::INT;
      rank_i := substring(p_group_code from '(\d+)$')::INT;
      RETURN nums[rank_i] = pick;
    END IF;
  END IF;

  -- K3 (th6688 full catalog)
  IF p_game_code = 'df_k3' THEN
    dice := nums[1:3];
    sum_val := dice[1] + dice[2] + dice[3];

    IF p_group_code = 'hz' OR p_bet_content IN ('big','small','odd','even','total_big','total_small','total_odd','total_even','k3_big','k3_small','k3_odd','k3_even') THEN
      IF p_bet_content IN ('total_big','total_odd','k3_big','k3_odd','big','odd') THEN RETURN sum_val >= 11; END IF;
      IF p_bet_content IN ('total_small','total_even','k3_small','k3_even','small','even') THEN RETURN sum_val <= 10; END IF;
      IF p_bet_content ~ '^\d{1,2}$' AND p_bet_content::INT BETWEEN 3 AND 18 THEN
        RETURN sum_val = p_bet_content::INT;
      END IF;
      IF p_bet_content ~ '^sum_(\d+)$' THEN
        RETURN sum_val = substring(p_bet_content from '(\d+)$')::INT;
      END IF;
    END IF;

    IF p_group_code = 'sth' OR p_bet_content ~ '^(\d)\1\1$' OR p_bet_content ~ '^triple_(\d)$' THEN
      IF p_bet_content ~ '^triple_(\d)$' THEN
        pick := substring(p_bet_content from '(\d)$')::INT;
      ELSE
        pick := substring(p_bet_content from '^(\d)')::INT;
      END IF;
      RETURN dice[1] = pick AND dice[2] = pick AND dice[3] = pick;
    END IF;

    IF p_group_code = 'slh' THEN
      IF p_bet_content ~ '^(\d)(\d)(\d)$' THEN
        SELECT ARRAY(SELECT unnest(dice) ORDER BY 1) INTO dice;
        RETURN dice[1] = substring(p_bet_content from '^(\d)')::INT
          AND dice[2] = substring(p_bet_content from '^\d(\d)')::INT
          AND dice[3] = substring(p_bet_content from '^\d\d(\d)$')::INT
          AND dice[2] = dice[1] + 1 AND dice[3] = dice[2] + 1;
      END IF;
      IF p_bet_content = 'straight' THEN
        SELECT ARRAY(SELECT unnest(dice) ORDER BY 1) INTO dice;
        RETURN dice[2] = dice[1] + 1 AND dice[3] = dice[2] + 1;
      END IF;
    END IF;

    IF p_group_code = 'eth' OR (p_bet_content ~ '^(\d)\1$' AND length(p_bet_content) = 2) THEN
      pick := substring(p_bet_content from '^(\d)')::INT;
      RETURN (SELECT count(*)::INT FROM unnest(dice) d WHERE d = pick) = 2;
    END IF;

    IF p_group_code = 'sbdh' AND p_bet_content ~ '^[1-6]{3}$' THEN
      SELECT ARRAY(SELECT DISTINCT unnest(dice) ORDER BY 1) INTO dice;
      IF array_length(dice, 1) <> 3 THEN RETURN FALSE; END IF;
      RETURN dice[1] = substring(p_bet_content from '^(\d)')::INT
        AND dice[2] = substring(p_bet_content from '^\d(\d)')::INT
        AND dice[3] = substring(p_bet_content from '^\d\d(\d)$')::INT;
    END IF;

    IF p_group_code = 'ebdh' AND p_bet_content ~ '^[1-6]{2}$' THEN
      pick := substring(p_bet_content from '^(\d)')::INT;
      n := substring(p_bet_content from '(\d)$')::INT;
      RETURN pick <> n AND pick = ANY (dice) AND n = ANY (dice);
    END IF;

    IF p_group_code = 'etdx' AND p_bet_content ~ '^[1-6]{3}$' THEN
      RETURN (
        SELECT ARRAY(SELECT unnest(dice) ORDER BY 1)
      ) = (
        SELECT ARRAY(
          SELECT substring(p_bet_content from i, 1)::INT
          FROM generate_series(1, 3) AS i
          ORDER BY 1
        )
      );
    END IF;
  END IF;

  -- Mark Six
  IF p_game_code = 'xam_6' THEN
    special := nums[array_length(nums, 1)];

    IF p_bet_content ~ '^tm_(\d+)$' THEN
      RETURN special = substring(p_bet_content from '(\d+)$')::INT;
    END IF;

    IF p_bet_content ~ '^zm_(\d+)$' THEN
      pick := substring(p_bet_content from '(\d+)$')::INT;
      RETURN pick = ANY (nums[1:6]);
    END IF;

    IF p_group_code IN ('tx', 'zx', 'bs') OR p_bet_content IN ('red','green','blue') THEN
      IF p_bet_content IN ('red','green','blue') THEN
        IF p_bet_content = 'red' THEN
          RETURN special = ANY (ARRAY[1,2,7,8,12,13,18,19,23,24,29,30,34,35,40,45,46]);
        ELSIF p_bet_content = 'green' THEN
          RETURN special = ANY (ARRAY[5,6,11,16,17,21,22,27,28,32,33,38,39,43,44,49]);
        ELSE
          RETURN special NOT IN (1,2,7,8,12,13,18,19,23,24,29,30,34,35,40,45,46,5,6,11,16,17,21,22,27,28,32,33,38,39,43,44,49);
        END IF;
      END IF;
    END IF;

    IF p_group_code = 'lm' THEN
      IF p_bet_content IN ('total_big','big') THEN RETURN special >= 25; END IF;
      IF p_bet_content IN ('total_small','small') THEN RETURN special <= 24; END IF;
      IF p_bet_content IN ('total_odd','odd') THEN RETURN special % 2 = 1; END IF;
      IF p_bet_content IN ('total_even','even') THEN RETURN special % 2 = 0; END IF;
    END IF;
  END IF;

  -- Lucky 28
  IF p_game_code = 'xy_28' THEN
    sum_val := nums[1] + nums[2] + nums[3];

    IF p_bet_content ~ '^(ball1|b2|b3)_(\d+)$' THEN
      IF p_bet_content LIKE 'ball1_%' THEN RETURN nums[1] = substring(p_bet_content from '(\d+)$')::INT; END IF;
      IF p_bet_content LIKE 'b2_%' THEN RETURN nums[2] = substring(p_bet_content from '(\d+)$')::INT; END IF;
      IF p_bet_content LIKE 'b3_%' THEN RETURN nums[3] = substring(p_bet_content from '(\d+)$')::INT; END IF;
    END IF;

    IF p_bet_content ~ '^sum_(\d+)$' THEN
      RETURN sum_val = substring(p_bet_content from '(\d+)$')::INT;
    END IF;

    IF p_bet_content = 'wave_red' THEN RETURN sum_val % 3 = 0; END IF;
    IF p_bet_content = 'wave_green' THEN RETURN sum_val % 3 = 1; END IF;
    IF p_bet_content = 'wave_blue' THEN RETURN sum_val % 3 = 2; END IF;

    IF p_group_code = 'lm28' OR p_bet_content LIKE 'total_%' THEN
      IF p_bet_content IN ('big','total_big') THEN RETURN sum_val >= 14; END IF;
      IF p_bet_content IN ('small','total_small') THEN RETURN sum_val < 14; END IF;
      IF p_bet_content IN ('odd','total_odd') THEN RETURN sum_val % 2 = 1; END IF;
      IF p_bet_content IN ('even','total_even') THEN RETURN sum_val % 2 = 0; END IF;
    END IF;
  END IF;

  -- SSC
  IF p_game_code = 'df_ssc' THEN
    IF p_bet_content ~ '^(ball1|b[2-5])_(\d+)$' THEN
      IF p_bet_content LIKE 'ball1_%' THEN RETURN nums[1] = substring(p_bet_content from '(\d+)$')::INT; END IF;
      IF p_bet_content LIKE 'b2_%' THEN RETURN nums[2] = substring(p_bet_content from '(\d+)$')::INT; END IF;
      IF p_bet_content LIKE 'b3_%' THEN RETURN nums[3] = substring(p_bet_content from '(\d+)$')::INT; END IF;
      IF p_bet_content LIKE 'b4_%' THEN RETURN nums[4] = substring(p_bet_content from '(\d+)$')::INT; END IF;
      IF p_bet_content LIKE 'b5_%' THEN RETURN nums[5] = substring(p_bet_content from '(\d+)$')::INT; END IF;
    END IF;

    IF p_group_code = 'ball1' AND p_bet_content IN ('big','small','odd','even') THEN
      IF p_bet_content = 'big' THEN RETURN nums[1] >= 5; END IF;
      IF p_bet_content = 'small' THEN RETURN nums[1] <= 4; END IF;
      IF p_bet_content = 'odd' THEN RETURN nums[1] % 2 = 1; END IF;
      IF p_bet_content = 'even' THEN RETURN nums[1] % 2 = 0; END IF;
    END IF;
  END IF;

  RETURN FALSE;
END;
$$;

-- ---------------------------------------------------------------------------
-- Settle all pending bets for a draw
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_settle_issue_bets(
  p_games_id BIGINT,
  p_issue TEXT,
  p_result TEXT
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bet RECORD;
  v_win BOOLEAN;
  v_win_amount NUMERIC(18, 2);
  v_settled INT := 0;
  v_group_code TEXT;
  v_game_code TEXT;
  v_bc TEXT;
BEGIN
  SELECT code INTO v_game_code FROM games WHERE id = p_games_id;

  FOR v_bet IN
    SELECT br.*, pg.code AS group_code, pi.bet_content AS item_bc
    FROM bet_records br
    LEFT JOIN play_items pi ON pi.id = br.play_item_id
    LEFT JOIN play_groups pg ON pg.id = pi.group_id
    WHERE br.games_id = p_games_id
      AND br.issue = p_issue
      AND br.status = '0'
    FOR UPDATE OF br
  LOOP
    v_group_code := COALESCE(v_bet.group_code, '');
    v_bc := COALESCE(v_bet.item_bc, regexp_replace(v_bet.bet_content, '[,，、]', '', 'g'));

    v_win := fn_evaluate_bet_win(v_game_code, v_group_code, v_bc, p_result);

    IF v_win THEN
      v_win_amount := ROUND(v_bet.amount * COALESCE(v_bet.odds, 1), 2);
      UPDATE bet_records SET
        status = '1', status_text = 'ชำระแล้ว',
        is_win = '1', is_win_text = 'ชนะ',
        win_amount = v_win_amount,
        settletime = EXTRACT(EPOCH FROM NOW())::BIGINT
      WHERE id = v_bet.id;

      INSERT INTO user_money_logs (user_id, category_id, money, type, ref_type, ref_id, createtime)
      VALUES (v_bet.user_id, 19, v_win_amount, 'ชนะเดิมพัน', 'bet', v_bet.id,
        EXTRACT(EPOCH FROM NOW())::BIGINT);

      UPDATE users SET
        unsettled = GREATEST(0, unsettled - v_bet.amount),
        updatetime = EXTRACT(EPOCH FROM NOW())::BIGINT
      WHERE id = v_bet.user_id;
    ELSE
      UPDATE bet_records SET
        status = '1', status_text = 'ชำระแล้ว',
        is_win = '0', is_win_text = 'แพ้',
        win_amount = 0,
        settletime = EXTRACT(EPOCH FROM NOW())::BIGINT
      WHERE id = v_bet.id;

      UPDATE users SET
        unsettled = GREATEST(0, unsettled - v_bet.amount),
        updatetime = EXTRACT(EPOCH FROM NOW())::BIGINT
      WHERE id = v_bet.user_id;
    END IF;

    v_settled := v_settled + 1;
  END LOOP;

  RETURN v_settled;
END;
$$;

-- ---------------------------------------------------------------------------
-- Generate random draw result per game type
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_random_draw(p_game_code TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  arr INT[];
  i INT;
  j INT;
  tmp INT;
BEGIN
  IF p_game_code IN ('df_pk10', 'df_pk10_3', 'df_pk10_5') THEN
    arr := ARRAY[1,2,3,4,5,6,7,8,9,10];
    FOR i IN REVERSE 10..2 LOOP
      j := 1 + floor(random() * i)::INT;
      tmp := arr[i]; arr[i] := arr[j]; arr[j] := tmp;
    END LOOP;
    RETURN array_to_string(arr, ',');
  END IF;

  IF p_game_code = 'df_k3' THEN
    RETURN (1 + floor(random()*6)::INT)::TEXT || ',' ||
           (1 + floor(random()*6)::INT)::TEXT || ',' ||
           (1 + floor(random()*6)::INT)::TEXT;
  END IF;

  IF p_game_code = 'xam_6' THEN
    arr := ARRAY[]::INT[];
    WHILE array_length(arr, 1) IS NULL OR array_length(arr, 1) < 7 LOOP
      i := 1 + floor(random()*49)::INT;
      IF NOT (i = ANY (arr)) THEN arr := array_append(arr, i); END IF;
    END LOOP;
    RETURN array_to_string(arr, ',');
  END IF;

  IF p_game_code = 'xy_28' THEN
    RETURN floor(random()*10)::INT || ',' || floor(random()*10)::INT || ',' || floor(random()*10)::INT;
  END IF;

  IF p_game_code = 'df_ssc' THEN
    RETURN floor(random()*10)::INT || ',' || floor(random()*10)::INT || ',' ||
           floor(random()*10)::INT || ',' || floor(random()*10)::INT || ',' ||
           floor(random()*10)::INT;
  END IF;

  RETURN '1,2,3';
END;
$$;

-- Cycle seconds per game (matches gameIntervals.ts)
CREATE OR REPLACE FUNCTION public.fn_game_cycle_seconds(p_game_code TEXT)
RETURNS INT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_game_code
    WHEN 'df_pk10' THEN 600
    WHEN 'df_pk10_3' THEN 180
    WHEN 'df_pk10_5' THEN 300
    WHEN 'df_k3' THEN 60
    WHEN 'xam_6' THEN 300
    WHEN 'xy_28' THEN 300
    WHEN 'df_ssc' THEN 60
    ELSE 300
  END;
$$;

-- ---------------------------------------------------------------------------
-- Advance round: draw → settle → new issue (called when countdown ends)
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
BEGIN
  v_now := EXTRACT(EPOCH FROM NOW())::BIGINT;

  SELECT id, code, name INTO v_game FROM games WHERE id = p_games_id;
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
    v_result := fn_random_draw(v_game.code);
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
    'draw_time', v_now + v_cycle
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.advance_game_round(BIGINT) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Hardened submit_bets (replaces submit_bet.sql)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_bets(
  p_games_id BIGINT,
  p_issue TEXT,
  p_bets JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id BIGINT;
  v_game_name VARCHAR(128);
  v_bet JSONB;
  v_amount NUMERIC(18, 2);
  v_total NUMERIC(18, 2) := 0;
  v_balance NUMERIC(18, 2);
  v_bet_id BIGINT;
  v_draw_time BIGINT;
  v_item_odds NUMERIC;
  v_item_bc TEXT;
  v_bc TEXT;
BEGIN
  IF p_bets IS NULL OR jsonb_array_length(p_bets) = 0 THEN
    RAISE EXCEPTION 'no bets';
  END IF;

  SELECT id INTO v_user_id FROM users WHERE auth_user_id = auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'user not found'; END IF;

  SELECT name INTO v_game_name FROM games WHERE id = p_games_id;
  IF v_game_name IS NULL THEN RAISE EXCEPTION 'game not found'; END IF;

  SELECT draw_time INTO v_draw_time FROM game_issues
  WHERE games_id = p_games_id AND issue = p_issue AND status = 0
  LIMIT 1;

  IF v_draw_time IS NULL THEN
    RAISE EXCEPTION 'issue closed or not found';
  END IF;

  IF v_draw_time <= EXTRACT(EPOCH FROM NOW())::BIGINT THEN
    RAISE EXCEPTION 'betting closed';
  END IF;

  FOR v_bet IN SELECT * FROM jsonb_array_elements(p_bets)
  LOOP
    v_amount := (v_bet->>'amount')::NUMERIC;
    IF v_amount IS NULL OR v_amount <= 0 OR v_amount <> trunc(v_amount) THEN
      RAISE EXCEPTION 'invalid bet amount';
    END IF;
    v_total := v_total + v_amount;
  END LOOP;

  SELECT money INTO v_balance FROM users WHERE id = v_user_id FOR UPDATE;
  IF v_balance < v_total THEN
    RAISE EXCEPTION 'insufficient balance';
  END IF;

  FOR v_bet IN SELECT * FROM jsonb_array_elements(p_bets)
  LOOP
    v_amount := (v_bet->>'amount')::NUMERIC;
    v_bc := regexp_replace(COALESCE(v_bet->>'bet_content', ''), '[,，、]', '', 'g');
    v_item_odds := NULL;
    v_item_bc := NULL;

    IF NULLIF(v_bet->>'play_item_id', '') IS NOT NULL THEN
      SELECT pi.odds, pi.bet_content
      INTO v_item_odds, v_item_bc
      FROM play_items pi
      WHERE pi.id = (v_bet->>'play_item_id')::BIGINT
        AND pi.games_id = p_games_id
        AND pi.status = 1;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'invalid play item';
      END IF;

      v_bc := v_item_bc;
    END IF;

    INSERT INTO bet_records (
      user_id, games_id, games_name, issue, play_item_id,
      category_name, bet_content, amount, odds,
      status, status_text, is_win, is_win_text, createtime
    ) VALUES (
      v_user_id,
      p_games_id,
      v_game_name,
      p_issue,
      NULLIF(v_bet->>'play_item_id', '')::BIGINT,
      COALESCE(v_bet->>'category_name', v_bet->>'group_name', ''),
      v_bc,
      v_amount,
      COALESCE(v_item_odds, NULLIF(v_bet->>'odds', '')::NUMERIC),
      '0', 'รอดำเนินการ', '0', 'รอผล',
      EXTRACT(EPOCH FROM NOW())::BIGINT
    )
    RETURNING id INTO v_bet_id;

    INSERT INTO user_money_logs (user_id, category_id, money, type, ref_type, ref_id, createtime)
    VALUES (
      v_user_id, 20, -v_amount, 'เดิมพัน', 'bet', v_bet_id,
      EXTRACT(EPOCH FROM NOW())::BIGINT
    );
  END LOOP;

  UPDATE users
  SET unsettled = unsettled + v_total,
      updatetime = EXTRACT(EPOCH FROM NOW())::BIGINT
  WHERE id = v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_bets(BIGINT, TEXT, JSONB) TO authenticated;

-- Dev-only: expire current issue and advance (for E2E test scripts)
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
  IF (v_result->>'skipped')::BOOLEAN THEN RETURN v_result; END IF;
  SELECT CASE WHEN COUNT(*) FILTER (WHERE is_win = '1') > 0 THEN '1' ELSE '0' END
  INTO v_bet_win
  FROM bet_records
  WHERE games_id = p_games_id AND issue = v_result->>'drawn_issue' AND status = '1';
  RETURN v_result || jsonb_build_object('bet_win', v_bet_win);
END;
$$;

GRANT EXECUTE ON FUNCTION public.test_force_advance(BIGINT) TO anon, authenticated;

COMMIT;
