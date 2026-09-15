-- Add username for email-channel password login/registration.
-- Nullable: accounts created via OTP/social channels have no username.
-- All existing rows are NULL, so the unique index cannot collide.
ALTER TABLE "User" ADD COLUMN "username" TEXT;

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
