import { generateTestData } from '../../lib/demo-data-generator.js';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase credentials');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

export default async function handler(req, res) {
  console.log('[GENERATE_TEST_API] Received generate test data request');
  console.log('[GENERATE_TEST_API] Request method:', req.method);
  
  // Log request headers to help with debugging URL issues
  console.log('[GENERATE_TEST_API] Request headers:', {
    host: req.headers.host,
    'x-forwarded-host': req.headers['x-forwarded-host'],
    'x-forwarded-proto': req.headers['x-forwarded-proto'],
    origin: req.headers.origin,
    referer: req.headers.referer
  });
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    console.log('[GENERATE_TEST_API] Invalid method:', req.method);
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // Initialize Supabase client
  let supabase;
  try {
    supabase = getServiceClient();
  } catch (error) {
    console.error('[GENERATE_TEST_API] Failed to initialize Supabase client:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to initialize database connection',
      errorType: error.name
    });
  }

  // Set API base URL for server-side requests
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
  const apiBaseUrl = `${protocol}://${host}`;
  
  console.log('[GENERATE_TEST_API] Setting API base URL:', apiBaseUrl);
  process.env.API_BASE_URL = apiBaseUrl;
  
  try {
    console.log('[GENERATE_TEST_API] Generating test data...');
    
    const result = await generateTestData();
    
    console.log('[GENERATE_TEST_API] Test data generation result:', result);
    
    if (result.success) {
      // Get inserted ad insights to know their IDs
      console.log('[TEST_DATA] Fetching inserted ad insights...');
      const fetchAdInsightsResponse = await fetch(`${apiBaseUrl}/api/demo-data/get-insights?table=demo_ad_insights`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!fetchAdInsightsResponse.ok) {
        console.error('[TEST_DATA] Failed to fetch ad insights:', await fetchAdInsightsResponse.text());
        return res.status(200).json(result); // Return original result if we can't fetch insights
      }
      
      const adInsightsResult = await fetchAdInsightsResponse.json();
      
      if (!adInsightsResult.success || !adInsightsResult.data) {
        console.error('[TEST_DATA] Error fetching ad insights:', adInsightsResult.error);
        return res.status(200).json(result);
      }
      
      const adInsights = adInsightsResult.data;
      
      // Get inserted ad set insights
      console.log('[TEST_DATA] Fetching inserted ad set insights...');
      const fetchAdSetInsightsResponse = await fetch(`${apiBaseUrl}/api/demo-data/get-insights?table=demo_ad_set_insights`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!fetchAdSetInsightsResponse.ok) {
        console.error('[TEST_DATA] Failed to fetch ad set insights:', await fetchAdSetInsightsResponse.text());
        return res.status(200).json(result);
      }
      
      const adSetInsightsResult = await fetchAdSetInsightsResponse.json();
      
      if (!adSetInsightsResult.success || !adSetInsightsResult.data) {
        console.error('[TEST_DATA] Error fetching ad set insights:', adSetInsightsResult.error);
        return res.status(200).json(result);
      }
      
      const adSetInsights = adSetInsightsResult.data;
      
      console.log('[TEST_DATA] Found ad insights:', adInsights.length);
      console.log('[TEST_DATA] Found ad set insights:', adSetInsights.length);

      // Add device data generation function
      function generateDeviceData(insightId) {
        const devices = ['desktop', 'mobile', 'tablet'];
        const platforms = ['facebook', 'instagram'];
        const positions = ['feed', 'story', 'reels'];
        
        const mockData = [];
        
        devices.forEach(device => {
          platforms.forEach(platform => {
            positions.forEach(position => {
              const impressions = Math.floor(Math.random() * 10000) + 1000;
              const clicks = Math.floor(Math.random() * (impressions * 0.1));
              const spend = Math.floor(Math.random() * 1000) + 100;
              const results = Math.floor(Math.random() * (clicks * 0.2));
              
              mockData.push({
                insight_id: insightId,
                action_device: device,
                publisher_platform: platform,
                platform_position: position,
                impression_device: device,
                spend: spend,
                impressions: impressions,
                reach: Math.floor(impressions * 0.7),
                frequency: (impressions / (impressions * 0.7)).toFixed(2),
                clicks: clicks,
                ctr: ((clicks / impressions) * 100).toFixed(2),
                cpm: ((spend / impressions) * 1000).toFixed(2),
                cpc: clicks > 0 ? (spend / clicks).toFixed(2) : 0,
                results: results,
                cpa: results > 0 ? (spend / results).toFixed(2) : 0,
                roas: results > 0 ? ((results * 50) / spend).toFixed(2) : 0,
                conversion_rate: ((results / clicks) * 100).toFixed(2),
                value_per_conversion: 50,
                quality_ranking: ['ABOVE_AVERAGE', 'AVERAGE', 'BELOW_AVERAGE'][Math.floor(Math.random() * 3)],
                engagement_rate_ranking: ['ABOVE_AVERAGE', 'AVERAGE', 'BELOW_AVERAGE'][Math.floor(Math.random() * 3)],
                conversion_rate_ranking: ['ABOVE_AVERAGE', 'AVERAGE', 'BELOW_AVERAGE'][Math.floor(Math.random() * 3)],
                post_reactions: Math.floor(Math.random() * 100),
                post_comments: Math.floor(Math.random() * 20),
                post_shares: Math.floor(Math.random() * 10),
                video_views: Math.floor(Math.random() * 5000),
                video_completion_rate: (Math.random() * 0.6 + 0.2).toFixed(2),
                average_watch_time: Math.floor(Math.random() * 15) + 5
              });
            });
          });
        });
        
        return mockData;
      }

      // Generate device data for each ad insight
      let allAdInsightsDeviceData = [];
      for (const insight of adInsights) {
        const deviceData = generateDeviceData(insight.id);
        allAdInsightsDeviceData = allAdInsightsDeviceData.concat(deviceData);
      }

      // Generate device data for each ad set insight
      let allAdSetInsightsDeviceData = [];
      for (const insight of adSetInsights) {
        const deviceData = generateDeviceData(insight.id);
        allAdSetInsightsDeviceData = allAdSetInsightsDeviceData.concat(deviceData);
      }

      console.log('[TEST_DATA] Generated ad insights device data:', allAdInsightsDeviceData.length, 'records');
      console.log('[TEST_DATA] Generated ad set insights device data:', allAdSetInsightsDeviceData.length, 'records');

      // Add logging for database insertions
      console.log('[TEST_DATA] Inserting device data into database');

      if (allAdInsightsDeviceData.length > 0) {
        const { error: adDeviceError } = await supabase
          .from('demo_ad_insights_device')
          .insert(allAdInsightsDeviceData);

        if (adDeviceError) {
          console.error('[TEST_DATA] Error inserting ad device data:', adDeviceError);
        } else {
          console.log('[TEST_DATA] Successfully inserted ad insights device data');
        }
      }

      if (allAdSetInsightsDeviceData.length > 0) {
        const { error: adSetDeviceError } = await supabase
          .from('demo_ad_set_insights_device')
          .insert(allAdSetInsightsDeviceData);

        if (adSetDeviceError) {
          console.error('[TEST_DATA] Error inserting ad set device data:', adSetDeviceError);
        } else {
          console.log('[TEST_DATA] Successfully inserted ad set insights device data');
        }
      }

      // Update the result summary with device data counts
      result.summary = {
        ...result.summary,
        adInsightsDevice: allAdInsightsDeviceData.length,
        adSetInsightsDevice: allAdSetInsightsDeviceData.length,
        totalDataPoints: result.summary.totalDataPoints + 
          allAdInsightsDeviceData.length + allAdSetInsightsDeviceData.length
      };

      return res.status(200).json(result);
    } else {
      console.error('[GENERATE_TEST_API] Test data generation failed:', result.error);
      return res.status(500).json(result);
    }
  } catch (error) {
    console.error('[GENERATE_TEST_API] Unhandled exception:', error);
    console.error('[GENERATE_TEST_API] Error stack:', error.stack);
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Unknown error occurred',
      errorType: error.name || 'Unknown'
    });
  }
} 