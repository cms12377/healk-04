-- Remove per-member win-rate controls — settlement uses natural win/loss + odds only
-- Run in Supabase SQL Editor if fix_member_win_rate.sql was applied

BEGIN;

DROP FUNCTION IF EXISTS public.admin_set_member_win_rate(BIGINT, NUMERIC);
DROP FUNCTION IF EXISTS public.fn_resolve_member_win_rate(BIGINT);
DROP FUNCTION IF EXISTS public.admin_update_settings(TEXT, TEXT, TEXT, NUMERIC);

DROP TABLE IF EXISTS user_house_controls;
DROP TABLE IF EXISTS house_settings;

-- Fair settlement (no payout probability override)
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
    v_bc := regexp_replace(COALESCE(NULLIF(trim(v_bet.bet_content), ''), v_bet.item_bc, ''), '[,，、]', '', 'g');

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

CREATE OR REPLACE FUNCTION public.admin_list_members(
  p_page INT DEFAULT 1,
  p_limit INT DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role user_role;
  v_staff_id BIGINT;
  v_offset INT;
  v_rows JSONB;
  v_total BIGINT;
BEGIN
  PERFORM fn_assert_staff();
  v_role := fn_current_user_role();
  v_staff_id := fn_current_db_user_id();
  v_offset := GREATEST(p_page - 1, 0) * p_limit;

  SELECT COUNT(*) INTO v_total
  FROM users u
  WHERE u.role = 'member'
    AND (v_role = 'admin' OR u.invited_by = v_staff_id);

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::JSONB) INTO v_rows
  FROM (
    SELECT
      u.id,
      u.username,
      u.nickname,
      u.money,
      u.real_name,
      u.identity_status,
      u.createtime,
      to_char(to_timestamp(u.createtime), 'YYYY-MM-DD HH24:MI') AS jointime_text
    FROM users u
    WHERE u.role = 'member'
      AND (v_role = 'admin' OR u.invited_by = v_staff_id)
    ORDER BY u.createtime DESC
    LIMIT p_limit OFFSET v_offset
  ) t;

  RETURN jsonb_build_object('data', v_rows, 'total', v_total, 'page', p_page, 'limit', p_limit);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_settings()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row site_settings%ROWTYPE;
BEGIN
  PERFORM fn_assert_staff();

  SELECT * INTO v_row FROM site_settings WHERE id = 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'notice', '',
      'service_url', '',
      'currency', '฿'
    );
  END IF;

  RETURN jsonb_build_object(
    'notice', COALESCE(v_row.notice, ''),
    'service_url', COALESCE(v_row.service_url, ''),
    'currency', COALESCE(v_row.currency, '฿')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_settings(
  p_notice TEXT,
  p_service_url TEXT,
  p_currency TEXT
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

  UPDATE site_settings
  SET
    notice = NULLIF(TRIM(p_notice), ''),
    service_url = NULLIF(TRIM(p_service_url), ''),
    currency = COALESCE(NULLIF(TRIM(p_currency), ''), '฿'),
    updated_at = NOW()
  WHERE id = 1;

  IF NOT FOUND THEN
    INSERT INTO site_settings (id, notice, service_url, currency)
    VALUES (
      1,
      NULLIF(TRIM(p_notice), ''),
      NULLIF(TRIM(p_service_url), ''),
      COALESCE(NULLIF(TRIM(p_currency), ''), '฿')
    );
  END IF;

  RETURN admin_get_settings();
END;
$$;

-- Keep member API from reading operator draw controls
REVOKE SELECT ON games FROM anon, authenticated;
GRANT SELECT (
  id, category_id, code, name, image, game_type, description, is_hot, status, sort
) ON games TO anon, authenticated;

COMMIT;
