/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

// --- AI Provider Configuration ---
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// --- Shared Secret for Endpoint Protection ---
const EXPECTED_SHARED_SECRET = Deno.env.get('YOUR_SHARED_SECRET');

// --- Supabase Client (Service Role) ---
let supabaseAdmin: any = null; // Use `any` type for SupabaseClient to avoid linter issues in this environment
function getSupabaseAdminClient() {
  if (supabaseAdmin) return supabaseAdmin;

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Server configuration error: Supabase secrets missing");
  }

  console.log("[ANOMALY LOG] Initializing Supabase client with Service Role Key.");
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  return supabaseAdmin;
}

serve(async (req: Request) => {
  const requestOrigin = req.headers.get('origin');
  const dynamicCorsHeaders = getCorsHeaders(requestOrigin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: dynamicCorsHeaders });
  }

  try {
    if (EXPECTED_SHARED_SECRET && req.headers.get('X-Shared-Secret') !== EXPECTED_SHARED_SECRET) {
      throw new Error('Unauthorized: Invalid or missing shared secret');
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        status: 405,
        headers: { ...dynamicCorsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { campaignId } = await req.json(); // This is the Supabase UUID
    if (!campaignId || typeof campaignId !== 'string') {
      throw new Error("Missing or invalid 'campaignId' (UUID string)");
    }

    console.log(`[ANOMALY LOG] Request for Campaign UUID: ${campaignId}`);
    const supaAdmin = getSupabaseAdminClient();

    // --- Step 1: Fetch campaign details ---
    const { data: campaignData, error: campaignLookupError } = await supaAdmin
      .from('campaigns')
      .select('meta_campaign_id, name, company_profile_id')
      .eq('id', campaignId)
      .single();

    if (campaignLookupError || !campaignData) {
      throw new Error(`Campaign with UUID ${campaignId} not found. DB Error: ${campaignLookupError?.message}`);
    }
    const { meta_campaign_id: metaCampaignId, name: campaignName, company_profile_id: companyProfileId } = campaignData;

    if (!metaCampaignId) {
      throw new Error(`Data integrity issue: meta_campaign_id is null for campaign ${campaignId}.`);
    }
    console.log(`[ANOMALY LOG] Found Meta Campaign ID: ${metaCampaignId}`);

    // --- Step 2: Detect date range ---
    console.log(`[ANOMALY LOG] Detecting date range for Meta Campaign ID ${metaCampaignId}...`);
    const { data: dateRange, error: dateError } = await supaAdmin
      .from('ad_set_insights')
      .select('date')
      .eq('campaign_id', metaCampaignId)
      .order('date', { ascending: true });

    if (dateError || !dateRange || dateRange.length === 0) {
      throw new Error(`No data found in 'ad_set_insights' for Meta Campaign ID ${metaCampaignId}. DB Error: ${dateError?.message || 'N/A'}`);
    }

    const minDate = new Date(dateRange[0].date);
    const maxDate = new Date(dateRange[dateRange.length - 1].date);
    const numDays = Math.ceil(Math.abs(maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const maxDateStr = maxDate.toISOString().split('T')[0];
    console.log(`[ANOMALY LOG] Detected data from ${minDate.toISOString().split('T')[0]} to ${maxDateStr} (${numDays} days).`);

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
This analysis MUST be framed by the following business intelligence.
*   **Company Summary:** ${profile.summary || 'Not provided.'}
*   **Primary Offering:** ${profile.primary_offering || 'Not provided.'}
*   **Target Audience:** ${profile.target_audience || 'Not provided.'}
`;
      }
    }

    // --- Step 3: Call RPC functions for both ad set and ad level anomalies ---
    const rpcParams = {
      p_campaign_id: metaCampaignId,
      p_end_date: maxDateStr,
      p_lookback_days: numDays
    };

    console.log(`[ANOMALY LOG] Calling DB functions with params:`, rpcParams);

    // Call functions in parallel
    const [adsetAnomaliesResult, adAnomaliesResult] = await Promise.all([
        supaAdmin.rpc('detect_adset_anomalies_fixed', rpcParams),
        supaAdmin.rpc('detect_ad_anomalies_fixed', rpcParams)
    ]);

    const { data: adsetAnomalies, error: adsetRpcError } = adsetAnomaliesResult;
    const { data: adAnomalies, error: adRpcError } = adAnomaliesResult;

    if (adsetRpcError) console.error(`[ANOMALY ERROR] detect_adset_anomalies_fixed:`, adsetRpcError);
    if (adRpcError) console.error(`[ANOMALY ERROR] detect_ad_anomalies_fixed:`, adRpcError);

    console.log(`[ANOMALY LOG] Received ${adsetAnomalies?.length ?? 0} adset anomaly records from DB.`);
    console.log(`[ANOMALY LOG] Received ${adAnomalies?.length ?? 0} ad anomaly records from DB.`);

    // --- Step 4: Fetch recent raw data for context ---
    const rawStartDate = new Date(maxDate);
    rawStartDate.setDate(maxDate.getDate() - 6);
    const rawStartDateStr = rawStartDate.toISOString().split('T')[0];
    const rawDataHeaderDateRange = `${rawStartDateStr} to ${maxDateStr}`;

    let rawAdsetInsights: any[] = [];
    let rawAdInsights: any[] = [];
    let rawDataError: string | null = null;

    try {
      const { data: adsetRaw, error: adsetErr } = await supaAdmin
        .from('ad_set_insights')
        .select('*')
        .eq('campaign_id', metaCampaignId)
        .gte('date', rawStartDateStr)
        .lte('date', maxDateStr)
        .order('date', { ascending: false });
      if (adsetErr) throw adsetErr;
      rawAdsetInsights = adsetRaw || [];

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
      rawDataError = err.message;
      console.error("[ANOMALY ERROR] Fetching recent raw data:", err);
    }
    console.log(`[ANOMALY LOG] Fetched ${rawAdsetInsights.length} raw adset insights and ${rawAdInsights.length} raw ad insights for context.`);

    if (!GEMINI_API_KEY) throw new Error("CRITICAL: GEMINI_API_KEY secret not set.");

    const nameForPrompt = campaignName || 'the campaign';
    const promptContent = `
**Role:** You are an expert Meta Ads analyst for ${nameForPrompt}.

${businessContext}

**Core Task:**
Review three data sources:
1.  **Calculated Ad Set Anomalies:** A pre-processed list of statistically significant performance deviations at the ad set level over the last ${numDays} days.
2.  **Calculated Ad Anomalies:** A pre-processed list of statistically significant performance deviations at the ad level over the last ${numDays} days. This helps pinpoint specific failing ads.
3.  **Recent Raw Data:** The raw daily performance for the last 7 available days of data. This provides CONTEXT to help explain the anomalies.

Your task is to synthesize these into a concise, actionable report. Connect the long-term anomalies with the recent daily data where possible. Focus on identifying which level (ad set or ad) is the source of the issue.

**Output Requirements:**
- Markdown format.
- Title: \`# Anomaly Report for ${nameForPrompt}\`.
- Section: \`## Key Findings\`.
- Use bullet points. Prioritize the most critical findings.
- Explicitly state if anomalies are at the ad set or ad level.
- If no significant anomalies are found, state that performance is stable.

**Provided Data:**

== Calculated Ad Set Anomalies (${numDays}-Day Analysis) ==
${adsetRpcError ? `// Error fetching ad set anomalies: ${adsetRpcError.message}` : adsetAnomalies && adsetAnomalies.length > 0 ? JSON.stringify(adsetAnomalies, null, 2) : '// No calculated ad set anomaly data found.'}

== Calculated Ad Anomalies (${numDays}-Day Analysis) ==
${adRpcError ? `// Error fetching ad anomalies: ${adRpcError.message}` : adAnomalies && adAnomalies.length > 0 ? JSON.stringify(adAnomalies, null, 2) : '// No calculated ad anomaly data found.'}

== Recent Raw Data (Last 7 Days: ${rawDataHeaderDateRange}) ==
${rawDataError ? `// Error fetching raw data: ${rawDataError}` : `
Adset Level Insights:
${rawAdsetInsights.length > 0 ? JSON.stringify(rawAdsetInsights, null, 2) : '// No recent adset data.'}

Ad Level Insights:
${rawAdInsights.length > 0 ? JSON.stringify(rawAdInsights, null, 2) : '// No recent ad data.'}
`}
`;

    const payload = {
      contents: [{ parts: [{ "text": promptContent }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 8192,
        topP: 0.95,
        topK: 40,
      },
    };

    console.log("[ANOMALY LOG] Sending payload to Google Gemini...");
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`AI API request failed: ${response.status} - ${errorBody}`);
    }

    const result = await response.json();
    const anomalyAnalysis = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "No analysis returned from AI.";

    return new Response(JSON.stringify({ anomalyAnalysis }), {
      headers: { ...dynamicCorsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('[ANOMALY FATAL ERROR] An unexpected error occurred:', error);
    return new Response(JSON.stringify({ error: 'An internal server error occurred.', details: error.message }), {
      status: 500,
      headers: { ...dynamicCorsHeaders, 'Content-Type': 'application/json' },
    });
  }
}); 