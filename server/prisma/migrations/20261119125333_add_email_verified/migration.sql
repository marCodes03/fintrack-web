-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: accounts that existed before email verification was introduced stay usable.
UPDATE "User" SET "emailVerified" = true;
