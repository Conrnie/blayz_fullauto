import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseServiceClient() {
  if (!supabaseServiceKey) {
    console.warn('Service role key not found, falling back to anon key');
    return createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { campaignId, userId } = req.body;

    if (!campaignId || !userId) {
      return res.status(400).json({ error: 'Campaign ID and User ID are required' });
    }

    const supabase = getSupabaseServiceClient();

    // Get the most recent report for this campaign and user
    const { data: reportData, error: reportError } = await supabase
      .from('campaign_reports')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (reportError) {
      console.error('Error fetching campaign report:', reportError);
      return res.status(404).json({ error: 'No recent campaign report found' });
    }

    if (!reportData) {
      return res.status(404).json({ error: 'No campaign report found' });
    }

    // Extract the AI insights from the report
    const aiInsights = reportData.ai_insights;
    
    if (!aiInsights) {
      return res.status(404).json({ error: 'No AI insights found in the report' });
    }

    // Format the response for the chat interface
    let formattedResponse = `## Campaign Analysis Report\n\n`;
    
    if (aiInsights.executive_summary) {
      formattedResponse += `**Executive Summary:**\n${aiInsights.executive_summary}\n\n`;
    }
    
    if (aiInsights.performance_overview) {
      formattedResponse += `**Performance Overview:**\n${aiInsights.performance_overview}\n\n`;
    }
    
    // Add segment analysis if available
    if (aiInsights.segment_analysis) {
      formattedResponse += `**Segment Analysis:**\n`;
      
      if (aiInsights.segment_analysis.demographics) {
        formattedResponse += `• **Demographics:** ${aiInsights.segment_analysis.demographics}\n`;
      }
      
      if (aiInsights.segment_analysis.devices) {
        formattedResponse += `• **Devices:** ${aiInsights.segment_analysis.devices}\n`;
      }
      
      if (aiInsights.segment_analysis.regions) {
        formattedResponse += `• **Regions:** ${aiInsights.segment_analysis.regions}\n`;
      }
      
      if (aiInsights.segment_analysis.times) {
        formattedResponse += `• **Times:** ${aiInsights.segment_analysis.times}\n`;
      }
      
      formattedResponse += `\n`;
    }
    
    // Add actionables if available
    if (aiInsights.actionables && aiInsights.actionables.length > 0) {
      formattedResponse += `**Key Recommendations:**\n`;
      aiInsights.actionables.forEach((action, index) => {
        formattedResponse += `${index + 1}. **${action.target}:** ${action.action}`;
        if (action.expected_impact) {
          formattedResponse += ` (${action.expected_impact} impact)`;
        }
        if (action.justification) {
          formattedResponse += `\n   *Reason:* ${action.justification}`;
        }
        formattedResponse += `\n\n`;
      });
    }
    
    // Add report metadata
    const reportDate = new Date(reportData.created_at).toLocaleDateString();
    formattedResponse += `\n---\n*Report generated on ${reportDate}*`;

    return res.status(200).json({
      success: true,
      analysis: formattedResponse,
      reportData: aiInsights,
      reportDate: reportData.created_at
    });

  } catch (error) {
    console.error('Error in get-campaign-report:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}