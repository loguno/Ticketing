-- Migration 1: Add missing enum values and columns
-- These were added to the schema after the initial migration was already deployed.
-- Uses IF NOT EXISTS to be idempotent (safe to run multiple times).

-- Add missing TicketStatus enum values
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'IN_CARICO';
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'RISPOSTO';
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'SOSPESO';

-- Add missing StartupStatus enum values
ALTER TYPE "StartupStatus" ADD VALUE IF NOT EXISTS 'SOSPESO';
ALTER TYPE "StartupStatus" ADD VALUE IF NOT EXISTS 'ANNULLATO';

-- Add BoardType enum (new, did not exist in 0_init)
CREATE TYPE "BoardType" AS ENUM ('STARTUP', 'TMS', 'WMS', 'CROSS_DOCKING');

-- Add isSuggestion column to tickets
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "isSuggestion" BOOLEAN NOT NULL DEFAULT false;

-- Add boardType column to startup_activities
ALTER TABLE "startup_activities" ADD COLUMN IF NOT EXISTS "boardType" "BoardType" NOT NULL DEFAULT 'STARTUP';
