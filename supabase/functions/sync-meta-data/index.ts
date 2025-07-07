import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

// --- Environment Variables for Auth ---
const EXPECTED_SHARED_SECRET = Deno.env.get('YOUR_SHARED_SECRET');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (request) => {
  const corsHeaders = getCorsHeaders(request);

  // Handle OPTIONS preflight request
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204
    });
  }

  // --- Main Function Logic ---
  // --- Shared Secret Authentication ---
  if (!EXPECTED_SHARED_SECRET) {
    console.error('CRITICAL: YOUR_SHARED_SECRET is not set in environment variables for sync-meta-data function.');
    return new Response(JSON.stringify({ error: 'Server configuration error: Missing shared secret configuration.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const authorizationHeader = request.headers.get('Authorization');
  if (!authorizationHeader) {
    return new Response(JSON.stringify({ error: 'Authorization header is missing.' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const tokenParts = authorizationHeader.split(' ');
  if (tokenParts.length !== 2 || tokenParts[0].toLowerCase() !== 'bearer') {
    return new Response(JSON.stringify({ error: 'Invalid Authorization header format. Expected Bearer token.' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const receivedToken = tokenParts[1];

  // Check if the token matches EXPECTED_SHARED_SECRET or SERVICE_ROLE_KEY
  if (receivedToken === EXPECTED_SHARED_SECRET) {
    console.log('Authorization successful with YOUR_SHARED_SECRET.');
  } else if (SERVICE_ROLE_KEY && receivedToken === SERVICE_ROLE_KEY) {
    console.log('Call to sync-meta-data authorized with SERVICE_ROLE_KEY. Assuming internal or trusted source.');
  } else {
    // Attempt to verify as a Supabase user JWT
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (supabaseUrl && supabaseAnonKey) {
      const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
      const { data, error } = await supabaseClient.auth.getUser(receivedToken);
      if (error) {
        console.warn('Invalid token: Received token is not a valid Supabase user JWT:', error.message);
        return new Response(JSON.stringify({ error: 'Invalid token.' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        console.log('Authorization successful with Supabase user JWT for user:', data.user.id);
        // Optionally, you can use data.user.id to match with payload user_id later
      }
    } else {
      console.warn('Invalid token: Received token does not match YOUR_SHARED_SECRET or SERVICE_ROLE_KEY, and Supabase client is not configured to verify JWT.');
      return new Response(JSON.stringify({ error: 'Invalid token.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }
  // If we reach here, the token is valid (either shared secret, service role key, or user JWT)

  try {
    // --- Get Payload ---
    if (!request.body) {
      throw new Error("Request body is missing.");
    }
    const payload = await request.json().catch((err)=>{
      throw new Error(`Invalid JSON in request body: ${err.message}`);
    });
    const userIdFromPayload = payload.user_id;
    const adAccountIdFromPayload = payload.ad_account_id; // Ensure ad_account_id is parsed

    let userIdToUse = userIdFromPayload;
    if (!userIdFromPayload) {
        // Fallback: Try to extract user_id from Supabase JWT if the token is a JWT
        if (receivedToken !== EXPECTED_SHARED_SECRET && receivedToken !== SERVICE_ROLE_KEY) {
            const supabaseUrl = Deno.env.get('SUPABASE_URL');
            const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
            if (supabaseUrl && supabaseAnonKey) {
                const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
                const { data, error } = await supabaseClient.auth.getUser(receivedToken);
                if (error) {
                    console.warn('Could not extract user_id from JWT:', error.message);
                } else {
                    userIdToUse = data.user.id;
                    console.log('Extracted user_id from JWT as fallback:', userIdToUse);
                }
            }
        }
        if (!userIdToUse) {
            const errorMessage = "Missing user_id in request payload. The user_id is required to identify the Meta connection for syncing data. Please include a valid user_id in the request body.";
            console.error(errorMessage);
            return new Response(JSON.stringify({ error: "Missing user_id in request payload.", details: errorMessage }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }
    }
    if (!adAccountIdFromPayload) { // Add check for ad_account_id
      throw new Error("Missing ad_account_id in request payload.");
    }

    // --- Start of New Validation Logic ---
    // Validate that the ad_account_id from the payload is in the correct format (e.g., "act_123456789")
    if (typeof adAccountIdFromPayload !== 'string' || !adAccountIdFromPayload.startsWith('act_')) {
      const errorMessage = `Invalid Meta Ad Account ID format: '${adAccountIdFromPayload}'. Expected a string starting with 'act_'. This is likely a data issue where the internal database ID was sent instead of the Meta Ad Account ID.`;
      console.error(errorMessage);
      return new Response(JSON.stringify({
        error: "Invalid Ad Account ID format provided.",
        details: errorMessage
      }), {
        status: 400, // Bad Request
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    // --- End of New Validation Logic ---
    
    console.log(`Processing sync request for User ID: ${userIdToUse}, Ad Account ID: ${adAccountIdFromPayload}`);
    console.log(`Payload sent to sub-functions: ${JSON.stringify(payload)}`);

    // --- Client Initialization & Auth using SERVICE ROLE KEY for internal DB operations ---
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    // const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY'); // No longer use anon key for this function's DB client
    const supabaseServiceRoleKey = SERVICE_ROLE_KEY; // SERVICE_ROLE_KEY is already loaded at the top of the file

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('CRITICAL: Missing Supabase URL or SUPABASE_SERVICE_ROLE_KEY in environment for sync-meta-data.');
      throw new Error("Server configuration error: Missing Supabase URL or Service Role Key for internal database client.");
    }
    const supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    // --- Fetch Meta Connection (using user_id from payload or JWT) ---
    console.log(`Fetching meta connection details for user ${userIdToUse}...`);
    const { data: connection, error: connError } = await supabaseClient
      .from('meta_connections')
      .select('long_lived_token, token_expires_at')
      .eq('user_id', userIdToUse)
      .single();

    if (connError) {
      console.error(`DB Error fetching meta connection for user ${userIdToUse}:`, connError.message);
      if (connError.code === 'PGRST116') {
        throw new Error("Database schema error: 'meta_connections' table might be missing or inaccessible.");
      }
      throw new Error(`Database error: ${connError.message}`);
    }
    if (!connection) {
      console.error(`Meta connection record not found for user ${userIdToUse}.`);
      throw new Error("Meta connection not found for user. Please connect your Meta account.");
    }

    // --- Validate Meta Token ---
    const now = Math.floor(Date.now() / 1000);
    const expiresAtTimestamp = connection.token_expires_at ? Math.floor(new Date(connection.token_expires_at).getTime() / 1000) : null;
    if (!connection.long_lived_token) {
      console.error(`Missing long_lived_token for user ${userIdToUse}.`);
      throw new Error("Meta token is missing in the database.");
    }
    if (expiresAtTimestamp && expiresAtTimestamp < now) {
      console.warn(`Meta token for user ${userIdToUse} has expired.`);
      throw new Error("Meta token has expired. Please reconnect your Meta account.");
    }
    // const meta_access_token = connection.long_lived_token; // Not needed to pass to sub-functions if they fetch it themselves

    console.log(`Successfully validated meta token for user ${userIdToUse}.`);

    // --- Prepare Headers for Sub-Function Calls ---
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`, // Use SERVICE_ROLE_KEY for internal sub-function calls
      ...corsHeaders
    };

    // --- Fetch Internal DB Ad Account ID ---
    // Sub-functions need the internal database ID to look up the ad account
    console.log(`Fetching internal database ID for Meta Ad Account ID: ${adAccountIdFromPayload}`);
    const { data: adAccountData, error: adAccountError } = await supabaseClient
      .from('ad_accounts')
      .select('id')
      .eq('user_id', userIdToUse)
      .eq('account_id', adAccountIdFromPayload.replace('act_', '')) // Remove 'act_' prefix to match database
      .single();

    if (adAccountError || !adAccountData) {
      console.error(`Could not find internal DB Ad Account ID for Meta Ad Account ID ${adAccountIdFromPayload} and user ${userIdToUse}:`, adAccountError);
      throw new Error(`Could not find internal DB Ad Account ID for the given Meta Ad Account ID and user.`);
    }

    const dbAdAccountId = adAccountData.id;
    console.log(`Found internal DB Ad Account ID: ${dbAdAccountId} for Meta Ad Account ID: ${adAccountIdFromPayload}`);

    // --- Prepare Payload for Sub-Function Calls ---
    // This payload will be used for sync-campaigns, sync-ad-sets, and sync-ads
    const subFunctionUniversalPayload = {
      user_id: userIdToUse,
      meta_ad_account_id: adAccountIdFromPayload, // Pass the Meta Ad Account ID (act_xxx)
      db_ad_account_id: dbAdAccountId // Pass the internal database ID
    };
    const bodyForSubFunctions = JSON.stringify(subFunctionUniversalPayload);

    // --- Invoke Sub-Functions Sequentially ---
    let campaignsResult: { message: string; errors: string[] } = { message: "Sync skipped.", errors: [] };
    let adSetsResult: { message: string; errors: string[] } = { message: "Sync skipped.", errors: [] };
    let adsResult: { message: string; errors: string[] } = { message: "Sync skipped.", errors: [] };

    try {
    // --- Step 1: Sync Campaigns ---
      console.log(`Starting campaign sync for user ${userIdToUse}...`);
    const campaignFunctionUrl = `${supabaseUrl}/functions/v1/sync-campaigns`;
    const campaignsResponse = await fetch(campaignFunctionUrl, {
      method: 'POST',
      headers,
        body: bodyForSubFunctions // Use the new universal payload
    });

    if (!campaignsResponse.ok) {
      const campaignError = await campaignsResponse.text();
      console.error(`Error syncing campaigns: ${campaignError}`);
      throw new Error(`Failed to sync campaigns: ${campaignError}`);
    }

      campaignsResult = await campaignsResponse.json().catch(() => ({ message: 'Campaign sync finished but response was not valid JSON.', errors: ['Invalid JSON response'] }));
    console.log(`Campaigns sync complete: ${campaignsResult.message}`);
    console.log(`Campaigns sync result details: ${JSON.stringify(campaignsResult)}`);

    // --- Step 2: Sync Ad Sets ---
      console.log(`Starting ad sets sync for user ${userIdToUse}...`);
    const adSetsFunctionUrl = `${supabaseUrl}/functions/v1/sync-ad-sets`;
    const adSetsResponse = await fetch(adSetsFunctionUrl, {
      method: 'POST',
      headers,
        body: bodyForSubFunctions // Use the new universal payload
    });

    if (!adSetsResponse.ok) {
      const adSetError = await adSetsResponse.text();
      console.error(`Error syncing ad sets: ${adSetError}`);
      throw new Error(`Failed to sync ad sets: ${adSetError}`);
    }

      adSetsResult = await adSetsResponse.json().catch(() => ({ message: 'Ad sets sync finished but response was not valid JSON.', errors: ['Invalid JSON response'] }));
    console.log(`Ad sets sync complete: ${adSetsResult.message}`);
    console.log(`Ad sets sync result details: ${JSON.stringify(adSetsResult)}`);

    // --- Step 3: Sync Ads ---
      console.log(`Starting ads sync for user ${userIdToUse}...`);
    const adsFunctionUrl = `${supabaseUrl}/functions/v1/sync-ads`;
    const adsResponse = await fetch(adsFunctionUrl, {
      method: 'POST',
      headers,
        body: bodyForSubFunctions // Use the new universal payload
    });

    if (!adsResponse.ok) {
      const adsError = await adsResponse.text();
      console.error(`Error syncing ads: ${adsError}`);
      throw new Error(`Failed to sync ads: ${adsError}`);
    }

      adsResult = await adsResponse.json().catch(() => ({ message: 'Ad sync finished but response was not valid JSON.', errors: ['Invalid JSON response'] }));
    console.log(`Ads sync complete: ${adsResult.message}`);

    } catch (error) {
      console.error('--- UNHANDLED ERROR CAUGHT IN INNER CATCH BLOCK ---');
      let errorMessage = error instanceof Error ? error.message : String(error);
      
      campaignsResult = { message: 'Sync skipped.', errors: [errorMessage] };
      adSetsResult = { message: 'Sync skipped.', errors: [errorMessage] };
      adsResult = { message: 'Sync skipped.', errors: [errorMessage] };
    }

    // --- Combine all errors ---
    const allErrors: string[] = [
      ...(campaignsResult.errors || []),
      ...(adSetsResult.errors || []),
      ...(adsResult.errors || [])
    ];

    // --- Final Response ---
    const responseBody = {
      message: `Meta data sync completed:
      - Campaigns: ${campaignsResult.message}
      - Ad Sets: ${adSetsResult.message}
      - Ads: ${adsResult.message}`,
      errors: allErrors.length > 0 ? allErrors : null,
      success: allErrors.length === 0,
      campaigns_result: campaignsResult,
      ad_sets_result: adSetsResult,
      ads_result: adsResult
    };

    console.log("Meta data sync function finished. Returning response.");
    return new Response(JSON.stringify(responseBody), {
      status: allErrors.length > 0 ? 200 : 200, // Still return 200 even with errors
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('--- UNHANDLED ERROR CAUGHT IN OUTER CATCH BLOCK ---');
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack || 'No stack trace available');
    return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}); 