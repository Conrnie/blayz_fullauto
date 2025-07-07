import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with the service role key
const getServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  console.log('[INSERT_API] Initializing Supabase service client');
  console.log('[INSERT_API] Supabase URL exists:', !!supabaseUrl);
  console.log('[INSERT_API] Supabase service key exists:', !!supabaseServiceKey);
  console.log('[INSERT_API] Environment variables:', Object.keys(process.env).filter(key => key.includes('SUPABASE')));
  
  // For local development/testing, use the provided key if environment variable is missing
  if (!supabaseServiceKey) {
    console.log('[INSERT_API] Using fallback service role key for development');
    // This is intentionally hardcoded for development only - in production always use environment variables
    const fallbackKey = null; // Removed hardcoded key for security
    
    if (!supabaseUrl) {
      console.error('[INSERT_API] Missing Supabase URL - cannot proceed');
      throw new Error('Missing Supabase URL');
    }
    
    return createClient(supabaseUrl, fallbackKey);
  }
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[INSERT_API] Missing Supabase service role credentials');
    throw new Error('Missing Supabase service role credentials');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
};

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    console.log('[INSERT_API] Invalid method for demo-data/insert endpoint:', req.method);
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // Validate request body
  const { table, data } = req.body;
  
  if (!table || !data || !Array.isArray(data)) {
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid request body. Required format: { table: "table_name", data: [...records] }' 
    });
  }
  
  // Only allow inserting into specific demo tables
  if (table !== 'demo_ad_insights' && table !== 'demo_ad_set_insights') {
    return res.status(400).json({ 
      success: false, 
      error: `Invalid table name: ${table}. Only demo_ad_insights and demo_ad_set_insights are allowed.` 
    });
  }

  console.log(`[INSERT_API] Received request to insert ${data.length} records into ${table}`);
  
  try {
    // Get admin Supabase client
    console.log('[INSERT_API] Creating admin Supabase client');
    const supabaseAdmin = getServiceClient();
    console.log('[INSERT_API] Admin client created successfully');
    
    // Insert the data
    console.log(`[INSERT_API] Inserting ${data.length} records into ${table}...`);
    const { error: insertError } = await supabaseAdmin
      .from(table)
      .insert(data);
    
    if (insertError) {
      console.error(`[INSERT_API] Error inserting data into ${table}:`, insertError);
      return res.status(500).json({ 
        success: false, 
        error: `Error inserting data: ${insertError.message}`,
        details: insertError
      });
    }
    
    console.log(`[INSERT_API] Successfully inserted ${data.length} records into ${table}`);
    return res.status(200).json({ success: true, count: data.length });
  } catch (error) {
    console.error('[INSERT_API] Error in demo-data/insert API:', error);
    console.error('[INSERT_API] Error stack:', error.stack);
    console.error('[INSERT_API] Error type:', error.name);
    console.error('[INSERT_API] Error message:', error.message);
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Unknown error occurred',
      errorType: error.name || 'Unknown'
    });
  }
} 