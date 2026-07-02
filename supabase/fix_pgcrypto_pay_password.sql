-- Fix: "function gen_salt(unknown) does not exist" when setting pay password
-- Cause: pgcrypto not enabled, or crypt/gen_salt live in extensions schema (Supabase default)
-- Run once in Supabase SQL Editor

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.set_pay_password(p_password TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id BIGINT;
BEGIN
  SELECT id INTO v_user_id FROM users WHERE auth_user_id = auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'user not found'; END IF;
  IF length(p_password) < 6 THEN RAISE EXCEPTION 'password too short'; END IF;

  UPDATE users
  SET pay_password_hash = crypt(p_password, gen_salt('bf')),
      updatetime = EXTRACT(EPOCH FROM NOW())::BIGINT
  WHERE id = v_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_pay_password(p_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_hash TEXT;
BEGIN
  SELECT pay_password_hash INTO v_hash FROM users WHERE auth_user_id = auth.uid();
  IF v_hash IS NULL OR v_hash = '' THEN RETURN FALSE; END IF;
  RETURN v_hash = crypt(p_password, v_hash);
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_pay_password(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_pay_password(TEXT) TO authenticated;

COMMIT;
