import { createClient } from '@supabase/supabase-js';

// Configure timeout for this API route (shorter for async approach)
export const config = {
  api: {
    externalResolver: true,
    responseLimit: false,
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
  maxDuration: 25, // 25 seconds - under Netlify Pro limit
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseAdmin;
if (supabaseUrl && supabaseServiceKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });
}

// Helper function with shorter timeout for async approach
async function invokeSupabaseFunction(functionName, bodyPayload, headers = {}, timeoutMs = 20000) {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not initialized.');
  }
  
  console.log(`[API:async] Invoking ${functionName} with 20s timeout`);
  
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Function ${functionName} timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  try {
    const invokePromise = supabaseAdmin.functions.invoke(functionName, {
      body: bodyPayload,
      headers: headers
    });

    const { data, error } = await Promise.race([invokePromise, timeoutPromise]);

    if (error) {
      console.error(`[API:async] Error in ${functionName}:`, error);
      throw error;
    }
    
    console.log(`[API:async] ${functionName} completed successfully`);
    return data;
  } catch (error) {
    if (error.message.includes('timed out')) {
      console.error(`[API:async] ${functionName} timed out - this is expected for heavy AI processing`);
      return { status: 'timeout', message: `${functionName} is processing in background` };
    }
    throw error;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const { campaignId, metaCampaignId, userId, startDate, endDate, userSupabaseAccessToken, step } = req.body;

  if (!campaignId || !metaCampaignId || !userId || !startDate || !endDate || !step) {
    return res.status(400).json({ error: 'Missing required parameters including step' });
  }

  console.log(`[API:async] Processing step: ${step} for campaign: ${campaignId}`);

  try {
    const headers = { 'X-Shared-Secret': process.env.YOUR_SHARED_SECRET };

    // Get campaign details first
    const { data: campaignData, error: campaignError } = await supabaseAdmin
      .from('campaigns')
      .select('ad_account_id')
      .eq('id', campaignId)
      .eq('user_id', userId)
      .single();

    if (campaignError || !campaignData) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const dbAdAccountId = campaignData.ad_account_id;

    // Calculate date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const numDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    switch (step) {
      case 'freshness':
        const freshnessPayload = {
          userId,
          dbAdAccountId,
          userSupabaseAccessToken,
          selectedMetaCampaignId: metaCampaignId
        };
        const freshnessResult = await invokeSupabaseFunction('ensure-data-is-fresh', freshnessPayload, headers, 15000);
        return res.status(200).json({ step: 'freshness', result: freshnessResult, nextStep: 'trend' });

      case 'trend':
        const trendPayload = {
          campaignId,
          metaCampaignId,
          userId,
          startDate,
          endDate,
          numDays
        };
        const trendResult = await invokeSupabaseFunction('get-trend-analysis', trendPayload, headers, 20000);
        return res.status(200).json({ step: 'trend', result: trendResult, nextStep: 'anomaly' });

      case 'anomaly':
        const anomalyPayload = {
          campaignId,
          metaCampaignId,
          userId,
          startDate,
          endDate,
          numDays
        };
        const anomalyResult = await invokeSupabaseFunction('get-anomaly-analysis', anomalyPayload, headers, 20000);
        return res.status(200).json({ step: 'anomaly', result: anomalyResult, nextStep: 'performance' });

      case 'performance':
        const performancePayload = {
          campaignId,
          metaCampaignId,
          userId,
          startDate,
          endDate
        };
        const performanceResult = await invokeSupabaseFunction('get-performance-analysis', performancePayload, headers, 20000);
        return res.status(200).json({ step: 'performance', result: performanceResult, nextStep: 'synthesize' });

      case 'synthesize':
        // This step requires the results from previous steps
        const { trendAnalysis, anomalyAnalysis, performanceAnalysis } = req.body;
        
        const synthesizePayload = {
          userId,
          campaignId,
          accountId: dbAdAccountId || 'N/A',
          startDate,
          endDate,
          trendAnalysisText: trendAnalysis?.analysis || "No trend analysis available.",
          anomalyAnalysisText: anomalyAnalysis?.analysis || "No anomaly analysis available.",
          performanceAnalysisText: performanceAnalysis?.analysis || "No performance analysis available."
        };
        
        const synthesizeResult = await invokeSupabaseFunction('get-synthesized-report', synthesizePayload, headers, 20000);
        return res.status(200).json({ step: 'synthesize', result: synthesizeResult, nextStep: 'complete' });

      default:
        return res.status(400).json({ error: 'Invalid step' });
    }

  } catch (error) {
    console.error(`[API:async] Error in step ${step}:`, error);
    return res.status(500).json({ 
      error: `Failed at step: ${step}`, 
      details: error.message,
      step: step
    });
  }
} 