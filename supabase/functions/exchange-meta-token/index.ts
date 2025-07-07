// Follow this setup guide to integrate the Deno runtime with your Supabase project:
// https://supabase.com/docs/guides/functions/quickstart

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Define interfaces for request and response data
interface RequestData {
  code: string;
  redirectUri: string;
  directToken?: string;
  metaUserId?: string;
}

serve(async (req: Request) => {
  // CORS headers for browser requests
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // Consider using Deno.env.get("APP_ORIGIN") for specific origin
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json'
  };

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204
    });
  }

  // Require POST method
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed', allowed: 'POST' }), {
      status: 405,
      headers: corsHeaders
    });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: corsHeaders
      });
    }

    // Get request body
    const requestData = await req.json();
    const { code, redirectUri, directToken, metaUserId: requestMetaUserId } = requestData;

    // Determine the flow type based on the provided data.
    // The direct token flow is identified by the presence of `directToken` and `requestMetaUserId`.
    const isDirectTokenFlow = directToken && requestMetaUserId;

    // Validate the payload based on the detected flow type.
    if (!isDirectTokenFlow && (!code || !redirectUri)) {
      return new Response(JSON.stringify({
        error: 'Missing required parameters. For auth code flow, `code` and `redirectUri` are required.',
        required: ['code', 'redirectUri']
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Get Meta API credentials
    const metaAppId = Deno.env.get('META_APP_ID');
    const metaAppSecret = Deno.env.get('META_APP_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // Validate environment variables
    if (!metaAppId || !metaAppSecret || !supabaseUrl || !supabaseServiceRoleKey) {
      console.error('Missing environment variables');
      return new Response(JSON.stringify({
        error: 'Server configuration error',
        details: {
          has_app_id: !!metaAppId,
          has_app_secret: !!metaAppSecret,
          has_supabase_url: !!supabaseUrl,
          has_service_role: !!supabaseServiceRoleKey
        }
      }), {
        status: 500,
        headers: corsHeaders
      });
    }

    let accessToken: string;
    let metaUserId: string;
    let expiresIn: number; // In seconds
    let expiresAt: Date;

    if (isDirectTokenFlow) {
      // --- Direct Token Flow ---
      console.log('Using direct token flow with provided token...');
      accessToken = directToken;
      metaUserId = requestMetaUserId;
      expiresIn = 5184000; // 60 days in seconds (standard assumption)
      expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);
      console.log(`Using provided token, assuming expiry in ${expiresIn} seconds`);
    } else {
      // --- Authorization Code Flow ---
      console.log('Using authorization code flow, exchanging code for token...');
      const tokenResponse = await fetch('https://graph.facebook.com/v19.0/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: metaAppId,
          client_secret: metaAppSecret,
          redirect_uri: redirectUri,
          code: code
        })
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        let errorDetails: any = errorText;
        try { errorDetails = JSON.parse(errorText); } catch (_) {}
        console.error('Meta API token exchange error:', errorDetails);
        return new Response(JSON.stringify({ error: 'Failed to exchange token with Meta', details: errorDetails }), {
          status: tokenResponse.status,
          headers: corsHeaders
        });
      }

      const tokenData = await tokenResponse.json();
      if (!tokenData.access_token) {
        console.error('Invalid Meta response (missing access_token):', tokenData);
        return new Response(JSON.stringify({ error: 'Invalid response from Meta (missing access_token)', details: tokenData }), {
          status: 502,
          headers: corsHeaders
        });
      }
      accessToken = tokenData.access_token;
      expiresIn = tokenData.expires_in || 5184000; // Default to 60 days if not provided
      expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);
      console.log(`Received access token, expires in ${expiresIn} seconds`);

      const meResponse = await fetch(`https://graph.facebook.com/v19.0/me?fields=id&access_token=${accessToken}`);
      if (!meResponse.ok) {
        const errorText = await meResponse.text();
        let errorDetails: any = errorText;
        try { errorDetails = JSON.parse(errorText); } catch (_) {}
        console.error('Error getting user ID from Meta:', errorDetails);
        return new Response(JSON.stringify({ error: 'Failed to get user info from Meta', details: errorDetails }), {
          status: meResponse.status,
          headers: corsHeaders
        });
      }
      const meData = await meResponse.json();
      metaUserId = meData.id;
      if (!metaUserId) {
        console.error('Failed to get Meta user ID from /me endpoint response:', meData);
        return new Response(JSON.stringify({ error: 'Could not retrieve Meta user ID' }), {
          status: 502,
          headers: corsHeaders
        });
      }
    } // End flow type check

    // --- Common Logic ---
    const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const tokenParts = authHeader.split(' ');
    if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
      return new Response(JSON.stringify({ error: 'Invalid authorization header format' }), {
        status: 401,
        headers: corsHeaders
      });
    }
    const jwtToken = tokenParts[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwtToken);

    if (userError || !user) {
      console.error('Error getting user from token:', userError);
      return new Response(JSON.stringify({ error: 'Authentication error', details: userError ? userError.message : 'User not found' }), {
        status: 401,
        headers: corsHeaders
      });
    }
    const supabaseUserId = user.id; // user.id is already a string
    // const supabaseUserIdString = supabaseUserId; // Not needed as user.id is string

    console.log(`Processing for Supabase user: ${supabaseUserId} with Meta user ID: ${metaUserId}`);

    // Store or update the token in meta_connections table
    const { error: connectionUpsertError } = await supabase
      .from('meta_connections')
      .upsert({
        user_id: supabaseUserId, // Supabase user_id is UUID but stored as string, compatible
        meta_user_id: metaUserId,
        long_lived_token: accessToken,
        token_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (connectionUpsertError) {
      console.error('Database error storing/updating Meta connection:', connectionUpsertError);
      return new Response(JSON.stringify({ error: 'Database error storing connection', details: connectionUpsertError.message }), {
        status: 500,
        headers: corsHeaders
      });
    }
    console.log(`Stored/Updated Meta connection for Supabase user ${supabaseUserId}`);

    // Fetch ad accounts from Meta API
    console.log('Fetching ad accounts from Meta API...');
    const adAccountsResponse = await fetch(`https://graph.facebook.com/v19.0/me/adaccounts?fields=name,account_id,account_status,balance,currency,business{id,name},amount_spent&access_token=${accessToken}`);

    if (!adAccountsResponse.ok) {
      const errorText = await adAccountsResponse.text();
      let errorDetails: any = errorText;
      try { errorDetails = JSON.parse(errorText); } catch (_) {}
      console.error('Error fetching ad accounts from Meta:', errorDetails);
      // Still return success as connection was made, but with a warning about ad accounts
      return new Response(JSON.stringify({
        success: true,
        message: 'Meta account connected successfully, but failed to fetch ad accounts.',
        warning_details: errorDetails,
        meta_user_id: metaUserId
      }), {
        status: 200, // Success in connecting, but with issues fetching accounts
        headers: corsHeaders
      });
    }

    const adAccountsData = await adAccountsResponse.json();
    const adAccounts = adAccountsData.data || [];
    console.log(`Retrieved ${adAccounts.length} ad accounts from Meta`);

    // Process and store/update ad accounts
    if (adAccounts.length > 0) {
      console.log('[AD ACCOUNT PROCESSING START]');
      const upsertData = adAccounts.map((account: any) => {
        let status = 'UNKNOWN';
        switch(account.account_status){
          case 1: status = 'ACTIVE'; break;
          case 2: status = 'DISABLED'; break;
          case 3: status = 'UNSETTLED'; break;
          // Add other cases as needed from Meta documentation
        }
        const dataToSave = {
          user_id: supabaseUserId, // Use the string supabaseUserId directly
          account_id: account.account_id,
          name: account.name,
          status: status,
          currency: account.currency || null,
          balance: parseFloat(account.balance) || 0,
          amount_spent: parseFloat(account.amount_spent) || 0,
          business_id: account.business?.id || null,
          business_name: account.business?.name || null,
          source: 'META',
          updated_at: new Date().toISOString()
        };
        return dataToSave;
      });
      console.log(`[AD ACCOUNT PREPARED] ${upsertData.length} accounts ready for upsert.`);
      console.log('[AD ACCOUNT UPSERT START] Attempting bulk upsert...');
      
      const { error: accountsUpsertError } = await supabase
        .from('ad_accounts')
        .upsert(upsertData, { onConflict: 'account_id, user_id' }); // Ensure constraint is correct

      if (accountsUpsertError) {
        console.error('[AD ACCOUNT UPSERT ERROR]', accountsUpsertError);
        return new Response(JSON.stringify({
          success: true,
          message: 'Meta account connected, but failed to store/update some ad accounts.',
          warning_details: accountsUpsertError.message,
          meta_user_id: metaUserId,
          ad_accounts_retrieved: adAccounts.length
        }), {
          status: 200, // Partial success
          headers: corsHeaders
        });
      } else {
        console.log(`[AD ACCOUNT UPSERT SUCCESS] Successfully upserted ${upsertData.length} ad accounts.`);
      }
    } else {
      console.log('[AD ACCOUNT PROCESSING SKIP] No ad accounts retrieved from Meta to process.');
    }

    // Final success response
    return new Response(JSON.stringify({
      success: true,
      message: 'Meta account connected successfully and ad accounts processed.',
      meta_user_id: metaUserId,
      ad_accounts_count: adAccounts.length
    }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Unhandled error in Edge Function:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}); 