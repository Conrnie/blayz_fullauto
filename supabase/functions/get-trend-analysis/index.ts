/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// --- Constants ---
const CHUTES_API_URL = 'https://llm.chutes.ai/v1/chat/completions';
const CHUTES_MODEL = 'tngtech/DeepSeek-R1T-Chimera';

// --- Shared Secret for Endpoint Protection ---
const EXPECTED_SHARED_SECRET = Deno.env.get('YOUR_SHARED_SECRET');

// --- Supabase Client (Service Role) ---
let supabaseAdmin: SupabaseClient | null = null;
function getSupabaseAdminClient(): SupabaseClient {
  if (supabaseAdmin) {
    return supabaseAdmin;
  }
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("CRITICAL: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars not set.");
    throw new Error("Server configuration error: Supabase secrets missing");
  }
  console.log("[TREND LOG] Initializing Supabase client with Service Role Key.");
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  return supabaseAdmin;
}

serve(async (req) => {
  // --- CORS Preflight ---
  if (req.method === 'OPTIONS') {
    console.log("[TREND LOG][CORS] OPTIONS request received.");
    return new Response('ok', { headers: corsHeaders });
  }

  // --- Shared Secret Authentication ---
  if (EXPECTED_SHARED_SECRET) { // Only check if the secret is configured
    const requestSharedSecret = req.headers.get('X-Shared-Secret');
    if (requestSharedSecret !== EXPECTED_SHARED_SECRET) {
      console.error("[TREND ERROR] Unauthorized: Shared secret mismatch or missing.");
      return new Response(JSON.stringify({ error: 'Unauthorized: Shared secret mismatch or missing.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    console.log("[TREND LOG] Shared secret validated successfully.");
  } else {
    // This case should ideally not happen in production if the secret is always set.
    // For development, you might allow it to proceed, or log a stern warning.
    console.warn("[TREND WARN] YOUR_SHARED_SECRET is not set in environment variables. Proceeding without shared secret check (DEVELOPMENT ONLY).");
  }

  // --- Method Check (after auth) ---
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    let campaignId: string | null = null;
    let numDays: number | null = null; 

    try {
      const body = await req.json();
      campaignId = body.campaignId;
      const parsedNumDays = parseInt(body.numDays, 10);

      if (!campaignId || typeof campaignId !== 'string') {
        throw new Error("Missing or invalid 'campaignId' (UUID string)");
      }
      if (isNaN(parsedNumDays) || parsedNumDays <= 0) {
        throw new Error("Missing or invalid 'numDays' (must be a positive number)");
      }
      numDays = parsedNumDays;
    } catch (jsonError: any) {
      return new Response(JSON.stringify({ error: 'Invalid JSON request body', details: jsonError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[TREND LOG] Request for Campaign UUID: ${campaignId}, Days: ${numDays}`);
    const supaAdmin = getSupabaseAdminClient();

    let metaCampaignId: string | null = null;
    let campaignObjective: string | null = null;
    let campaignName: string | null = null;
    let companyProfileId: string | null = null;

    try {
      console.log(`[TREND LOG] Looking up details for campaign UUID: ${campaignId}`);
      const { data: campaignData, error: campaignError } = await supaAdmin
        .from('campaigns')
        .select('meta_campaign_id, objective, name, company_profile_id')
        .eq('id', campaignId!)
        .single();

      if (campaignError) throw campaignError;
      if (!campaignData) throw new Error(`Campaign with UUID ${campaignId} not found.`);

      metaCampaignId = campaignData.meta_campaign_id;
      campaignObjective = campaignData.objective;
      campaignName = campaignData.name;
      companyProfileId = campaignData.company_profile_id;
      console.log(`[TREND LOG] Meta ID: ${metaCampaignId || 'N/A'}, Name: ${campaignName || 'N/A'}, Objective: ${campaignObjective || 'N/A'}`);
    } catch (lookupError: any) {
      console.error(`[TREND ERROR] Campaign lookup for UUID ${campaignId}:`, lookupError);
      return new Response(JSON.stringify({ error: 'Failed to retrieve campaign details', details: lookupError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let businessContext = "No business context available.";
    if (companyProfileId) {
      const { data: profileData } = await supaAdmin
        .from('company_profiles')
        .select('llm_synthesized_profile')
        .eq('profile_id', companyProfileId)
        .single();
      if (profileData?.llm_synthesized_profile) {
        const profile = profileData.llm_synthesized_profile;
        businessContext = `
**Business Context Framework:**
*   **Company Summary:** ${profile.summary || 'Not provided.'}
*   **Primary Offering:** ${profile.primary_offering || 'Not provided.'}
*   **Target Audience:** ${profile.target_audience || 'Not provided.'}
`;
      }
    }

    // --- Step 3: Call RPCs and fetch raw data ---
    const adsetRpcParams = {
      campaign_id_param: campaignId,
      num_days: numDays
    };
    const adRpcParams = {
      meta_campaign_id_param: metaCampaignId,
      num_days: numDays
    };

    console.log(`[TREND LOG] Calling DB function analyze_adset_trends...`);
    const { data: calculatedAdsetTrends, error: adsetTrendsError } = await supaAdmin.rpc('analyze_adset_trends', adsetRpcParams);
    if (adsetTrendsError) console.error("[TREND ERROR] Calling analyze_adset_trends:", adsetTrendsError);

    console.log(`[TREND LOG] Calling DB function analyze_ad_trends...`);
    const { data: calculatedAdTrends, error: adTrendsError } = await supaAdmin.rpc('analyze_ad_trends', adRpcParams);
    if (adTrendsError) console.error("[TREND ERROR] Calling analyze_ad_trends:", adTrendsError);

    let overallMaxDate: Date | null = null;
    let maxDateStr: string | null = null;
    let rawStartDateStr: string | null = null;
    let rawDataHeaderDateRange = "Unavailable";

    try {
      const { data: maxAdsetData } = await supaAdmin
        .from('ad_set_insights')
        .select('date')
        .eq('campaign_id', campaignId!)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();
      const maxAdsetDate = maxAdsetData?.date ? new Date(maxAdsetData.date) : null;

      let maxAdDate: Date | null = null;
      if (metaCampaignId) {
        const { data: maxAdData } = await supaAdmin
          .from('ad_insights')
          .select('date')
          .eq('campaign_id', metaCampaignId)
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle();
        maxAdDate = maxAdData?.date ? new Date(maxAdData.date) : null;
      }

      if (maxAdsetDate && maxAdDate) {
        overallMaxDate = maxAdsetDate > maxAdDate ? maxAdsetDate : maxAdDate;
      } else {
        overallMaxDate = maxAdsetDate || maxAdDate;
      }
      
      if (overallMaxDate instanceof Date && !isNaN(overallMaxDate.getTime())) {
        maxDateStr = overallMaxDate.toISOString().split('T')[0];
        const tempStartDate = new Date(overallMaxDate);
        tempStartDate.setDate(tempStartDate.getDate() - 6);
        rawStartDateStr = tempStartDate.toISOString().split('T')[0];
        rawDataHeaderDateRange = `${rawStartDateStr} to ${maxDateStr}`;
        console.log(`[TREND LOG] Max insight date: ${maxDateStr}. Raw data window: ${rawDataHeaderDateRange}`);
      } else {
        console.log(`[TREND LOG] No valid overallMaxDate to determine raw data window.`);
      }
    } catch (dateError: any) {
      console.error("[TREND ERROR] Determining max insight date:", dateError);
    }

    let rawAdsetInsights: any[] = [];
    let rawAdInsights: any[] = [];
    let rawAdsetError: Error | null = null;
    let rawAdInsightsError: Error | null = null;
    let rawDataError: string | null = null;

    if (rawStartDateStr && maxDateStr) {
      try {
        const { data: adsetRaw, error: adsetErr } = await supaAdmin
          .from('ad_set_insights')
          .select('*')
          .eq('campaign_id', campaignId!)
          .gte('date', rawStartDateStr)
          .lte('date', maxDateStr)
          .order('date', { ascending: false });
        if (adsetErr) throw adsetErr;
        rawAdsetInsights = adsetRaw || [];
      } catch (err: any) {
        rawAdsetError = err;
      }

      if (metaCampaignId) {
        try {
          const { data: adRaw, error: adErr } = await supaAdmin
            .from('ad_insights')
            .select('*')
            .eq('campaign_id', metaCampaignId)
            .gte('date', rawStartDateStr)
            .lte('date', maxDateStr)
            .order('date', { ascending: false });
          if (adErr) throw adErr;
          rawAdInsights = adRaw || [];
        } catch (err: any) {
          rawAdInsightsError = err;
        }
      } else {
        rawAdInsightsError = new Error("Meta Campaign ID not found/is null, skipping raw ad insights.");
      }
    } else {
      const msg = "Skipping 7-day raw insights: date window not determined.";
      if (!rawAdsetError) rawAdsetError = new Error(msg);
      if (!rawAdInsightsError) rawAdInsightsError = new Error(msg);
    }
    
    const errorMessages: string[] = [];
    if (rawAdsetError) errorMessages.push(`Adset Insights Error: ${rawAdsetError.message}`);
    if (rawAdInsightsError) errorMessages.push(`Ad Insights Error: ${rawAdInsightsError.message}`);
    if (errorMessages.length > 0) {
        rawDataError = errorMessages.join('; ');
    }

    console.log(`[TREND LOG] Raw Adset Insights: ${rawAdsetInsights.length}, Errors: ${rawAdsetError?.message || 'None'}`);
    console.log(`[TREND LOG] Raw Ad Insights: ${rawAdInsights.length}, Errors: ${rawAdInsightsError?.message || 'None'}`);

    const chutesApiToken = Deno.env.get('CHUTES_API_TOKEN');
    if (!chutesApiToken) {
      console.error("CRITICAL: CHUTES_API_TOKEN secret not set.");
      return new Response(JSON.stringify({ error: 'AI API Authentication Error: Token missing' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const objectiveForPrompt = campaignObjective || 'Not Specified';
    const nameForPrompt = campaignName || 'the campaign';
    const metaIdForPrompt = metaCampaignId || 'N/A';

    const promptContent = `**Role:** You are a hyper-intelligent data analyst specializing in Meta ad campaigns for "${nameForPrompt}" (Objective: ${objectiveForPrompt}).

${businessContext}

**Core Task:**
Analyze two data streams to identify performance trends.
1.  **Calculated Trends:** Shows KPI trajectories over the last ${numDays} days for both ad sets and ads.
2.  **Raw Daily Insights:** Granular daily performance for the latest 7 days of available data. Use this to validate the longer-term trends.

**Output Requirements:**
- Markdown format.
- Title: \`# Trend Analysis for ${nameForPrompt}\`.
- Section: \`## Key Findings\`.
- Use bullet points. Be concise and focus on impactful business outcomes.

**Provided Data:**

== Calculated Adset Trends (${numDays} days) ==
${adsetTrendsError ? `// Error: ${adsetTrendsError.message}` : calculatedAdsetTrends && calculatedAdsetTrends.length > 0 ? JSON.stringify(calculatedAdsetTrends, null, 2) : '// No calculated adset trend data found.'}

== Calculated Ad Trends (${numDays} days) ==
${adTrendsError ? `// Error: ${adTrendsError.message}` : calculatedAdTrends && calculatedAdTrends.length > 0 ? JSON.stringify(calculatedAdTrends, null, 2) : '// No calculated ad trend data found.'}

== Raw Daily Insights (Latest 7 Recorded Days: ${rawDataHeaderDateRange}) ==
${rawDataError ? `// Error: ${rawDataError}` : `
Adset Level Insights:
${rawAdsetInsights.length > 0 ? JSON.stringify(rawAdsetInsights, null, 2) : '// No recent adset data.'}

Ad Level Insights:
${rawAdInsights.length > 0 ? JSON.stringify(rawAdInsights, null, 2) : '// No recent ad data.'}
`}
`;

    console.log("--- [TREND] Sending Prompt to AI ---");
    console.log(`[TREND LOG] Prompt length: ${promptContent.length} chars`);
    const chutesHeaders = { 'Authorization': `Bearer ${chutesApiToken}`, 'Content-Type': 'application/json' };
    const chutesPayload = {
      model: CHUTES_MODEL,
      messages: [{ role: 'user', content: promptContent }],
      stream: false,
      max_tokens: 2000, 
      temperature: 0.7
    };

    const aiResponse = await fetch(CHUTES_API_URL, {
      method: 'POST',
      headers: chutesHeaders,
      body: JSON.stringify(chutesPayload)
    });
    console.log(`[TREND LOG] Chutes AI Response Status: ${aiResponse.status}`);

    if (!aiResponse.ok) {
      const errorBody = await aiResponse.text();
      console.error("[TREND ERROR] Chutes AI API Error:", errorBody);
      let detail = errorBody; 
      try { detail = JSON.parse(errorBody).error || detail; } catch (e) { /* ignore */ }
      return new Response(JSON.stringify({ error: `AI API Error: ${detail}`, status: aiResponse.status }), {
        status: aiResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const analysisResultJson = await aiResponse.json();
    const analysisContent = analysisResultJson?.choices?.[0]?.message?.content;

    if (!analysisContent) {
      console.error("[TREND ERROR] Analysis content missing:", analysisResultJson);
      return new Response(JSON.stringify({ error: 'AI API Error: Empty/malformed analysis' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    console.log("[TREND LOG] Successfully processed request, returning analysis.");
    return new Response(JSON.stringify({ analysis: analysisContent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
    });

  } catch (error: any) {
    console.error('[TREND FATAL ERROR] Edge Function:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Helper function to create Supabase client
let supabase: SupabaseClient | null = null;
function getSupabaseClient(req: Request): SupabaseClient {
  if (supabase) {
    return supabase;
  }
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  // Use the service role key to bypass RLS for internal function operations
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("CRITICAL: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY secrets not set.");
    throw new Error("Server configuration error: Supabase secrets missing");
  }

  // Initialize with service role key, DO NOT pass user auth header here
  supabase = createClient(supabaseUrl, supabaseServiceKey);

  return supabase;
}