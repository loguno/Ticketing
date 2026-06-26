-- Migration: Add missing enum values and columns that were added after initial migration

-- Add missing TicketStatus enum values
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'IN_CARICO';
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'RISPOSTO';
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'SOSPESO';

-- Add missing StartupStatus enum values
ALTER TYPE "StartupStatus" ADD VALUE IF NOT EXISTS 'SOSPESO';
ALTER TYPE "StartupStatus" ADD VALUE IF NOT EXISTS 'ANNULLATO';

-- Add missing BoardType enum (if not exists)
DO $$ BEGIN
  CREATE TYPE "BoardType" AS ENUM ('STARTUP', 'TMS', 'WMS', 'CROSS_DOCKING');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add isSuggestion column to tickets (if not exists)
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "isSuggestion" BOOLEAN NOT NULL DEFAULT false;

-- Add boardType column to startup_activities (if not exists)
ALTER TABLE "startup_activities" ADD COLUMN IF NOT EXISTS "boardType" "BoardType" NOT NULL DEFAULT 'STARTUP';
