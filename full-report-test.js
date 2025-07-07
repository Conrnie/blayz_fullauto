// Placeholder for database pool/client setup
// const pool = require('./db-config'); // Assuming you have a db config file

/**
 * Analyzes trends for all active adsets within a specific campaign.
 * @param {string} campaignId - The Meta Campaign ID to analyze adsets for.
 * @param {object} pool - The database connection pool.
 * @returns {Promise<Array<object>>} - A promise that resolves to an array of trend results for each active adset.
 */
async function getAdsetTrendsForCampaign(campaignId, pool) {
  console.log(`Fetching active adsets for campaign: ${campaignId}`);
  const activeAdsetsResult = await pool.query(
    "SELECT ad_set_id, name FROM ad_sets WHERE campaign_id = $1 AND status = 'ACTIVE'", 
    [campaignId]
  );

  const activeAdsets = activeAdsetsResult.rows;
  console.log(`Found ${activeAdsets.length} active adsets.`);

  const allTrendResults = [];

  for (const adset of activeAdsets) {
    const adsetId = adset.ad_set_id;
    const adsetName = adset.name;
    console.log(`Analyzing trends for Adset ID: ${adsetId} (Name: ${adsetName})...`);
    try {
      const { rows: trendRows } = await pool.query(
        'SELECT * FROM analyze_adset_trends($1, $2)', 
        [adsetId, 'adset'] // Pass Adset ID and level 'adset'
      );
      console.log(` -> Found ${trendRows.length} trend records for Adset ID: ${adsetId}`);
      allTrendResults.push({ 
        adsetId: adsetId, 
        adsetName: adsetName,
        trends: trendRows 
      });

      // Fetch trend analysis data for the adset
      const { data: trendsData, error: trendsError } = await supabase
        .rpc('analyze_adset_trends', {
          p_adset_id: adsetId, // Use the adsetId variable
          p_level: 'adset'
        })
        .single(); // Assuming the function returns a single JSON object

      if (trendsError) {
        console.error('Error fetching adset trends data:', trendsError);
        return;
      }

      console.log('Adset Trends Data:', trendsData);

      // Fetch Adset and Campaign context data
      const { data: contextData, error: contextError } = await supabase
        .rpc('get_campaign_and_adset_data', {
          p_adset_id: adsetId // Use the adsetId variable
        })
        .single(); // Assuming the function returns a single JSON object

      if (contextError) {
        console.error('Error fetching context data:', contextError);
        return;
      }

      console.log('Context Data (Campaign & Adset):', contextData);

      // Prepare data for AI analysis (Combine trendsData and contextData)
      const aiPayload = {
        adsetId: adsetId,
        adsetName: adsetName,
        trends: trendRows,
        trendsData: trendsData,
        contextData: contextData
      };

      // Next steps: Fetch Campaign Info, call AI, etc. based on campaignTrends

    } catch (error) {
      console.error(`Error analyzing trends for Adset ID ${adsetId}:`, error);
      // Optionally add error information to results or handle differently
      allTrendResults.push({ 
        adsetId: adsetId, 
        adsetName: adsetName,
        error: error.message 
      });
    }
  }

  console.log('Finished analyzing trends for all active adsets.');
  return allTrendResults;
}

// --- Example Usage ---
async function runAnalysis() {
    try {
        console.log('Starting AI trend analysis...');
        const campaigns = await fetchCampaigns();
        if (!campaigns || campaigns.length === 0) {
            console.log('No campaigns available for analysis.');
            return;
        }

        const analysisResults = [];
        for (const campaign of campaigns) {
            const { id, name, startDate, endDate, budget, impressions, clicks, conversions } = campaign;
            const campaignData = {
                id,
                name,
                startDate,
                endDate,
                budget,
                impressions,
                clicks,
                conversions
            };

            console.log(`Sending data for campaign: ${name} to AI for analysis...`);
            
            const fetchUrl = 'https://llm.chutes.ai/v1/chat/completions';
            const fetchOptions = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer cpk_cabcc80868b24da6a3d3b2ad1e451577.e50cfab0bef253288ae966000710bc6c.Uu0gbQ72YAhKQn7E1CD9YH4NVgwtLIS9'
                },
                body: JSON.stringify({
                    model: 'deepseek-ai/DeepSeek-V3-0324',
                    messages: [{
                        role: 'user',
                        content: `Analyze the following campaign data for trends and anomalies: ${JSON.stringify(campaignData)}`
                    }],
                    stream: false,
                    max_tokens: 1024,
                    temperature: 0.7
                }),
            };

            console.log('--- Fetch Request Details ---');
            console.log('URL:', fetchUrl);
            console.log('Options:', JSON.stringify(fetchOptions, null, 2)); // Pretty print options
            console.log('---------------------------');

            const response = await fetch(fetchUrl, fetchOptions);

            // Log the response status
            console.log(`Response Status: ${response.status} ${response.statusText}`);

            // Log the full response for debugging
            const responseText = await response.text();
            console.log(`Raw response for campaign ${name}:`, responseText);

            // Check if response is valid JSON before parsing
            try {
                const analysis = JSON.parse(responseText);
                if (analysis.choices && analysis.choices[0].message && analysis.choices[0].message.content) {
                    analysisResults.push({
                        campaign: name,
                        analysis: analysis.choices[0].message.content
                    });
                    console.log(`Received analysis for campaign: ${name}`);
                } else {
                    console.error(`Invalid response format for campaign: ${name}`, analysis);
                }
            } catch (parseError) {
                console.error(`Error parsing JSON response for campaign: ${name}`, parseError);
            }
        }

        console.log('AI trend analysis completed.');
        console.log('Analysis Results:', analysisResults);
    } catch (error) {
        console.error('Error in runAnalysis:', error);
    }
}

// runAnalysis(); // Uncomment to run the analysis 