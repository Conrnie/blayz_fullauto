/**
 * Iterative Analysis Module
 * 
 * Implements a true iterative analysis approach with multiple LLM calls
 * to build a comprehensive campaign analysis:
 * 
 * 1. Overall Campaign Summary
 * 2. Ad Set Aggregate Analysis
 * 3. Ad Aggregate Analysis
 * 4. Segment Deep Dive
 * 5. Final Synthesis & Actionables
 */

// Helper function for making calls to the Requesty API with Gemini models
async function callGeminiAPI(prompt, systemPrompt = '', retries = 2, modelOverride = null) {
  // For intermediate steps, use Chutes API with DeepSeek model
  const CHUTES_BASE_URL = 'https://llm.chutes.ai/v1';
  const CHUTES_API_TOKEN = process.env.CHUTES_API_TOKEN;
  const CHUTES_MODEL = 'deepseek-ai/DeepSeek-V3-0324';
  
  // For final synthesis, use Requesty with Gemini 2.5
  const REQUESTY_BASE_URL = process.env.REQUESTY_BASE_URL || 'https://router.requesty.ai/v1';
  const REQUESTY_FINAL_MODEL = process.env.REQUESTY_MODEL || 'google/gemini-2.5-pro-exp-03-25';
  const REQUESTY_API_KEY = process.env.REQUESTY_API_KEY;
  
  // Determine which API and model to use
  const useRequesty = modelOverride === REQUESTY_FINAL_MODEL;
  
  // Check for required API keys
  if (useRequesty && !REQUESTY_API_KEY) {
    throw new Error('Missing Requesty API key');
  }
  
  if (!useRequesty && !CHUTES_API_TOKEN) {
    throw new Error('Missing Chutes API token');
  }
  
  // Default system prompt if none provided
  const defaultSystemPrompt = `You are an expert Meta ads campaign analysis AI. Your task is to analyze campaign data and generate insights in JSON format. Always ensure you return valid, properly escaped JSON that can be parsed using JSON.parse().`;
  
  const effectiveSystemPrompt = systemPrompt || defaultSystemPrompt;
  
  let attempt = 0;
  
  while (attempt <= retries) {
    try {
      if (attempt > 0) {
        console.log(`[ITERATIVE_ANALYSIS] Retry attempt ${attempt} of ${retries}`);
      }
      
      if (useRequesty) {
        // Use Requesty with Gemini for final synthesis
        console.log(`[ITERATIVE_ANALYSIS] Request to Requesty API with Gemini 2.5 Pro`);
      console.log(`[ITERATIVE_ANALYSIS] Prompt length: ${prompt.length} characters`);
      
      const response = await fetch(`${REQUESTY_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${REQUESTY_API_KEY}`
        },
        body: JSON.stringify({
            model: REQUESTY_FINAL_MODEL,
          messages: [
            { role: "system", content: effectiveSystemPrompt },
            { role: "user", content: prompt }
          ]
        })
      });
    
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Requesty API error: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('[ITERATIVE_ANALYSIS] Requesty API response received');
      
      // Extract the content from the Requesty response using standard OpenAI format
      const content = result.choices?.[0]?.message?.content || '';
                      
      if (!content) {
        throw new Error('Empty or invalid response from Requesty API');
      }
      
      console.log(`[ITERATIVE_ANALYSIS] Response content length: ${content.length} characters`);
      console.log(`[ITERATIVE_ANALYSIS] Response preview: ${content.substring(0, 200)}...`);
      
        // Process and return JSON content
        return processJsonContent(content);
      } else {
        // Use Chutes with DeepSeek for intermediate steps
        console.log(`[ITERATIVE_ANALYSIS] Request to Chutes API with DeepSeek model`);
        console.log(`[ITERATIVE_ANALYSIS] Prompt length: ${prompt.length} characters`);
        
        // Combine system prompt and user prompt for DeepSeek
        const combinedPrompt = `${effectiveSystemPrompt}\n\n${prompt}`;
        
        // Using DeepSeek for intermediate steps
        const response = await fetch(`${CHUTES_BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CHUTES_API_TOKEN}`
          },
          body: JSON.stringify({
            model: CHUTES_MODEL,
            messages: [
              { role: "user", content: combinedPrompt }
            ],
            max_tokens: 4096,
            temperature: 0.7
          })
        });
      
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Chutes API error with DeepSeek: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        console.log('[ITERATIVE_ANALYSIS] Chutes API response received from DeepSeek');
        
        // Extract the content from the Chutes response
        const content = result.choices?.[0]?.message?.content || '';
                        
        if (!content) {
          throw new Error('Empty or invalid response from Chutes API (DeepSeek)');
        }
        
        console.log(`[ITERATIVE_ANALYSIS] Response content length: ${content.length} characters`);
        console.log(`[ITERATIVE_ANALYSIS] Response preview: ${content.substring(0, 200)}...`);
        
        // Process and return JSON content
        return processJsonContent(content);
      }
    } catch (error) {
      console.error(`[ITERATIVE_ANALYSIS] Error (attempt ${attempt + 1}):`, error);
      
      if (attempt === retries) {
        throw error; // Re-throw if we've exhausted retries
      }
      
      // Wait before retrying (exponential backoff)
      const delay = 1000 * Math.pow(2, attempt);
      console.log(`[ITERATIVE_ANALYSIS] Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      attempt++;
    }
  }
}

// Helper function to process and extract JSON content from API responses
function processJsonContent(content) {
      try {
        // Clean the content
        let jsonContent = content.trim();
        
        // If it doesn't start with {, extract the JSON
        if (!jsonContent.startsWith('{')) {
          console.log('[ITERATIVE_ANALYSIS] Response doesn\'t start with {, attempting to extract JSON');
          const startIndex = jsonContent.indexOf('{');
          const endIndex = jsonContent.lastIndexOf('}');
          if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
            jsonContent = jsonContent.substring(startIndex, endIndex + 1);
            console.log(`[ITERATIVE_ANALYSIS] Extracted JSON from response (${startIndex} to ${endIndex})`);
          }
        }
        
        // Remove any control characters that might break JSON parsing
        jsonContent = jsonContent.replace(/[\u0000-\u0019]+/g, '');
        
        const parsedJson = JSON.parse(jsonContent);
        console.log('[ITERATIVE_ANALYSIS] Successfully parsed JSON response');
        
        return parsedJson;
      } catch (parseError) {
        console.error('[ITERATIVE_ANALYSIS] JSON parse error:', parseError);
        console.log('[ITERATIVE_ANALYSIS] Raw content:', content.substring(0, 500) + '...');
        throw new Error(`Failed to parse JSON response: ${parseError.message}`);
  }
}

// Formatting helper functions
const formatCurrency = (value) => `$${Number(value).toFixed(2)}`;
const formatNumber = (value) => Number(value).toLocaleString();
const formatPercent = (value) => `${Number(value).toFixed(2)}%`;

/**
 * Step 1: Generate Overall Campaign Summary
 * Provides a high-level assessment of campaign performance metrics
 */
async function generateCampaignSummary(campaignId, metrics) {
  console.log('[ITERATIVE_ANALYSIS] STEP 1: Generating overall campaign summary...');

  const systemPrompt = `You are an expert digital marketing analyst specializing in Meta ads. Your task is to analyze top-level campaign metrics and provide a concise yet comprehensive summary in JSON format.`;
  
  const prompt = `
Campaign ID: ${campaignId}

CAMPAIGN PERFORMANCE METRICS:
- Total Spend: ${formatCurrency(metrics.totalSpend)}
- Impressions: ${formatNumber(metrics.totalImpressions)}
- Clicks: ${formatNumber(metrics.totalClicks)}
- Results: ${formatNumber(metrics.totalResults)}
- CTR: ${formatPercent(metrics.ctr)}
- CPC: ${formatCurrency(metrics.cpc)}
- CPA: ${formatCurrency(metrics.cpa)}
- Conversion Rate: ${formatPercent(metrics.conversionRate)}
- ROAS: ${metrics.roas.toFixed(2)}x

Focus on:
1. Overall campaign health (ROAS, CPA vs. typical benchmarks)
2. Major trends evident in the top-level metrics
3. Initial assessment of whether the campaign is meeting typical performance objectives
4. Identification of areas that likely need deeper investigation

Your response must be valid JSON with this structure:
{
  "overall_assessment": "Brief overall assessment of campaign health (1-2 sentences)",
  "strengths": ["Array of 1-3 identified strengths based only on these top-level metrics"],
  "concerns": ["Array of 1-3 potential concerns based only on these top-level metrics"],
  "kpi_analysis": {
    "impressions": "Analysis of impression volume and what it suggests",
    "ctr": "Analysis of CTR performance",
    "cpc": "Analysis of CPC performance",
    "conversion_rate": "Analysis of conversion rate",
    "cpa": "Analysis of CPA and what it suggests about campaign efficiency",
    "roas": "Analysis of ROAS and overall return"
  },
  "initial_focus_areas": ["Array of 2-3 areas that warrant deeper investigation in subsequent analyses"]
}`;

  try {
    // Use the default intermediate model
    return await callGeminiAPI(prompt, systemPrompt);
  } catch (error) {
    console.error('[ITERATIVE_ANALYSIS] Error generating campaign summary:', error);
    return {
      overall_assessment: "Error generating campaign summary.",
      strengths: [],
      concerns: ["Unable to analyze campaign due to API error."],
      kpi_analysis: {
        impressions: "Analysis unavailable",
        ctr: "Analysis unavailable",
        cpc: "Analysis unavailable",
        conversion_rate: "Analysis unavailable",
        cpa: "Analysis unavailable",
        roas: "Analysis unavailable"
      },
      initial_focus_areas: ["Retry analysis"]
    };
  }
}

/**
 * Step 2: Generate Ad Set Aggregate Analysis
 * Analyzes performance trends across ad sets
 */
async function generateAdSetAnalysis(campaignId, adSetsArray, campaignSummary) {
  console.log('[ITERATIVE_ANALYSIS] STEP 2: Generating ad set aggregate analysis...');

  const systemPrompt = `You are an expert digital marketing analyst specializing in Meta ads. Your task is to analyze ad set performance metrics in the context of overall campaign performance and provide insights in JSON format.`;
  
  const prompt = `
Campaign ID: ${campaignId}

OVERALL CAMPAIGN SUMMARY:
${JSON.stringify(campaignSummary, null, 2)}

AD SET PERFORMANCE DATA (sorted by spend):
${JSON.stringify(adSetsArray, null, 2)}

Focus on:
1. Comparing performance across ad sets
2. Identifying top and bottom performing ad sets and why they might be performing that way
3. Budget allocation effectiveness across ad sets
4. Patterns in targeting or approach among high-performing ad sets

Your response must be valid JSON with this structure:
{
  "overview": "Brief overview of ad set performance trends",
  "top_performers": [
    {
      "ad_set_id": "ID of top performer",
      "performance_summary": "Why it's performing well",
      "key_metrics": "Highlight of strongest metrics",
      "spend_effectiveness": "Assessment of spend vs. performance",
      "recommendations": ["Array of 1-3 recommendations specific to this ad set"]
    }
  ],
  "underperformers": [
    {
      "ad_set_id": "ID of underperformer",
      "performance_summary": "Why it's underperforming",
      "concerning_metrics": "Highlight of problematic metrics",
      "spend_efficiency": "Assessment of potential wasted spend",
      "recommendations": ["Array of 1-3 recommendations specific to this ad set"]
    }
  ],
  "budget_allocation_assessment": "Analysis of current budget allocation effectiveness",
  "patterns_identified": ["Array of patterns observed across ad sets"],
  "recommended_actions": ["Array of 3-5 specific actions to optimize ad sets"]
}`;

  try {
    // Use the default intermediate model
    return await callGeminiAPI(prompt, systemPrompt);
  } catch (error) {
    console.error('[ITERATIVE_ANALYSIS] Error generating ad set analysis:', error);
    return {
      overview: "Error generating ad set analysis.",
      top_performers: [],
      underperformers: [],
      budget_allocation_assessment: "Analysis unavailable due to API error.",
      patterns_identified: [],
      recommended_actions: ["Retry analysis"]
    };
  }
}

/**
 * Step 3: Generate Ad Aggregate Analysis
 * Analyzes performance trends across individual ads
 */
async function generateAdAnalysis(campaignId, adMetrics, campaignSummary, adSetAnalysis) {
  console.log('[ITERATIVE_ANALYSIS] STEP 3: Generating ad aggregate analysis...');

  const systemPrompt = `You are an expert digital marketing analyst specializing in Meta ads. Your task is to analyze individual ad performance metrics in the context of campaign and ad set performance and provide insights in JSON format.`;
  
  const prompt = `
Campaign ID: ${campaignId}

OVERALL CAMPAIGN SUMMARY:
${JSON.stringify(campaignSummary, null, 2)}

AD SET ANALYSIS:
${JSON.stringify(adSetAnalysis, null, 2)}

AD PERFORMANCE DATA (sorted by spend):
${JSON.stringify(adMetrics, null, 2)}

Focus on:
1. Identifying performance patterns across ads
2. Analyzing top and bottom performing ads using Z-scores to identify statistical significance
3. Connecting ad performance to ad set performance where possible
4. Identifying creative or targeting elements that might explain performance differences

Your response must be valid JSON with this structure:
{
  "overview": "Brief overview of ad performance trends",
  "top_performers": [
    {
      "ad_id": "ID of top performer",
      "performance_summary": "Why it's performing well",
      "z_score_analysis": "Analysis of significant z-scores",
      "spend_effectiveness": "Assessment of spend vs. performance",
      "recommendations": ["Array of 1-3 recommendations specific to this ad"]
    }
  ],
  "underperformers": [
    {
      "ad_id": "ID of underperformer",
      "performance_summary": "Why it's underperforming",
      "z_score_analysis": "Analysis of concerning z-scores",
      "spend_efficiency": "Assessment of potential wasted spend",
      "recommendations": ["Array of 1-3 recommendations specific to this ad"]
    }
  ],
  "cross_cutting_insights": ["Array of insights that apply across multiple ads"],
  "ad_to_adset_relationships": "Analysis of how ad performance relates to parent ad set performance",
  "recommended_actions": ["Array of 3-5 specific actions to optimize ads"]
}`;

  try {
    // Use the default intermediate model
    return await callGeminiAPI(prompt, systemPrompt);
  } catch (error) {
    console.error('[ITERATIVE_ANALYSIS] Error generating ad analysis:', error);
    return {
      overview: "Error generating ad analysis.",
      top_performers: [],
      underperformers: [],
      cross_cutting_insights: [],
      ad_to_adset_relationships: "Analysis unavailable due to API error.",
      recommended_actions: ["Retry analysis"]
    };
  }
}

/**
 * Step 4: Generate Segment Deep Dive Analysis
 * Analyzes performance across different segment types (demographic, device, etc.)
 */
async function generateSegmentAnalysis(campaignId, segmentData, campaignSummary, adSetAnalysis, adAnalysis) {
  console.log('[ITERATIVE_ANALYSIS] STEP 4: Generating segment deep dive analysis...');

  const systemPrompt = `You are an expert digital marketing analyst specializing in Meta ads. Your task is to analyze segment performance metrics in the context of the overall campaign, ad sets, and ads performance and provide insights in JSON format.`;
  
  const prompt = `
Campaign ID: ${campaignId}

OVERALL CAMPAIGN SUMMARY:
${JSON.stringify(campaignSummary, null, 2)}

AD SET ANALYSIS:
${JSON.stringify(adSetAnalysis, null, 2)}

AD ANALYSIS:
${JSON.stringify(adAnalysis, null, 2)}

SEGMENT DATA:
${JSON.stringify(segmentData, null, 2)}

Focus on:
1. Analyzing performance patterns across demographic segments (age/gender)
2. Identifying high and low performing device/platform combinations
3. Detecting time-based patterns in the hourly data
4. Spotting regional performance differences
5. Evaluating audience targeting effectiveness

For each segment type, prioritize insights where:
- Z-scores show statistically significant deviation
- The segment represents a meaningful percentage of spend
- There's sufficient data volume to make confident conclusions

Your response must be valid JSON with this structure:
{
  "demographic_analysis": {
    "overview": "Overview of demographic performance patterns",
    "significant_segments": [
      {
        "segment": "Description of segment (e.g., '18-24 Female')",
        "performance": "Performance assessment",
        "z_score_insights": "What the z-scores tell us",
        "spend_impact": "Assessment of spend percentage and importance",
        "recommendations": ["Specific recommendations for this demographic segment"]
      }
    ],
    "summary": "Summary of demographic findings"
  },
  "device_analysis": {
    "overview": "Overview of device performance patterns",
    "significant_segments": [
      {
        "segment": "Description of segment (e.g., 'Mobile-iOS-Facebook Feed')",
        "performance": "Performance assessment",
        "z_score_insights": "What the z-scores tell us",
        "spend_impact": "Assessment of spend percentage and importance",
        "recommendations": ["Specific recommendations for this device segment"]
      }
    ],
    "summary": "Summary of device findings"
  },
  "hourly_analysis": {
    "overview": "Overview of time-based performance patterns",
    "significant_segments": [
      {
        "segment": "Description of time segment (e.g., 'Hour-18')",
        "performance": "Performance assessment",
        "z_score_insights": "What the z-scores tell us",
        "spend_impact": "Assessment of spend percentage and importance",
        "recommendations": ["Specific recommendations for this time segment"]
      }
    ],
    "summary": "Summary of hourly/time-based findings"
  },
  "region_analysis": {
    "overview": "Overview of regional performance patterns",
    "significant_segments": [
      {
        "segment": "Description of region segment",
        "performance": "Performance assessment",
        "z_score_insights": "What the z-scores tell us",
        "spend_impact": "Assessment of spend percentage and importance",
        "recommendations": ["Specific recommendations for this region"]
      }
    ],
    "summary": "Summary of regional findings"
  },
  "audience_analysis": {
    "overview": "Overview of audience targeting performance",
    "significant_segments": [
      {
        "segment": "Description of audience segment",
        "performance": "Performance assessment",
        "z_score_insights": "What the z-scores tell us",
        "spend_impact": "Assessment of spend percentage and importance",
        "recommendations": ["Specific recommendations for this audience segment"]
      }
    ],
    "summary": "Summary of audience findings"
  },
  "cross_segment_insights": ["Array of insights that span multiple segment types"],
  "highest_priority_segment_findings": ["Array of 3-5 most important segment findings across all types"]
}`;

  try {
    // Use the default intermediate model
    return await callGeminiAPI(prompt, systemPrompt);
  } catch (error) {
    console.error('[ITERATIVE_ANALYSIS] Error generating segment analysis:', error);
    return {
      demographic_analysis: { overview: "Error generating demographic analysis.", significant_segments: [], summary: "Analysis unavailable due to API error." },
      device_analysis: { overview: "Error generating device analysis.", significant_segments: [], summary: "Analysis unavailable due to API error." },
      hourly_analysis: { overview: "Error generating hourly analysis.", significant_segments: [], summary: "Analysis unavailable due to API error." },
      region_analysis: { overview: "Error generating region analysis.", significant_segments: [], summary: "Analysis unavailable due to API error." },
      audience_analysis: { overview: "Error generating audience analysis.", significant_segments: [], summary: "Analysis unavailable due to API error." },
      cross_segment_insights: [],
      highest_priority_segment_findings: ["Retry segment analysis"]
    };
  }
}

/**
 * Step 5: Generate Final Synthesis and Actionables
 * Combines all previous analyses into a cohesive final report
 */
async function generateFinalSynthesis(campaignId, metrics, campaignSummary, adSetAnalysis, adAnalysis, segmentAnalysis, modelOverride = null) {
  console.log('[ITERATIVE_ANALYSIS] STEP 5: Generating final synthesis and actionables...');

  const systemPrompt = `You are a senior digital marketing strategist specializing in Meta ads optimization. Your task is to synthesize multiple analyses into a comprehensive final report with structured sections and specific actionable recommendations in JSON format.`;
  
  const prompt = `
Campaign ID: ${campaignId}

CAMPAIGN PERFORMANCE METRICS:
- Total Spend: ${formatCurrency(metrics.totalSpend)}
- Impressions: ${formatNumber(metrics.totalImpressions)}
- Clicks: ${formatNumber(metrics.totalClicks)}
- Results: ${formatNumber(metrics.totalResults)}
- CTR: ${formatPercent(metrics.ctr)}
- CPC: ${formatCurrency(metrics.cpc)}
- CPA: ${formatCurrency(metrics.cpa)}
- Conversion Rate: ${formatPercent(metrics.conversionRate)}
- ROAS: ${metrics.roas.toFixed(2)}x

CAMPAIGN SUMMARY:
${JSON.stringify(campaignSummary, null, 2)}

AD SET ANALYSIS:
${JSON.stringify(adSetAnalysis, null, 2)}

AD ANALYSIS:
${JSON.stringify(adAnalysis, null, 2)}

SEGMENT ANALYSIS:
${JSON.stringify(segmentAnalysis, null, 2)}

Your task is to synthesize all these analyses into a cohesive final report with clear actionable recommendations. Specifically:

1. Create an executive summary that presents the most important findings from all analyses
2. Develop a structured campaign analysis that draws from all previous steps
3. Prioritize actionable recommendations based on:
   - Statistical significance (z-scores)
   - Spend percentage (economic impact)
   - Data volume (confidence)
   - Potential impact on overall campaign performance

Your response must be valid JSON with this structure:
{
  "executive_summary": "Concise overview of campaign performance and key findings",
  "campaign_analysis": "Detailed analysis of overall campaign performance based on top-level metrics",
  "ad_set_analysis": "Analysis of aggregate ad set performance trends",
  "ad_analysis": "Analysis of aggregate ad performance trends",
  "segment_analysis": {
    "demographics": "Analysis of demographic performance",
    "devices": "Analysis of device and platform performance",
    "regions": "Analysis of regional performance",
    "times": "Analysis of time-based performance",
    "audiences": "Analysis of audience performance"
  },
  "actionables": [
    {
      "target": "Specific area to modify (e.g., 'Mobile ads', '18-24 demographic')",
      "observation": "What was observed in the data",
      "action": "Clear actionable recommendation with specific numbers (e.g., 'Increase budget by 20%', 'Pause ad ID XYZ')",
      "expected_impact": "high|medium|low",
      "confidence": "high|medium|low"
    }
  ],
  "model": "${modelOverride || 'google/gemini-2.5-pro-exp-03-25'}",
  "source": "ai",
  "generated_at": "${new Date().toISOString()}"
}

Most importantly, your actionables should be SPECIFIC and PRACTICAL - with exact recommendations including percentages, specific ad/segment identifiers, and clear next steps that could be implemented immediately.`;

  try {
    // Define model names
    const REQUESTY_FINAL_MODEL = process.env.REQUESTY_MODEL || 'google/gemini-2.5-pro-exp-03-25';
    const CHUTES_FALLBACK_MODEL = 'deepseek-ai/DeepSeek-V3-0324';
    
    console.log(`[ITERATIVE_ANALYSIS] Attempting to use ${REQUESTY_FINAL_MODEL} for final synthesis`);
    
    try {
      // First try with Gemini 2.5 Pro with more retries (4 instead of 2)
      const finalReport = await callGeminiAPI(prompt, systemPrompt, 4, modelOverride || REQUESTY_FINAL_MODEL);
      
      // Add intermediate analyses for reference
      finalReport._intermediate_analyses = {
        campaign_summary: campaignSummary,
        ad_set_analysis: adSetAnalysis,
        ad_analysis: adAnalysis,
        segment_analysis: segmentAnalysis
      };
      
      finalReport.model = REQUESTY_FINAL_MODEL;
      return finalReport;
    } catch (error) {
      // If Gemini 2.5 Pro fails, fall back to DeepSeek
      console.log(`[ITERATIVE_ANALYSIS] Failed with ${REQUESTY_FINAL_MODEL}, falling back to ${CHUTES_FALLBACK_MODEL}`);
      console.log('[ITERATIVE_ANALYSIS] Original error:', error.message);
      
      // Add a delay before trying with the fallback model
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      console.log('[ITERATIVE_ANALYSIS] Using DeepSeek via Chutes API as fallback for final synthesis');
      
      // Create a special version of the system prompt and user prompt combined for DeepSeek
      const combinedPrompt = `${systemPrompt}\n\n${prompt}`;
      
      // Make a direct call to Chutes API for DeepSeek
      const CHUTES_BASE_URL = 'https://llm.chutes.ai/v1';
      const CHUTES_API_TOKEN = process.env.CHUTES_API_TOKEN;
      
      const response = await fetch(`${CHUTES_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CHUTES_API_TOKEN}`
        },
        body: JSON.stringify({
          model: CHUTES_FALLBACK_MODEL,
          messages: [
            { role: "user", content: combinedPrompt }
          ],
          max_tokens: 4096,
          temperature: 0.7
        })
      });
    
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Fallback to DeepSeek failed: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('[ITERATIVE_ANALYSIS] Chutes API response received from DeepSeek fallback');
      
      // Extract the content
      const content = result.choices?.[0]?.message?.content || '';
                      
      if (!content) {
        throw new Error('Empty response from DeepSeek fallback');
      }
      
      // Process the content to extract JSON
      const fallbackReport = processJsonContent(content);
      
      // Add intermediate analyses and note the fallback model
      fallbackReport._intermediate_analyses = {
        campaign_summary: campaignSummary,
        ad_set_analysis: adSetAnalysis,
        ad_analysis: adAnalysis,
        segment_analysis: segmentAnalysis
      };
      
      fallbackReport.model = CHUTES_FALLBACK_MODEL;
      fallbackReport.model_note = "Used DeepSeek fallback model due to issue with primary model";
      
      return fallbackReport;
    }
  } catch (error) {
    console.error('[ITERATIVE_ANALYSIS] Error generating final synthesis with both models:', error);
    return {
      executive_summary: "Error generating final report synthesis.",
      campaign_analysis: "Analysis unavailable due to API error.",
      ad_set_analysis: "Analysis unavailable due to API error.",
      ad_analysis: "Analysis unavailable due to API error.",
      segment_analysis: {
        demographics: "Analysis unavailable due to API error.",
        devices: "Analysis unavailable due to API error.",
        regions: "Analysis unavailable due to API error.",
        times: "Analysis unavailable due to API error.",
        audiences: "Analysis unavailable due to API error."
      },
      actionables: [{
        target: "Error",
        observation: "Failed to generate report",
        action: "Retry report generation",
        expected_impact: "medium",
        confidence: "low"
      }],
      error_details: error.message,
      model: "fallback",
      source: "ai",
      generated_at: new Date().toISOString(),
      _intermediate_analyses: {
        campaign_summary: campaignSummary || {},
        ad_set_analysis: adSetAnalysis || {},
        ad_analysis: adAnalysis || {},
        segment_analysis: segmentAnalysis || {}
      }
    };
  }
}

/**
 * Main function to run the complete iterative analysis
 */
async function runIterativeAnalysis(campaignId, campaignData, adSetsArray, adMetrics, segmentData) {
  console.log('[ITERATIVE_ANALYSIS] Starting TRUE iterative analysis process...');
  
  // Define the models for logging
  const CHUTES_MODEL = 'deepseek-ai/DeepSeek-V3-0324';
  const REQUESTY_FINAL_MODEL = process.env.REQUESTY_MODEL || 'google/gemini-2.5-pro-exp-03-25';
  
  console.log(`[ITERATIVE_ANALYSIS] Using Chutes API with ${CHUTES_MODEL} for intermediate steps and Requesty with ${REQUESTY_FINAL_MODEL} for final synthesis (with ${CHUTES_MODEL} as final fallback)`);
  
  // Helper function to add delay between API calls
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
  try {
    // Step 1: Overall Campaign Summary (Use Chutes with DeepSeek)
    console.log(`[ITERATIVE_ANALYSIS] Step 1: Generating campaign summary with DeepSeek via Chutes API`);
    const campaignSummary = await generateCampaignSummary(campaignId, campaignData);
    console.log('[ITERATIVE_ANALYSIS] Step 1 completed');
    
    // Add delay between API calls to avoid rate limiting
    await delay(2000);
    
    // Step 2: Ad Set Aggregate Analysis (Use Chutes with DeepSeek)
    console.log(`[ITERATIVE_ANALYSIS] Step 2: Generating ad set analysis with DeepSeek via Chutes API`);
    const adSetAnalysis = await generateAdSetAnalysis(campaignId, adSetsArray, campaignSummary);
    console.log('[ITERATIVE_ANALYSIS] Step 2 completed');
    
    // Add delay between API calls
    await delay(2000);
    
    // Step 3: Ad Aggregate Analysis (Use Chutes with DeepSeek)
    console.log(`[ITERATIVE_ANALYSIS] Step 3: Generating ad analysis with DeepSeek via Chutes API`);
    const adAnalysis = await generateAdAnalysis(campaignId, adMetrics, campaignSummary, adSetAnalysis);
    console.log('[ITERATIVE_ANALYSIS] Step 3 completed');
    
    // Add delay between API calls
    await delay(2000);
    
    // Step 4: Segment Deep Dive (Use Chutes with DeepSeek)
    console.log(`[ITERATIVE_ANALYSIS] Step 4: Generating segment analysis with DeepSeek via Chutes API`);
    const segmentAnalysis = await generateSegmentAnalysis(campaignId, segmentData, campaignSummary, adSetAnalysis, adAnalysis);
    console.log('[ITERATIVE_ANALYSIS] Step 4 completed');
    
    // Add longer delay before final synthesis to ensure we don't hit rate limits
    console.log('[ITERATIVE_ANALYSIS] Waiting 5 seconds before final synthesis to avoid rate limits...');
    await delay(5000);
    
    // Step 5: Final Synthesis & Actionables (Use Gemini 2.5 Pro for highest quality)
    console.log('[ITERATIVE_ANALYSIS] Step 5: Generating final synthesis with Gemini 2.5 Pro');
    // Pass the REQUESTY_FINAL_MODEL to use Requesty instead of Chutes for the final step
    const finalReport = await generateFinalSynthesis(campaignId, campaignData, campaignSummary, adSetAnalysis, adAnalysis, segmentAnalysis, REQUESTY_FINAL_MODEL);
    console.log('[ITERATIVE_ANALYSIS] Step 5 completed');
    
    console.log('[ITERATIVE_ANALYSIS] TRUE iterative analysis process completed successfully');
    return finalReport;
  } catch (error) {
    console.error('[ITERATIVE_ANALYSIS] Error in iterative analysis process:', error);
    throw error;
  }
}

module.exports = {
  runIterativeAnalysis,
  generateCampaignSummary,
  generateAdSetAnalysis,
  generateAdAnalysis,
  generateSegmentAnalysis,
  generateFinalSynthesis,
  formatCurrency,
  formatNumber,
  formatPercent
}; 