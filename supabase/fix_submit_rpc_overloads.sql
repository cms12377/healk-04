-- Drop legacy RPC overloads that confuse PostgREST (ambiguous submit_deposit / submit_identity)
-- Run after fix_deposit_submit.sql + fix_identity_kyc.sql

BEGIN;

DROP FUNCTION IF EXISTS public.submit_deposit(NUMERIC, TEXT);
DROP FUNCTION IF EXISTS public.submit_identity(TEXT, TEXT);

COMMIT;
