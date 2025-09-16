import { createClient } from '@supabase/supabase-js';
import { USER_PROMPT_INSTRUCTIONS } from '../../lib/ai-prompt-template.js'; // Import the template

// --- Supabase Client Initialization ---
function getServiceClient() {
  try {
    console.log('[AI_ANALYSIS_API] Initializing Supabase client');
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service key on server

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[AI_ANALYSIS_API] Missing Supabase server credentials (URL or Service Role Key)');
      // Fallback to anon key if service key is missing, but log a warning
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (supabaseUrl && supabaseAnonKey) {
         console.warn('[AI_ANALYSIS_API] Using ANON KEY for server client - Service Role Key is preferred.');
         return createClient(supabaseUrl, supabaseAnonKey, { auth: { autoRefreshToken: false, persistSession: false } });
      }
      throw new Error('Missing Supabase credentials for server-side client.');
    }
    
    console.log('[AI_ANALYSIS_API] Creating Supabase client with Service Role Key.');
    const client = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { 
        autoRefreshToken: false,
        persistSession: false 
      }
    });
    
    if (!client) throw new Error('Failed to initialize Supabase client');
    if (!client.rpc) throw new Error('Invalid Supabase client - missing RPC method');
    
    console.log('[AI_ANALYSIS_API] Supabase client initialized successfully');
    return client;
  } catch (error) {
    console.error('[AI_ANALYSIS_API] Error in getServiceClient:', error.message);
    console.error('[AI_ANALYSIS_API] Error stack:', error.stack);
    throw error; // Re-throw to be caught by handler
  }
}
// --- End Supabase Client Initialization ---

// --- AI API Configurations ---
// Requesty API Config (Primary)
const REQUESTY_API_KEY = process.env.REQUESTY_API_KEY;
const REQUESTY_BASE_URL = process.env.REQUESTY_BASE_URL || 'https://router.requesty.ai/v1';
const REQUESTY_MODEL_GEMINI_2_5 = process.env.REQUESTY_MODEL || 'google/gemini-2.5-pro-exp-03-25';
const REQUESTY_MODEL_GEMINI_2_0 = 'google/gemini-2.0-flash-exp';

// OpenRouter API Config (Fallback 1)
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const OPENROUTER_MODEL = 'google/gemini-1.5-pro-latest';

// Direct Gemini API Config (Fallback 2)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1/models';
const GEMINI_MODEL = 'gemini-1.5-pro-latest';

// Retry Settings
const MAX_RETRIES_REQUESTY = 4;
const MAX_RETRIES_OPENROUTER = 3;
const MAX_RETRIES_GEMINI_DIRECT = 2;
// --- End AI API Configurations ---

// --- Helper Functions ---
function calculateOverview(adData) {
  if (!adData || !Array.isArray(adData)) return {};
  try {
    let totalSpend = 0, totalImpressions = 0, totalClicks = 0, totalResults = 0, totalRevenue = 0;
    adData.forEach(ad => {
      const metrics = ad.overall_metrics || ad.metrics || {}; 
      totalSpend += Number(metrics.spend || 0);
      totalImpressions += Number(metrics.impressions || 0);
      totalClicks += Number(metrics.clicks || 0);
      totalResults += Number(metrics.results || 0);
      totalRevenue += metrics.results ? Number(metrics.results) * 50 : 0; // Assuming $50 value/result
    });
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
    const cpa = totalResults > 0 ? totalSpend / totalResults : 0;
    const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
    return {
      total_ads: adData.length, total_spend: parseFloat(totalSpend.toFixed(2)),
      total_impressions: totalImpressions, total_clicks: totalClicks, total_conversions: totalResults,
      total_revenue: parseFloat(totalRevenue.toFixed(2)), ctr: parseFloat(ctr.toFixed(2)),
      cpc: parseFloat(cpc.toFixed(2)), cpa: parseFloat(cpa.toFixed(2)), roas: parseFloat(roas.toFixed(2))
    };
  } catch (err) { console.error('Error calculating overview:', err); return {}; }
}

function transformAdData(adData) {
    if (!adData || !Array.isArray(adData)) return [];
    return adData.map(ad => {
        const metrics = ad.overall_metrics || ad.metrics || {};
        const zScores = ad.overall_z_scores_vs_campaign_avg || ad.z_scores || {};
        const processSegments = (segmentKey) => (ad[segmentKey] && Array.isArray(ad[segmentKey])) ? ad[segmentKey].map(segment => ({
            segment_type: segment.segment_type || segmentKey.replace('_segments', ''), // Infer type if missing
            segment_detail: segment.segment_detail || {},
            metrics: segment.metrics || {},
            z_scores_vs_ad_avg: segment.z_scores_vs_ad_avg || {},
            ad_spend_percentage: segment.ad_spend_percentage || 0
        })) : [];

        return {
            ad_id: ad.ad_id,
            overall_metrics: metrics,
            overall_z_scores_vs_campaign_avg: zScores,
            demographic_segments: processSegments('demographic_segments'),
            device_segments: processSegments('device_segments'),
            hourly_segments: processSegments('hourly_segments'),
            region_segments: processSegments('region_segments'),
            audience_segments: processSegments('audience_segments'),
            is_outlier: ad.is_outlier || false
        };
    });
}

function generateMockAnalysis(data) {
  return `SUMMARY: Mock analysis generated due to API issues. Please review raw data. Campaign Overview: ${JSON.stringify(data?.campaign_overview || {})}. Ads Analyzed: ${data?.ad_analysis?.length || 0}. RECOMMENDATIONS: 1. Verify API connection. 2. Check data format. 3. Retry analysis later. BUDGET ALLOCATION: N/A. TARGETING ADJUSTMENTS: N/A.`;
}

// Utility function to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- AI Service Functions ---

// Primary API: Requesty with Gemini 2.5
async function callRequestyAPI(systemPrompt, userPrompt, retryCount = 0) {
  console.log(`[AI_ANALYSIS_API] Calling Requesty API with Gemini 2.5 Pro (attempt ${retryCount + 1}/${MAX_RETRIES_REQUESTY})`);
  
  try {
    const response = await fetch(`${REQUESTY_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${REQUESTY_API_KEY}`
      },
      body: JSON.stringify({
        model: REQUESTY_MODEL_GEMINI_2_5,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      })
    });
    
    if (!response.ok) {
      const responseText = await response.text();
      console.error(`[AI_ANALYSIS_API] Requesty API error: ${response.status} - ${responseText}`);
      
      // Check for rate limits or server errors that might be temporary
      if (
        response.status === 429 || // Rate limit
        response.status === 500 || // Internal server error
        response.status === 502 || // Bad gateway 
        response.status === 503 || // Service unavailable
        response.status === 504    // Gateway timeout
      ) {
        if (retryCount < MAX_RETRIES_REQUESTY - 1) {
          const backoffTime = Math.pow(2, retryCount) * 1000; // Exponential backoff
          console.log(`[AI_ANALYSIS_API] Retrying Requesty in ${backoffTime}ms...`);
          await wait(backoffTime);
          return callRequestyAPI(systemPrompt, userPrompt, retryCount + 1);
        }
      }
      
      throw new Error(`Requesty API error: ${response.status} - ${responseText}`);
    }
    
    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '';
    
    if (!content) {
      throw new Error('Empty response from Requesty API');
    }
    
    return {
      content,
      source: 'requesty',
      model: REQUESTY_MODEL_GEMINI_2_5
    };
  } catch (error) {
    if (retryCount < MAX_RETRIES_REQUESTY - 1) {
      const backoffTime = Math.pow(2, retryCount) * 1000;
      console.log(`[AI_ANALYSIS_API] Requesty API error: ${error.message}. Retrying in ${backoffTime}ms...`);
      await wait(backoffTime);
      return callRequestyAPI(systemPrompt, userPrompt, retryCount + 1);
    }
    throw error; // Re-throw if all retries failed
  }
}

// Fallback 1: OpenRouter with Gemini
async function callOpenRouterAPI(systemPrompt, userPrompt, retryCount = 0) {
  console.log(`[AI_ANALYSIS_API] Fallback 1: Calling OpenRouter API with Gemini model (attempt ${retryCount + 1}/${MAX_RETRIES_OPENROUTER})`);
  
  try {
    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://blayz.app', // Using app domain as referer
        'X-Title': 'Blayz Campaign Analysis'
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      })
    });
    
    if (!response.ok) {
      const responseText = await response.text();
      console.error(`[AI_ANALYSIS_API] OpenRouter API error: ${response.status} - ${responseText}`);
      
      if (response.status === 429 || (response.status >= 500 && response.status < 600)) {
        if (retryCount < MAX_RETRIES_OPENROUTER - 1) {
          const backoffTime = Math.pow(2, retryCount) * 1500; // Longer backoff for OpenRouter
          console.log(`[AI_ANALYSIS_API] Retrying OpenRouter in ${backoffTime}ms...`);
          await wait(backoffTime);
          return callOpenRouterAPI(systemPrompt, userPrompt, retryCount + 1);
        }
      }
      
      throw new Error(`OpenRouter API error: ${response.status} - ${responseText}`);
    }
    
    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '';
    
    if (!content) {
      throw new Error('Empty response from OpenRouter API');
    }
    
    return {
      content,
      source: 'openrouter',
      model: OPENROUTER_MODEL
    };
  } catch (error) {
    if (retryCount < MAX_RETRIES_OPENROUTER - 1) {
      const backoffTime = Math.pow(2, retryCount) * 1500;
      console.log(`[AI_ANALYSIS_API] OpenRouter API error: ${error.message}. Retrying in ${backoffTime}ms...`);
      await wait(backoffTime);
      return callOpenRouterAPI(systemPrompt, userPrompt, retryCount + 1);
    }
    throw error; // Re-throw if all retries failed
  }
}

// Fallback 2: Direct Gemini API
async function callDirectGeminiAPI(systemPrompt, userPrompt, retryCount = 0) {
  console.log(`[AI_ANALYSIS_API] Fallback 2: Calling Direct Gemini API (attempt ${retryCount + 1}/${MAX_RETRIES_GEMINI_DIRECT})`);
  
  try {
    // Combining system prompt and user prompt for direct Gemini API
    const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;
    
    const response = await fetch(`${GEMINI_BASE_URL}/${GEMINI_MODEL}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: combinedPrompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_ONLY_HIGH"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_ONLY_HIGH"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_ONLY_HIGH"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_ONLY_HIGH"
          }
        ]
      })
    });
    
    if (!response.ok) {
      const responseText = await response.text();
      console.error(`[AI_ANALYSIS_API] Direct Gemini API error: ${response.status} - ${responseText}`);
      
      if (response.status === 429 || (response.status >= 500 && response.status < 600)) {
        if (retryCount < MAX_RETRIES_GEMINI_DIRECT - 1) {
          const backoffTime = Math.pow(2, retryCount) * 2000; // Even longer backoff for direct Gemini
          console.log(`[AI_ANALYSIS_API] Retrying Direct Gemini in ${backoffTime}ms...`);
          await wait(backoffTime);
          return callDirectGeminiAPI(systemPrompt, userPrompt, retryCount + 1);
        }
      }
      
      throw new Error(`Direct Gemini API error: ${response.status} - ${responseText}`);
    }
    
    const result = await response.json();
    
    // Extract content from Gemini API response format
    const content = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    if (!content) {
      throw new Error('Empty response from Direct Gemini API');
    }
    
    return {
      content,
      source: 'direct_gemini',
      model: GEMINI_MODEL
    };
  } catch (error) {
    if (retryCount < MAX_RETRIES_GEMINI_DIRECT - 1) {
      const backoffTime = Math.pow(2, retryCount) * 2000;
      console.log(`[AI_ANALYSIS_API] Direct Gemini API error: ${error.message}. Retrying in ${backoffTime}ms...`);
      await wait(backoffTime);
      return callDirectGeminiAPI(systemPrompt, userPrompt, retryCount + 1);
    }
    throw error; // Re-throw if all retries failed
  }
}

// Fallback 3: Requesty with Gemini 2.0 (last resort)
async function callRequestyWithGemini2(systemPrompt, userPrompt) {
  console.log(`[AI_ANALYSIS_API] Last resort fallback: Calling Requesty API with Gemini 2.0`);
  
  try {
    const response = await fetch(`${REQUESTY_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${REQUESTY_API_KEY}`
      },
      body: JSON.stringify({
        model: REQUESTY_MODEL_GEMINI_2_0,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      })
    });
    
    if (!response.ok) {
      const responseText = await response.text();
      console.error(`[AI_ANALYSIS_API] Requesty with Gemini 2.0 error: ${response.status} - ${responseText}`);
      throw new Error(`Final fallback failed: ${response.status} - ${responseText}`);
    }
    
    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '';
    
    if (!content) {
      throw new Error('Empty response from final fallback');
    }
    
    return {
      content,
      source: 'requesty_fallback',
      model: REQUESTY_MODEL_GEMINI_2_0
    };
  } catch (error) {
    console.error(`[AI_ANALYSIS_API] Final fallback error: ${error.message}`);
    throw error; // All fallbacks failed
  }
}

// Main function to call AI with fallbacks
async function generateAIAnalysis(systemPrompt, userPrompt) {
  console.log('[AI_ANALYSIS_API] Starting AI analysis generation with fallback chain');
  
  try {
    // Primary API: Requesty with Gemini 2.5
    return await callRequestyAPI(systemPrompt, userPrompt);
  } catch (requestyError) {
    console.error('[AI_ANALYSIS_API] Primary API (Requesty) failed:', requestyError.message);
    console.log('[AI_ANALYSIS_API] Trying fallback 1: OpenRouter...');
    
    try {
      // Fallback 1: OpenRouter with Gemini
      return await callOpenRouterAPI(systemPrompt, userPrompt);
    } catch (openRouterError) {
      console.error('[AI_ANALYSIS_API] Fallback 1 (OpenRouter) failed:', openRouterError.message);
      console.log('[AI_ANALYSIS_API] Trying fallback 2: Direct Gemini API...');
      
      try {
        // Fallback 2: Direct Gemini API
        return await callDirectGeminiAPI(systemPrompt, userPrompt);
      } catch (directGeminiError) {
        console.error('[AI_ANALYSIS_API] Fallback 2 (Direct Gemini) failed:', directGeminiError.message);
        console.log('[AI_ANALYSIS_API] Trying final fallback: Requesty with Gemini 2.0...');
        
        try {
          // Fallback 3: Requesty with Gemini 2.0
          return await callRequestyWithGemini2(systemPrompt, userPrompt);
        } catch (finalError) {
          // All fallbacks failed
          console.error('[AI_ANALYSIS_API] All fallbacks failed. Final error:', finalError.message);
          throw new Error(`All AI analysis methods failed: ${finalError.message}`);
        }
      }
    }
  }
}
// --- End Helper Functions ---


export default async function handler(req, res) {
  console.log('[AI_ANALYSIS_API] Handler started - Full Rebuild with Fallbacks');

  if (req.method !== 'POST') {
    console.log('[AI_ANALYSIS_API] Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[AI_ANALYSIS_API] Getting campaign data');
    const supabase = getServiceClient(); // Initialize client
    
    let analysisData;
    if (req.body && Object.keys(req.body).length > 0 && req.body.ad_analysis) { // Check if body contains expected data
      console.log('[AI_ANALYSIS_API] Using data from request body');
      analysisData = req.body;
    } else {
      console.log('[AI_ANALYSIS_API] Fetching data from database via RPC');
      const { data, error: rpcError } = await supabase.rpc('analyze_campaign_performance_full_context');
      if (rpcError) throw new Error(`Failed to fetch campaign data: ${rpcError.message}`);
      if (!data || (Array.isArray(data) && data.length === 0)) {
        console.warn('[AI_ANALYSIS_API] No campaign data found from RPC');
        return res.status(404).json({ error: 'No campaign data found' });
      }
      console.log('[AI_ANALYSIS_API] Campaign data fetched successfully via RPC');
      analysisData = { ad_analysis: data }; // Structure it as expected
    }
    
    console.log('[AI_ANALYSIS_API] Processing campaign data');
    const adData = analysisData.ad_analysis || [];
    const transformedAdData = transformAdData(adData);
    const campaignOverview = calculateOverview(adData);
    
    const dataForAI = {
      campaign_overview: campaignOverview,
      ad_analysis: transformedAdData
    };
    
    // --- AI Call Logic ---
    console.log('[AI_ANALYSIS_API] Generating AI analysis with fallback chain');
    try {
      const systemPrompt = `You are an expert Meta Ads performance analyst specializing in campaign optimization. Your task is to analyze Facebook/Instagram ad campaign data and provide actionable insights and recommendations based on statistical analysis. Use your expertise to identify performance patterns, outliers, and optimization opportunities based on Z-scores, spend percentages, and volume metrics. Focus on data-driven recommendations that will maximize ROAS, minimize CPA, and improve overall campaign performance.`;
      
      const jsonDataString = JSON.stringify(dataForAI, null, 2);
      let userPrompt = USER_PROMPT_INSTRUCTIONS.replace('__CAMPAIGN_DATA_JSON__', jsonDataString);

      if (req.body.userMessage) {
        userPrompt += `\n\nAdditional user question about this analysis: ${req.body.userMessage}\nAnswer the question based on the analysis data provided, providing insights and recommendations as appropriate.`;
      }

      const result = await generateAIAnalysis(systemPrompt, userPrompt);
      
      console.log(`[AI_ANALYSIS_API] AI analysis generated successfully with ${result.source} (${result.model})`);
      
      return res.status(200).json({
        analysis: result.content,
        source: result.source,
        model: result.model
      });
      
    } catch (aiError) {
      console.error('[AI_ANALYSIS_API] All AI services failed:', aiError.message);
      console.log('[AI_ANALYSIS_API] Using mock analysis due to service failures');
      const mockAnalysis = generateMockAnalysis(dataForAI);
      return res.status(200).json({ 
        analysis: mockAnalysis, 
        source: 'mock', 
        mock_reason: `AI service failure: ${aiError.message}`, 
        error_details: aiError.message 
      });
    }
    // --- End AI Call Logic ---

  } catch (error) {
    console.error('[AI_ANALYSIS_API] Handler error:', error.message);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
