import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with the service role key
const getServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[DB_STATUS_API] Missing Supabase credentials');
    throw new Error('Missing Supabase credentials');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
};

export default async function handler(req, res) {
  console.log('[DB_STATUS_API] Database status endpoint called');
  
  // Get auth header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[DB_STATUS_API] No valid authorization header');
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    // Create authenticated Supabase client
    const supabase = getServiceClient();
    
    // Get user from token
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.log('[DB_STATUS_API] Invalid token or user not found:', userError);
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    console.log('[DB_STATUS_API] User authenticated:', user.id);
    
    // Get table counts
    const tableStatus = {};
    
    // 1. Check ad_accounts table
    const { count: adAccountsCount, error: adAccountsError } = await supabase
      .from('ad_accounts')
      .select('*', { count: 'exact', head: true });
      
    if (adAccountsError) {
      console.error('[DB_STATUS_API] Error counting ad_accounts:', adAccountsError);
      tableStatus.ad_accounts = { error: adAccountsError.message };
    } else {
      tableStatus.ad_accounts = { count: adAccountsCount };
      
      // Get ad_accounts owned by this user
      const { count: userAdAccountsCount } = await supabase
        .from('ad_accounts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
        
      tableStatus.ad_accounts.user_count = userAdAccountsCount;
    }
    
    // 2. Check campaigns table
    const { count: campaignsCount, error: campaignsError } = await supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true });
      
    if (campaignsError) {
      console.error('[DB_STATUS_API] Error counting campaigns:', campaignsError);
      tableStatus.campaigns = { error: campaignsError.message };
    } else {
      tableStatus.campaigns = { count: campaignsCount };
      
      // Get a sample campaign
      const { data: campaignSample, error: sampleError } = await supabase
        .from('campaigns')
        .select('*')
        .limit(1);
        
      if (!sampleError && campaignSample && campaignSample.length > 0) {
        tableStatus.campaigns.sample = campaignSample[0];
      }
    }
    
    // 3. Check campaigns_insights table
    const { count: insightsCount, error: insightsError } = await supabase
      .from('campaigns_insights')
      .select('*', { count: 'exact', head: true });
      
    if (insightsError) {
      console.error('[DB_STATUS_API] Error counting campaign_insights:', insightsError);
      tableStatus.campaigns_insights = { error: insightsError.message };
    } else {
      tableStatus.campaigns_insights = { count: insightsCount };
      
      // Get a sample insight
      const { data: insightSample, error: sampleError } = await supabase
        .from('campaigns_insights')
        .select('*')
        .limit(1);
        
      if (!sampleError && insightSample && insightSample.length > 0) {
        tableStatus.campaigns_insights.sample = insightSample[0];
      }
    }
    
    // 4. Check user's campaigns
    if (tableStatus.ad_accounts && tableStatus.ad_accounts.user_count > 0) {
      // Get user's ad account IDs
      const { data: userAdAccounts, error: userAdAccountsError } = await supabase
        .from('ad_accounts')
        .select('id')
        .eq('user_id', user.id);
        
      if (!userAdAccountsError && userAdAccounts && userAdAccounts.length > 0) {
        const adAccountIds = userAdAccounts.map(acc => acc.id);
        
        // Count campaigns for these ad accounts
        const { count: userCampaignsCount, error: userCampaignsError } = await supabase
          .from('campaigns')
          .select('*', { count: 'exact', head: true })
          .in('ad_account_id', adAccountIds);
          
        if (!userCampaignsError) {
          tableStatus.user_campaigns = { 
            count: userCampaignsCount,
            ad_account_ids: adAccountIds
          };
          
          // Count insights for user's campaigns
          if (userCampaignsCount > 0) {
            const { data: userCampaigns } = await supabase
              .from('campaigns')
              .select('id')
              .in('ad_account_id', adAccountIds);
              
            if (userCampaigns && userCampaigns.length > 0) {
              const campaignIds = userCampaigns.map(c => c.id);
              
              const { count: userInsightsCount } = await supabase
                .from('campaigns_insights')
                .select('*', { count: 'exact', head: true })
                .in('campaign_id', campaignIds);
                
              tableStatus.user_insights = {
                count: userInsightsCount,
                campaign_count: campaignIds.length
              };
            }
          }
        }
      }
    }
    
    // Prepare response
    const response = {
      database: {
        tables: tableStatus,
        timestamp: new Date().toISOString()
      },
      user: {
        id: user.id,
        email: user.email
      }
    };
    
    console.log('[DB_STATUS_API] Returning database status');
    return res.status(200).json(response);
  } catch (error) {
    console.error('[DB_STATUS_API] Error in database status API:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
} 