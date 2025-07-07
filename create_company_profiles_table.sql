-- Create the company_profiles table
CREATE TABLE IF NOT EXISTS public.company_profiles (
  profile_id uuid NOT NULL DEFAULT gen_random_uuid(),
  blayz_user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  last_updated_at timestamp with time zone NOT NULL DEFAULT now(),
  company_name character varying(255) NOT NULL,
  website_url text NULL,
  status character varying(50) NOT NULL DEFAULT 'pending',
  general_summary jsonb NULL,
  custom_knowledge_summary jsonb NULL,
  llm_synthesized_profile jsonb NULL,
  source_data_references jsonb NULL,
  display_summary jsonb NULL,
  CONSTRAINT company_profiles_pkey PRIMARY KEY (profile_id),
  CONSTRAINT company_profiles_blayz_user_id_fkey FOREIGN KEY (blayz_user_id) REFERENCES auth.users (id) ON DELETE CASCADE
);

-- Create index for faster queries by user
CREATE INDEX IF NOT EXISTS idx_company_profiles_user_id ON public.company_profiles USING btree (blayz_user_id);

-- Create index for faster queries by creation date
CREATE INDEX IF NOT EXISTS idx_company_profiles_created_at ON public.company_profiles USING btree (created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policy to allow users to only see their own profiles
CREATE POLICY "Users can view their own company profiles" ON public.company_profiles
  FOR SELECT USING (auth.uid() = blayz_user_id);

-- Create RLS policy to allow users to insert their own profiles
CREATE POLICY "Users can insert their own company profiles" ON public.company_profiles
  FOR INSERT WITH CHECK (auth.uid() = blayz_user_id);

-- Create RLS policy to allow users to update their own profiles
CREATE POLICY "Users can update their own company profiles" ON public.company_profiles
  FOR UPDATE USING (auth.uid() = blayz_user_id);

-- Create RLS policy to allow users to delete their own profiles
CREATE POLICY "Users can delete their own company profiles" ON public.company_profiles
  FOR DELETE USING (auth.uid() = blayz_user_id);

-- Grant necessary permissions
GRANT ALL ON public.company_profiles TO authenticated;
GRANT SELECT ON public.company_profiles TO anon; 