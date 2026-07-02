-- Fix member cannot add bank account (RLS INSERT + RPC)
-- Run in Supabase SQL Editor

BEGIN;

-- ---------------------------------------------------------------------------
-- RLS: split policies so INSERT has explicit WITH CHECK
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "bank_cards_own" ON user_bank_cards;
DROP POLICY IF EXISTS "bank_cards_select_own" ON user_bank_cards;
DROP POLICY IF EXISTS "bank_cards_insert_own" ON user_bank_cards;
DROP POLICY IF EXISTS "bank_cards_update_own" ON user_bank_cards;
DROP POLICY IF EXISTS "bank_cards_delete_own" ON user_bank_cards;

CREATE POLICY "bank_cards_select_own" ON user_bank_cards
  FOR SELECT TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "bank_cards_insert_own" ON user_bank_cards
  FOR INSERT TO authenticated
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "bank_cards_update_own" ON user_bank_cards
  FOR UPDATE TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "bank_cards_delete_own" ON user_bank_cards
  FOR DELETE TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Crypto wallets: same pattern (prevent INSERT issues)
DROP POLICY IF EXISTS "crypto_wallets_own" ON user_crypto_wallets;
DROP POLICY IF EXISTS "crypto_wallets_select_own" ON user_crypto_wallets;
DROP POLICY IF EXISTS "crypto_wallets_insert_own" ON user_crypto_wallets;
DROP POLICY IF EXISTS "crypto_wallets_update_own" ON user_crypto_wallets;
DROP POLICY IF EXISTS "crypto_wallets_delete_own" ON user_crypto_wallets;

CREATE POLICY "crypto_wallets_select_own" ON user_crypto_wallets
  FOR SELECT TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "crypto_wallets_insert_own" ON user_crypto_wallets
  FOR INSERT TO authenticated
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "crypto_wallets_update_own" ON user_crypto_wallets
  FOR UPDATE TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "crypto_wallets_delete_own" ON user_crypto_wallets
  FOR DELETE TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- RPC: reliable bank card insert (bypasses RLS edge cases)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.member_add_bank_card(
  p_bank_name TEXT,
  p_bank_username TEXT,
  p_bank_card TEXT
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id BIGINT;
  v_card TEXT;
  v_id BIGINT;
BEGIN
  SELECT id INTO v_user_id FROM users WHERE auth_user_id = auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'user not found'; END IF;

  IF length(trim(p_bank_name)) < 2 THEN RAISE EXCEPTION 'invalid bank name'; END IF;
  IF length(trim(p_bank_username)) < 2 THEN RAISE EXCEPTION 'invalid bank username'; END IF;

  v_card := regexp_replace(trim(COALESCE(p_bank_card, '')), '[^0-9]', '', 'g');
  IF length(v_card) < 8 THEN RAISE EXCEPTION 'invalid bank card'; END IF;

  INSERT INTO user_bank_cards (user_id, bank_name, bank_username, bank_card, createtime)
  VALUES (v_user_id, trim(p_bank_name), trim(p_bank_username), v_card, EXTRACT(EPOCH FROM NOW())::BIGINT)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.member_add_bank_card(TEXT, TEXT, TEXT) TO authenticated;

COMMIT;
