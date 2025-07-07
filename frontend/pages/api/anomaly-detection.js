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
    const numDays = parseInt(timeframe) || 14;
    console.log(`Using numDays: ${numDays}`); // Log the number of days being used

    // Create Supabase client
    const supabase = getServiceClient();

    // *** USE TEST DATE & FOLLOW CLEAR DEBUGGING FLOW ***
    console.log(`[anomaly-detection API] Campaign ID: ${campaign_id}, Days: ${numDays}`);

    // Use a fixed test date we know has data
    const testDate = '2024-08-11';
    console.log(`Using test date: ${testDate} (hardcoded for testing)`);

    // Try each function in order until we get data
    let data = null;
    let error = null;

    // 1. First try the fixed function
    console.log('Attempt 1: Trying detect_campaign_anomalies_fixed...');
    const result1 = await supabase.rpc('detect_campaign_anomalies_fixed', {
      p_campaign_id: campaign_id,
      p_lookback_days: numDays,
      p_end_date: testDate
    });

    if (!result1.error && result1.data && result1.data.length > 0) {
      console.log('✅ detect_campaign_anomalies_fixed succeeded!');
      data = result1.data;
    } else {
      console.log('❌ detect_campaign_anomalies_fixed failed:', result1.error?.message || 'No data returned');
      
      // 2. Try the low_threshold function
      console.log('Attempt 2: Trying detect_campaign_anomalies_low_threshold...');
      const result2 = await supabase.rpc('detect_campaign_anomalies_low_threshold', {
        p_campaign_id: campaign_id,
        p_lookback_days: numDays,
        p_end_date: testDate
      });
      
      if (!result2.error && result2.data && result2.data.length > 0) {
        console.log('✅ detect_campaign_anomalies_low_threshold succeeded!');
        data = result2.data;
      } else {
        console.log('❌ detect_campaign_anomalies_low_threshold failed:', result2.error?.message || 'No data returned');
        
        // 3. Try the original function with different parameter names
        console.log('Attempt 3: Trying original detect_campaign_anomalies...');
        const result3 = await supabase.rpc('detect_campaign_anomalies', {
          campaign_id_param: campaign_id,
          num_days: numDays
        });
        
        if (!result3.error && result3.data && result3.data.length > 0) {
          console.log('✅ detect_campaign_anomalies succeeded!');
          data = result3.data;
        } else {
          console.log('❌ detect_campaign_anomalies failed:', result3.error?.message || 'No data returned');
          error = result3.error || new Error('No anomaly data found with any method');
        }
      }
    }

    if (error) {
      console.error('All anomaly detection attempts failed:', error);
      return res.status(500).json({ error: 'Failed to detect anomalies', details: error.message });
    }

    if (!data || (Array.isArray(data) && data.length === 0)) {
      console.log(`No anomalies detected for campaign ${campaign_id}`);
      return res.status(200).json({ 
        message: 'No anomalies detected',
        rawAnomalies: [] // Return empty array for raw data
      });
    }

    // Return the raw data directly
    return res.status(200).json({
      rawAnomalies: data // Return the data as received from the function
    });
  } catch (error) {
    console.error('Error in anomaly detection API:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
} 