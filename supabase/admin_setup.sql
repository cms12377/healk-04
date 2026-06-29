-- =============================================================================
-- Admin / Agent panel — รันใน Supabase SQL Editor (ครั้งเดียว)
-- หลัง database.sql + auth_setup.sql + submit_bet.sql
-- =============================================================================
BEGIN;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('member', 'agent', 'admin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE users ADD COLUMN IF NOT EXISTS role user_role NOT NULL DEFAULT 'member';

CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_invited_by ON users (invited_by);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_current_db_user_id()
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.fn_current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role FROM users WHERE auth_user_id = auth.uid() LIMIT 1),
    'member'::user_role
  );
$$;

CREATE OR REPLACE FUNCTION public.fn_is_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT fn_current_user_role() IN ('admin', 'agent');
$$;

CREATE OR REPLACE FUNCTION public.fn_assert_staff()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT fn_is_staff() THEN
    RAISE EXCEPTION 'access denied: staff only';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_order_status_label(p_status order_status)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_status
    WHEN 'pending' THEN 'รอดำเนินการ'
    WHEN 'approved' THEN 'อนุมัติแล้ว'
    WHEN 'rejected' THEN 'ปฏิเสธ'
    WHEN 'cancelled' THEN 'ยกเลิก'
    ELSE p_status::TEXT
  END;
$$;

-- ---------------------------------------------------------------------------
-- Member deposit: pending until admin approves
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_deposit(
  p_amount NUMERIC,
  p_channel_type TEXT DEFAULT 'bank'
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id BIGINT;
  v_order_id BIGINT;
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'invalid amount'; END IF;
  SELECT id INTO v_user_id FROM users WHERE auth_user_id = auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'user not found'; END IF;

  INSERT INTO deposit_orders (user_id, channel_type, amount, status, createtime)
  VALUES (
    v_user_id,
    p_channel_type::recharge_channel_type,
    p_amount,
    'pending',
    EXTRACT(EPOCH FROM NOW())::BIGINT
  )
  RETURNING id INTO v_order_id;

  RETURN v_order_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- Member withdraw: pending + hold balance
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_withdraw(
  p_amount NUMERIC,
  p_pay_password TEXT,
  p_type TEXT DEFAULT 'bank',
  p_bank_name TEXT DEFAULT NULL,
  p_bank_card TEXT DEFAULT NULL,
  p_bank_username TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id BIGINT;
  v_cfg RECORD;
  v_order_id BIGINT;
  v_fee NUMERIC(18, 2);
  v_wtype withdraw_type;
BEGIN
  SELECT id INTO v_user_id FROM users WHERE auth_user_id = auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'user not found'; END IF;
  IF NOT verify_pay_password(p_pay_password) THEN RAISE EXCEPTION 'invalid pay password'; END IF;

  SELECT * INTO v_cfg FROM withdraw_settings WHERE id = 1;
  IF p_amount < v_cfg.withdraw_min OR p_amount > v_cfg.withdraw_max THEN
    RAISE EXCEPTION 'amount out of range';
  END IF;

  v_fee := v_cfg.withdraw_fee;
  v_wtype := CASE WHEN p_type = 'crypto' THEN 'crypto'::withdraw_type ELSE 'bank'::withdraw_type END;

  INSERT INTO withdraw_orders (
    user_id, type, bank_name, bank_card, bank_username,
    amount, fee, status, createtime
  ) VALUES (
    v_user_id, v_wtype, p_bank_name, p_bank_card, p_bank_username,
    p_amount, v_fee, 'pending',
    EXTRACT(EPOCH FROM NOW())::BIGINT
  )
  RETURNING id INTO v_order_id;

  INSERT INTO user_money_logs (user_id, category_id, money, type, ref_type, ref_id, createtime)
  VALUES (
    v_user_id, 15, -(p_amount + v_fee), 'ถอนเงิน (รออนุมัติ)', 'withdraw', v_order_id,
    EXTRACT(EPOCH FROM NOW())::BIGINT
  );

  RETURN v_order_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- Admin: list deposit orders (#/rechargeAdmin, #/hyChong)
-- ---------------------------------------------------------------------------
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
      d.createtime,
      d.admin_note
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
      )
    ORDER BY d.createtime DESC
    LIMIT p_limit OFFSET v_offset
  ) t;

  RETURN jsonb_build_object('data', v_rows, 'total', v_total, 'page', p_page, 'limit', p_limit);
END;
$$;

-- ---------------------------------------------------------------------------
-- Admin: list withdraw orders (#/depositAdmin, #/hyTixian)
-- ---------------------------------------------------------------------------
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
      w.amount,
      w.fee,
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

-- ---------------------------------------------------------------------------
-- Admin: list bets (#/bettingHistory, #/hyTou)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_bets(
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
  FROM bet_records b
  JOIN users u ON u.id = b.user_id
  WHERE (p_user_id IS NULL OR b.user_id = p_user_id)
    AND (
      p_status = 'all'
      OR (p_status = '0' AND b.status = '0')
      OR (p_status = '1' AND b.status = '1' AND b.is_win = '0')
      OR (p_status = '2' AND b.status = '1' AND b.is_win = '1')
    )
    AND (
      v_role = 'admin'
      OR (v_role = 'agent' AND (p_user_id IS NOT NULL OR u.invited_by = v_staff_id))
    );

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::JSONB) INTO v_rows
  FROM (
    SELECT
      b.id,
      b.user_id,
      u.username,
      b.games_name,
      b.issue AS draw_number,
      b.bet_content AS number,
      b.category_name AS position,
      b.amount,
      b.amount AS bet_amount,
      1 AS multiple,
      b.win_amount,
      b.status,
      COALESCE(b.status_text, CASE WHEN b.status = '0' THEN 'รอออกผล' ELSE 'ออกผลแล้ว' END) AS status_text,
      b.is_win,
      b.createtime
    FROM bet_records b
    JOIN users u ON u.id = b.user_id
    WHERE (p_user_id IS NULL OR b.user_id = p_user_id)
      AND (
        p_status = 'all'
        OR (p_status = '0' AND b.status = '0')
        OR (p_status = '1' AND b.status = '1' AND b.is_win = '0')
        OR (p_status = '2' AND b.status = '1' AND b.is_win = '1')
      )
      AND (
        v_role = 'admin'
        OR (v_role = 'agent' AND (p_user_id IS NOT NULL OR u.invited_by = v_staff_id))
      )
    ORDER BY b.createtime DESC
    LIMIT p_limit OFFSET v_offset
  ) t;

  RETURN jsonb_build_object('data', v_rows, 'total', v_total, 'page', p_page, 'limit', p_limit);
END;
$$;

-- ---------------------------------------------------------------------------
-- Admin: member list (#/huiYuan)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_members(
  p_page INT DEFAULT 1,
  p_limit INT DEFAULT 10
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

-- ---------------------------------------------------------------------------
-- Admin: approve / reject deposit
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_review_deposit(
  p_order_id BIGINT,
  p_action TEXT,
  p_note TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order deposit_orders%ROWTYPE;
BEGIN
  PERFORM fn_assert_staff();
  IF fn_current_user_role() <> 'admin' AND p_action = 'approve' THEN
    -- agents can approve downline only — checked below
    NULL;
  END IF;

  SELECT * INTO v_order FROM deposit_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order not found'; END IF;
  IF v_order.status <> 'pending' THEN RAISE EXCEPTION 'order not pending'; END IF;

  IF fn_current_user_role() = 'agent' THEN
    IF NOT EXISTS (
      SELECT 1 FROM users WHERE id = v_order.user_id AND invited_by = fn_current_db_user_id()
    ) THEN
      RAISE EXCEPTION 'access denied';
    END IF;
  END IF;

  IF p_action = 'approve' THEN
    UPDATE deposit_orders
    SET status = 'approved', admin_note = p_note,
        audittime = EXTRACT(EPOCH FROM NOW())::BIGINT
    WHERE id = p_order_id;

    INSERT INTO user_money_logs (user_id, category_id, money, type, ref_type, ref_id, createtime)
    VALUES (
      v_order.user_id, 14, v_order.amount, 'ฝากเงิน (อนุมัติ)', 'deposit', p_order_id,
      EXTRACT(EPOCH FROM NOW())::BIGINT
    );
  ELSIF p_action = 'reject' THEN
    UPDATE deposit_orders
    SET status = 'rejected', admin_note = p_note,
        audittime = EXTRACT(EPOCH FROM NOW())::BIGINT
    WHERE id = p_order_id;
  ELSE
    RAISE EXCEPTION 'invalid action';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Admin: approve / reject withdraw
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_review_withdraw(
  p_order_id BIGINT,
  p_action TEXT,
  p_note TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order withdraw_orders%ROWTYPE;
BEGIN
  PERFORM fn_assert_staff();

  SELECT * INTO v_order FROM withdraw_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order not found'; END IF;
  IF v_order.status <> 'pending' THEN RAISE EXCEPTION 'order not pending'; END IF;

  IF fn_current_user_role() = 'agent' THEN
    IF NOT EXISTS (
      SELECT 1 FROM users WHERE id = v_order.user_id AND invited_by = fn_current_db_user_id()
    ) THEN
      RAISE EXCEPTION 'access denied';
    END IF;
  END IF;

  IF p_action = 'approve' THEN
    UPDATE withdraw_orders
    SET status = 'approved', admin_note = p_note,
        audittime = EXTRACT(EPOCH FROM NOW())::BIGINT
    WHERE id = p_order_id;
  ELSIF p_action = 'reject' THEN
    UPDATE withdraw_orders
    SET status = 'rejected', admin_note = p_note,
        audittime = EXTRACT(EPOCH FROM NOW())::BIGINT
    WHERE id = p_order_id;

    INSERT INTO user_money_logs (user_id, category_id, money, type, ref_type, ref_id, createtime)
    VALUES (
      v_order.user_id, 15, v_order.amount + v_order.fee, 'คืนเงินถอน (ปฏิเสธ)', 'withdraw', p_order_id,
      EXTRACT(EPOCH FROM NOW())::BIGINT
    );
  ELSE
    RAISE EXCEPTION 'invalid action';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Admin: manual top-up (#/chongZhi)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_manual_deposit(
  p_user_id BIGINT,
  p_amount NUMERIC,
  p_note TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id BIGINT;
BEGIN
  PERFORM fn_assert_staff();
  IF p_amount <= 0 THEN RAISE EXCEPTION 'invalid amount'; END IF;

  IF fn_current_user_role() = 'agent' THEN
    IF NOT EXISTS (
      SELECT 1 FROM users WHERE id = p_user_id AND invited_by = fn_current_db_user_id()
    ) THEN
      RAISE EXCEPTION 'access denied';
    END IF;
  END IF;

  INSERT INTO deposit_orders (user_id, channel_type, amount, status, admin_note, createtime, audittime)
  VALUES (
    p_user_id, 'bank', p_amount, 'approved', COALESCE(p_note, 'เติมเงินโดยผู้ดูแล'),
    EXTRACT(EPOCH FROM NOW())::BIGINT, EXTRACT(EPOCH FROM NOW())::BIGINT
  )
  RETURNING id INTO v_order_id;

  INSERT INTO user_money_logs (user_id, category_id, money, type, ref_type, ref_id, createtime)
  VALUES (
    p_user_id, 14, p_amount, 'เติมเงิน (ผู้ดูแล)', 'deposit', v_order_id,
    EXTRACT(EPOCH FROM NOW())::BIGINT
  );

  RETURN v_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_is_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_deposits(TEXT, INT, INT, BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_withdraws(TEXT, INT, INT, BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_bets(TEXT, INT, INT, BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_members(INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_deposit(BIGINT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_withdraw(BIGINT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_manual_deposit(BIGINT, NUMERIC, TEXT) TO authenticated;

COMMIT;

-- ตั้ง admin คนแรก (แก้ username ให้ตรง):
-- UPDATE users SET role = 'admin' WHERE username = 'your_username';
