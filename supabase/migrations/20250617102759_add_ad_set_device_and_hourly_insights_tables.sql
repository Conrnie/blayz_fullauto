-- Add status column to company_profiles table if it doesn't exist
ALTER TABLE public.company_profiles ADD COLUMN IF NOT EXISTS status character varying(50) NOT NULL DEFAULT 'pending';

-- Add other existing migration content if any
-- ... existing code ...
