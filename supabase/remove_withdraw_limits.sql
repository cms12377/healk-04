-- Remove withdraw min/max limits: allow any amount > 0 and <= user balance
-- Run in Supabase SQL Editor

BEGIN;

UPDATE withdraw_settings
SET
  withdraw_min = 1,
  withdraw_max = 999999999,
  withdraw_fee = 0
WHERE id = 1;

-- See fix_withdraw_balance_column.sql for submit_withdraw implementation

COMMIT;
