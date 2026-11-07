-- Schedule list: upcoming first, used last; auto-delete used rows after 1 hour
-- Run after fix_scheduled_draw_alignment.sql

BEGIN;

CREATE OR REPLACE FUNCTION public.fn_purge_used_scheduled_draws(p_games_id BIGINT DEFAULT NULL)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INT;
  v_cutoff BIGINT;
BEGIN
  v_cutoff := EXTRACT(EPOCH FROM NOW())::BIGINT - 3600;

  DELETE FROM scheduled_draw_results
  WHERE status = 1
    AND COALESCE(updated_at, createtime) < v_cutoff
    AND (p_games_id IS NULL OR games_id = p_games_id);

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_purge_used_scheduled_draws(BIGINT) TO authenticated;

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
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offset INT;
  v_total INT;
  v_rows JSONB;
  v_purged INT;
BEGIN
  PERFORM fn_assert_staff();
  IF fn_current_user_role() <> 'admin'::user_role THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  v_purged := fn_purge_used_scheduled_draws(p_games_id);

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

  SELECT COALESCE(jsonb_agg(row_data ORDER BY sort_rank, sort_key), '[]'::JSONB)
  INTO v_rows
  FROM (
    SELECT
      CASE WHEN s.status = 0 THEN 0 ELSE 1 END AS sort_rank,
      CASE
        WHEN s.status = 0 THEN s.issue
        ELSE lpad(COALESCE(s.updated_at, s.createtime)::TEXT, 20, '0')
      END AS sort_key,
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
    ORDER BY
      CASE WHEN s.status = 0 THEN 0 ELSE 1 END,
      CASE WHEN s.status = 0 THEN s.issue END ASC NULLS LAST,
      CASE WHEN s.status <> 0 THEN COALESCE(s.updated_at, s.createtime) END ASC NULLS LAST
    OFFSET v_offset
    LIMIT GREATEST(1, LEAST(p_limit, 200))
  ) sub;

  RETURN jsonb_build_object(
    'data', v_rows,
    'total', v_total,
    'page', GREATEST(1, p_page),
    'limit', GREATEST(1, LEAST(p_limit, 200)),
    'purged', v_purged
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_scheduled_draws(BIGINT, BIGINT, BIGINT, TEXT, INT, INT) TO authenticated;

-- Also purge when a scheduled result is consumed at draw time
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
  PERFORM fn_purge_used_scheduled_draws(p_games_id);

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

COMMIT;
