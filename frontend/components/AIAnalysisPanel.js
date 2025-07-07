import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { fetchWithAuth } from '../lib/apiClient.js';

export default function AIAnalysisPanel() {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [rawData, setRawData] = useState(null);
  const [showRawData, setShowRawData] = useState(false);
  const [responseDetails, setResponseDetails] = useState(null);
  const [showResponseDetails, setShowResponseDetails] = useState(false);
  const [rawResponse, setRawResponse] = useState(null);
  const [showRawResponse, setShowRawResponse] = useState(false);
  const [isMockResponse, setIsMockResponse] = useState(false);
  const [mockReason, setMockReason] = useState(null);
  const [aiInputData, setAiInputData] = useState(null);
  const [showAiInputData, setShowAiInputData] = useState(false);
  const [rawCampaignData, setRawCampaignData] = useState(null);
  const [showRawCampaignData, setShowRawCampaignData] = useState(false);
  const [showPrompts, setShowPrompts] = useState(false);
  const [prompts, setPrompts] = useState(null);

  const startAIAnalysis = async () => {
    console.log('Starting AI analysis request');
    setLoading(true);
    setError(null);
    setAnalysis(null);
    setResponseDetails(null);
    setRawResponse(null);
    setIsMockResponse(false);
    setMockReason(null);
    setAiInputData(null);
    setRawCampaignData(null);
    setPrompts(null);
    
    try {
      // First, fetch the data that will be sent to the AI
      console.log('Fetching campaign data for AI analysis with auth...');
      const campaignData = await fetchWithAuth('/api/analyze-campaign', {
        method: 'POST',
      });
      
      console.log('Raw campaign data from fetchWithAuth:', campaignData);
      setRawCampaignData(campaignData);
      
      // Transform the data into the AI input format
      const adAnalysis = Array.isArray(campaignData.ad_analysis) ? campaignData.ad_analysis : 
                        Array.isArray(campaignData) ? campaignData : [];
      
      console.log('Extracted ad analysis array:', adAnalysis);
      
      const transformedData = {
        campaign_overview: {
          total_spend: adAnalysis.reduce((sum, ad) => sum + (ad.overall_metrics?.spend || 0), 0),
          total_impressions: adAnalysis.reduce((sum, ad) => sum + (ad.overall_metrics?.impressions || 0), 0),
          total_clicks: adAnalysis.reduce((sum, ad) => sum + (ad.overall_metrics?.clicks || 0), 0),
          total_conversions: adAnalysis.reduce((sum, ad) => sum + (ad.overall_metrics?.results || 0), 0),
          ctr: adAnalysis.length > 0 ? adAnalysis.reduce((sum, ad) => sum + (ad.overall_metrics?.ctr || 0), 0) / adAnalysis.length : 0,
          cpc: adAnalysis.length > 0 ? adAnalysis.reduce((sum, ad) => sum + (ad.overall_metrics?.cpc || 0), 0) / adAnalysis.length : 0,
          cpa: adAnalysis.length > 0 ? adAnalysis.reduce((sum, ad) => sum + (ad.overall_metrics?.cpa || 0), 0) / adAnalysis.length : 0,
          roas: adAnalysis.length > 0 ? adAnalysis.reduce((sum, ad) => sum + (ad.overall_metrics?.roas || 0), 0) / adAnalysis.length : 0
        },
        ad_analysis: adAnalysis
      };
      
      console.log('Transformed data:', transformedData);
      
      // Save the input data for display
      setAiInputData(transformedData);
      
      // Save the prompts that will be sent to Deepseek
      const systemPrompt = `You are an expert Meta Ads performance analyst, specializing in interpreting campaign data to provide actionable optimization insights. You will receive JSON data detailing ad campaign performance, structured as follows:

- An array of ad objects.
- Each ad object contains:
    - \`ad_id\`: The identifier for the ad.
    - \`overall_metrics\`: The aggregate performance metrics for the entire ad.
    - \`overall_z_scores_vs_campaign_avg\`: Z-scores comparing this ad's overall metrics to the average of all other analyzed ads in the campaign.
    - \`demographic_segments\`: An array of objects, each representing a specific Age/Gender segment *within that ad*.
    - \`device_segments\`: An array of objects, each representing a specific Device/Platform/Placement segment *within that ad*.
- Each segment object (within \`demographic_segments\` and \`device_segments\`) contains:
    - \`segment_type\`: 'demographic' or 'device/platform'.
    - \`segment_detail\`: Specific identifiers (e.g., age, gender, device, platform, placement).
    - \`metrics\`: Performance metrics for that specific segment within that ad (impressions, spend, results, ctr, cpc, cpa, roas).
    - \`z_scores_vs_ad_avg\`: Z-scores comparing this segment's metrics to the average of *all other segments of the same type within the same ad*.
    - \`ad_spend_percentage\`: The percentage of the ad's total spend consumed by this segment.`;

      const userPrompt = `Analyze the attached Facebook Ads campaign data JSON according to the expert analytical principles outlined in the system prompt. The JSON contains an array of ads, each with overall performance/Z-scores and detailed \`demographic_segments\` / \`device_segments\` including metrics, \`z_scores_vs_ad_avg\`, and \`ad_spend_percentage\`.

Generate a detailed, data-driven report with the following structure:

1.  **SUMMARY:**
    *   Briefly summarize the overall state of the analyzed ads based on \`overall_metrics\` (total spend, results, overall ROAS/CPA if meaningful) and \`overall_z_scores_vs_campaign_avg\`.
    *   Identify any ads that are clear outliers (positive or negative) compared to the campaign average.
    *   Note any ads with significant spend but very poor results, or vice-versa.

2.  **KEY INSIGHTS (Per Ad or Thematic):**
    *   Identify the top 3-5 most significant findings across all ads. For *each* insight:
        *   Specify the \`ad_id\` and the relevant segment details (from \`demographic_segments\` or \`device_segments\`).
        *   Reference the key metric(s) and the specific \`z_scores_vs_ad_avg\` that support the finding.
        *   **Crucially, state the segment's \`ad_spend_percentage\` and assess the data volume (impressions, spend, results). Explicitly mention if the finding is based on low volume.**
        *   Clearly state if this represents a significant opportunity (positive outlier) or a significant problem (negative outlier).

3.  **RECOMMENDATIONS:**
    *   Provide the top 5 *most impactful and data-backed* actionable recommendations based *directly* on the Key Insights.
    *   Prioritize recommendations addressing segments with high \`ad_spend_percentage\` and significant Z-score deviations (positive or negative).
    *   Recommendations should be specific (e.g., "For Ad X, test excluding 'Device Y / Placement Z'...", "Consider shifting budget within Ad A towards 'Demographic B'..." ).
    *   Acknowledge confidence levels - state if a recommendation is based on strong vs. weak (low volume) evidence.

4.  **BUDGET ALLOCATION:**
    *   Based on the analysis (especially ROAS/CPA Z-scores and spend percentage), suggest specific budget shifts.
    *   Should budget move *between* ads (e.g., from overall poor performers to overall strong performers)? Justify using \`overall_metrics\` and \`overall_z_scores_vs_campaign_avg\`.
    *   Should budget shift *within* an ad (e.g., away from negative outlier segments towards positive ones)? Justify using segment \`z_scores_vs_ad_avg\` and \`ad_spend_percentage\`.
    *   Advise on the *magnitude* of shifts (e.g., small test shift vs. significant reallocation) based on confidence in the data.

5.  **TARGETING ADJUSTMENTS:**
    *   Recommend specific changes to audience targeting (demographics, device/platform/placement) based on the \`*_segments\` data.
    *   Suggest concrete actions:
        *   **Exclusions:** Identify specific segments (Demographic or Device/Platform/Placement) that are strong candidates for exclusion based on consistently poor performance (negative Z-scores, high spend share).
        *   **Refinement/Focus:** Identify segments showing strong positive performance (positive Z-scores). Suggest ways to focus budget here (e.g., dedicated focus, potentially adjusting bids if possible). Explicitly state if this is based on low volume and needs validation.
        *   **Testing:** Suggest specific tests for problematic segments (e.g., test new creatives for a high-CPC segment before excluding).

Campaign Data: ${JSON.stringify(transformedData, null, 2)}`;

      setPrompts({
        system: systemPrompt,
        user: userPrompt
      });

      console.log('Sending request to /api/ai-campaign-analysis with auth...');
      const responseData = await fetchWithAuth('/api/ai-campaign-analysis', {
        method: 'POST',
        body: JSON.stringify({
          ...transformedData,
          model: 'google/gemini-2.5-pro-exp-03-25:free'
        })
      });
      
      console.log('Response data from fetchWithAuth for AI analysis:', responseData);
      setRawResponse(JSON.stringify(responseData));
      setResponseDetails(responseData);
      
      if (responseData.error && responseData.status === 429 && responseData.user_friendly) {
          setError('AI service quota exceeded. Please try again later.');
          return;
        }
        
      if (!responseData.analysis) {
        console.error('Missing analysis in response:', responseData);
        throw new Error('No analysis returned from the AI service');
      }
      
      setAnalysis(responseData.analysis);
      
      // Set raw data if available
      if (responseData.raw_data) {
        setRawData(responseData.raw_data);
      }
      
      // Check for mock response (both legacy and new format)
      setIsMockResponse(responseData.is_mock || responseData.source === 'mock');
      if (responseData.mock_reason) {
        setMockReason(responseData.mock_reason);
        console.log('Using mock response due to:', responseData.mock_reason);
      }
      
      console.log('Successfully processed AI analysis');
      
      // Log source information
      if (responseData.source) {
        console.log('Analysis source:', responseData.source);
      }
      if (responseData.model) {
        console.log('AI model used:', responseData.model);
      }
    } catch (error) {
      console.error('AI Analysis error:', error);
      setError(error.message || 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to format the analysis into sections
  const formatAnalysis = (text) => {
    if (!text) return null;
    
    // Replace section headers with markdown headers
    const formattedText = text
      .replace(/SUMMARY:/g, '## SUMMARY:')
      .replace(/KEY INSIGHTS:/g, '## KEY INSIGHTS:')
      .replace(/RECOMMENDATIONS:/g, '## RECOMMENDATIONS:')
      .replace(/BUDGET ALLOCATION:/g, '## BUDGET ALLOCATION:')
      .replace(/TARGETING ADJUSTMENTS:/g, '## TARGETING ADJUSTMENTS:');
    
    return formattedText;
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">AI Campaign Analysis</h2>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          onClick={startAIAnalysis}
          disabled={loading}
        >
          {loading ? 'Analyzing...' : 'Generate AI Analysis'}
        </button>
      </div>
      
      {loading && (
        <div className="flex flex-col items-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">Analyzing campaign data with AI...</p>
          <p className="text-sm text-gray-500 mt-2">This may take up to 30 seconds</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Error</p>
          <p>{error}</p>
          
          {/* Debug information for errors */}
          <div className="mt-3 space-y-2">
            {responseDetails && (
              <div>
                <button 
                  onClick={() => setShowResponseDetails(!showResponseDetails)}
                  className="text-xs text-red-800 hover:text-red-900 underline"
                >
                  {showResponseDetails ? 'Hide Response Details' : 'Show Response Details'}
                </button>
                
                {showResponseDetails && (
                  <div className="mt-2 p-2 bg-red-100 rounded text-xs overflow-auto max-h-40">
                    <pre>{JSON.stringify(responseDetails, null, 2)}</pre>
                  </div>
                )}
              </div>
            )}
            
            {rawResponse && (
              <div>
                <button 
                  onClick={() => setShowRawResponse(!showRawResponse)}
                  className="text-xs text-red-800 hover:text-red-900 underline ml-4"
                >
                  {showRawResponse ? 'Hide Raw Response' : 'Show Raw Response'}
                </button>
                
                {showRawResponse && (
                  <div className="mt-2 p-2 bg-red-100 rounded text-xs overflow-auto max-h-40">
                    <pre>{rawResponse}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && analysis && (
        <div className="mt-4">
          {isMockResponse && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded mb-4">
              <p className="font-bold">Using Mock Analysis</p>
              <p>
                {mockReason 
                  ? `Reason: ${mockReason}`
                  : 'Due to AI service limitations, this is an automatically generated analysis based on campaign data patterns.'
                }
              </p>
              <p className="text-sm mt-1">For a more detailed analysis, try again later.</p>
            </div>
          )}
          
          <div className="prose max-w-none">
            <ReactMarkdown components={{
              p: ({node, ...props}) => <p {...props} />,
              h1: ({node, ...props}) => <h1 {...props} />,
              h2: ({node, ...props}) => <h2 {...props} />,
              h3: ({node, ...props}) => <h3 {...props} />,
              ul: ({node, ...props}) => <ul {...props} />,
              ol: ({node, ...props}) => <ol {...props} />,
              li: ({node, ...props}) => <li {...props} />
            }}>
              {formatAnalysis(analysis)}
            </ReactMarkdown>
          </div>
          
          <div className="mt-6 flex justify-end space-x-4">
            {rawCampaignData && (
              <button 
                onClick={() => setShowRawCampaignData(!showRawCampaignData)}
                className="text-sm text-green-500 hover:text-green-700 underline"
              >
                {showRawCampaignData ? 'Hide Raw Campaign Data' : 'Show Raw Campaign Data'}
              </button>
            )}
            
            {aiInputData && (
              <button 
                onClick={() => setShowAiInputData(!showAiInputData)}
                className="text-sm text-blue-500 hover:text-blue-700 underline"
              >
                {showAiInputData ? 'Hide AI Input Data' : 'Show AI Input Data'}
              </button>
            )}
            
            {rawData && (
              <button 
                onClick={() => setShowRawData(!showRawData)}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                {showRawData ? 'Hide Raw Data' : 'Show Raw Data'}
              </button>
            )}
            
            {responseDetails && !rawData && (
              <button 
                onClick={() => setShowResponseDetails(!showResponseDetails)}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                {showResponseDetails ? 'Hide Response Details' : 'Show Response Details'}
              </button>
            )}
            
            {prompts && (
              <button 
                onClick={() => setShowPrompts(!showPrompts)}
                className="text-sm text-purple-500 hover:text-purple-700 underline"
              >
                {showPrompts ? 'Hide AI Prompts' : 'Show AI Prompts'}
              </button>
            )}
          </div>
          
          {showRawCampaignData && rawCampaignData && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">Raw Campaign Data (Before Transformation)</h3>
              <div className="bg-gray-50 p-4 rounded overflow-auto max-h-96">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                  {JSON.stringify(rawCampaignData, null, 2)}
                </pre>
              </div>
            </div>
          )}
          
          {showAiInputData && aiInputData && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">AI Input Data (After Transformation)</h3>
              <div className="bg-gray-50 p-4 rounded overflow-auto max-h-96">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                  {JSON.stringify(aiInputData, null, 2)}
                </pre>
              </div>
            </div>
          )}
          
          {showRawData && rawData && (
            <div className="mt-4 bg-gray-50 p-4 rounded overflow-auto max-h-96">
              <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                {JSON.stringify(rawData, null, 2)}
              </pre>
            </div>
          )}
          
          {showResponseDetails && responseDetails && (
            <div className="mt-4 bg-gray-50 p-4 rounded overflow-auto max-h-96">
              <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                {JSON.stringify(responseDetails, null, 2)}
              </pre>
            </div>
          )}
          
          {showPrompts && prompts && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">AI Prompts</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">System Prompt:</h4>
                  <div className="bg-gray-50 p-4 rounded overflow-auto max-h-96">
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                      {prompts.system}
                    </pre>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">User Prompt:</h4>
                  <div className="bg-gray-50 p-4 rounded overflow-auto max-h-96">
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                      {prompts.user}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 