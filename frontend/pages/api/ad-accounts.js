import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with the service role key
const getServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  console.log('[AD_ACCOUNTS_API] Initializing Supabase service client');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[AD_ACCOUNTS_API] Missing Supabase credentials');
    throw new Error('Missing Supabase credentials');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
};

export default async function handler(req, res) {
  console.log('Ad accounts API called');
  
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
    
    const userId = user.id;
    console.log('User authenticated:', userId);
    
    // Query ad accounts from Supabase
    console.log(`Executing Supabase query for ad accounts with user_id=${userId}`);
    
    const { data: adAccounts, error } = await supabase
      .from('ad_accounts')
      .select(`
        id,
        account_id,
        name,
        status,
        currency,
        balance,
        amount_spent,
        spend_cap,
        business_name,
        connected_at,
        updated_at
      `)
      .eq('user_id', userId)
      .order('name');
    
    if (error) {
      console.error('Error fetching ad accounts:', error);
      return res.status(500).json({ error: 'Failed to fetch ad accounts' });
    }
    
    console.log(`Retrieved ${adAccounts?.length || 0} ad accounts from database`);
    
    // Debug: Log the first account for inspection (if available)
    if (adAccounts && adAccounts.length > 0) {
      console.log('First ad account sample:', JSON.stringify(adAccounts[0], null, 2));
    }
    
    // If no accounts found, return an empty array
    if (!adAccounts || adAccounts.length === 0) {
      console.log('No ad accounts found for the user');
      return res.status(200).json([]);
    }
    
    // Format the accounts for the frontend component
    const formattedAccounts = adAccounts.map(account => ({
      id: account.id, // Use the internal database ID for frontend
      account_id: account.account_id.startsWith('act_') ? account.account_id : `act_${account.account_id}`, // Auto-add "act_" prefix if missing
      meta_account_id: account.account_id, // Include the original Meta account_id as a separate field
      name: account.name || 'Unnamed Account',
      status: account.status || 'UNKNOWN',
      currency: account.currency || 'USD',
      balance: account.balance,
      amount_spent: account.amount_spent,
      business_name: account.business_name,
      connected_at: account.connected_at,
      updated_at: account.updated_at
    }));
    
    console.log('Returning formatted ad accounts to client, count:', formattedAccounts.length);
    return res.status(200).json(formattedAccounts);
  } catch (error) {
    console.error('Error in ad accounts API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 