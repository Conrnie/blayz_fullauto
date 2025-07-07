import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from './_shared/cors.ts';
// --- AI Provider Configuration ---
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
// --- DEBUG LINE ---
console.log(`[synthesize-report][DEBUG] Read GEMINI_API_KEY length: ${GEMINI_API_KEY.length}`); // Check if length > 0
// --- END DEBUG LINE ---
const CHUTES_API_TOKEN = Deno.env.get("CHUTES_API_TOKEN") ?? "";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${GEMINI_API_KEY}`; // Using 1.5 Pro latest
const CHUTES_API_URL = 'https://llm.chutes.ai/v1/chat/completions';
// Define models
const GEMINI_MODEL = "gemini-2.5-pro-preview-03-25"; // Use the model name in the URL path
const CHUTES_DEEPSEEK_MODEL = 'tngtech/DeepSeek-R1T-Chimera'; // Note: This might be deprecated, check Chutes docs if needed

// --- Shared Secret for Endpoint Protection ---
const EXPECTED_SHARED_SECRET = Deno.env.get('YOUR_SHARED_SECRET');

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
// --- AI Call Logic with Fallback ---
async function callAIWithFallback(prompt) {
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
        // Check if the result has a valid analysis string
        if (result && typeof result === 'object' && typeof result.analysis === 'string' && result.analysis) {
          // Clean the analysis string (remove potential markdown fences FIRST)
          const cleanedAnalysis = result.analysis.trim().replace(/^```json\\s*|\\s*```$/g, '');
          // Now check if it looks like JSON
          if (cleanedAnalysis.startsWith('{') && cleanedAnalysis.endsWith('}')) {
            console.log(`[synthesize-report][LOG] Success with ${provider.name} (JSON structure detected)`);
            // Return the cleaned JSON string directly for later parsing
            return {
              analysis: cleanedAnalysis,
              modelUsed: provider.name
            }; // Include which provider succeeded
          } else {
            console.warn(`[synthesize-report][WARN] ${provider.name} returned analysis, but it does not appear to be a JSON object after cleaning fences:`, cleanedAnalysis.substring(0, 100) + "...");
          }
        } else if (result && typeof result === 'object' && 'error' in result) {
          // Provider call failed internally and returned an error structure
          console.warn(`[synthesize-report][WARN] ${provider.name} call failed internally: ${result.error}. Details: ${result.details || 'N/A'}`);
        } else {
          // Unexpected result structure
          console.warn(`[synthesize-report][WARN] ${provider.name} returned unexpected result structure:`, result);
        }
      } catch (error) {
        // Error occurred during the fetch/call itself
        console.warn(`[synthesize-report][WARN] Error during ${provider.name} call: ${error.message}. Trying next provider.`);
      }
    } else {
      console.log(`[synthesize-report][LOG] Skipping ${provider.name} (disabled or missing config)`);
    }
  }
  console.error("[synthesize-report][ERROR] All AI providers failed or returned non-JSON analysis.");
  return {
    error: "Failed to get valid JSON analysis from all AI providers."
  };
}
// --- Individual AI Provider Call Functions ---
async function callGeminiAPI(prompt) {
  console.log(`[synthesize-report][LOG] Calling Google Gemini API (${GEMINI_MODEL})`);
  if (!GEMINI_API_KEY) return {
    error: "Configuration Error",
    details: "GEMINI_API_KEY is not set."
  };
  try {
    // Construct the specific URL for this call, ensures key is present
    const apiUrlWithKey = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    const response = await fetch(apiUrlWithKey, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.6 // Adjust temperature as needed
        }
      })
    });
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[synthesize-report][ERROR] Google Gemini API Error (${response.status}): ${errorBody}`);
      return {
        error: "Google Gemini API call failed",
        details: `Status ${response.status}: ${errorBody.substring(0, 500)}`
      };
    }
    const data = await response.json();
    const analysis = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!analysis) {
      console.error("[synthesize-report][ERROR] Google Gemini API response missing analysis content:", JSON.stringify(data));
      return {
        error: "Google Gemini API returned empty/malformed analysis",
        details: JSON.stringify(data)
      };
    }
    console.log("[synthesize-report][LOG] Google Gemini API call successful.");
    return {
      analysis: analysis
    }; // Return raw analysis string
  } catch (error) {
    console.error("[synthesize-report][ERROR] Failed calling Google Gemini API:", error);
    return {
      error: "Google Gemini API call failed",
      details: error.message
    };
  }
}
async function callChutesAI(prompt) {
  console.log(`[synthesize-report][LOG] Calling Chutes AI API (Fallback - ${CHUTES_DEEPSEEK_MODEL})`);
  if (!CHUTES_API_TOKEN) return {
    error: "Configuration Error",
    details: "CHUTES_API_TOKEN is not set."
  };
  try {
    const chutesHeaders = {
      'Authorization': `Bearer ${CHUTES_API_TOKEN}`,
      'Content-Type': 'application/json'
    };
    const chutesPayload = {
      model: CHUTES_DEEPSEEK_MODEL,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      stream: false,
      max_tokens: 4000,
      temperature: 0.7,
      response_format: {
        type: "json_object"
      } // Request JSON output
    };
    const aiResponse = await fetch(CHUTES_API_URL, {
      method: 'POST',
      headers: chutesHeaders,
      body: JSON.stringify(chutesPayload)
    });
    if (!aiResponse.ok) {
      const errorBody = await aiResponse.text();
      console.error(`[synthesize-report][ERROR] Chutes AI API Error (${aiResponse.status}): ${errorBody}`);
      if (aiResponse.status === 404) {
        return {
          error: "Chutes AI API call failed - Model Not Found?",
          details: `Status ${aiResponse.status}: ${errorBody.substring(0, 500)}`
        };
      }
      return {
        error: "Chutes AI API call failed",
        details: `Status ${aiResponse.status}: ${errorBody.substring(0, 500)}`
      };
    }
    const analysisResultJson = await aiResponse.json();
    const analysisContent = analysisResultJson?.choices?.[0]?.message?.content;
    if (!analysisContent) {
      console.error("[synthesize-report][ERROR] Chutes AI response missing analysis content:", analysisResultJson);
      return {
        error: "Chutes AI returned empty/malformed analysis"
      };
    }
    console.log("[synthesize-report][LOG] Chutes AI call successful.");
    return {
      analysis: analysisContent
    }; // Return raw analysis string
  } catch (error) {
    console.error("[synthesize-report][ERROR] Failed calling Chutes AI:", error);
    return {
      error: "Chutes AI API call failed",
      details: error.message
    };
  }
}
// Helper function to format date range
function formatDateRangeForPrompt(endDate, days) {
  if (!endDate || isNaN(endDate.getTime()) || days <= 0) return 'Unavailable';
  try {
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - (days - 1));
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    };
    const startStr = startDate.toLocaleDateString('en-CA', options);
    const endStr = endDate.toLocaleDateString('en-CA', options);
    return `${startStr} to ${endStr}`;
  } catch (error) {
    console.error('[synthesize-report][ERROR] Error formatting date range:', error);
    return 'Error calculating range';
  }
}
// --- Main Handler ---
serve(async (req)=>{
  console.log(`[synthesize-report] Function called with method: ${req.method}`);
  if (req.method === 'OPTIONS') {
    console.log("[synthesize-report][CORS] OPTIONS request received.");
    console.log("[synthesize-report][CORS] Returning with headers:", JSON.stringify(corsHeaders));
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  // --- Shared Secret Authentication ---
  if (!EXPECTED_SHARED_SECRET) {
    console.error('[synthesize-report] CRITICAL: YOUR_SHARED_SECRET is not set in environment variables.');
    return new Response(JSON.stringify({ error: 'Server configuration error: Missing shared secret configuration.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const authorizationHeader = req.headers.get('Authorization');
  if (!authorizationHeader) {
    console.warn('[synthesize-report] Unauthorized - Missing Authorization header.');
    return new Response(JSON.stringify({ error: 'Authorization header is missing.' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const tokenParts = authorizationHeader.split(' ');
  if (tokenParts.length !== 2 || tokenParts[0].toLowerCase() !== 'bearer') {
    console.warn('[synthesize-report] Unauthorized - Invalid Authorization header format.');
    return new Response(JSON.stringify({ error: 'Invalid Authorization header format. Expected Bearer token.' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const receivedToken = tokenParts[1];

  if (receivedToken !== EXPECTED_SHARED_SECRET) {
    console.warn('[synthesize-report] Forbidden - Invalid token provided.');
    return new Response(JSON.stringify({ error: 'Invalid token.' }), {
      status: 403, // Forbidden
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  console.log('[synthesize-report] Shared secret validated successfully.');
  // --- End Shared Secret Authentication ---

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({
      error: 'Method Not Allowed'
    }), {
      status: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
  // --- 1. Parse Input ---
  let campaignId = null, startDateStr = null, endDateStr = null;
  let trendAnalysisText = null, anomalyAnalysisText = null, performanceAnalysisText = null;
  let userId = null;
  try {
    const payload = await req.json();
    console.log('[synthesize-report][LOG] Received payload keys:', Object.keys(payload));
    // Assign and validate payload fields
    campaignId = payload.campaignId;
    startDateStr = payload.startDate;
    endDateStr = payload.endDate;
    trendAnalysisText = payload.trendAnalysisText;
    anomalyAnalysisText = payload.anomalyAnalysisText;
    performanceAnalysisText = payload.performanceAnalysisText;
    userId = payload.userId;
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
    console.log(`[synthesize-report][LOG] Parsed input successfully.`);
  } catch (jsonError) {
    console.error('[synthesize-report][ERROR] Invalid request payload:', jsonError);
    return new Response(JSON.stringify({
      error: 'Invalid JSON request body or missing/invalid fields',
      details: jsonError.message
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
  // --- Main Try/Catch Block ---
  try {
    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      console.error("[synthesize-report][FATAL] Supabase client is null after initialization.");
      return new Response(JSON.stringify({
        error: 'Internal Server Error',
        details: 'Supabase client initialization failed.'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    // --- 2. Fetch Additional Data ---
    console.log(`[synthesize-report][LOG] Fetching campaign details for UUID: ${campaignId}`);
    let campaignName = 'N/A', campaignObjective = 'Not Specified', metaCampaignId: string | null = null;
    let rawAdsetInsights: any[] | null = null;
    let rawAdInsights: any[] | null = null;
    let fetchError: Error | null = null;
    let overallMaxDate: Date | null = null;
    let maxDateStr: string | null = null;
    let rawStartDateStrForInsights: string | null = null;
    let rawDataHeaderDateRange = "Unavailable";

    try {
      // Fetch Campaign Details
      const { data: campData, error: campError } = await supabase.from('campaigns').select('name, objective, meta_campaign_id').eq('id', campaignId).single();
      if (campError) throw new Error(`Campaign lookup failed: ${campError.message}`);
      if (!campData) throw new Error(`Campaign with UUID ${campaignId} not found.`);
      campaignName = campData.name || campaignName;
      campaignObjective = campData.objective || campaignObjective;
      metaCampaignId = campData.meta_campaign_id;
      console.log(`[synthesize-report][LOG] Fetched Campaign Details.`);

      // Determine Max Date & Window
      const { data: maxAdsetData, error: maxAdsetError } = await supabase.from('ad_set_insights').select('date').eq('campaign_id', campaignId).order('date', { ascending: false }).limit(1).maybeSingle();
      if (maxAdsetError) console.warn("[synthesize-report][WARN] Error finding max adset date:", maxAdsetError.message);
      const maxAdsetDate = maxAdsetData?.date ? new Date(maxAdsetData.date) : null;

      let maxAdDate: Date | null = null;
      if (metaCampaignId) {
        const { data: maxAdData, error: maxAdError } = await supabase.from('ad_insights').select('date').eq('campaign_id', metaCampaignId).order('date', { ascending: false }).limit(1).maybeSingle();
        if (maxAdError) console.warn("[synthesize-report][WARN] Error finding max ad date:", maxAdError.message);
        maxAdDate = maxAdData?.date ? new Date(maxAdData.date) : null;
      }

      if (maxAdsetDate && maxAdDate) {
        overallMaxDate = maxAdsetDate > maxAdDate ? maxAdsetDate : maxAdDate;
      } else {
        overallMaxDate = maxAdsetDate || maxAdDate;
      }

      if (overallMaxDate) {
        maxDateStr = overallMaxDate.toISOString().split('T')[0];
        const rawStartDate = new Date(overallMaxDate);
        rawStartDate.setDate(rawStartDate.getDate() - 6); // 7-day window including max date
        rawStartDateStrForInsights = rawStartDate.toISOString().split('T')[0];
        rawDataHeaderDateRange = formatDateRangeForPrompt(overallMaxDate, 7);
        console.log(`[synthesize-report][LOG] Determined raw data window: ${rawDataHeaderDateRange}`);
      } else {
        rawDataHeaderDateRange = "Unavailable (No recent data)";
        console.log(`[synthesize-report][LOG] Could not determine 7-day raw data window.`);
      }

      // Fetch Raw Insights if window determined
      if (rawStartDateStrForInsights && maxDateStr) {
        const { data: adsetData, error: adsetError } = await supabase.from('ad_set_insights').select('*').eq('campaign_id', campaignId).gte('date', rawStartDateStrForInsights).lte('date', maxDateStr).order('date', { ascending: false });
        if (adsetError) console.warn("[synthesize-report][WARN] Error fetching raw adset insights (7d):", adsetError.message);
        rawAdsetInsights = adsetData;
        console.log(`[synthesize-report][LOG] Fetched ${rawAdsetInsights?.length ?? 0} raw adset insight rows (7d).`);

        if (metaCampaignId) {
          const { data: adData, error: adError } = await supabase.from('ad_insights').select('*').eq('campaign_id', metaCampaignId).gte('date', rawStartDateStrForInsights).lte('date', maxDateStr).order('date', { ascending: false });
          if (adError) console.warn("[synthesize-report][WARN] Error fetching raw ad insights (7d):", adError.message);
          rawAdInsights = adData;
          console.log(`[synthesize-report][LOG] Fetched ${rawAdInsights?.length ?? 0} raw ad insight rows (7d).`);
        }
      } else {
        console.warn("[synthesize-report][WARN] Skipping raw data fetch because date window could not be determined.");
        if (!fetchError) fetchError = new Error("No insight data found to determine 7-day window.");
      }
    } catch (error) {
      console.error("[synthesize-report][ERROR] Error during data fetching stage:", error);
      fetchError = error instanceof Error ? error : new Error(String(error));
    // Don't throw here, allow prompt construction with error messages
    }
    // --- 3. Construct Synthesis Prompt ---
    console.log("[synthesize-report][LOG] Constructing synthesis prompt (Blayz Optimizer Persona)...");
    const truncatedRawAdsets = rawAdsetInsights ? JSON.stringify(rawAdsetInsights.slice(0, 50), null, 2) + (rawAdsetInsights.length > 50 ? "\n// ... (truncated)" : "") : null;
    const truncatedRawAds = rawAdInsights ? JSON.stringify(rawAdInsights.slice(0, 50), null, 2) + (rawAdInsights.length > 50 ? "\n// ... (truncated)" : "") : null;
    const fetchErrorAdsetsMsg = fetchError && !rawAdsetInsights ? `// ERROR FETCHING LATEST RAW ADSET INSIGHTS: ${fetchError.message}` : '';
    const fetchErrorAdsMsg = fetchError && !rawAdInsights && metaCampaignId ? `// ERROR FETCHING LATEST RAW AD INSIGHTS: ${fetchError.message}` : '';
    // Updated Synthesis Prompt
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
    // --- 4. Call AI ---
    console.log(`[synthesize-report][LOG] Initiating AI call with fallback...`);
    const aiResult = await callAIWithFallback(synthesisPrompt);
    // --- 5. Handle AI Response ---
    if ('error' in aiResult && aiResult.error) {
      // aiResult is now { error: string; details?: string | undefined; analysis?: undefined; modelUsed?: undefined; }
      // or { error: string; details?: string | undefined; }
      const errorDetails = (typeof aiResult.details === 'string' && aiResult.details) ? aiResult.details : 'N/A';
      console.error(`[synthesize-report][ERROR] Final AI synthesis failed: ${aiResult.error}. Details: ${errorDetails}`);
      return new Response(JSON.stringify({
        error: aiResult.error,
        details: errorDetails
      }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    console.log(`[synthesize-report][LOG] Successfully received synthesized analysis from AI provider: ${aiResult.modelUsed}`); // Log which provider succeeded
    let reportJson;
    try {
      // Parse the cleaned JSON string received from callAIWithFallback
      reportJson = JSON.parse(aiResult.analysis); // aiResult.analysis is already cleaned
      console.log("[synthesize-report][LOG] AI analysis successfully parsed as JSON.");
      // Basic Structure Validation
      const requiredKeys = [
        "executive_summary",
        "performance_overview",
        "segment_analysis",
        "actionables"
      ];
      const missingKeys = requiredKeys.filter((key)=>!(key in reportJson));
      if (missingKeys.length > 0) throw new Error(`AI JSON missing required top-level keys: ${missingKeys.join(', ')}`);
      if (!reportJson.segment_analysis || typeof reportJson.segment_analysis !== 'object') throw new Error("AI JSON missing or invalid 'segment_analysis' object.");
      const requiredSegmentKeys = [
        "demographics",
        "devices",
        "regions",
        "times"
      ];
      const missingSegmentKeys = requiredSegmentKeys.filter((key)=>!(key in reportJson.segment_analysis));
      if (missingSegmentKeys.length > 0) throw new Error(`AI JSON missing required segment keys: ${missingSegmentKeys.join(', ')}`);
      if (!Array.isArray(reportJson.actionables)) throw new Error("AI JSON 'actionables' key is not an array.");
      // Validate new justification field within actionables
      if (reportJson.actionables.length > 0) {
        const firstActionable = reportJson.actionables[0];
        if (typeof firstActionable.justification === 'undefined') {
          console.warn("[synthesize-report][WARN] AI JSON 'actionables' items are missing the 'justification' field. The prompt might need adjustment or the AI didn't follow instructions.");
        // Optionally add a default value if needed downstream, or just log the warning.
        // reportJson.actionables.forEach(a => { if (!a.justification) a.justification = "Justification not provided by AI."; });
        }
      }
    } catch (parseError) {
      console.error("[synthesize-report][ERROR] Failed to parse or validate the cleaned AI analysis JSON:", parseError);
      console.error("[synthesize-report][DEBUG] Cleaned AI Output that failed parsing:", aiResult.analysis); // Log the failing content
      return new Response(JSON.stringify({
        error: "AI analysis could not be parsed as valid JSON after cleaning",
        details: parseError.message,
        cleaned_ai_output: aiResult.analysis
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // --- 6. Insert Report ---
    console.log(`[synthesize-report][LOG] Attempting to save report to DB...`);
    if (!userId || !campaignId) throw new Error("UserID or CampaignID became null unexpectedly before DB insert."); // Should not happen due to validation
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
        ai_provider: aiResult.modelUsed || 'unknown' // Log which AI provider was used
      }
    });
    if (insertError) {
      console.error("[synthesize-report][ERROR] Failed to insert report into database:", insertError);
      return new Response(JSON.stringify({
        error: "Failed to save report to database",
        details: insertError.message
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    console.log("[synthesize-report][LOG] Report successfully saved to database.");
    // --- 7. Return Success ---
    return new Response(JSON.stringify({
      synthesizedReport: reportJson
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    // Catch-all for unexpected errors
    console.error('[synthesize-report][FATAL] Uncaught error in main handler:', error);
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      details: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
console.log('[synthesize-report] Function script loaded.'); 