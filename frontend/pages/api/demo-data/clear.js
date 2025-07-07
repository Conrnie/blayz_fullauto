import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with the service role key
const getServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  console.log('[CLEAR_API] Initializing Supabase service client');
  console.log('[CLEAR_API] Supabase URL exists:', !!supabaseUrl);
  console.log('[CLEAR_API] Supabase service key exists:', !!supabaseServiceKey);
  
  // For local development/testing, use the provided key if environment variable is missing
  if (!supabaseServiceKey) {
    console.log('[CLEAR_API] Using fallback service role key for development');
    // This is intentionally hardcoded for development only - in production always use environment variables
    const fallbackKey = null; // Removed hardcoded key for security
    
    if (!supabaseUrl) {
      console.error('[CLEAR_API] Missing Supabase URL - cannot proceed');
      throw new Error('Missing Supabase URL');
    }
    
    return createClient(supabaseUrl, fallbackKey);
  }
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[CLEAR_API] Missing Supabase service role credentials');
    throw new Error('Missing Supabase service role credentials');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
};

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    console.log('[CLEAR_API] Invalid method for demo-data/clear endpoint:', req.method);
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  console.log('[CLEAR_API] Received request to clear demo data');
  
  try {
    // Get admin Supabase client
    console.log('[CLEAR_API] Creating admin Supabase client');
    const supabaseAdmin = getServiceClient();
    console.log('[CLEAR_API] Admin client created successfully');
    
    // Clear demo_ad_insights table
    console.log('[CLEAR_API] Clearing demo_ad_insights table...');
    try {
      // Using a filter condition that matches all records to satisfy DELETE requires WHERE clause
      const { error: adInsightsError } = await supabaseAdmin
        .from('demo_ad_insights')
        .delete()
        .gte('id', '00000000-0000-0000-0000-000000000000'); // Match all UUIDs (greater than all-zeros UUID)
      
      if (adInsightsError) {
        console.error('[CLEAR_API] Error clearing demo_ad_insights:', adInsightsError);
        return res.status(500).json({ 
          success: false, 
          error: `Error clearing demo_ad_insights: ${adInsightsError.message}`, 
          details: adInsightsError 
        });
      }
      
      console.log('[CLEAR_API] Successfully cleared demo_ad_insights table');
    } catch (err) {
      console.error('[CLEAR_API] Exception clearing demo_ad_insights:', err.message);
      return res.status(500).json({
        success: false,
        error: `Exception clearing demo_ad_insights: ${err.message}`,
        details: err
      });
    }
    
    // Clear demo_ad_set_insights table
    console.log('[CLEAR_API] Clearing demo_ad_set_insights table...');
    try {
      const { error: adSetInsightsError } = await supabaseAdmin
        .from('demo_ad_set_insights')
        .delete()
        .gte('id', '00000000-0000-0000-0000-000000000000'); // Match all UUIDs
      
      if (adSetInsightsError) {
        console.error('[CLEAR_API] Error clearing demo_ad_set_insights:', adSetInsightsError);
        return res.status(500).json({ 
          success: false, 
          error: `Error clearing demo_ad_set_insights: ${adSetInsightsError.message}`,
          details: adSetInsightsError 
        });
      }
      
      console.log('[CLEAR_API] Successfully cleared demo_ad_set_insights table');
    } catch (err) {
      console.error('[CLEAR_API] Exception clearing demo_ad_set_insights:', err.message);
      return res.status(500).json({
        success: false,
        error: `Exception clearing demo_ad_set_insights: ${err.message}`,
        details: err
      });
    }
    
    // Clear breakdown tables as well
    const breakdownTables = [
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
    
    // Clear each breakdown table
    for (const table of breakdownTables) {
      try {
        console.log(`[CLEAR_API] Clearing ${table} table...`);
        const { error: tableError } = await supabaseAdmin
          .from(table)
          .delete()
          .gte('id', '00000000-0000-0000-0000-000000000000'); // Match all UUIDs
          
        if (tableError) {
          console.warn(`[CLEAR_API] Error clearing ${table}: ${tableError.message}`);
          // Continue with other tables even if one fails
        } else {
          console.log(`[CLEAR_API] Successfully cleared ${table} table`);
        }
      } catch (tableError) {
        console.warn(`[CLEAR_API] Exception clearing ${table}: ${tableError.message}`);
        // Continue with other tables even if one fails
      }
    }
    
    console.log('[CLEAR_API] All demo data cleared successfully');
    
    return res.status(200).json({ success: true, message: 'All demo data cleared successfully' });
  } catch (error) {
    console.error('[CLEAR_API] Error in demo-data/clear API:', error);
    console.error('[CLEAR_API] Error stack:', error.stack);
    console.error('[CLEAR_API] Error type:', error.name);
    console.error('[CLEAR_API] Error message:', error.message);
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Unknown error occurred',
      errorType: error.name || 'Unknown'
    });
  }
} 