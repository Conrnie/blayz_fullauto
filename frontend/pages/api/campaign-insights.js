import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with the service role key
const getServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  console.log('[CAMPAIGN_INSIGHTS_API] Initializing Supabase service client');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[CAMPAIGN_INSIGHTS_API] Missing Supabase credentials');
    throw new Error('Missing Supabase credentials');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
};

export default async function handler(req, res) {
  console.log('Campaign insights API called with query:', req.query);
  
  // Get auth header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('No valid authorization header');
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    // Create authenticated Supabase client
    const supabase = getServiceClient();
    
    // Get user from token
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.log('Invalid token or user not found:', userError);
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    console.log('User authenticated:', user.id);
    
    // Get query parameters
    const { account_id, ad_account_id, campaign_id, time_range } = req.query;
    
    if (!account_id && !ad_account_id) {
      console.log('Missing account_id or ad_account_id parameter');
      return res.status(400).json({ error: 'Either account_id or ad_account_id is required' });
    }
    
    // Use account_id (Meta's ID) to find the internal ad_account_id if provided
    let internalAdAccountId;
    
    try {
      if (ad_account_id) {
        console.log('[INSIGHTS_API] Trying to use ad_account_id directly:', ad_account_id);
        
        // First try to find the ad account directly with the id (internal ID)
        const { data: directAccount, error: directError } = await supabase
          .from('ad_accounts')
          .select('id')
          .eq('id', parseInt(ad_account_id, 10)) // Convert to number to ensure proper comparison
          .eq('user_id', user.id)
          .maybeSingle();
          
        if (directError) {
          console.error('[INSIGHTS_API] Error during direct ID lookup:', directError);
          // Don't return yet, we'll try the next approach
        }
          
        if (directAccount) {
          console.log(`[INSIGHTS_API] Found ad account by internal ID: ${directAccount.id}`);
          internalAdAccountId = directAccount.id;
        } else {
          // If that doesn't work, try with account_id (Meta's external ID)
          console.log(`[INSIGHTS_API] No account with internal ID ${ad_account_id}, trying as Meta account_id...`);
          const { data: metaAccount, error: metaError } = await supabase
            .from('ad_accounts')
            .select('id')
            .eq('account_id', ad_account_id)
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (metaError) {
            console.error('[INSIGHTS_API] Error during Meta ID lookup:', metaError);
            return res.status(500).json({ error: 'Failed to query for ad account' });
          }
          
          if (!metaAccount) {
            console.log('[INSIGHTS_API] No ad account found matching either internal id or account_id:', ad_account_id);
            return res.status(404).json({ error: 'Ad account not found for this user' });
          }
          
          console.log(`[INSIGHTS_API] Found ad account by Meta account_id: ${metaAccount.id}`);
          internalAdAccountId = metaAccount.id;
        }
      } 
      else if (account_id) {
        console.log('[INSIGHTS_API] Looking up internal ID for Meta account_id:', account_id);
        
        // Query the ad_accounts table to get the internal ID
        const { data: adAccounts, error: adAccountError } = await supabase
          .from('ad_accounts')
          .select('id')
          .eq('account_id', account_id)
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (adAccountError) {
          console.error('[INSIGHTS_API] Error fetching ad account by account_id:', adAccountError);
          return res.status(500).json({ error: 'Failed to fetch ad account' });
        }
        
        if (!adAccounts) {
          console.log('[INSIGHTS_API] Ad account not found for account_id:', account_id);
          return res.status(404).json({ error: 'Ad account not found' });
        }
        
        internalAdAccountId = adAccounts.id;
        console.log('[INSIGHTS_API] Found internal ad_account_id:', internalAdAccountId);
      }
    } catch (accountError) {
      console.error('[INSIGHTS_API] Error during ad account lookup:', accountError);
      return res.status(500).json({ error: 'Failed to find the specified ad account', details: accountError.message });
    }
    
    // Check if we successfully found an internal ID
    if (!internalAdAccountId) {
      console.error('[INSIGHTS_API] Failed to determine internal ad account ID');
      return res.status(500).json({ error: 'Could not determine the internal ID for the ad account.' });
    }
    
    console.log('[INSIGHTS_API] Fetching insights for internal ad account ID:', internalAdAccountId);
    
    // Build the query with explicit casts for numeric fields
    let query = supabase
      .from('campaigns_insights')
      .select(`
        id,
        campaign_id,
        meta_campaign_id,
        date,
        spend::text,
        impressions::text,
        reach::text,
        clicks::text,
        ctr::text,
        cpm::text,
        cpc::text,
        results::text,
        cpa::text,
        roas::text,
        conversion_rate::text,
        post_reactions::text,
        post_comments::text,
        post_shares::text,
        video_views::text,
        video_completion_rate::text
      `)
      .eq('ad_account_id', internalAdAccountId);
    
    // Add filters if provided
    if (campaign_id) {
      console.log('[INSIGHTS_API] Filtering by campaign_id:', campaign_id);
      // Try both fields since we might have either the internal ID or Meta ID
      query = query.or(`meta_campaign_id.eq.${campaign_id},campaign_id.eq.${campaign_id}`);
    }
    
    // Add time range filter if provided
    if (time_range) {
      console.log('[INSIGHTS_API] Applying time range filter:', time_range);
      const now = new Date();
      let startDate;
      
      switch (time_range.since) {
        case '7d':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          break;
        case '14d':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 14);
          break;
        case '30d':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 30);
          break;
        case '90d':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 90);
          break;
        case '365d':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 365);
          break;
        default:
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 30); // Default to 30 days
      }
      
      const formattedStartDate = startDate.toISOString().split('T')[0];
      console.log('Using start date:', formattedStartDate);
      query = query.gte('date', formattedStartDate);
    }
    
    // Order by date
    query = query.order('date', { ascending: false });
    
    // Execute the query
    const { data: insights, error } = await query;
    
    if (error) {
      console.error('[INSIGHTS_API] Error fetching campaign insights:', error);
      console.error('[INSIGHTS_API] Error details:', {
        message: error.message,
        code: error.code,
        hint: error.hint,
        details: error.details
      });
      return res.status(500).json({ error: 'Failed to fetch campaign insights' });
    }
    
    console.log(`Retrieved ${insights?.length || 0} campaign insights`);
    
    // Debug: Log sample of insights
    if (insights && insights.length > 0) {
      console.log('First insight sample:', JSON.stringify(insights[0], null, 2));
    }
    
    // If no insights found, return an empty array
    if (!insights || insights.length === 0) {
      console.log('No insights found for the selected parameters');
      return res.status(200).json([]);
    }
    
    // Process and format the data for the frontend
    const formattedInsights = insights.map(insight => {
      // Log each individual insight before processing
      console.log('Raw insight before processing:', {
        id: insight.id,
        campaign_id: insight.campaign_id,
        date: insight.date,
        rawSpend: insight.spend,
        rawSpendType: typeof insight.spend,
        parsedSpend: parseFloat(insight.spend || 0),
        rawImpressions: insight.impressions,
        parsedImpressions: parseInt(insight.impressions || 0),
        rawClicks: insight.clicks,
        parsedClicks: parseInt(insight.clicks || 0),
      });
      
      return {
        date: insight.date,
        spend: parseFloat(insight.spend || 0),
        impressions: parseInt(insight.impressions || 0),
        reach: parseInt(insight.reach || 0),
        clicks: parseInt(insight.clicks || 0),
        ctr: parseFloat(insight.ctr || 0),
        cpm: parseFloat(insight.cpm || 0),
        cpc: parseFloat(insight.cpc || 0),
        results: parseInt(insight.results || 0),
        cpa: parseFloat(insight.cpa || 0),
        roas: parseFloat(insight.roas || 0),
        conversion_rate: parseFloat(insight.conversion_rate || 0),
        post_reactions: parseInt(insight.post_reactions || 0),
        post_comments: parseInt(insight.post_comments || 0),
        post_shares: parseInt(insight.post_shares || 0),
        video_views: parseInt(insight.video_views || 0),
        video_completion_rate: parseFloat(insight.video_completion_rate || 0)
      };
    });
    
    // Log both raw and formatted results
    if (insights.length > 0) {
      console.log('Sample raw database values:');
      console.log('- spend:', insights[0].spend, 'type:', typeof insights[0].spend);
      console.log('- impressions:', insights[0].impressions, 'type:', typeof insights[0].impressions);
      console.log('- clicks:', insights[0].clicks, 'type:', typeof insights[0].clicks);
      
      console.log('Sample formatted values:');
      console.log('- spend:', formattedInsights[0].spend, 'type:', typeof formattedInsights[0].spend);
      console.log('- impressions:', formattedInsights[0].impressions, 'type:', typeof formattedInsights[0].impressions);
      console.log('- clicks:', formattedInsights[0].clicks, 'type:', typeof formattedInsights[0].clicks);
    }
    
    console.log('Returning formatted insights to client, count:', formattedInsights.length);
    return res.status(200).json(formattedInsights);
  } catch (error) {
    console.error('Error in campaign insights API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 