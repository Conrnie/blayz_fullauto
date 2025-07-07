import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with the service role key
const getServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  console.log('[GET_INSIGHTS_API] Initializing Supabase service client');
  console.log('[GET_INSIGHTS_API] Supabase URL exists:', !!supabaseUrl);
  console.log('[GET_INSIGHTS_API] Supabase service key exists:', !!supabaseServiceKey);
  
  // For local development/testing, use the provided key if environment variable is missing
  if (!supabaseServiceKey) {
    console.log('[GET_INSIGHTS_API] Using fallback service role key for development');
    // This is intentionally hardcoded for development only - in production always use environment variables
    const fallbackKey = null; // Removed hardcoded key for security
    
    if (!supabaseUrl) {
      console.error('[GET_INSIGHTS_API] Missing Supabase URL - cannot proceed');
      throw new Error('Missing Supabase URL');
    }
    
    return createClient(supabaseUrl, fallbackKey);
  }
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[GET_INSIGHTS_API] Missing Supabase service role credentials');
    throw new Error('Missing Supabase service role credentials');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
};

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    console.log('[GET_INSIGHTS_API] Invalid method for get-insights endpoint:', req.method);
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  console.log('[GET_INSIGHTS_API] Received request to get insights');
  console.log('[GET_INSIGHTS_API] Query params:', req.query);
  
  // Validate request parameters
  const { table } = req.query;
  
  if (!table) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required parameter: table' 
    });
  }
  
  // Only allow querying from specific demo tables
  const allowedTables = [
    'demo_ad_insights', 
    'demo_ad_set_insights', 
    'demo_ad_insights_demographics',
    'demo_ad_set_insights_demographics',
    'demo_ad_insights_country',
    'demo_ad_set_insights_country',
    'demo_ad_insights_region',
    'demo_ad_set_insights_region',
    'demo_ad_insights_device',
    'demo_ad_set_insights_device',
    'demo_ad_insights_hourly',
    'demo_ad_set_insights_hourly',
    'demo_ad_insights_audience',
    'demo_ad_set_insights_audience'
  ];
  
  if (!allowedTables.includes(table)) {
    return res.status(400).json({ 
      success: false, 
      error: `Invalid table name: ${table}. Only demo_* tables are allowed.` 
    });
  }

  try {
    // Get admin Supabase client
    console.log('[GET_INSIGHTS_API] Creating admin Supabase client');
    const supabaseAdmin = getServiceClient();
    console.log('[GET_INSIGHTS_API] Admin client created successfully');
    
    // Query the data
    console.log(`[GET_INSIGHTS_API] Querying data from ${table}...`);
    
    // Get limit and offset from query params, with defaults
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    
    // Log the query parameters to assist with debugging
    console.log(`[GET_INSIGHTS_API] Query params: limit=${limit}, offset=${offset}`);
    
    // Start building the query
    let query = supabaseAdmin
      .from(table)
      .select('*');
    
    // Apply pagination - some Supabase client versions are sensitive to method chaining order
    try {
      query = query.limit(limit);
      // Add .offset() only if it's available as a function
      if (typeof query.offset === 'function') {
        query = query.offset(offset);
      } else {
        console.warn('[GET_INSIGHTS_API] query.offset is not a function, skipping offset');
      }
    } catch (error) {
      console.error('[GET_INSIGHTS_API] Error applying pagination:', error);
      return res.status(500).json({
        success: false,
        error: 'Error applying pagination',
        details: error.message
      });
    }
    
    // Add filters if provided
    if (req.query.campaign_id) {
      query = query.eq('campaign_id', req.query.campaign_id);
    }
    
    if (req.query.ad_set_id) {
      query = query.eq('ad_set_id', req.query.ad_set_id);
    }
    
    if (req.query.ad_id) {
      query = query.eq('ad_id', req.query.ad_id);
    }
    
    if (req.query.date) {
      query = query.eq('date', req.query.date);
    }
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error(`[GET_INSIGHTS_API] Error querying ${table}:`, error);
      return res.status(500).json({ 
        success: false, 
        error: `Error querying data: ${error.message}`,
        details: error
      });
    }
    
    console.log(`[GET_INSIGHTS_API] Successfully queried ${data.length} records from ${table}`);
    return res.status(200).json({ 
      success: true, 
      data,
      count: data.length,
      limit,
      offset
    });
  } catch (error) {
    console.error('[GET_INSIGHTS_API] Error in get-insights API:', error);
    console.error('[GET_INSIGHTS_API] Error stack:', error.stack);
    console.error('[GET_INSIGHTS_API] Error type:', error.name);
    console.error('[GET_INSIGHTS_API] Error message:', error.message);
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Unknown error occurred',
      errorType: error.name || 'Unknown'
    });
  }
} 