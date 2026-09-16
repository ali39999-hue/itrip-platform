-- Migration 20260916120000: Ensure User.username exists in Neon / Production
-- Idempotent: checks IF NOT EXISTS so it succeeds whether the column is absent or already present.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "username" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE tablename = 'User' AND indexname = 'User_username_key'
  ) THEN
    CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
  END IF;
END $$;
