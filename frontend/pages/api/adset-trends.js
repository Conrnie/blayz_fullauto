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
    // Get and validate parameters
    const { campaign_id, num_days = 30 } = req.query;
    const parsedDays = parseInt(num_days);
    
    if (isNaN(parsedDays) || parsedDays < 1 || parsedDays > 365) {
      return res.status(400).json({ 
        error: 'Invalid num_days parameter. Must be between 1 and 365.' 
      });
    }

    console.log(`[adset-trends API] Analyzing ad set trends for campaign: ${campaign_id}, days: ${parsedDays}`);
    
    // Log parameters right before RPC call for confirmation
    console.log(`[adset-trends API] Calling RPC 'analyze_adset_trends' with campaign_id_param: ${campaign_id || null}, num_days: ${parsedDays}`);

    // Call the Supabase function with validated parameters
    const { data, error } = await supabase
      .rpc('analyze_adset_trends', {
        campaign_id_param: campaign_id || null,
        num_days: parsedDays
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
        error: 'No ad set trend data available for the specified parameters.' 
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