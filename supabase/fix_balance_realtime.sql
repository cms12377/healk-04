-- Realtime balance updates for members (after settle / deposit approve)
-- Run after fix_game_realtime.sql

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'users'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE users;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'user_money_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_money_logs;
  END IF;
END $$;
