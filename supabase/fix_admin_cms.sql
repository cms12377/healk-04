-- Admin CMS: site settings (chat URL) + game management
-- Run in Supabase SQL Editor after admin_setup.sql + game_betting.sql

BEGIN;

-- ---------------------------------------------------------------------------
-- Site settings (read: staff, write: admin)
-- ---------------------------------------------------------------------------
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
    VALUES (1, NULLIF(TRIM(p_notice), ''), NULLIF(TRIM(p_service_url), ''), COALESCE(NULLIF(TRIM(p_currency), ''), '฿'));
  END IF;

  RETURN admin_get_settings();
END;
$$;

-- ---------------------------------------------------------------------------
-- Games list + control (read: staff, mutate: admin)
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

CREATE OR REPLACE FUNCTION public.admin_set_game_status(
  p_games_id BIGINT,
  p_status SMALLINT
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

  IF p_status NOT IN (0, 1) THEN
    RAISE EXCEPTION 'invalid status';
  END IF;

  UPDATE games SET status = p_status WHERE id = p_games_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'game not found';
  END IF;

  RETURN admin_list_games();
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_force_advance_game(p_games_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  PERFORM fn_assert_staff();
  IF fn_current_user_role() <> 'admin'::user_role THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  -- Allow immediate draw even if countdown has not elapsed
  UPDATE game_issues
  SET draw_time = EXTRACT(EPOCH FROM NOW())::BIGINT
  WHERE games_id = p_games_id AND status = 0;

  v_result := advance_game_round(p_games_id);
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_settings(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_games() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_game_status(BIGINT, SMALLINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_force_advance_game(BIGINT) TO authenticated;

COMMIT;
