import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with the service role key
const getServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  console.log('[TEST_DATA_API] Initializing Supabase service client');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[TEST_DATA_API] Missing Supabase credentials');
    throw new Error('Missing Supabase credentials');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
};

export default async function handler(req, res) {
  console.log('Test data API called');
  
  try {
    // Create Supabase client
    const supabase = getServiceClient();
    
    // Get counts using proper count method
    const { count: campaignsCount, error: campaignsError } = await supabase
      .from('campaigns')
      .select('*', { count: 'exact' });
    
    const { count: insightsCount, error: insightsError } = await supabase
      .from('campaigns_insights')
      .select('*', { count: 'exact' });
    
    const { count: adAccountsCount, error: adAccountsError } = await supabase
      .from('ad_accounts')
      .select('*', { count: 'exact' });
    
    console.log('Count results:', { campaignsCount, insightsCount, adAccountsCount });
    
    // Get a single ad account as sample
    const { data: sampleAdAccount, error: adAccountError } = await supabase
      .from('ad_accounts')
      .select('*')
      .limit(1)
      .single();
    
    // Get a single campaign as sample
    const { data: sampleCampaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .limit(1)
      .single();
    
    // Get a single campaign insight as sample
    const { data: sampleInsight, error: insightError } = await supabase
      .from('campaigns_insights')
      .select('*')
      .limit(1)
      .single();
    
    // Return all the data
    return res.status(200).json({
      counts: {
        campaigns: campaignsCount || 0,
        insights: insightsCount || 0,
        adAccounts: adAccountsCount || 0
      },
      samples: {
        adAccount: sampleAdAccount || null,
        campaign: sampleCampaign || null,
        insight: sampleInsight || null
      },
      errors: {
        campaigns: campaignsError?.message || null,
        insights: insightsError?.message || null,
        adAccounts: adAccountsError?.message || null,
        adAccount: adAccountError?.message || null,
        campaign: campaignError?.message || null,
        insight: insightError?.message || null
      }
    });
  } catch (error) {
    console.error('Error in test data API:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
} 