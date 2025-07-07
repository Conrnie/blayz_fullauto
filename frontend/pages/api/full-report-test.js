import { createClient } from '@supabase/supabase-js';

// Helper to create Supabase service client (reuse from other API routes)
const getServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in environment variables.');
    throw new Error('Internal server configuration error.');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

// Updated Chutes API call helper
async function callChutesDeepseekAPI(prompt, analysisType, retries = 2) {
  console.log(`[Chutes API] Calling Deepseek V3 for ${analysisType} analysis. Prompt length: ${prompt.length}`);
  
  const CHUTES_API_TOKEN = process.env.CHUTES_API_TOKEN;
  const CHUTES_ENDPOINT = 'https://llm.chutes.ai/v1/chat/completions';
  const DEEPSEEK_MODEL = 'deepseek-ai/DeepSeek-V3-0324';

  if (!CHUTES_API_TOKEN) {
     console.error('[Chutes API] Missing CHUTES_API_TOKEN in environment variables.');
     throw new Error('Chutes API configuration missing: API Token not set.');
  }

  let attempt = 0;
  while (attempt <= retries) {
    try {
       if (attempt > 0) {
         const backoffTime = Math.pow(2, attempt) * 1000;
         console.log(`[Chutes API] Retrying ${analysisType} analysis, attempt ${attempt + 1}/${retries + 1} in ${backoffTime}ms...`);
         await new Promise(resolve => setTimeout(resolve, backoffTime)); // Exponential backoff
       }

       const response = await fetch(CHUTES_ENDPOINT, {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${CHUTES_API_TOKEN}`
         },
         body: JSON.stringify({
           model: DEEPSEEK_MODEL, 
           messages: [
             // Optional: Add a system prompt if helpful for Deepseek V3
             // { role: "system", content: "You are an expert marketing analyst. Respond ONLY with valid JSON matching the requested schema." }, 
             { role: "user", content: prompt }
           ],
           stream: false, // We want the complete response, not a stream
           max_tokens: 4096, // Adjust as needed, but keep generous for JSON
           temperature: 0.5, // Adjust for more deterministic JSON output
           response_format: { type: "json_object" } // Request JSON output
         })
       });

       if (!response.ok) {
         const errorText = await response.text();
         console.error(`[Chutes API] Error (${response.status}): ${errorText}`);
         // Retry on rate limits or server errors
         if (response.status === 429 || response.status >= 500) {
            attempt++;
            if (attempt <= retries) continue; // Retry if attempts remain
         }
         throw new Error(`Chutes API error (${response.status}): ${errorText}`);
       }

       const result = await response.json();
       // Extract content based on observed Chutes API structure
       const content = result.choices?.[0]?.message?.content; 

        if (!content) {
           console.error('[Chutes API] Empty or invalid content received:', result);
           throw new Error('Empty or invalid content received from Chutes API.');
        }
        
        // Clean potential markdown and extract JSON
        const cleanedContent = content.replace(/^###.*\n|\n###.*$/g, '').replace(/^```json\s*|```$/g, '').trim();
        
        // Attempt to parse the cleaned content as JSON
        try {
            // *** ADD PRE-CHECK ***
            if (!cleanedContent.startsWith('{') && !cleanedContent.startsWith('[')) {
              console.error(`[Chutes API] Cleaned content for ${analysisType} does not appear to be JSON:`, cleanedContent);
              throw new Error('API response content is not valid JSON format.');
            }
            // *** END PRE-CHECK ***
            
            const parsedContent = JSON.parse(cleanedContent);
            console.log(`[Chutes API] Successfully received and parsed JSON for ${analysisType}`);
            // Add model info to the result for traceability
            parsedContent.model = DEEPSEEK_MODEL;
            parsedContent.source = 'chutes-deepseek';
            return parsedContent; // Return the parsed JSON object
        } catch (parseError) {
            console.error(`[Chutes API] Failed to parse JSON response for ${analysisType}:`, parseError);
            console.error(`[Chutes API] Raw content received:`, content);
            console.error(`[Chutes API] Cleaned content:`, cleanedContent);
            // Fallback to a default JSON response to prevent entire process failure
            console.log(`[Chutes API] Using fallback JSON for ${analysisType} due to parsing failure`);
            return {
                analysis_type: analysisType,
                summary: `Failed to parse ${analysisType} analysis due to API response format. See logs for details. Error: ${parseError.message}`, // Include error message
                key_findings: [],
                recommendations: [],
                model: DEEPSEEK_MODEL,
                source: 'chutes-deepseek-fallback',
                error: 'JSON parse failure'
            };
        }
       
    } catch (error) {
      // Catch fetch errors (network issues) or errors thrown above
      console.error(`[Chutes API] Error during ${analysisType} call (attempt ${attempt + 1}):`, error);
      attempt++;
       if (attempt <= retries) {
          // Optional: Wait slightly before the final retry 
          if (attempt === retries) {
             await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          }
          continue; 
       }
      // All retries failed
      throw new Error(`Failed ${analysisType} analysis after ${retries + 1} attempts: ${error.message}`);
    }
  }
  // Should not be reachable if retries are configured
  throw new Error(`Failed ${analysisType} analysis after exhausting retries.`);
}

// Updated Gemini Synthesis API call (Direct Google AI API)
async function callGeminiSynthesisAPI(trendResult, performanceResult, anomalyResult, contextData, retries = 2) {
  console.log('[Gemini API] Calling Google Generative AI for final synthesis (gemini-2.5-pro-exp-03-25).');
  
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  // Note: Using v1beta for potential access to newer features like JSON mode if supported
  const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-exp-03-25:generateContent?key=${GEMINI_API_KEY}`;

  if (!GEMINI_API_KEY) {
    console.error('[Gemini API] Missing GEMINI_API_KEY environment variable.');
    throw new Error('Gemini API configuration missing: API Key not set.');
  }

  // Define the structure of the final report
  const finalReportSchema = {
    executive_summary: "String",
    campaign_analysis: "String",
    ad_set_analysis: "String", 
    ad_analysis: "String",
    segment_analysis: {
      demographics: "String or Object with details",
      devices: "String or Object with details",
      regions: "String or Object with details",
      times: "String or Object with details",
      audiences: "String or Object with details"
    },
    actionables: [
      { action: "String", priority: "high|medium|low" }
    ]
  };

  const systemInstruction = `You are an expert Meta ads campaign analysis AI. Synthesize the provided specialized analyses (trends, performance, anomalies) and context data into a comprehensive final report. Respond *only* with a single, valid JSON object adhering strictly to the following schema:\n${JSON.stringify(finalReportSchema, null, 2)}\nDo not include markdown formatting, code blocks (\`\`\`), introductory text, or explanations outside the JSON structure. Ensure all strings within the JSON are properly escaped.`

  const userPrompt = `Synthesize a final campaign report based on the following specialized analyses and context data. Output *only* valid JSON conforming to the specified schema.\n\nTrend Analysis:\n${JSON.stringify(trendResult, null, 2)}\n\nPerformance Analysis:\n${JSON.stringify(performanceResult, null, 2)}\n\nAnomaly Analysis:\n${JSON.stringify(anomalyResult, null, 2)}\n\nContext Data (Ad/AdSet Insights for the day):\n${JSON.stringify(contextData, null, 2)}\n`

  let attempt = 0;
  while (attempt <= retries) {
    try {
      if (attempt > 0) {
        const backoffTime = Math.pow(2, attempt) * 1500; // Slightly longer backoff for Gemini
        console.log(`[Gemini API] Retrying synthesis, attempt ${attempt + 1}/${retries + 1} in ${backoffTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
      }

      const response = await fetch(GEMINI_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Using the Google Generative AI API structure
          contents: [
            {
              role: "user", // Treat the system instruction + user prompt as one user turn for gemini-pro
              parts: [{ text: systemInstruction + "\n\n" + userPrompt }]
            }
          ],
          generationConfig: {
            // responseMimeType: "application/json", // Use if model/API version supports it
            temperature: 0.5, // Lower temperature for more structured output
            maxOutputTokens: 8192,
            topP: 0.95,
            topK: 40
          },
          // Safety settings (optional, adjust as needed)
          // safetySettings: [
          //   { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          //   { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          //   { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          //   { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
          // ]
        })
      });

      if (!response.ok) {
        let errorText = 'Unknown error';
        try {
          errorText = await response.text();
        } catch (e) { /* Ignore if reading text fails */ }
        console.error(`[Gemini API] Error (${response.status}): ${errorText}`);
         // Retry on specific errors if needed (e.g., 429, 5xx)
         if (response.status === 429 || response.status >= 500) {
            attempt++
            if (attempt <= retries) continue
         }
        throw new Error(`Gemini API error (${response.status}): ${errorText}`);
      }

      const result = await response.json();

      // Extract content based on Google Generative AI API structure
      // Check for safety blocks first
      if (result.promptFeedback?.blockReason) {
        console.error('[Gemini API] Request blocked due to safety settings:', result.promptFeedback.blockReason);
        throw new Error(`Gemini API request blocked: ${result.promptFeedback.blockReason}`);
      }
      
      // Check if candidate exists and has content
      const candidate = result.candidates?.[0];
      if (!candidate) {
          console.error('[Gemini API] No candidates returned:', JSON.stringify(result, null, 2));
          throw new Error('No candidates received from Gemini API.');
      }
      if (candidate.finishReason && candidate.finishReason !== 'STOP') {
          console.error(`[Gemini API] Candidate generation finished due to ${candidate.finishReason}:`, JSON.stringify(result, null, 2));
          throw new Error(`Gemini API generation finished unexpectedly: ${candidate.finishReason}`);
      }
      
      const content = candidate.content?.parts?.[0]?.text;

      if (!content) {
        console.error('[Gemini API] Empty or invalid content received:', JSON.stringify(result, null, 2));
        throw new Error('Empty or invalid content received from Gemini API.');
      }

      // Attempt to parse the content as JSON
      try {
        // Clean potential markdown fences if the model didn't respect the instructions
        const cleanedContent = content.replace(/^```json\s*|```$/g, '').trim();
        const parsedJson = JSON.parse(cleanedContent);
        console.log('[Gemini API] Successfully received and parsed JSON for synthesis.');
        // Add model info for traceability
        parsedJson.model = candidate.model || 'google/gemini-2.5-pro-exp-03-25'; // Use model name from response if available
        parsedJson.source = 'google-gemini';
        return parsedJson;
      } catch (parseError) {
        console.error('[Gemini API] Failed to parse JSON response for synthesis:', parseError);
        console.error('[Gemini API] Raw content received:', content);
        throw new Error('Gemini API returned invalid JSON for synthesis.');
      }

    } catch (error) {
      console.error(`[Gemini API] Error during synthesis call (attempt ${attempt + 1}):`, error);
      attempt++
      if (attempt <= retries) {
        if (attempt === retries) {
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1500));
        }
        continue;
      }
      // All retries failed
      throw new Error(`Failed synthesis after ${retries + 1} attempts: ${error.message}`);
    }
  }
   // Should not be reachable
   throw new Error('Failed synthesis after exhausting retries.');
}

// MAIN API HANDLER
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  let supabaseAccessToken = null;
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('[full-report-test] Missing or malformed Authorization header');
      return res.status(401).json({ error: 'Authorization header missing or malformed' });
    }
    supabaseAccessToken = authHeader.split(' ')[1];

    const supabase = getServiceClient(); // Use service client to validate any user's token
    const { data: { user }, error: userError } = await supabase.auth.getUser(supabaseAccessToken);

    if (userError) {
      console.warn('[full-report-test] Token validation error:', userError.message);
      return res.status(401).json({ error: 'Invalid or expired token', details: userError.message });
    }

    if (!user) {
      console.warn('[full-report-test] No user found for token');
      return res.status(401).json({ error: 'No user found for token' });
    }
    
    console.log(`[full-report-test] Authenticated user: ${user.id}`);
    // User is authenticated, proceed with the rest of the function

  } catch (authError) {
    console.error('[full-report-test] Authentication processing error:', authError);
    return res.status(500).json({ error: 'Error processing authentication', details: authError.message });
  }

  try {
    const { campaignId, startDate, endDate } = req.query;
    console.log('[full-report-test] Received Request:', { campaignId, startDate, endDate });

    if (!campaignId || !startDate || !endDate) {
      console.error('[full-report-test] Missing required query parameters');
      return res.status(400).json({ error: 'Missing required query parameters: campaignId, startDate, endDate' });
    }

    let adsetTrendCampaignId = null;

    try {
      console.log(`[full-report-test] Looking up UUID for meta_campaign_id: ${campaignId}`);
      // Dynamically look up the UUID (id) based on the meta_campaign_id
      const supabase = getServiceClient();
      const { data: campaignData, error: campaignError } = await supabase
        .from('campaigns')
        .select('id') // Select the UUID column
        .eq('meta_campaign_id', campaignId) // Filter by the numeric/text ID
        .maybeSingle(); // Use maybeSingle to handle not found gracefully

      if (campaignError) {
        console.error('[full-report-test] Error fetching campaign UUID from Supabase:', campaignError);
        // Return an error, as Adset Trends might be crucial.
        return res.status(500).json({ error: 'Failed to retrieve campaign UUID', details: campaignError.message });
      }

      if (!campaignData) {
        console.warn(`[full-report-test] No campaign found in Supabase for meta_campaign_id: ${campaignId}. Proceeding without Adset Trends.`);
        // Decide how to handle: return error, use a default, or proceed without adset trends?
        // For now, let's proceed but adsetTrendCampaignId will remain null.
      } else {
        adsetTrendCampaignId = campaignData.id; // The UUID
        console.log(`[full-report-test] Found UUID for campaign ${campaignId}: ${adsetTrendCampaignId}`);
      }

    } catch (error) {
      console.error('[full-report-test] Unexpected error during Supabase lookup:', error);
      // Decide how to handle: return error or proceed without? For now, log and proceed.
      console.warn('[full-report-test] Proceeding without Adset Trends due to lookup error.');
    }

    const baseUrl = req.headers['x-forwarded-proto'] ? `https://${req.headers.host}` : `http://${req.headers.host}`;

    try {
      console.log(`[full-report-test] Fetching Full Context for campaignId (meta): ${campaignId}`);
      // Fetch Full Context Report Data (uses the original campaignId - meta_campaign_id)
      const fullContextResponse = await fetch(`${baseUrl}/api/db/campaign-analysis?campaign_id_param=${campaignId}`, {
        headers: {
          'Authorization': `Bearer ${supabaseAccessToken}`,
          'Content-Type': 'application/json' // Assuming target API expects/handles JSON
        }
      });
      if (!fullContextResponse.ok) {
        const errorText = await fullContextResponse.text();
        console.error(`[full-report-test] Error fetching full context: ${fullContextResponse.status}`, errorText);
        throw new Error(`Failed to fetch full context report: ${fullContextResponse.statusText} - ${errorText}`);
      }
      const fullContextData = await fullContextResponse.json();
      console.log('[full-report-test] Full Context Data Received (structure check):', { keys: Object.keys(fullContextData || {})});


      let adsetTrendData = []; // Initialize as empty array
      // Only fetch adset trends if we found a UUID
      if (adsetTrendCampaignId) {
          console.log(`[full-report-test] Fetching Adset Trend for campaignId (UUID): ${adsetTrendCampaignId}, startDate: ${startDate}, endDate: ${endDate}`);
          // Fetch Adset Trend Data (uses the looked-up adsetTrendCampaignId - the UUID)
          const adsetTrendResponse = await fetch(`${baseUrl}/api/adset-trends?campaignId=${adsetTrendCampaignId}&startDate=${startDate}&endDate=${endDate}`, {
            headers: {
              'Authorization': `Bearer ${supabaseAccessToken}`,
              'Content-Type': 'application/json'
            }
          });
          if (!adsetTrendResponse.ok) {
            const errorText = await adsetTrendResponse.text();
            console.error(`[full-report-test] Error fetching adset trend: ${adsetTrendResponse.status}`, errorText);
            // Allow report generation even if adset trends fail, log the error.
            console.warn(`[full-report-test] Proceeding with empty Adset Trend data due to fetch error.`);
            adsetTrendData = []; // Ensure it remains an empty array on error
          } else {
             adsetTrendData = await adsetTrendResponse.json();
             console.log('[full-report-test] Adset Trend Data Received (count):', adsetTrendData?.length);
          }
      } else {
          console.log('[full-report-test] Skipping Adset Trend fetch because UUID lookup failed or returned no result.');
          adsetTrendData = []; // Explicitly set to empty array if skipped
      }


      console.log(`[full-report-test] Fetching Creative Analysis for campaignId (meta): ${campaignId}`);
      // Fetch Creative Analysis Data (uses the original campaignId - meta_campaign_id)
      const creativeAnalysisResponse = await fetch(`${baseUrl}/api/db/creative-analysis?campaign_id_param=${campaignId}`, {
        headers: {
          'Authorization': `Bearer ${supabaseAccessToken}`,
          'Content-Type': 'application/json' // Assuming target API expects/handles JSON
        }
      });
       if (!creativeAnalysisResponse.ok) {
        const errorText = await creativeAnalysisResponse.text();
        console.error(`[full-report-test] Error fetching creative analysis: ${creativeAnalysisResponse.status}`, errorText);
        // Allow report generation to proceed with empty data for this part
        console.warn('[full-report-test] Proceeding with empty Creative Analysis data due to fetch error.');
        creativeAnalysisData = {}; // Or an appropriate empty structure
      } else {
         creativeAnalysisData = await creativeAnalysisResponse.json();
         console.log('[full-report-test] Creative Analysis Data Received');
      }

      // --- Start: AI Analysis Calls ---
      console.log('[full-report-test] Preparing data for AI analysis...');

      // Prepare consolidated context data for synthesis (if needed, or pass separately)
      const analysisContext = {
         // Pass relevant parts of fullContextData, adsetTrendData, creativeAnalysisData
         // Example:
         // campaignDetails: fullContextData?.campaign_details,
         // adSetPerformanceSummary: adsetTrendData // Or a processed version
         // creativeHighlights: creativeAnalysisData?.highlights
         // Structure depends on what the synthesis prompt expects
      };
      
      // Placeholder results - In a real scenario, these would come from the fetched data
      // or potentially previous API calls if this handler only does synthesis.
      // For now, let's assume the fetched data IS the input for the AI calls.
      
      console.log('[full-report-test] Calling Chutes API for Trend Analysis...');
      const trendAnalysisResult = await callChutesDeepseekAPI(JSON.stringify(adsetTrendData), 'Trend');

      console.log('[full-report-test] Calling Chutes API for Performance Analysis...');
      const performanceAnalysisResult = await callChutesDeepseekAPI(JSON.stringify(fullContextData), 'Performance'); // Using full context as performance input

      console.log('[full-report-test] Calling Chutes API for Anomaly Analysis...');
      // For anomaly, might need specific data subset or combination
      const anomalyInputData = { context: fullContextData, trends: adsetTrendData }; // Example combination
      const anomalyAnalysisResult = await callChutesDeepseekAPI(JSON.stringify(anomalyInputData), 'Anomaly');

      console.log('[full-report-test] Calling Gemini API for Final Synthesis...');
    const finalReport = await callGeminiSynthesisAPI(
          trendAnalysisResult,
          performanceAnalysisResult,
          anomalyAnalysisResult,
          analysisContext // Pass the prepared context
      );
      // --- End: AI Analysis Calls ---


      // Combine and return the data (including the final synthesized report)
      console.log('[full-report-test] Successfully fetched data and performed AI analysis. Returning final report.');
      res.status(200).json({
          // Original fetched data (optional to return)
          // rawFullContext: fullContextData,
          // rawAdsetTrends: adsetTrendData,
          // rawCreativeAnalysis: creativeAnalysisData,
          // AI Analysis results (optional to return)
          // trendAnalysis: trendAnalysisResult,
          // performanceAnalysis: performanceAnalysisResult,
          // anomalyAnalysis: anomalyAnalysisResult,
          // Final synthesized report
          finalReport: finalReport
      });


    } catch (error) {
      // Catch errors from fetch calls OR AI analysis calls
      console.error('[full-report-test] Error during data fetching or AI analysis:', error);
      res.status(500).json({ error: 'Failed to generate full report', details: error.message });
    }

  } catch (error) {
    console.error('[Full Report API] Top-Level Error Handler:', error);
    // Ensure a structured error response even from the top-level catch
    return res.status(500).json({ 
        success: false, 
        error: error.message || 'Internal server error',
        report: null, // Indicate no report generated
        diagnostics: { // Include partial diagnostics if available
           prompts: null, // Prompts might not be available if error happened early
           fetchStatus: null, // Fetch status might not be available
           aiAnalysisResults: null 
        } 
    });
  }
} 