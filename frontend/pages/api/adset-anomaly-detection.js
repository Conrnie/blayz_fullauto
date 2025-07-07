import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with the service role key
const getServiceClient = () => {
  const supabaseUrl = 'https://zrsevaevonthrspehpaj.supabase.co';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get campaign_id and timeframe from query parameters
    const { campaign_id, timeframe } = req.query;

    if (!campaign_id) {
      return res.status(400).json({ error: 'Campaign ID is required' });
    }

    // Convert timeframe to number of days (default to 14 if not provided or invalid)
    const rollingWindow = parseInt(timeframe) || 14;
    console.log(`Using rolling window: ${rollingWindow}`);

    // Create Supabase client
    const supabase = getServiceClient();

    // Log what we're doing
    console.log(`[adset-anomaly-detection API] Campaign ID: ${campaign_id}, Rolling window: ${rollingWindow}`);

    // Set start date to August 1st, 2024 and end date to today
    const today = new Date();
    const endDateString = today.toISOString().split('T')[0];
    const startDateString = '2024-08-01'; 
    
    console.log(`Using date range: ${startDateString} to ${endDateString}`);

    // Call the new unified ad set daily anomaly detection function
    console.log('Calling detect_adset_daily_anomalies...');
    const { data, error } = await supabase.rpc('detect_adset_daily_anomalies', {
      p_start_date: startDateString,
      p_end_date: endDateString,
      p_campaign_id: campaign_id,
      p_rolling_window: rollingWindow,       // Use timeframe from query params
      p_std_dev_threshold: 2.0,             // Standard threshold for daily checks
      p_segment_threshold_pct: 0.25,        // Increased threshold for segment comparisons (was 0.15)
      p_min_impressions: 100                // Keep minimum impressions at 100
      // Spend dominance percentages will use the function's defaults
    });

    if (error) {
      console.error('Error calling detect_adset_daily_anomalies:', error);
      // Removed the fallback logic
      return res.status(500).json({ error: 'Failed to detect ad set anomalies', details: error.message });
    }

    // Removed successful fallback log

    if (!data || (Array.isArray(data) && data.length === 0) || (data && data.hasOwnProperty('error'))) {
      // Check if the function returned a specific error message
      if (data && data.hasOwnProperty('error')) {
        console.error(`Error returned from detect_adset_daily_anomalies: ${data.error}`);
         return res.status(500).json({ error: 'Error during anomaly detection', details: data.error });
      }
      // Otherwise, no anomalies found or empty array returned
      console.log(`No ad set anomalies detected or empty result for campaign ${campaign_id}`);
      return res.status(200).json({
        message: 'No ad set anomalies detected',
        rawAnomalies: [] // Return empty array for raw data
      });
    }

    // Return the raw data directly
    return res.status(200).json({
      rawAnomalies: data // Return the data as received from the function
    });
  } catch (error) {
    console.error('Error in ad set anomaly detection API:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
} 