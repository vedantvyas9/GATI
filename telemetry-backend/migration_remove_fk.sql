-- Migration: Remove foreign key constraint for anonymous telemetry
-- Run this on your Vercel Postgres database to allow anonymous telemetry

-- Drop the foreign key constraint
ALTER TABLE public.gati_metrics 
DROP CONSTRAINT IF EXISTS fk_user_email;

-- Note: This allows user_email to be NULL or any value without validation
-- All telemetry is now anonymous and doesn't require user authentication

