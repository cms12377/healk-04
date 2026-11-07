-- Agent panel parity: expose deposit proof + withdraw destination for staff review
-- Run after admin_setup.sql + fix_deposit_submit.sql + fix_admin_recharge_channels.sql

BEGIN;

CREATE OR REPLACE FUNCTION public.admin_list_deposits(
  p_status TEXT DEFAULT 'all',
  p_page INT DEFAULT 1,
  p_limit INT DEFAULT 10,
  p_user_id BIGINT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
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
  FROM deposit_orders d
  JOIN users u ON u.id = d.user_id
  WHERE (p_user_id IS NULL OR d.user_id = p_user_id)
    AND (
      p_status = 'all'
      OR (p_status = '0' AND d.status = 'pending')
      OR (p_status = '1' AND d.status = 'approved')
      OR (p_status = '2' AND d.status IN ('rejected', 'cancelled'))
    )
    AND (
      v_role = 'admin'
      OR (v_role = 'agent' AND (p_user_id IS NOT NULL OR u.invited_by = v_staff_id))
    );

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::JSONB) INTO v_rows
  FROM (
    SELECT
      d.id,
      d.user_id,
      u.username,
      d.amount,
      d.status,
      fn_order_status_label(d.status) AS status_text,
      d.channel_type,
      rc.name AS channel_name,
      d.payer_name,
      d.proof_image,
      d.createtime,
      d.admin_note
    FROM deposit_orders d
    JOIN users u ON u.id = d.user_id
    LEFT JOIN recharge_channels rc ON rc.id = d.channel_id
    WHERE (p_user_id IS NULL OR d.user_id = p_user_id)
      AND (
        p_status = 'all'
        OR (p_status = '0' AND d.status = 'pending')
        OR (p_status = '1' AND d.status = 'approved')
        OR (p_status = '2' AND d.status IN ('rejected', 'cancelled'))
      )
      AND (
        v_role = 'admin'
        OR (v_role = 'agent' AND (p_user_id IS NOT NULL OR u.invited_by = v_staff_id))
      )
    ORDER BY d.createtime DESC
    LIMIT p_limit OFFSET v_offset
  ) t;

  RETURN jsonb_build_object('data', v_rows, 'total', v_total, 'page', p_page, 'limit', p_limit);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_withdraws(
  p_status TEXT DEFAULT 'all',
  p_page INT DEFAULT 1,
  p_limit INT DEFAULT 10,
  p_user_id BIGINT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
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
  FROM withdraw_orders w
  JOIN users u ON u.id = w.user_id
  WHERE (p_user_id IS NULL OR w.user_id = p_user_id)
    AND (
      p_status = 'all'
      OR (p_status = '0' AND w.status = 'pending')
      OR (p_status = '1' AND w.status = 'approved')
      OR (p_status = '2' AND w.status IN ('rejected', 'cancelled'))
    )
    AND (
      v_role = 'admin'
      OR (v_role = 'agent' AND (p_user_id IS NOT NULL OR u.invited_by = v_staff_id))
    );

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::JSONB) INTO v_rows
  FROM (
    SELECT
      w.id,
      w.user_id,
      u.username,
      w.type AS withdraw_type,
      w.amount,
      w.fee,
      w.bank_name,
      w.bank_card,
      w.bank_username,
      w.status,
      fn_order_status_label(w.status) AS status_text,
      w.createtime,
      w.admin_note
    FROM withdraw_orders w
    JOIN users u ON u.id = w.user_id
    WHERE (p_user_id IS NULL OR w.user_id = p_user_id)
      AND (
        p_status = 'all'
        OR (p_status = '0' AND w.status = 'pending')
        OR (p_status = '1' AND w.status = 'approved')
        OR (p_status = '2' AND w.status IN ('rejected', 'cancelled'))
      )
      AND (
        v_role = 'admin'
        OR (v_role = 'agent' AND (p_user_id IS NOT NULL OR u.invited_by = v_staff_id))
      )
    ORDER BY w.createtime DESC
    LIMIT p_limit OFFSET v_offset
  ) t;

  RETURN jsonb_build_object('data', v_rows, 'total', v_total, 'page', p_page, 'limit', p_limit);
END;
$$;

COMMIT;
