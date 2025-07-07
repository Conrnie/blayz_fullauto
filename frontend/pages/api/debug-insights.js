import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with the service role key
const getServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  console.log('[DEBUG_API] Initializing Supabase service client');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[DEBUG_API] Missing Supabase credentials');
    throw new Error('Missing Supabase credentials');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
};

export default async function handler(req, res) {
  console.log('[DEBUG_API] Debug insights endpoint called');
  
  // Get auth header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[DEBUG_API] No valid authorization header');
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    // Create authenticated Supabase client
    const supabase = getServiceClient();
    
    // Get user from token
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.log('[DEBUG_API] Invalid token or user not found:', userError);
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    console.log('[DEBUG_API] User authenticated:', user.id);
    
    // Initialize results object
    const results = {
      user: {
        id: user.id,
        email: user.email
      },
      ad_accounts: [],
      campaigns: [],
      insights: [],
      counts: {
        ad_accounts: 0,
        campaigns: 0,
        insights: 0
      }
    };
    
    // Get all ad accounts for this user
    const { data: adAccounts, error: adAccountsError } = await supabase
      .from('ad_accounts')
      .select('id, account_id, name, status')
      .eq('user_id', user.id)
      .order('name');
      
    if (adAccountsError) {
      console.error('[DEBUG_API] Error fetching ad accounts:', adAccountsError);
      results.errors = { ad_accounts: adAccountsError.message };
    } else {
      results.ad_accounts = adAccounts || [];
      results.counts.ad_accounts = adAccounts?.length || 0;
    }
    
    // Get global counts
    try {
      // Count campaigns
      const { count: campaignsCount, error: campaignsCountError } = await supabase
        .from('campaigns')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
        
      if (!campaignsCountError) {
        results.counts.campaigns = campaignsCount || 0;
      }
      
      // Count insights
      const { count: insightsCount, error: insightsCountError } = await supabase
        .from('campaigns_insights')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
        
      if (!insightsCountError) {
        results.counts.insights = insightsCount || 0;
      }
    } catch (countError) {
      console.error('[DEBUG_API] Error getting counts:', countError);
    }
    
    // Get a specific ad account if provided
    const { ad_account_id } = req.query;
    if (ad_account_id) {
      // Try to fetch the account directly with internal ID
      const { data: adAccount, error: adAccountError } = await supabase
        .from('ad_accounts')
        .select('*')
        .eq('id', parseInt(ad_account_id, 10))
        .eq('user_id', user.id)
        .single();
        
      if (adAccountError) {
        console.error('[DEBUG_API] Error fetching ad account:', adAccountError);
      } else if (adAccount) {
        results.selected_account = adAccount;
        
        // Get campaigns for this account
        const { data: campaigns, error: campaignsError } = await supabase
          .from('campaigns')
          .select('id, meta_campaign_id, name, status, effective_status, synced_at')
          .eq('ad_account_id', adAccount.id)
          .eq('user_id', user.id)
          .order('name');
          
        if (campaignsError) {
          console.error('[DEBUG_API] Error fetching campaigns:', campaignsError);
        } else {
          results.campaigns = campaigns || [];
          
          // Get insights for this account
          const { data: insights, error: insightsError } = await supabase
            .from('campaigns_insights')
            .select('id, campaign_id, meta_campaign_id, date, spend, impressions, clicks, ctr')
            .eq('ad_account_id', adAccount.id)
            .eq('user_id', user.id)
            .order('date', { ascending: false })
            .limit(100);
            
          if (insightsError) {
            console.error('[DEBUG_API] Error fetching insights:', insightsError);
          } else {
            results.insights = insights || [];
            
            // Add count by campaign
            if (insights && insights.length > 0) {
              const insightsByCampaign = {};
              insights.forEach(insight => {
                const id = insight.campaign_id || insight.meta_campaign_id;
                if (!insightsByCampaign[id]) {
                  insightsByCampaign[id] = 0;
                }
                insightsByCampaign[id]++;
              });
              
              results.insights_by_campaign = insightsByCampaign;
              
              // Add date range info
              const dates = [...new Set(insights.map(i => i.date))].sort();
              results.insight_dates = {
                first: dates[0],
                last: dates[dates.length - 1],
                count: dates.length
              };
            }
          }
        }
      } else {
        console.log('[DEBUG_API] Ad account not found by internal ID');
      }
    }
    
    res.status(200).json(results);
  } catch (error) {
    console.error('[DEBUG_API] Error in debug insights API:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
} 