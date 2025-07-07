import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with the service role key
const getServiceClient = () => {
  try {
    // Hardcoded values for Supabase credentials
    const supabaseUrl = process.env.SUPABASE_URL; // Or process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Validate credentials before proceeding
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[ANALYZE_API] Missing Supabase credentials from environment variables. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
      throw new Error('Missing Supabase credentials. Please check environment variables.');
    }

    console.log('[ANALYZE_API] Initializing Supabase client with URL from environment variable');
    
    // Create client with additional options for debugging
    const client = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { 
        autoRefreshToken: false,
        persistSession: false 
      }
    });
    
    // Verify the client was created successfully
    if (!client || !client.rpc) {
      throw new Error('Supabase client initialization failed');
    }
    
    console.log('[ANALYZE_API] Supabase client created successfully');
    return client;
  } catch (error) {
    console.error('[ANALYZE_API] Error creating Supabase client:', error);
    throw error;
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = getServiceClient();

    // Authenticate the user
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[ANALYZE_API] No valid authorization header');
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error('[ANALYZE_API] Authentication error:', userError?.message);
      return res.status(401).json({ error: 'Authentication failed' });
    }
    console.log('[ANALYZE_API] User authenticated:', user.id);
    
    // TODO: If 'analyze_campaign_performance_full_context' RPC needs user_id,
    // ensure it's passed as an argument or that the RPC correctly uses auth.uid().
    // Example: const { data, error } = await supabase.rpc('analyze_campaign_performance_full_context', { p_user_id: user.id });
    // For now, assuming the RPC handles user context or is public.

    // Get campaign_id from request body if needed by RPC (example)
    // const { campaign_id } = req.body;
    // if (!campaign_id) {
    //   return res.status(400).json({ error: 'campaign_id is required in the request body' });
    // }

    console.log('[ANALYZE_API] Calling analyze_campaign_performance_full_context function');
    const { data, error } = await supabase.rpc('analyze_campaign_performance_full_context'); // Potentially pass params like { campaign_id_param: campaign_id }

    if (error) {
      console.error('[ANALYZE_API] Analysis error:', error);
      return res.status(500).json({ error: 'An error occurred during analysis.' }); // Generic error
    }

    if (!data) {
      console.warn('[ANALYZE_API] Function returned no data');
      return res.status(200).json({
        ad_analysis: [],
        demographic_analysis: []
      });
    }

    console.log('[ANALYZE_API] Analysis completed successfully');
    
    // Extract all segment types for each ad
    const adAnalysisWithSegments = data.map(ad => {
      // Make sure we're preserving all the segments
      return {
        ...ad,
        device_segments: ad.device_segments || ad.device_outliers || [],
        demographic_segments: ad.demographic_segments || ad.demographic_outliers || [],
        hourly_segments: ad.hourly_segments || [],
        region_segments: ad.region_segments || [],
        audience_segments: ad.audience_segments || []
      };
    });

    return res.status(200).json({
      ad_analysis: adAnalysisWithSegments,
      demographic_analysis: []  // This is kept for backward compatibility
    });
  } catch (error) {
    console.error('[ANALYZE_API] Server error:', error);
    return res.status(500).json({ 
      error: 'An internal server error occurred.' // Generic error
      // details: error.message, // Removed for production
      // stack: process.env.NODE_ENV === 'development' ? error.stack : undefined // Keep for dev if desired, but not in prod response
    });
  }
} 