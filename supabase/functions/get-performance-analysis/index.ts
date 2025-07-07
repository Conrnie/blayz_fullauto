import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

// --- AI Provider Configuration ---
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// --- Shared Secret for Endpoint Protection ---
const EXPECTED_SHARED_SECRET = Deno.env.get('YOUR_SHARED_SECRET');

// --- Supabase Client (Service Role) ---
let supabaseAdminInstance = null;
function getSupabaseAdminClient(logPrefix = "[performance-analysis]") {
    if (supabaseAdminInstance) {
        console.log(`${logPrefix}[DEBUG] Reusing existing Supabase admin client.`);
        return supabaseAdminInstance;
    }
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error(`${logPrefix}[FATAL] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY secrets are not set.`);
        throw new Error("Server configuration error: Supabase secrets missing.");
    }

    console.log(`${logPrefix}[INFO] Initializing new Supabase client with Service Role Key.`);
    supabaseAdminInstance = createClient(supabaseUrl, supabaseServiceKey);
    return supabaseAdminInstance;
}

// --- Main Handler ---
serve(async (req) => {
    const requestStartTime = Date.now();
    const logPrefix = `[performance-analysis][${new Date().toISOString()}]`;

    console.log(`${logPrefix}[INFO] Function triggered. Method: ${req.method}.`);

    const requestOrigin = req.headers.get('origin');
    const dynamicCorsHeaders = getCorsHeaders(requestOrigin);

    if (req.method === 'OPTIONS') {
        console.log(`${logPrefix}[INFO] Handling OPTIONS preflight request.`);
        return new Response('ok', { headers: dynamicCorsHeaders });
    }

    try {
        console.log(`${logPrefix}[INFO] Validating request...`);

        if (EXPECTED_SHARED_SECRET) {
            if (req.headers.get('X-Shared-Secret') !== EXPECTED_SHARED_SECRET) {
                console.error(`${logPrefix}[ERROR] Unauthorized: Shared secret mismatch.`);
                throw new Error('Unauthorized: Invalid or missing shared secret');
            }
            console.log(`${logPrefix}[DEBUG] Shared secret validated successfully.`);
        } else {
            console.warn(`${logPrefix}[WARN] Shared secret (YOUR_SHARED_SECRET) is not configured. This is insecure for production.`);
        }

        if (req.method !== 'POST') {
            console.error(`${logPrefix}[ERROR] Method Not Allowed: Received ${req.method}, expected POST.`);
            return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
                status: 405,
                headers: { ...dynamicCorsHeaders, 'Content-Type': 'application/json' },
            });
        }
        
        console.log(`${logPrefix}[INFO] Parsing request payload.`);
        const { campaignId } = await req.json();
        if (!campaignId) {
            console.error(`${logPrefix}[ERROR] Validation failed: Missing campaignId.`);
            throw new Error("Missing required field: campaignId");
        }
        console.log(`${logPrefix}[INFO] Request validated. campaignId: ${campaignId}`);

        const supabase = getSupabaseAdminClient(logPrefix);

        // --- Step 1: Get campaign details ---
        console.log(`${logPrefix}[INFO] Fetching campaign details for campaignId: ${campaignId}`);
        const { data: campaignData, error: campaignError } = await supabase
            .from('campaigns')
            .select('name, objective, company_profile_id, meta_campaign_id')
            .eq('id', campaignId)
            .single();

        if (campaignError) {
            console.error(`${logPrefix}[ERROR] Supabase error fetching campaign details:`, campaignError.message);
            throw new Error(`Campaign lookup failed: ${campaignError.message}`);
        }
        if (!campaignData) {
            console.error(`${logPrefix}[ERROR] Campaign with ID ${campaignId} not found.`);
            throw new Error(`Campaign with ID ${campaignId} not found.`);
        }
        const { name: campaignNameString, objective: objectiveString, company_profile_id, meta_campaign_id: metaCampaignId } = campaignData;
        console.log(`${logPrefix}[SUCCESS] Fetched campaign details. Name: "${campaignNameString}", Meta ID: ${metaCampaignId}`);
        
        if (!metaCampaignId) {
            console.error(`${logPrefix}[ERROR] Prerequisite failed: Meta campaign ID not found for campaign ${campaignId}.`);
            throw new Error(`Meta campaign ID not found for campaign ${campaignId}`);
        }

        // --- Step 2: Dynamically determine date range from insights ---
        console.log(`${logPrefix}[INFO] Determining date range from ad_set_insights for meta_campaign_id: ${metaCampaignId}`);
        const { data: dateRangeData, error: dateRangeError } = await supabase
            .from('ad_set_insights')
            .select('date_start')
            .eq('campaign_id', metaCampaignId)
            .order('date_start', { ascending: true });

        if (dateRangeError) {
            console.error(`${logPrefix}[ERROR] Supabase error fetching date range:`, dateRangeError.message);
            throw new Error(`Failed to determine date range: ${dateRangeError.message}`);
        }
        if (!dateRangeData || dateRangeData.length === 0) {
            console.log(`${logPrefix}[INFO] No ad set insights found for this campaign. Returning empty analysis.`);
            return new Response(JSON.stringify({ analysis: 'No ad set insights data found for this campaign to analyze.' }), {
                headers: { ...dynamicCorsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }
        
        const earliestDate = new Date(dateRangeData[0].date_start);
        const latestDate = new Date(dateRangeData[dateRangeData.length - 1].date_start);
        const startDateStr = earliestDate.toISOString().split('T')[0];
        const endDateStr = latestDate.toISOString().split('T')[0];
        const lookbackDays = Math.round((latestDate.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        console.log(`${logPrefix}[SUCCESS] Determined date range: ${startDateStr} to ${endDateStr} (${lookbackDays} days).`);

        // --- Step 3: Fetch Business Context ---
        let businessContext = "No business context available.";
        if (company_profile_id) {
            console.log(`${logPrefix}[INFO] Fetching company profile for profile_id: ${company_profile_id}`);
            const { data: profileData, error: profileError } = await supabase
                .from('company_profiles')
                .select('llm_synthesized_profile')
                .eq('profile_id', company_profile_id)
                .single();
            
            if (profileError) {
                console.warn(`${logPrefix}[WARN] Could not fetch company profile:`, profileError.message);
            } else if (profileData?.llm_synthesized_profile) {
                const profile = profileData.llm_synthesized_profile;
                businessContext = `
**Business Context Framework:**
*   **Company Summary:** ${profile.summary || 'Not provided.'}
*   **Primary Offering:** ${profile.primary_offering || 'Not provided.'}
*   **Target Audience:** ${profile.target_audience || 'Not provided.'}
`;
                console.log(`${logPrefix}[SUCCESS] Successfully fetched and formatted business context.`);
            } else {
                 console.log(`${logPrefix}[INFO] Company profile found but llm_synthesized_profile is empty.`);
            }
        } else {
            console.log(`${logPrefix}[INFO] No company_profile_id linked to campaign. Skipping business context fetch.`);
        }

        // --- Step 4: Call Performance Analysis DB Function ---
        console.log(`${logPrefix}[INFO] Calling RPC 'analyze_adset_performance_full_context' with params:`, { campaign_id_param: metaCampaignId, end_date_param: endDateStr, days_back: lookbackDays });
        const { data: adsetPerformanceData, error: adsetPerformanceError } = await supabase.rpc('analyze_adset_performance_full_context', {
            campaign_id_param: metaCampaignId,
            end_date_param: endDateStr,
            days_back: lookbackDays,
        });

        if (adsetPerformanceError) {
            console.error(`${logPrefix}[ERROR] RPC 'analyze_adset_performance_full_context' failed:`, adsetPerformanceError.message);
            // We can still proceed and let the AI know the data is missing.
        } else {
            console.log(`${logPrefix}[SUCCESS] RPC 'analyze_adset_performance_full_context' call successful.`);
        }

        // --- Step 5: Construct and Send Prompt to AI ---
        console.log(`${logPrefix}[INFO] Constructing prompt for Gemini AI.`);
        const prompt = `
**Role:** You are an analyst with an IQ of 190+ and over 40 years of experience in Meta Marketing. Your main concern is simple: how to optimize the company's campaign to drive product/service usage. This campaign has the objective: **'${objectiveString || 'Not Specified'}'**.

**Context:**
You've been handed the performance data for campaign "${campaignNameString || 'N/A'}". The data covers aggregated stats from **${startDateStr} to ${endDateStr}**. Your job is to find the actual levers for optimization.

${businessContext}

**Provided Data:**
**Detailed Performance & Segment Breakdown:**
\`\`\`json
${adsetPerformanceError ? `// Error fetching the performance data: ${adsetPerformanceError.message}` : JSON.stringify(adsetPerformanceData, null, 2)}
\`\`\`

**Task:**
Dissect this data. Forget vanity metrics; focus on what actually impacts the objective **'${objectiveString || 'Not Specified'}'** and aligns with the business context.
1.  **Ad Set Reality Check:** Point out the best and worst Ad Sets. Do they align with the target audience?
2.  **Segment Failures & Opportunities:** Identify 2-3 segments (demographic, device, etc.) that are clear winners or losers. Are you spending money on segments that don't match the target audience?
3.  **The Obvious Thing They Missed:** Based on the business context and the data, what is the most glaringly obvious pattern or inefficiency?
4.  **Immediate Action Items:** Summarize the 2-3 most critical takeaways that dictate immediate optimization.

**Output Format:**
- Use headings: "Ad Set Performance (The Good & The Ugly)", "Segment Deep Dive", "The Blindingly Obvious Insight", "Immediate Action Items".
- Use bullet points.
- Justify observations with metrics from the data, explicitly referencing the business context.
`;
        console.log(`${logPrefix}[DEBUG] Prompt length: ${prompt.length} characters.`);

        if (!GEMINI_API_KEY) {
            console.error(`${logPrefix}[FATAL] GEMINI_API_KEY is not set.`);
            throw new Error("AI API Authentication Error: GEMINI_API_KEY is not set.");
        }

        const geminiPayload = {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.6,
                response_mime_type: "text/plain",
            },
        };

        console.log(`${logPrefix}[INFO] Sending request to Gemini AI at ${GEMINI_API_URL}`);
        const aiResponse = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(geminiPayload),
        });

        console.log(`${logPrefix}[INFO] Received response from Gemini AI. Status: ${aiResponse.status}`);
        if (!aiResponse.ok) {
            const errorBody = await aiResponse.text();
            console.error(`${logPrefix}[ERROR] AI service request failed: ${aiResponse.status} - ${errorBody}`);
            throw new Error(`AI service request failed: ${aiResponse.status} - ${errorBody}`);
        }

        const analysisResultJson = await aiResponse.json();
        const analysisContent = analysisResultJson?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!analysisContent) {
            console.error(`${logPrefix}[ERROR] AI service returned empty or malformed analysis.`);
            console.debug(`${logPrefix}[DEBUG] Full AI response:`, JSON.stringify(analysisResultJson));
            throw new Error('AI service returned an empty or malformed analysis.');
        }

        const processingTime = Date.now() - requestStartTime;
        console.log(`${logPrefix}[SUCCESS] Successfully processed performance request in ${processingTime}ms.`);
        
        return new Response(JSON.stringify({ analysis: analysisContent }), {
            headers: { ...dynamicCorsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        const processingTime = Date.now() - requestStartTime;
        console.error(`${logPrefix}[FATAL] Uncaught error after ${processingTime}ms:`, error.message);
        if (error.stack) {
            console.error(`${logPrefix}[STACK]`, error.stack);
        }

        let status = 500;
        if (error.message.includes("lookup failed") || error.message.includes("not found")) {
            status = 404;
        } else if (error.message.includes("Unauthorized")) {
            status = 401;
        } else if (error.message.includes("Missing required field")) {
            status = 400;
        }

        return new Response(JSON.stringify({
            error: 'Failed to process performance analysis',
            details: error.message,
        }), {
            status,
            headers: { ...dynamicCorsHeaders, 'Content-Type': 'application/json' },
        });
    }
}); 