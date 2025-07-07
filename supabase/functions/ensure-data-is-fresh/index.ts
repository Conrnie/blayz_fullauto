/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// Environment variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const EXPECTED_SHARED_SECRET = Deno.env.get('YOUR_SHARED_SECRET');
const YOUR_BACKEND_SYNC_ALL_URL = Deno.env.get('YOUR_BACKEND_SYNC_ALL_URL'); // For calling your Python backend

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('CRITICAL: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables for ensure-data-is-fresh.');
}

if (!EXPECTED_SHARED_SECRET) {
  console.warn('WARNING: YOUR_SHARED_SECRET is not set in environment variables for ensure-data-is-fresh. Function will be insecure if called via HTTP directly.');
}

if (!YOUR_BACKEND_SYNC_ALL_URL) {
  console.warn('WARNING: YOUR_BACKEND_SYNC_ALL_URL is not set. ensure-data-is-fresh will not be able to trigger backend sync.');
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let requestPayload: any;

  try {
    const incomingSharedSecret = req.headers.get('X-Shared-Secret');

    if (EXPECTED_SHARED_SECRET && incomingSharedSecret !== EXPECTED_SHARED_SECRET) {
      console.warn('ensure-data-is-fresh: Missing or incorrect X-Shared-Secret header.');
      // return new Response(JSON.stringify({ error: 'Unauthorized: Missing or incorrect shared secret' }), {
      //   status: 401,
      //   headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      // });
    }

    requestPayload = await req.json();
    // The payload from generate-standard-report.js includes: 
    // { userId, dbAdAccountId, userSupabaseAccessToken, selectedMetaCampaignId }
    const { userId, dbAdAccountId, userSupabaseAccessToken, selectedMetaCampaignId } = requestPayload;

    if (!userId || !dbAdAccountId || !userSupabaseAccessToken) {
      return new Response(
        JSON.stringify({
          error: 'Missing required parameters: userId, dbAdAccountId, and userSupabaseAccessToken.',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(
      `[ensure-data-is-fresh] Received request: userId='${userId}', dbAdAccountId='${dbAdAccountId}', selectedMetaCampaignId='${selectedMetaCampaignId || 'Not Provided'}'`
    );

    const supabaseAdminClient = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Default freshness assumption and sync status
    let dataWasFresh = false;
    let syncAttempted = false;
    let message = 'Freshness check initiated.';

    // Simple example: Check if there are any insights for today for this ad account
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const { data: latestInsight, error: insightCheckError } = await supabaseAdminClient
      .from('campaigns_insights') // Assuming this is your insights table
      .select('date', { count: 'exact', head: false })
      .eq('ad_account_id', dbAdAccountId) // Ensure this column name matches your table
      .eq('user_id', userId)
      .eq('date', today)
      .limit(1)
      .maybeSingle();

    if (insightCheckError) {
      console.error('[ensure-data-is-fresh] Error checking latest insight:', insightCheckError.message);
      message = 'Error during freshness check. Proceeding with sync attempt if configured.';
    } else {
      if (latestInsight) {
        dataWasFresh = true;
        message = 'Data is already fresh for today.';
        console.log(`[ensure-data-is-fresh] Data for today (${today}) is present for dbAdAccountId ${dbAdAccountId}.`);
      } else {
        message = 'Data for today is not present. Attempting sync.';
        console.log(`[ensure-data-is-fresh] Data for today (${today}) is NOT present for dbAdAccountId ${dbAdAccountId}.`);
      }
    }

    if (!dataWasFresh && YOUR_BACKEND_SYNC_ALL_URL) {
      console.log(`[ensure-data-is-fresh] Invoking backend sync endpoint: ${YOUR_BACKEND_SYNC_ALL_URL}`);
      syncAttempted = true;
      try {
        const backendPayload = {
          userId: userId,
          dbAdAccountId: dbAdAccountId,
          ...(selectedMetaCampaignId && { selectedMetaCampaignId: selectedMetaCampaignId })
        };

        // Add timeout to prevent hanging on unavailable backend
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const syncResponse = await fetch(YOUR_BACKEND_SYNC_ALL_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userSupabaseAccessToken}` // Pass the user's token
          },
          body: JSON.stringify(backendPayload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!syncResponse.ok) {
          const errorBody = await syncResponse.text();
          console.error(`[ensure-data-is-fresh] Backend sync call failed. Status: ${syncResponse.status}, Body: ${errorBody}`);
          message += ' Backend sync call failed.';
        } else {
          console.log('[ensure-data-is-fresh] Backend sync call successful.');
          message += ' Backend sync call initiated successfully.';
          // Optionally, you could set dataWasFresh to true here if sync implies immediate freshness,
          // or the calling function re-evaluates.
        }
      } catch (syncError) {
        if (syncError.name === 'AbortError') {
          console.warn('[ensure-data-is-fresh] Backend sync timed out after 10 seconds. Continuing without sync.');
          message += ' Backend sync timed out - continuing without fresh data sync.';
        } else {
          console.error('[ensure-data-is-fresh] Error during backend sync invocation:', syncError.message);
          message += ` Error during backend sync invocation: ${syncError.message}`;
        }
      }
    } else if (!dataWasFresh && !YOUR_BACKEND_SYNC_ALL_URL) {
      message = 'Data is not fresh, but backend sync URL is not configured.';
      console.warn('[ensure-data-is-fresh] Data not fresh, but YOUR_BACKEND_SYNC_ALL_URL is not set.');
    }

    const freshnessResult = {
      success: true, // This function itself completed, errors in sync are logged.
      dataWasFresh: dataWasFresh, // Was data fresh BEFORE this function's sync attempt?
      syncAttempted: syncAttempted,
      message: message
    };

    return new Response(JSON.stringify(freshnessResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('[ensure-data-is-fresh] Error:', error);
    const errorMessage = requestPayload 
      ? `Error processing request. Payload: ${JSON.stringify(requestPayload)}. Error: ${error.message}` 
      : error.message;
    return new Response(JSON.stringify({ success: false, error: errorMessage, dataWasFresh: false, syncAttempted: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}); 