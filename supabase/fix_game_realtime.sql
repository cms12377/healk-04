-- Enable Supabase Realtime for game round updates (member + admin auto-refresh)
-- Run once in Supabase SQL Editor

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'draw_results'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE draw_results;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'game_issues'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE game_issues;
  END IF;
END $$;
