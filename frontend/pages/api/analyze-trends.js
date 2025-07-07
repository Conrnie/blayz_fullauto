import { createClient } from '@supabase/supabase-js'; // Using Supabase client

// Initialize Supabase client (adjust environment variables as needed)
// It's better to centralize this client creation if used elsewhere
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; 

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("API Error: Supabase URL or Service Key is missing.");
  // Consider throwing an error or handling this case appropriately
}

// Ensure Supabase client is initialized only if variables exist
const supabase = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

const DEFAULT_NUM_DAYS = 30; // Default number of days for trend analysis

/**
 * API Route Handler for analyzing trends for all active adsets within a specific campaign.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // campaignId from query should now be the UUID
  const { campaignId } = req.query;
  const numDays = req.query.numDays ? parseInt(req.query.numDays, 10) : DEFAULT_NUM_DAYS;

  if (!campaignId) {
    return res.status(400).json({ error: 'Campaign ID (UUID) is required' });
  }
  if (isNaN(numDays) || numDays <= 0) {
    return res.status(400).json({ error: 'Invalid number of days specified.' });
  }

  if (!supabase) {
     console.error("API Error: Supabase client not initialized.");
     return res.status(500).json({ error: 'Supabase client not initialized.' });
  }

  console.log(`API: Analyzing trends for Campaign UUID: ${campaignId} over ${numDays} days`);

  try {
    let adsetTrends = [];
    let adTrends = [];
    let adsetError = null;
    let adError = null;

    // Parameters only need campaign_id and num_days
    const rpcParams = {
      campaign_id_param: campaignId, // UUID
      num_days: numDays
    };

    // 1. Call function for Adset level trends (only 2 params)
    console.log(`API: Calling analyze_adset_trends with params:`, rpcParams);
    try {
      const { data: adsetData, error: rpcAdsetError } = await supabase.rpc(
        'analyze_adset_trends', // Correct function for adsets
        rpcParams
      );
      if (rpcAdsetError) throw rpcAdsetError;
      adsetTrends = adsetData || [];
      console.log(`API: -> Found ${adsetTrends.length} adset trend records.`);
    } catch (err) {
       console.error(`API: Error calling analyze_adset_trends:`, err);
       adsetError = err.message;
    }

    // 2. Call function for Ad level trends (reverting to analyze_campaign_trends)
    console.log(`API: Calling analyze_campaign_trends with params:`, rpcParams);
     try {
        const { data: adData, error: rpcAdError } = await supabase.rpc(
            'analyze_campaign_trends', // Assuming this is the correct function for ads
             rpcParams                // Assuming same parameters
        );
        if (rpcAdError) throw rpcAdError;
        adTrends = adData || [];
        console.log(`API: -> Found ${adTrends.length} ad trend records.`);
     } catch (err) {
         console.error(`API: Error calling analyze_campaign_trends:`, err);
         adError = err.message; // This will tell us if analyze_campaign_trends doesn't exist or has wrong params
     }

    // Return results
    return res.status(200).json({
        adsetTrends: adsetTrends,
        adTrends: adTrends,
        errors: {
            adset: adsetError,
            ad: adError
        }
    });

  } catch (error) {
    // Catch errors outside the specific RPC calls (e.g., initialization errors)
    console.error('API: General error analyzing trends:', error);
    return res.status(500).json({ error: 'Failed to analyze trends', details: error.message });
  }
} 