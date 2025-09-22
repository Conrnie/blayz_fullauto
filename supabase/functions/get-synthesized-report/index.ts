import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// 1. Import the new dynamic header function
import { getCorsHeaders } from '../_shared/cors.ts';

// --- AI Provider Configuration ---
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const CHUTES_API_TOKEN = Deno.env.get("CHUTES_API_TOKEN") ?? "";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GEMINI_API_KEY}`;
const CHUTES_API_URL = 'https://llm.chutes.ai/v1/chat/completions';

// --- Shared Secret for Internal Edge Function Calls ---
const EXPECTED_SHARED_SECRET = Deno.env.get('YOUR_SHARED_SECRET') ?? "";

// --- Supabase Client ---
let supabaseAdminInstance = null;

function getSupabaseAdminClient() {
  if (supabaseAdminInstance) {
    return supabaseAdminInstance;
  }
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("[synthesize-report] CRITICAL: Supabase secrets missing.");
    throw new Error("Server configuration error: Supabase secrets missing");
  }
  console.log("[synthesize-report][LOG] Initializing Supabase client with Service Role Key.");
  supabaseAdminInstance = createClient(supabaseUrl, supabaseServiceKey);
  return supabaseAdminInstance;
}

// --- Helper function to calculate date range ---
function calculateDateRange(daysBack = 90) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - daysBack);
  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0] // YYYY-MM-DD format
  };
}

// --- Internal Edge Function Calls ---
async function callInternalEdgeFunction(functionName, payload) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const edgeUrl = `${supabaseUrl}/functions/v1/${functionName}`;
  try {
    console.log(`[synthesize-report][LOG] Calling internal function: ${functionName}`);
    const response = await fetch(edgeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shared-Secret': EXPECTED_SHARED_SECRET
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${functionName} failed with status ${response.status}: ${errorText}`);
    }
    const result = await response.json();
    console.log(`[synthesize-report][LOG] ${functionName} completed successfully`);
    return result;
  } catch (error) {
    console.error(`[synthesize-report][ERROR] ${functionName} failed:`, error);
    return {
      error: error.message
    };
  }
}

// --- AI Call Logic with Fallback ---
async function callAIWithFallback(prompt: string): Promise<{ analysis: string; modelUsed: string } | { error: string; details?: string }> {
  const providers = [
    {
      name: 'GoogleGeminiAPI',
      call: callGeminiAPI,
      enabled: !!GEMINI_API_KEY && !!GEMINI_API_URL // Check if API key is truthy
    },
    {
      name: 'ChutesAI',
      call: callChutesAI,
      enabled: !!CHUTES_API_TOKEN && !!CHUTES_API_URL
    }
  ];
  for (const provider of providers){
    if (provider.enabled) {
      console.log(`[synthesize-report][LOG] Attempting AI call with ${provider.name}`);
      try {
        const result = await provider.call(prompt);
        if (result && typeof result === 'object' && 'analysis' in result && typeof result.analysis === 'string' && result.analysis) {
          const cleanedAnalysis = result.analysis.trim().replace(/^```json\\s*|\\s*```$/g, '');
          if (cleanedAnalysis.startsWith('{') && cleanedAnalysis.endsWith('}')) {
            console.log(`[synthesize-report][LOG] Success with ${provider.name} (JSON structure detected)`);
            return {
              analysis: cleanedAnalysis,
              modelUsed: provider.name
            };
          } else {
            console.warn(`[synthesize-report][WARN] ${provider.name} returned analysis, but it does not appear to be a JSON object after cleaning fences:`, cleanedAnalysis.substring(0, 100) + "...");
          }
        } else if (result && typeof result === 'object' && 'error' in result) {
          console.warn(`[synthesize-report][WARN] ${provider.name} call failed internally: ${result.error}. Details: ${(result as any).details || 'N/A'}`);
        } else {
          console.warn(`[synthesize-report][WARN] ${provider.name} returned unexpected result structure:`, result);
        }
      } catch (error) {
        console.warn(`[synthesize-report][WARN] Error during ${provider.name} call: ${error.message}. Trying next provider.`);
      }
    } else {
      console.log(`[synthesize-report][LOG] Skipping ${provider.name} (disabled or missing config)`);
    }
  }
  console.error("[synthesize-report][ERROR] All AI providers failed or returned non-JSON analysis.");
  return {
    error: "Failed to get valid JSON analysis from all AI providers.",
    details: "All configured AI providers failed or were unable to return a valid JSON analysis."
  };
}

// --- Individual AI Provider Call Functions ---
async function callGeminiAPI(prompt: string): Promise<{ analysis: string } | { error: string; details: string }> {
  console.log(`[synthesize-report][LOG] Calling Google Gemini API (${GEMINI_MODEL})`);
  if (!GEMINI_API_KEY) return {
    error: "Configuration Error",
    details: "GEMINI_API_KEY is not set."
  };
  try {
    const apiUrlWithKey = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    const response = await fetch(apiUrlWithKey, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.6 }
      })
    });
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[synthesize-report][ERROR] Google Gemini API Error (${response.status}): ${errorBody}`);
      return { error: "Google Gemini API call failed", details: `Status ${response.status}: ${errorBody.substring(0, 500)}` };
    }
    const data = await response.json();
    const analysis = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!analysis) {
      console.error("[synthesize-report][ERROR] Google Gemini API response missing analysis content:", JSON.stringify(data));
      return { error: "Google Gemini API returned empty/malformed analysis", details: JSON.stringify(data) };
    }
    console.log("[synthesize-report][LOG] Google Gemini API call successful.");
    return { analysis };
  } catch (error) {
    console.error("[synthesize-report][ERROR] Failed calling Google Gemini API:", error);
    return { error: "Google Gemini API call failed", details: error.message };
  }
}

async function callChutesAI(prompt: string): Promise<{ analysis: string } | { error: string; details: string }> {
  console.log(`[synthesize-report][LOG] Calling Chutes AI API (Fallback - ${CHUTES_DEEPSEEK_MODEL})`);
  if (!CHUTES_API_TOKEN) return {
    error: "Configuration Error",
    details: "CHUTES_API_TOKEN is not set."
  };
  try {
    const chutesHeaders = { 'Authorization': `Bearer ${CHUTES_API_TOKEN}`, 'Content-Type': 'application/json' };
    const chutesPayload = {
      model: CHUTES_DEEPSEEK_MODEL,
      messages: [{ role: 'user', content: prompt }],
      stream: false, max_tokens: 4000, temperature: 0.7,
      response_format: { type: "json_object" }
    };
    const aiResponse = await fetch(CHUTES_API_URL, {
      method: 'POST', headers: chutesHeaders, body: JSON.stringify(chutesPayload)
    });
    if (!aiResponse.ok) {
      const errorBody = await aiResponse.text();
      console.error(`[synthesize-report][ERROR] Chutes AI API Error (${aiResponse.status}): ${errorBody}`);
      if (aiResponse.status === 404) {
        return { error: "Chutes AI API call failed - Model Not Found?", details: `Status ${aiResponse.status}: ${errorBody.substring(0, 500)}` };
      }
      return { error: "Chutes AI API call failed", details: `Status ${aiResponse.status}: ${errorBody.substring(0, 500)}` };
    }
    const analysisResultJson = await aiResponse.json();
    const analysisContent = analysisResultJson?.choices?.[0]?.message?.content;
    if (!analysisContent) {
      console.error("[synthesize-report][ERROR] Chutes AI response missing analysis content:", analysisResultJson);
      return { error: "Chutes AI returned empty/malformed analysis", details: JSON.stringify(analysisResultJson) };
    }
    console.log("[synthesize-report][LOG] Chutes AI call successful.");
    return { analysis: analysisContent };
  } catch (error) {
    console.error("[synthesize-report][ERROR] Failed calling Chutes AI:", error);
    return { error: "Chutes AI API call failed", details: error.message };
  }
}

// Helper function to format date range
function formatDateRangeForPrompt(endDate: Date, days: number): string {
  if (!endDate || isNaN(endDate.getTime()) || days <= 0) return 'Unavailable';
  try {
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - (days - 1));
    const options = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    } as const;
    const startStr = startDate.toLocaleDateString('en-CA', options);
    const endStr = endDate.toLocaleDateString('en-CA', options);
    return `${startStr} to ${endStr}`;
  } catch (error) {
    console.error('[synthesize-report][ERROR] Error formatting date range:', error);
    return 'Error calculating range';
  }
}

// --- Main Handler ---
serve(async (req: Request) => {
  console.log(`[synthesize-report] Function called with method: ${req.method}`);
  
  // Get dynamic CORS headers based on request origin
  const origin = req.headers.get('origin');
  const dynamicCorsHeaders = getCorsHeaders(origin);
  
  if (req.method === 'OPTIONS') {
    console.log("[synthesize-report][CORS] OPTIONS request received.");
    console.log("[synthesize-report][CORS] Returning with headers:", JSON.stringify(dynamicCorsHeaders));
    return new Response('ok', { headers: dynamicCorsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405, headers: { ...dynamicCorsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // --- 1. Parse Input ---
  let campaignId = null, startDateStr = null, endDateStr = null;
  let trendAnalysisText = null, anomalyAnalysisText = null, performanceAnalysisText = null;
  let userId = null, accountId = null;
  try {
    const payload = await req.json();
    console.log('[synthesize-report][LOG] Received payload:', JSON.stringify(payload, null, 2));
    console.log('[synthesize-report][LOG] Received payload keys:', Object.keys(payload));
    // Assign and validate payload fields
    campaignId = payload.campaignId;
    startDateStr = payload.startDate;
    endDateStr = payload.endDate;
    trendAnalysisText = payload.trendAnalysisText;
    anomalyAnalysisText = payload.anomalyAnalysisText;
    performanceAnalysisText = payload.performanceAnalysisText;
    userId = payload.userId;
    accountId = payload.accountId || 'N/A'; // Use a fallback if accountId is missing
    console.log(`[synthesize-report][LOG] Account ID received: ${accountId}`);
    if (!campaignId || typeof campaignId !== 'string') throw new Error("Missing or invalid 'campaignId'");
    if (!startDateStr || typeof startDateStr !== 'string') throw new Error("Missing or invalid 'startDate'");
    if (!endDateStr || typeof endDateStr !== 'string') throw new Error("Missing or invalid 'endDate'");
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDateStr) || !dateRegex.test(endDateStr)) throw new Error("Invalid date format. Expected YYYY-MM-DD.");
    if (new Date(startDateStr) >= new Date(endDateStr)) throw new Error("'startDate' must be before 'endDate'");
    if (!trendAnalysisText || typeof trendAnalysisText !== 'string') throw new Error("Missing or invalid 'trendAnalysisText'");
    if (!anomalyAnalysisText || typeof anomalyAnalysisText !== 'string') throw new Error("Missing or invalid 'anomalyAnalysisText'");
    if (!performanceAnalysisText || typeof performanceAnalysisText !== 'string') throw new Error("Missing or invalid 'performanceAnalysisText'");
    if (!userId || typeof userId !== 'string') throw new Error("Missing or invalid 'userId'");
    // Maintain a security check for accountId if needed
    if (accountId === 'N/A') console.warn("[synthesize-report][WARN] accountId is missing or invalid in payload, using fallback value.");
    console.log(`[synthesize-report][LOG] Parsed input successfully. Account ID used: ${accountId}`);
  } catch (jsonError) {
    console.error('[synthesize-report][ERROR] Invalid request payload:', jsonError);
    return new Response(JSON.stringify({
      error: 'Invalid JSON request body or missing/invalid fields',
      details: jsonError.message
    }), {
      status: 400,
      headers: {
        ...dynamicCorsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }

  try {
    const supabase = getSupabaseAdminClient(); // This will throw if supabase cannot be initialized

    console.log(`[synthesize-report][LOG] Fetching campaign details for UUID: ${campaignId}`);
    let campaignName: string = 'N/A', campaignObjective: string = 'Not Specified', metaCampaignId: string | null = null;
    let rawAdsetInsights: InsightRecord[] | null = null;
    let rawAdInsights: InsightRecord[] | null = null;
    let fetchError: Error | null = null;
    let overallMaxDate: Date | null = null;
    let maxDateStr: string | null = null;
    let rawStartDateStrForInsights: string | null = null;
    let rawDataHeaderDateRange: string = "Unavailable";

    try {
      const { data: campData, error: campError } = await supabase.from('campaigns').select('name, objective, meta_campaign_id').eq('id', campaignId!).single();
      if (campError) throw new Error(`Campaign lookup failed: ${campError.message}`);
      if (!campData) throw new Error(`Campaign with UUID ${campaignId} not found.`);
      campaignName = campData.name || campaignName;
      campaignObjective = campData.objective || campaignObjective;
      metaCampaignId = campData.meta_campaign_id;
      console.log(`[synthesize-report][LOG] Fetched Campaign Details.`);

      const { data: maxAdsetData, error: maxAdsetError } = await supabase.from('ad_set_insights').select('date').eq('campaign_id', campaignId!).order('date', { ascending: false }).limit(1).maybeSingle();
      if (maxAdsetError) console.warn("[synthesize-report][WARN] Error finding max adset date:", maxAdsetError.message);
      const maxAdsetDate: Date | null = maxAdsetData?.date ? new Date(maxAdsetData.date as string) : null;

      let maxAdDateInternal: Date | null = null;
      if (metaCampaignId) {
        const { data: maxAdData, error: maxAdError } = await supabase.from('ad_insights').select('date').eq('campaign_id', metaCampaignId).order('date', { ascending: false }).limit(1).maybeSingle();
        if (maxAdError) console.warn("[synthesize-report][WARN] Error finding max ad date:", maxAdError.message);
        maxAdDateInternal = maxAdData?.date ? new Date(maxAdData.date as string) : null;
      }

      if (maxAdsetDate && maxAdDateInternal) {
        overallMaxDate = maxAdsetDate.getTime() > maxAdDateInternal.getTime() ? maxAdsetDate : maxAdDateInternal;
      } else {
        overallMaxDate = maxAdsetDate || maxAdDateInternal;
      }
      
      if (overallMaxDate) {
        maxDateStr = overallMaxDate.toISOString().split('T')[0];
        const rawStartDate = new Date(overallMaxDate);
        rawStartDate.setDate(rawStartDate.getDate() - 6);
        rawStartDateStrForInsights = rawStartDate.toISOString().split('T')[0];
        rawDataHeaderDateRange = formatDateRangeForPrompt(overallMaxDate, 7);
        console.log(`[synthesize-report][LOG] Determined raw data window: ${rawDataHeaderDateRange}`);
      } else {
        rawDataHeaderDateRange = "Unavailable (No recent data)";
        console.log(`[synthesize-report][LOG] Could not determine 7-day raw data window.`);
      }

      if (rawStartDateStrForInsights && maxDateStr) {
        const { data: adsetData, error: adsetError } = await supabase.from('ad_set_insights').select('*').eq('campaign_id', campaignId!).gte('date', rawStartDateStrForInsights).lte('date', maxDateStr).order('date', { ascending: false });
        if (adsetError) console.warn("[synthesize-report][WARN] Error fetching raw adset insights (7d):", adsetError.message);
        rawAdsetInsights = adsetData as InsightRecord[] | null;
        console.log(`[synthesize-report][LOG] Fetched ${rawAdsetInsights?.length ?? 0} raw adset insight rows (7d).`);
        if (metaCampaignId) {
          const { data: adData, error: adError } = await supabase.from('ad_insights').select('*').eq('campaign_id', metaCampaignId).gte('date', rawStartDateStrForInsights).lte('date', maxDateStr).order('date', { ascending: false });
          if (adError) console.warn("[synthesize-report][WARN] Error fetching raw ad insights (7d):", adError.message);
          rawAdInsights = adData as InsightRecord[] | null;
          console.log(`[synthesize-report][LOG] Fetched ${rawAdInsights?.length ?? 0} raw ad insight rows (7d).`);
        }
      } else {
        console.warn("[synthesize-report][WARN] Skipping raw data fetch because date window could not be determined.");
        if (!fetchError) fetchError = new Error("No insight data found to determine 7-day window.");
      }
    } catch (error) {
      console.error("[synthesize-report][ERROR] Error during data fetching stage:", error);
      fetchError = error instanceof Error ? error : new Error(String(error));
    }

    console.log("[synthesize-report][LOG] Constructing synthesis prompt (Blayz Optimizer Persona)...");
    const truncatedRawAdsets = rawAdsetInsights ? JSON.stringify(rawAdsetInsights.slice(0, 50), null, 2) + (rawAdsetInsights.length > 50 ? "\\n// ... (truncated)" : "") : null;
    const truncatedRawAds = rawAdInsights ? JSON.stringify(rawAdInsights.slice(0, 50), null, 2) + (rawAdInsights.length > 50 ? "\\n// ... (truncated)" : "") : null;
    const fetchErrorAdsetsMsg = fetchError && !rawAdsetInsights ? `// ERROR FETCHING LATEST RAW ADSET INSIGHTS: ${fetchError.message}` : '';
    const fetchErrorAdsMsg = fetchError && !rawAdInsights && metaCampaignId ? `// ERROR FETCHING LATEST RAW AD INSIGHTS: ${fetchError.message}` : '';
    
    const synthesisPrompt = `
**Role:** You are Blayz, the Head of Marketing, renowned for your 190+ IQ and exceptional ability to optimize META campaign performance for any company. You make balanced, direct judgments based on data, connecting obvious cues with hidden patterns. Your focus is on delivering immediately applicable, profitability-driven actionables through honest assessment. You are the ultimate expert in Meta Marketing optimization.

**Your AI Agent Inputs:**

You will receive analyses from three specialist AI agents, each providing a unique perspective on the campaign's performance during the period **${startDateStr} to ${endDateStr}**. Understand their distinct analytical styles:

1.  **Trend Analysis:**
    *   **Explanation:** This analysis identifies momentum and directional changes in KPIs over the specified period (${startDateStr} to ${endDateStr}). Its source is a hyper-intelligent agent known for a ruthless, almost uncanny ability to uncover subtle or non-obvious patterns and connections *within* these trends, focusing intently on the campaign's trajectory and underlying dynamics.
    *   *(Input Analyst Identifier: The Pattern Seeker)*
    *   **Report:**
        \`\`\`text
        ${trendAnalysisText}
        \`\`\`

2.  **Anomaly Analysis:**
    *   **Explanation:** This analysis pinpoints significant deviations, outliers, or unexpected events within the specified period (${startDateStr} to ${endDateStr}). It comes from a vastly experienced agent who instinctively looks *behind* the numbers first, seeking root causes and hidden layers driving unusual spikes or drops, often finding the core issue where others see only surface data.
    *   *(Input Analyst Identifier: The Root Cause Analyst)*
    *   **Report:**
        \`\`\`text
        ${anomalyAnalysisText}
        \`\`\`

3.  **Performance Analysis:**
    *   **Explanation:** This analysis provides a holistic evaluation of effectiveness against the objective (${campaignObjective}) by dissecting segment performance (demographics, device, etc.) during the specified period (${startDateStr} to ${endDateStr}). The originating agent excels at deep quantitative breakdown and relative performance assessment, focusing relentlessly on how metrics translate to *actual* product/service usage and uncovering optimization levers others might overlook or avoid.
    *   *(Input Analyst Identifier: Fredrick - The Optimizer)*
    *   **Report:**
        \`\`\`text
        ${performanceAnalysisText}
        \`\`\`

**Your Task:**

Synthesize the reports from your three AI agents, considering their unique analytical styles (explained above) and the supporting raw data provided below. Think deeply about their outputs, identifying common patterns and evaluating differing opinions based on their likely approach. Your final judgment counts most. Generate ONLY a valid JSON object adhering strictly to the structure below.

**Campaign Context:**
*   **Campaign Name:** ${campaignName}
*   **Campaign Objective:** ${campaignObjective}
*   **Analysis Period for Agent Reports:** ${startDateStr} to ${endDateStr}
*   **Internal Campaign ID (UUID):** ${campaignId}
*   **Meta Platform Campaign ID:** ${metaCampaignId || 'N/A'}

**Supporting Raw Data (Latest 7 Recorded Days: ${rawDataHeaderDateRange}):**
*NOTE: This data provides recent context but covers a potentially different date range than the agent analyses.*
*   **Raw Ad Set Insights (Latest 7 Days):**
    ${fetchErrorAdsetsMsg || (truncatedRawAdsets ? truncatedRawAdsets : '// No raw adset insight data available/fetched.')}
*   **Raw Ad Insights (Latest 7 Days):**
    ${fetchErrorAdsMsg || (metaCampaignId ? truncatedRawAds ? truncatedRawAds : '// No raw ad insight data available/fetched.' : '// Raw ad insights not applicable (Meta ID missing).')}

**Required JSON Output Structure:**
\`\`\`json
{
  "executive_summary": "string",
  "performance_overview": "string (Synthesized overview of overall campaign/ad set/ad performance based on agent reports and raw data)",
  "segment_analysis": {
    "demographics": "string (Key findings on age/gender performance)",
    "devices": "string (Key findings on device/placement performance)",
    "regions": "string (Key findings on geographic performance)",
    "times": "string (Key findings on time-based performance)"
  },
  "actionables": [
    {
      "target": "string",
      "observation": "string",
      "action": "string",
      "expected_impact": "string (high/medium/low)",
      "confidence": "string (high/medium/low)",
      "justification": "string (Brief summary of the key finding/data point prompting this action)"
    }
    // ... potentially more actionables ...
  ]
}
\`\`\`

**Instructions & Guidelines:**
*   Your entire response must be a single, valid JSON object conforming to the structure above.
*   Base your synthesis *primarily* on the three agent reports, using the raw data for recent context or tie-breaking. Consider the analytical style of each agent when weighing their input.
*   Ground all statements and actionables *directly* in the provided inputs.
*   Prioritize actionables based on potential impact on the campaign objective: **'${campaignObjective}'**. Ensure they are immediately applicable.
*   Populate each string field with relevant analysis. If specific data for a sub-section (e.g., Regions) isn't available, note this concisely (e.g., "No specific regional insights found in the provided analyses.").
*   Do not include explanations, apologies, or any text outside the main JSON structure.
*   **Disclaimer:** NEVER name the AI Agents personas or people (e.g., Fredrick, Pattern Seeker). If you need to reference their input, use general terms like "one of our Agents", "the trend analysis indicated", "performance data suggests", etc.
*   **Crucially, for each entry in the 'actionables' array, populate the 'justification' field by briefly summarizing the specific key insight or data point (from the Trend, Anomaly, or Performance analysis inputs) that directly led to this recommendation. This links the action to its reason.**
`;
    console.log(`[synthesize-report][LOG] Synthesis prompt constructed.`);

    const aiResult = await callAIWithFallback(synthesisPrompt);

    if ('error' in aiResult) {
      console.error(`[synthesize-report][ERROR] Final AI synthesis failed: ${aiResult.error}. Details: ${aiResult.details}`);
      return new Response(JSON.stringify({ error: aiResult.error, details: aiResult.details }), {
        status: 502, headers: { ...dynamicCorsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[synthesize-report][LOG] Successfully received synthesized analysis from AI provider: ${aiResult.modelUsed}`);
    let reportJson;
    try {
      reportJson = JSON.parse(aiResult.analysis);
      console.log("[synthesize-report][LOG] AI analysis successfully parsed as JSON.");
      const requiredKeys = ["executive_summary", "performance_overview", "segment_analysis", "actionables"];
      const missingKeys = requiredKeys.filter((key) => !(key in reportJson));
      if (missingKeys.length > 0) throw new Error(`AI JSON missing required top-level keys: ${missingKeys.join(', ')}`);
      if (!reportJson.segment_analysis || typeof reportJson.segment_analysis !== 'object') throw new Error("AI JSON missing or invalid 'segment_analysis' object.");
      const requiredSegmentKeys = ["demographics", "devices", "regions", "times"];
      const missingSegmentKeys = requiredSegmentKeys.filter((key) => !(key in reportJson.segment_analysis));
      if (missingSegmentKeys.length > 0) throw new Error(`AI JSON missing required segment keys: ${missingSegmentKeys.join(', ')}`);
      if (!Array.isArray(reportJson.actionables)) throw new Error("AI JSON 'actionables' key is not an array.");
      if (reportJson.actionables.length > 0) {
        const firstActionable = reportJson.actionables[0];
        if (typeof firstActionable.justification === 'undefined') {
          console.warn("[synthesize-report][WARN] AI JSON 'actionables' items are missing the 'justification' field.");
        }
      }
    } catch (parseError) {
      console.error("[synthesize-report][ERROR] Failed to parse or validate the cleaned AI analysis JSON:", parseError);
      console.error("[synthesize-report][DEBUG] Cleaned AI Output that failed parsing:", aiResult.analysis);
      return new Response(JSON.stringify({ error: "AI analysis could not be parsed as valid JSON after cleaning", details: parseError.message, cleaned_ai_output: aiResult.analysis }), {
        status: 500, headers: { ...dynamicCorsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[synthesize-report][LOG] Attempting to save report to DB...`);
    if (!userId || !campaignId) throw new Error("UserID or CampaignID became null unexpectedly before DB insert.");
    
    const { error: insertError } = await supabase.from('campaign_reports').insert({
      user_id: userId,
      campaign_id: campaignId,
      ai_insights: reportJson,
      report_data: {
        source_analyses_received: true,
        raw_data_fetched: !!(rawAdsetInsights || rawAdInsights),
        fetch_error: fetchError?.message || null,
        requested_start_date: startDateStr,
        requested_end_date: endDateStr,
        actual_raw_data_range: rawDataHeaderDateRange,
        ai_provider: aiResult.modelUsed || 'unknown'
      }
    });

    if (insertError) {
      console.error("[synthesize-report][ERROR] Failed to insert report into database:", insertError);
      return new Response(JSON.stringify({ error: "Failed to save report to database", details: insertError.message }), {
        status: 500, headers: { ...dynamicCorsHeaders, 'Content-Type': 'application/json' }
      });
    }
    console.log("[synthesize-report][LOG] Report successfully saved to database.");

    return new Response(JSON.stringify({ synthesizedReport: reportJson }), {
      status: 200, headers: { ...dynamicCorsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[synthesize-report][FATAL] Uncaught error in main handler:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

console.log('[synthesize-report] Function script loaded.')