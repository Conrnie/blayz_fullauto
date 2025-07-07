-- Create the campaign_reports table
CREATE TABLE public.campaign_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  campaign_id TEXT NOT NULL,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  report_data JSONB NOT NULL,
  ai_insights JSONB NOT NULL
);

-- Add indexes for faster queries
CREATE INDEX campaign_reports_user_id_idx ON public.campaign_reports(user_id);
CREATE INDEX campaign_reports_campaign_id_idx ON public.campaign_reports(campaign_id);
CREATE INDEX campaign_reports_created_at_idx ON public.campaign_reports(created_at);

-- Add RLS (Row Level Security) policy
ALTER TABLE public.campaign_reports ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see only their own reports
CREATE POLICY "Users can view their own reports" 
  ON public.campaign_reports 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own reports
CREATE POLICY "Users can create their own reports" 
  ON public.campaign_reports 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Grant access to authenticated users
GRANT SELECT, INSERT ON public.campaign_reports TO authenticated; 