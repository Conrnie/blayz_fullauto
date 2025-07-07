import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Create a Supabase client with the API route's direct access
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  try {
    // Get campaign_id from query parameters
    const { campaign_id } = req.query;
    
    if (!campaign_id) {
      return res.status(400).json({ error: 'Campaign ID is required' });
    }

    console.log(`[adset-performance API] Analyzing full context for campaign: ${campaign_id}`);
    
    // Call the Supabase function
    const { data, error } = await supabase
      .rpc('analyze_adset_performance_full_context', {
        campaign_id_param: campaign_id
      });
    
    if (error) {
      // Log the full error for debugging
      console.error('Supabase RPC Error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      
      return res.status(500).json({ 
        error: 'Database function error: ' + error.message,
        details: error.details,
        code: error.code
      });
    }
    
    if (!data) {
      return res.status(404).json({ 
        error: 'No ad set performance data available for the specified campaign.' 
      });
    }

    // Return successful response
    return res.status(200).json(data);
    
  } catch (err) {
    console.error('API Error:', {
      message: err.message,
      stack: err.stack
    });
    
    return res.status(500).json({ 
      error: 'Unexpected error: ' + err.message 
    });
  }
} 