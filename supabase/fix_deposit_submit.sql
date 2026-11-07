-- Extended deposit submit (payer name, proof/tx hash, channel id) — pending until admin approves
-- Run after admin_setup.sql

BEGIN;

DROP FUNCTION IF EXISTS public.submit_deposit(NUMERIC, TEXT);

ALTER TABLE users ADD COLUMN IF NOT EXISTS real_name VARCHAR(128);
ALTER TABLE users ADD COLUMN IF NOT EXISTS id_number VARCHAR(32);
ALTER TABLE users ADD COLUMN IF NOT EXISTS identity_status VARCHAR(16) DEFAULT 'none';

CREATE OR REPLACE FUNCTION public.submit_deposit(
  p_amount NUMERIC,
  p_channel_type TEXT DEFAULT 'bank',
  p_payer_name TEXT DEFAULT NULL,
  p_proof_image TEXT DEFAULT NULL,
  p_channel_id BIGINT DEFAULT NULL
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

  INSERT INTO deposit_orders (
    user_id, channel_id, channel_type, amount, payer_name, proof_image, status, createtime
  )
  VALUES (
    v_user_id,
    p_channel_id,
    p_channel_type::recharge_channel_type,
    p_amount,
    NULLIF(trim(p_payer_name), ''),
    NULLIF(trim(p_proof_image), ''),
    'pending',
    EXTRACT(EPOCH FROM NOW())::BIGINT
  )
  RETURNING id INTO v_order_id;

  RETURN v_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_deposit(NUMERIC, TEXT, TEXT, TEXT, BIGINT) TO authenticated;

COMMIT;
