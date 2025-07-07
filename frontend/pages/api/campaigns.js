import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with the service role key
const getServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  console.log('[CAMPAIGNS_API] Initializing Supabase service client');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[CAMPAIGNS_API] Missing Supabase credentials');
    throw new Error('Missing Supabase credentials');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
};

export default async function handler(req, res) {
  console.log('[CAMPAIGNS_API] Handler called with query:', req.query);
  
  // Get auth header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[CAMPAIGNS_API] No valid authorization header');
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    // Create authenticated Supabase client
    const supabase = getServiceClient();
    
    // Get user from token
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.log('[CAMPAIGNS_API] Invalid token or user not found:', userError);
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    console.log('[CAMPAIGNS_API] User authenticated:', user.id);
    
    // Get the ad_account_id from query params
    const { ad_account_id } = req.query;
    if (!ad_account_id) {
      console.log('[CAMPAIGNS_API] Missing ad_account_id parameter');
      return res.status(400).json({ error: 'ad_account_id is required' });
    }

    // Basic input validation for ad_account_id
    if (typeof ad_account_id !== 'string' || ad_account_id.length > 100) { // Max length 100 as an example
      console.log('[CAMPAIGNS_API] Invalid ad_account_id format or length');
      return res.status(400).json({ error: 'Invalid ad_account_id format' });
    }
    
    console.log(`[CAMPAIGNS_API] Received ad_account_id parameter: ${ad_account_id} (type: ${typeof ad_account_id})`);
    
    let adAccountInternalId;
    
    // Note on ID lookup: The system attempts to match ad_account_id first as an internal DB ID (integer),
    // and then as a Meta account_id (string, e.g., 'act_xxxxxxxx'). 
    // The .eq('user_id', user.id) check ensures data is scoped to the authenticated user.
    try {
      console.log(`[CAMPAIGNS_API] Attempt 1: Finding ad account by internal ID (column 'id') matching: ${ad_account_id}`);
      
      // First try to find the ad account directly with the id (internal ID)
      // Try as both number and string to be safe
      let numericId = null;
      try {
        numericId = parseInt(ad_account_id, 10);
        console.log(`[CAMPAIGNS_API] Parsed ad_account_id as number: ${numericId}`);
      } catch (parseError) {
        console.warn(`[CAMPAIGNS_API] Could not parse ad_account_id as number: ${parseError.message}`);
      }
      
      const { data: directAccount, error: directError } = await supabase
        .from('ad_accounts')
        .select('id')
        .or(`id.eq.${numericId || ad_account_id},id.eq.${ad_account_id}`)
        .eq('user_id', user.id)
        .maybeSingle(); 
        
      if (directError) {
        console.error('[CAMPAIGNS_API] Error during direct ID lookup (Attempt 1):', directError);
        // Don't return yet, we'll try the next approach
      }
        
      if (directAccount) {
        console.log(`[CAMPAIGNS_API] Success (Attempt 1): Found ad account by internal ID: ${directAccount.id}`);
        adAccountInternalId = directAccount.id;
      } else {
        // If that doesn't work, try with account_id (Meta's external ID)
        console.log(`[CAMPAIGNS_API] Attempt 1 failed. Attempt 2: Finding ad account by Meta ID (column 'account_id') matching: ${ad_account_id}`);
        
        const { data: metaAccount, error: metaError } = await supabase
          .from('ad_accounts')
          .select('id')
          .eq('account_id', ad_account_id.toString()) // Ensure string format for account_id
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (metaError) {
          console.error('[CAMPAIGNS_API] Error during Meta ID lookup (Attempt 2):', metaError);
          return res.status(500).json({ error: 'Failed to query for ad account. Please try again later.' }); // Generic error
        }
        
        if (!metaAccount) {
          console.log('[CAMPAIGNS_API] Attempt 2 failed. No ad account found matching either internal id or account_id:', ad_account_id);
          return res.status(404).json({ error: 'Ad account not found for this user' });
        }
        
        console.log(`[CAMPAIGNS_API] Success (Attempt 2): Found ad account by Meta account_id. Internal ID is: ${metaAccount.id}`);
        adAccountInternalId = metaAccount.id;
      }
    } catch (accountError) {
      console.error('[CAMPAIGNS_API] Unexpected error during ad account lookup block:', accountError);
      return res.status(500).json({ error: 'Internal server error during ad account lookup', details: accountError.message });
    }
    
    // Check if we successfully found an internal ID after both attempts
    if (adAccountInternalId === undefined || adAccountInternalId === null) {
      console.error('[CAMPAIGNS_API] Critical Failure: Failed to determine internal ad account ID for input:', ad_account_id);
      return res.status(500).json({ error: 'Could not determine the internal ID for the ad account.' });
    }
    
    console.log(`[CAMPAIGNS_API] Proceeding to query campaigns using internal ID: ${adAccountInternalId} (type: ${typeof adAccountInternalId})`);
    
    // Direct database query to verify campaigns exist
    try {
      // First do a count query to check if campaigns exist
      const { count, error: countError } = await supabase
        .from('campaigns')
        .select('id', { count: 'exact', head: true })
        .eq('ad_account_id', adAccountInternalId);
        
      if (countError) {
        console.error('[CAMPAIGNS_API] Error counting campaigns:', countError);
      } else {
        console.log(`[CAMPAIGNS_API] Campaign count for ad_account_id ${adAccountInternalId}: ${count}`);
      }
    } catch (countQueryError) {
      console.error('[CAMPAIGNS_API] Error in count query:', countQueryError);
    }
    
    // Now query campaigns using the internal ID
    try {
      const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select(`
          id,
          meta_campaign_id,
          name,
          status,
          effective_status,
          objective,
          created_at,
          meta_updated_time,
          start_time,
          stop_time,
          synced_at
        `)
        .eq('ad_account_id', adAccountInternalId);
      
      if (error) {
        console.error('[CAMPAIGNS_API] Error fetching campaigns from DB:', { 
          internalIdUsed: adAccountInternalId, 
          idType: typeof adAccountInternalId,
          error: error.message, // Log detailed error server-side
          code: error.code,
          details: error.details || 'No additional details'
        });
        return res.status(500).json({ error: 'Failed to fetch campaigns. Please try again later.' }); // Generic error
      }
      
      console.log(`[CAMPAIGNS_API] Retrieved ${campaigns?.length || 0} campaigns from database`);
      
      // Debug: Log the first campaign for inspection (if available)
      if (campaigns && campaigns.length > 0) {
        console.log('[CAMPAIGNS_API] First campaign sample:', JSON.stringify(campaigns[0], null, 2));
      }
      
      // If no campaigns found, return an empty array
      if (!campaigns || campaigns.length === 0) {
        console.log('[CAMPAIGNS_API] No campaigns found for the selected ad account internal ID:', adAccountInternalId);
        return res.status(200).json([]);
      }
      
      // Format the campaigns for the frontend component
      const formattedCampaigns = campaigns.map(campaign => ({
        id: campaign.id, // Use internal ID as 'id'
        campaign_id: campaign.meta_campaign_id, // Use Meta's campaign ID as 'campaign_id'
        name: campaign.name || 'Unnamed Campaign',
        status: campaign.status || 'UNKNOWN',
        effective_status: campaign.effective_status,
        objective: campaign.objective || 'Not specified',
        created_time: campaign.created_at,
        updated_time: campaign.meta_updated_time,
        start_time: campaign.start_time,
        stop_time: campaign.stop_time,
        synced_at: campaign.synced_at
      }));
      
      console.log('[CAMPAIGNS_API] Returning formatted campaigns to client, count:', formattedCampaigns.length);
      return res.status(200).json(formattedCampaigns);
    } catch (campaignsQueryError) {
      console.error('[CAMPAIGNS_API] Critical error in campaigns query:', {
        error: campaignsQueryError.message,
        stack: campaignsQueryError.stack
      });
      return res.status(500).json({ error: 'Critical error fetching campaigns', details: campaignsQueryError.message });
    }
  } catch (error) {
    console.error('[CAMPAIGNS_API] Unexpected error in handler:', error); // Log detailed error
    // Potentially add more specific details from 'error' object to the server log if helpful
    return res.status(500).json({ error: 'An internal server error occurred.' }); // Generic error
  }
} 