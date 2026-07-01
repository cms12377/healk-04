-- Admin: manage recharge_channels (member deposit accounts — bank + crypto)
-- Run after fix_admin_cms.sql

BEGIN;

CREATE OR REPLACE FUNCTION public.admin_list_recharge_channels()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM fn_assert_staff();

  RETURN COALESCE(
    (
      SELECT jsonb_agg(row_to_json(t) ORDER BY sort_val, id_val)
      FROM (
        SELECT
          c.id,
          c.type,
          c.name,
          c.bank_name,
          c.bank_username,
          c.bank_card,
          c.address,
          c.qrcode,
          c.notice,
          c.quick_amounts,
          c.status,
          c.sort,
          c.sort AS sort_val,
          c.id AS id_val
        FROM recharge_channels c
        ORDER BY c.sort, c.id
      ) t
    ),
    '[]'::JSONB
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_save_recharge_channel(
  p_id BIGINT DEFAULT NULL,
  p_type TEXT DEFAULT 'bank',
  p_name TEXT DEFAULT '',
  p_bank_name TEXT DEFAULT NULL,
  p_bank_username TEXT DEFAULT NULL,
  p_bank_card TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_qrcode TEXT DEFAULT NULL,
  p_notice TEXT DEFAULT NULL,
  p_quick_amounts JSONB DEFAULT '[]'::JSONB,
  p_sort INT DEFAULT 0,
  p_status SMALLINT DEFAULT 1
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id BIGINT;
  v_type recharge_channel_type;
BEGIN
  PERFORM fn_assert_staff();
  IF fn_current_user_role() <> 'admin'::user_role THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  IF TRIM(p_name) = '' THEN
    RAISE EXCEPTION 'name required';
  END IF;

  v_type := CASE
    WHEN p_type = 'crypto' THEN 'crypto'::recharge_channel_type
    ELSE 'bank'::recharge_channel_type
  END;

  IF v_type = 'bank' THEN
    IF COALESCE(TRIM(p_bank_card), '') = '' THEN
      RAISE EXCEPTION 'bank account number required';
    END IF;
  ELSE
    IF COALESCE(TRIM(p_address), '') = '' THEN
      RAISE EXCEPTION 'crypto address required';
    END IF;
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO recharge_channels (
      type, name, bank_name, bank_username, bank_card,
      address, qrcode, notice, quick_amounts, sort, status
    ) VALUES (
      v_type,
      TRIM(p_name),
      NULLIF(TRIM(p_bank_name), ''),
      NULLIF(TRIM(p_bank_username), ''),
      NULLIF(TRIM(p_bank_card), ''),
      NULLIF(TRIM(p_address), ''),
      NULLIF(TRIM(p_qrcode), ''),
      NULLIF(TRIM(p_notice), ''),
      COALESCE(p_quick_amounts, '[]'::JSONB),
      COALESCE(p_sort, 0),
      COALESCE(p_status, 1)
    )
    RETURNING id INTO v_id;
  ELSE
    UPDATE recharge_channels
    SET
      type = v_type,
      name = TRIM(p_name),
      bank_name = NULLIF(TRIM(p_bank_name), ''),
      bank_username = NULLIF(TRIM(p_bank_username), ''),
      bank_card = NULLIF(TRIM(p_bank_card), ''),
      address = NULLIF(TRIM(p_address), ''),
      qrcode = NULLIF(TRIM(p_qrcode), ''),
      notice = NULLIF(TRIM(p_notice), ''),
      quick_amounts = COALESCE(p_quick_amounts, '[]'::JSONB),
      sort = COALESCE(p_sort, 0),
      status = COALESCE(p_status, 1)
    WHERE id = p_id
    RETURNING id INTO v_id;

    IF v_id IS NULL THEN
      RAISE EXCEPTION 'channel not found';
    END IF;
  END IF;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_recharge_channels() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_recharge_channel(
  BIGINT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, INT, SMALLINT
) TO authenticated;

COMMIT;
