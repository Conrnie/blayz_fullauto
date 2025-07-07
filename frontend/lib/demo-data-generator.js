import supabase from './supabase';

// Default options for demo data generation
const DEFAULT_OPTIONS = {
  numberOfCampaigns: 3,
  adSetsPerCampaign: 2,
  adsPerAdSet: 3,
  daysToGenerate: 30,
  includeSpendsOnly: false,
  includeAdSetInsights: true,
  includeAdInsights: true,
  startDate: null,
  endDate: null,
};

// Create admin supabase client to bypass RLS for demo data
const createAdminClient = () => {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase service role credentials for admin operations');
      return null;
    }
    
    return createClient(supabaseUrl, supabaseServiceKey);
  } catch (error) {
    console.error('Error creating admin Supabase client:', error);
    return null;
  }
};

// Constants for generating realistic random data
const MEDIA_TYPES = ['IMAGE', 'VIDEO', 'CAROUSEL', 'COLLECTION'];
const PLATFORMS = ['FACEBOOK', 'INSTAGRAM', 'AUDIENCE_NETWORK', 'MESSENGER'];
const PLACEMENTS = ['FEED', 'STORIES', 'REELS', 'RIGHT_COLUMN', 'INSTANT_ARTICLE', 'MARKETPLACE'];
const DEVICES = ['DESKTOP', 'MOBILE', 'TABLET'];
const COUNTRIES = ['US', 'UK', 'CA', 'AU', 'DE', 'FR', 'JP', 'BR', 'IN', 'IT'];
const REGIONS = ['NORTH', 'SOUTH', 'EAST', 'WEST', 'CENTRAL', 'NORTHEAST', 'NORTHWEST', 'SOUTHEAST', 'SOUTHWEST'];
const AGE_GROUPS = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
const GENDERS = ['MALE', 'FEMALE', 'UNKNOWN'];
const DAYS_OF_WEEK = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const TIME_OF_DAY = ['MORNING', 'AFTERNOON', 'EVENING', 'NIGHT'];
const RANKINGS = ['ABOVE_AVERAGE', 'AVERAGE', 'BELOW_AVERAGE', 'UNKNOWN'];
const AUDIENCE_SEGMENTS = ['LOOKALIKE', 'INTEREST', 'DEMOGRAPHIC', 'REMARKETING', 'BROAD'];

// Helper function to generate a random number within a range
const randomNumber = (min, max, decimals = 0) => {
  const num = Math.random() * (max - min) + min;
  return decimals === 0 ? Math.floor(num) : parseFloat(num.toFixed(decimals));
};

// Helper function to select a random item from an array
const randomItem = (array) => {
  return array[Math.floor(Math.random() * array.length)];
};

// Helper function to generate random IDs
const generateId = (prefix) => {
  return `${prefix}_${Math.random().toString(36).substring(2, 10)}`;
};

// Helper function to generate a random date within the last 90 days
const randomDate = (daysAgo = 90) => {
  const now = new Date();
  const pastDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  const randomTimestamp = pastDate.getTime() + Math.random() * (now.getTime() - pastDate.getTime());
  return new Date(randomTimestamp).toISOString().split('T')[0]; // YYYY-MM-DD format
};

// Helper function to generate realistic metrics for a given media type
const generateMetrics = (mediaType) => {
  // Base metrics that all ad types have
  const impressions = randomNumber(1000, 50000);
  const reach = randomNumber(impressions * 0.5, impressions * 0.9); // Reach is always less than impressions
  const frequency = parseFloat((impressions / reach).toFixed(2));
  const clicks = randomNumber(10, Math.floor(impressions * 0.1));
  const ctr = parseFloat((clicks / impressions * 100).toFixed(2));
  const spend = randomNumber(50, 5000, 2);
  const cpm = parseFloat((spend / impressions * 1000).toFixed(2));
  const cpc = parseFloat((spend / clicks).toFixed(2));
  const results = randomNumber(1, clicks * 0.2);
  const cpa = parseFloat((spend / (results || 1)).toFixed(2));
  // Note: database doesn't have a 'conversions' column
  // Conversion-related metrics that do exist in the database
  const conversion_rate = parseFloat((results / clicks * 100).toFixed(2));
  const roas = randomNumber(0, 10, 2);
  const value_per_conversion = parseFloat((cpa * roas).toFixed(2));
  
  // Common engagement metrics
  const postReactions = mediaType !== 'IMAGE' ? randomNumber(0, impressions * 0.05) : randomNumber(0, impressions * 0.03);
  const postComments = randomNumber(0, postReactions * 0.1);
  const postShares = randomNumber(0, postComments * 0.5);
  
  // Create base metrics object
  const metrics = {
    impressions,
    reach,
    frequency,
    clicks,
    ctr,
    spend,
    cpm,
    cpc,
    results,
    cpa,
    // Removed: conversions,
    conversion_rate,
    roas,
    value_per_conversion,
    post_reactions: postReactions,
    post_comments: postComments,
    post_shares: postShares,
    quality_ranking: randomItem(RANKINGS),
    engagement_rate_ranking: randomItem(RANKINGS),
    conversion_rate_ranking: randomItem(RANKINGS),
  };
  
  // Add media-specific metrics
  if (mediaType === 'VIDEO') {
    const videoViews = randomNumber(impressions * 0.3, impressions * 0.8);
    const videoCompletionRate = randomNumber(10, 60, 2);
    const averageWatchTime = randomNumber(3, 30);
    
    metrics.video_views = videoViews;
    metrics.video_completion_rate = videoCompletionRate;
    metrics.average_watch_time = averageWatchTime;
  } else {
    // Set video metrics to null or 0 for non-video content
    metrics.video_views = 0;
    metrics.video_completion_rate = 0;
    metrics.average_watch_time = 0;
  }
  
  return metrics;
};

// Generate a single ad insight record
const generateAdInsight = ({ adId, adSetId, campaignId, date = null }) => {
  const mediaType = randomItem(MEDIA_TYPES);
  const insightDate = date || randomDate();
  
  return {
    ad_id: adId,
    ad_set_id: adSetId,
    campaign_id: campaignId,
    date: insightDate,
    time_of_day: randomItem(TIME_OF_DAY),
    day_of_week: randomItem(DAYS_OF_WEEK),
    media_type: mediaType,
    audiece_segment: randomItem(AUDIENCE_SEGMENTS), // Note: typo in table column name
    breakdown_age: randomItem(AGE_GROUPS),
    breakdown_gender: randomItem(GENDERS),
    breakdown_country: randomItem(COUNTRIES),
    breakdown_region: randomItem(REGIONS),
    breakdown_placement: randomItem(PLACEMENTS),
    breakdown_platform: randomItem(PLATFORMS),
    breakdown_impression_device: randomItem(DEVICES),
    breakdown_platform_and_device: `${randomItem(PLATFORMS)}_${randomItem(DEVICES)}`,
    conversion_device: randomItem(DEVICES),
    created_at: new Date().toISOString(),
    ...generateMetrics(mediaType)
  };
};

// Generate a single ad set insight record
const generateAdSetInsight = ({ adSetId, campaignId, date = null }) => {
  const insightDate = date || randomDate();
  const mediaType = randomItem(MEDIA_TYPES);
  
  return {
    ad_set_id: adSetId,
    campaign_id: campaignId,
    date: insightDate,
    time_of_day: randomItem(TIME_OF_DAY),
    day_of_week: randomItem(DAYS_OF_WEEK),
    media_type: mediaType,
    audiece_segment: randomItem(AUDIENCE_SEGMENTS), // Note: typo in table column name
    breakdown_age: randomItem(AGE_GROUPS),
    breakdown_gender: randomItem(GENDERS),
    breakdown_country: randomItem(COUNTRIES),
    breakdown_region: randomItem(REGIONS),
    breakdown_placement: randomItem(PLACEMENTS),
    breakdown_platform: randomItem(PLATFORMS),
    breakdown_impression_device: randomItem(DEVICES),
    breakdown_platform_and_device: `${randomItem(PLATFORMS)}_${randomItem(DEVICES)}`,
    conversion_device: randomItem(DEVICES),
    created_at: new Date().toISOString(),
    ...generateMetrics(mediaType)
  };
};

/**
 * Generates a single insight record
 */
function generateInsight(
  id,
  name,
  campaignId,
  dateStr,
  impressionsRange,
  clicksRange,
  conversionsRange,
  revenueRange,
  spendOnly = false,
  adSetId = null
) {
  // Base metrics
  const impressions = randomInRange(...impressionsRange);
  const clicks = randomInRange(...clicksRange, impressions);
  // Database doesn't have a 'conversions' column, use results instead
  const results = randomInRange(...conversionsRange, clicks);
  
  // Calculate metrics based on these base values
  const ctr = clicks / impressions;
  const cpc = randomInRange(0.5, 2);
  const spend = clicks * cpc;
  
  // Revenue is only generated if results exist and we're not in spend-only mode
  const revenue = spendOnly ? 0 : results * randomInRange(...revenueRange);
  
  // Additional metrics
  const costPerConversion = results > 0 ? spend / results : 0;
  const roi = revenue > 0 ? (revenue - spend) / spend : -1;
  
  return {
    id: `${id}_${dateStr}`,
    entity_id: id,
    entity_name: name,
    campaign_id: campaignId,
    date: dateStr,
    
    // Core metrics
    impressions,
    clicks,
    ctr,
    spend,
    cpc,
    results, // Use results instead of conversions
    cost_per_conversion: costPerConversion,
    revenue,
    roi,
    
    // If this is an ad insight, include the ad set ID
    ...(adSetId && { ad_set_id: adSetId }),
    
    // Add some randomness to the data for realism
    frequency: randomInRange(1, 3, 1, 2),
    reach: Math.floor(impressions / randomInRange(1, 3, 1, 2)),
    
    // Additional metrics for more complete data
    link_clicks: Math.floor(clicks * randomInRange(0.7, 0.95, 1, 2)),
    unique_clicks: Math.floor(clicks * randomInRange(0.8, 0.99, 1, 2)),
    
    // Timestamp for sorting and filtering
    timestamp: new Date(dateStr).toISOString()
  };
}

/**
 * Generates a random number between min and max
 * @param {number} min Minimum value
 * @param {number} max Maximum value
 * @param {number|null} cap Optional maximum value to cap the result
 * @param {number} decimals Number of decimal places (default 2)
 * @returns {number} Random number
 */
function randomInRange(min, max, cap = null, decimals = 2) {
  const factor = Math.pow(10, decimals);
  let value = Math.random() * (max - min) + min;
  
  // Cap the value if a cap is provided
  if (cap !== null && value > cap) {
    value = Math.min(value, cap);
  }
  
  return Math.floor(value * factor) / factor;
}

/**
 * Generate demo data including campaigns, ad sets, ads and insights
 * @param {Object} options - Configuration options
 * @returns {Object} Generated data
 */
function generateDemoData(options) {
  console.log('[DEMO_GENERATOR] Generating demo data with options:', options);
  
  // Generate dates for the insights
  const today = new Date();
  let endDate = options.endDate ? new Date(options.endDate) : new Date(today);
  endDate.setHours(0, 0, 0, 0);
  
  let startDate = options.startDate ? new Date(options.startDate) : new Date(endDate);
  if (!options.startDate) {
    startDate.setDate(startDate.getDate() - options.daysToGenerate + 1);
  }
  startDate.setHours(0, 0, 0, 0);
  
  // List of dates for which to generate data
  const dates = [];
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  console.log(`[DEMO_GENERATOR] Generating data for ${dates.length} days from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
  
  // Campaign names
  const campaignNames = ['Summer Sale', 'Product Launch', 'Brand Awareness', 'Retargeting', 'Holiday Special'];
  
  // Generate campaigns, ad sets, and ads
  const campaigns = [];
  const adSets = [];
  const ads = [];
  
  for (let c = 0; c < options.numberOfCampaigns; c++) {
    const campaignId = `demo_campaign_${c + 1}`;
    const campaignName = campaignNames[c % campaignNames.length] + ` ${c + 1}`;
    campaigns.push({ id: campaignId, name: campaignName });
    
    for (let as = 0; as < options.adSetsPerCampaign; as++) {
      const adSetId = `demo_adset_${c + 1}_${as + 1}`;
      const adSetName = `Ad Set ${as + 1} - ${campaignName}`;
      adSets.push({ id: adSetId, name: adSetName, campaignId });
      
      for (let a = 0; a < options.adsPerAdSet; a++) {
        const adId = `demo_ad_${c + 1}_${as + 1}_${a + 1}`;
        const adName = `Ad ${a + 1} - ${adSetName}`;
        ads.push({ id: adId, name: adName, adSetId, campaignId });
      }
    }
  }
  
  console.log(`[DEMO_GENERATOR] Generated ${campaigns.length} campaigns, ${adSets.length} ad sets, and ${ads.length} ads`);
  
  // Generate ad set insights
  const adSetInsights = [];
  if (options.includeAdSetInsights) {
    console.log('[DEMO_GENERATOR] Generating ad set insights...');
    for (const adSet of adSets) {
      for (const date of dates) {
        const dateStr = date.toISOString().split('T')[0];
        adSetInsights.push(
          generateAdSetInsight({
            adSetId: adSet.id,
            campaignId: adSet.campaignId,
            date: dateStr
          })
        );
      }
    }
    console.log(`[DEMO_GENERATOR] Generated ${adSetInsights.length} ad set insights`);
  }
  
  // Generate ad insights
  const adInsights = [];
  if (options.includeAdInsights) {
    console.log('[DEMO_GENERATOR] Generating ad insights...');
    for (const ad of ads) {
      for (const date of dates) {
        const dateStr = date.toISOString().split('T')[0];
        adInsights.push(
          generateAdInsight({
            adId: ad.id,
            adSetId: ad.adSetId,
            campaignId: ad.campaignId,
            date: dateStr
          })
        );
      }
    }
    console.log(`[DEMO_GENERATOR] Generated ${adInsights.length} ad insights`);
  }
  
  return {
    campaigns,
    adSets,
    ads,
    insights: {
      adSetInsights,
      adInsights
    }
  };
}

// Function to generate and insert demo data
export async function generateAndInsertDemoData(options = {}) {
  console.log('[DEMO_GENERATOR] Starting demo data generation with options:', options);
  
  try {
    // Determine the base URL for API requests
    let baseUrl = '';
    
    // In browser environment
    if (typeof window !== 'undefined') {
      baseUrl = window.location.origin;
      console.log('[DEMO_GENERATOR] Running in browser, using origin:', baseUrl);
    } else {
      // In server environment
      baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
      console.log('[DEMO_GENERATOR] Running in server, using base URL:', baseUrl);
    }
    
    // Merge options with defaults
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
    console.log('[DEMO_GENERATOR] Using merged options:', mergedOptions);

    // Step 1: Clear existing demo data
    console.log('[DEMO_GENERATOR] Clearing existing demo data...');
    const clearUrl = `${baseUrl}/api/demo-data/clear`;
    console.log('[DEMO_GENERATOR] Clear URL:', clearUrl);
    
    const clearResponse = await fetch(clearUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!clearResponse.ok) {
      const errorData = await clearResponse.json().catch(() => ({}));
      console.error('[DEMO_GENERATOR] Failed to clear existing demo data:', errorData);
      console.error('[DEMO_GENERATOR] Clear response status:', clearResponse.status);
      console.error('[DEMO_GENERATOR] Clear response text:', await clearResponse.text().catch(() => 'Cannot read response text'));
      throw new Error(`Failed to clear existing demo data: ${errorData.error || clearResponse.statusText}`);
    }
    
    console.log('[DEMO_GENERATOR] Successfully cleared existing demo data');

    // Step 2: Generate demo data
    console.log('[DEMO_GENERATOR] Generating demo ad insights data...');
    const { campaigns, adSets, ads, insights } = generateDemoData(mergedOptions);
    
    console.log(`[DEMO_GENERATOR] Generated ${campaigns.length} campaigns`);
    console.log(`[DEMO_GENERATOR] Generated ${adSets.length} ad sets`);
    console.log(`[DEMO_GENERATOR] Generated ${ads.length} ads`);
    console.log(`[DEMO_GENERATOR] Generated ${insights.adInsights.length} ad insights`);
    console.log(`[DEMO_GENERATOR] Generated ${insights.adSetInsights.length} ad set insights`);

    // Step 3: Insert ad insights data in batches to avoid API limits
    const adInsightsBatches = chunkArray(insights.adInsights, 100);
    console.log(`[DEMO_GENERATOR] Inserting ad insights in ${adInsightsBatches.length} batches...`);
    
    for (const [index, batch] of adInsightsBatches.entries()) {
      console.log(`[DEMO_GENERATOR] Inserting ad insights batch ${index + 1}/${adInsightsBatches.length} (${batch.length} records)...`);
      const insertUrl = `${baseUrl}/api/demo-data/insert`;
      console.log('[DEMO_GENERATOR] Insert URL:', insertUrl);
      
      const insertResponse = await fetch(insertUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          table: 'demo_ad_insights',
          data: batch
        })
      });
      
      if (!insertResponse.ok) {
        const errorData = await insertResponse.json().catch(() => ({}));
        console.error(`[DEMO_GENERATOR] Failed to insert ad insights batch ${index + 1}:`, errorData);
        console.error('[DEMO_GENERATOR] Insert response status:', insertResponse.status);
        console.error('[DEMO_GENERATOR] Insert response text:', await insertResponse.text().catch(() => 'Cannot read response text'));
        throw new Error(`Failed to insert ad insights data: ${errorData.error || insertResponse.statusText}`);
      }
      
      console.log(`[DEMO_GENERATOR] Successfully inserted ad insights batch ${index + 1}`);
    }
    
    // Step 4: Insert ad set insights data in batches
    const adSetInsightsBatches = chunkArray(insights.adSetInsights, 100);
    console.log(`[DEMO_GENERATOR] Inserting ad set insights in ${adSetInsightsBatches.length} batches...`);
    
    for (const [index, batch] of adSetInsightsBatches.entries()) {
      console.log(`[DEMO_GENERATOR] Inserting ad set insights batch ${index + 1}/${adSetInsightsBatches.length} (${batch.length} records)...`);
      const insertUrl = `${baseUrl}/api/demo-data/insert`;
      
      const insertResponse = await fetch(insertUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          table: 'demo_ad_set_insights',
          data: batch
        })
      });
      
      if (!insertResponse.ok) {
        const errorData = await insertResponse.json().catch(() => ({}));
        console.error(`[DEMO_GENERATOR] Failed to insert ad set insights batch ${index + 1}:`, errorData);
        console.error('[DEMO_GENERATOR] Insert response status:', insertResponse.status);
        throw new Error(`Failed to insert ad set insights data: ${errorData.error || insertResponse.statusText}`);
      }
      
      console.log(`[DEMO_GENERATOR] Successfully inserted ad set insights batch ${index + 1}`);
    }
    
    console.log('[DEMO_GENERATOR] Demo data generation completed successfully!');
    
    // Return the generated data summary
    return {
      success: true,
      summary: {
        campaigns: campaigns.length,
        adSets: adSets.length,
        ads: ads.length,
        adInsights: insights.adInsights.length,
        adSetInsights: insights.adSetInsights.length,
        totalDataPoints: insights.adInsights.length + insights.adSetInsights.length,
        startDate: mergedOptions.startDate,
        endDate: mergedOptions.endDate,
        daysGenerated: mergedOptions.daysToGenerate
      }
    };
  } catch (error) {
    console.error('[DEMO_GENERATOR] Error generating demo data:', error);
    console.error('[DEMO_GENERATOR] Error stack:', error.stack);
    console.error('[DEMO_GENERATOR] Error type:', error.name);
    console.error('[DEMO_GENERATOR] Error message:', error.message);
    
    return {
      success: false,
      error: error.message || 'Unknown error occurred',
      errorType: error.name || 'Unknown'
    };
  }
}

// Helper function to split array into chunks
function chunkArray(array, chunkSize) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

// Helper function to generate distribution percentages that sum to 100%
function generateDistribution(count) {
  const distribution = [];
  let remaining = 100;
  
  for (let i = 0; i < count - 1; i++) {
    // Generate a value for this item, but ensure we leave some for remaining items
    const maxAllocation = remaining - (count - i - 1) * 5; // Ensure at least 5% for each remaining
    const minAllocation = 5; // Minimum 5% allocation
    const allocation = Math.floor(Math.random() * (maxAllocation - minAllocation + 1) + minAllocation);
    
    distribution.push(allocation);
    remaining -= allocation;
  }
  
  // Assign the remaining percentage to the last item
  distribution.push(remaining);
  
  // Shuffle the distribution to avoid patterns
  return distribution.sort(() => Math.random() - 0.5);
}

// Apply a percentage to metrics
function applyPercentageToMetrics(sourceMetrics, percentage) {
  const result = {};
  const fraction = percentage / 100;
  
  // Apply percentage to numeric metrics
  for (const [key, value] of Object.entries(sourceMetrics)) {
    if (typeof value === 'number') {
      // For integer metrics, round to whole numbers
      if (Number.isInteger(value)) {
        result[key] = Math.round(value * fraction);
      } else {
        // For metrics with decimals, keep 2 decimal places
        result[key] = parseFloat((value * fraction).toFixed(2));
      }
    } else {
      // Non-numeric values are copied directly
      result[key] = value;
    }
  }
  
  // Recalculate dependent metrics to ensure they're mathematically consistent
  if (result.impressions && result.clicks) {
    result.ctr = parseFloat((result.clicks / result.impressions * 100).toFixed(2));
  }
  
  if (result.spend && result.clicks && result.clicks > 0) {
    result.cpc = parseFloat((result.spend / result.clicks).toFixed(2));
  }
  
  if (result.impressions && result.spend && result.impressions > 0) {
    result.cpm = parseFloat((result.spend / result.impressions * 1000).toFixed(2));
  }
  
  if (result.results && result.spend && result.results > 0) {
    result.cpa = parseFloat((result.spend / result.results).toFixed(2));
  }
  
  return result;
}

/**
 * Generate a simplified test dataset with just 1 campaign, 1 ad set, 3 ads, and only demographic breakdowns
 * @returns {Object} Generated test data
 */
export async function generateTestData() {
  console.log('[DEMO_GENERATOR] Generating test data with 1 campaign, 1 ad set, 3 ads');
  
  try {
    // Determine the base URL for API requests
    let baseUrl = '';
    
    // In browser environment
    if (typeof window !== 'undefined') {
      baseUrl = window.location.origin;
      console.log('[DEMO_GENERATOR] Running in browser, using origin:', baseUrl);
    } else {
      // In server environment
      baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
      console.log('[DEMO_GENERATOR] Running in server, using base URL:', baseUrl);
    }
    
    // Step 1: Clear existing demo data
    console.log('[DEMO_GENERATOR] Clearing existing demo data...');
    const clearUrl = `${baseUrl}/api/demo-data/clear`;
    console.log('[DEMO_GENERATOR] Clear URL:', clearUrl);
    
    const clearResponse = await fetch(clearUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!clearResponse.ok) {
      const errorData = await clearResponse.json().catch(() => ({}));
      console.error('[DEMO_GENERATOR] Failed to clear existing demo data:', errorData);
      console.error('[DEMO_GENERATOR] Clear response status:', clearResponse.status);
      console.error('[DEMO_GENERATOR] Clear response text:', await clearResponse.text().catch(() => 'Cannot read response text'));
      throw new Error(`Failed to clear existing demo data: ${errorData.error || clearResponse.statusText}`);
    }
    
    console.log('[DEMO_GENERATOR] Successfully cleared existing demo data');

    // Step 2: Generate test entities
    // Create campaign
    const campaign = {
      id: 'test_campaign_1',
      name: 'Test Campaign'
    };
    
    // Create ad set
    const adSet = {
      id: 'test_adset_1',
      name: 'Test Ad Set',
      campaignId: campaign.id
    };
    
    // Create ads
    const ads = [
      { id: 'test_ad_1', name: 'Test Ad 1', adSetId: adSet.id, campaignId: campaign.id },
      { id: 'test_ad_2', name: 'Test Ad 2', adSetId: adSet.id, campaignId: campaign.id },
      { id: 'test_ad_3', name: 'Test Ad 3', adSetId: adSet.id, campaignId: campaign.id }
    ];
    
    console.log(`[DEMO_GENERATOR] Generated ${ads.length} ads in 1 ad set in 1 campaign`);

    // Step 3: Generate insights data using the top-down approach
    // Today's date
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    
    // 1. First, generate the ad set metrics (parent metrics)
    console.log('[DEMO_GENERATOR] Generating ad set metrics with logical distribution...');
    const mediaType = randomItem(MEDIA_TYPES);
    const adSetMetrics = generateMetrics(mediaType);
    
    // 2. Then, generate distribution percentages for the ads
    const adDistribution = generateDistribution(ads.length);
    console.log('[DEMO_GENERATOR] Ad distribution percentages:', adDistribution);
    
    // Generate ad insights by distributing ad set metrics
    const adInsights = [];
    
    for (let i = 0; i < ads.length; i++) {
      const ad = ads[i];
      const percentage = adDistribution[i];
      
      // Apply percentage to create consistent ad metrics
      const adMetrics = applyPercentageToMetrics(adSetMetrics, percentage);
      
      // Create main insight record (no breakdown)
      const mainInsight = {
        ad_id: ad.id,
        ad_set_id: ad.adSetId,
        campaign_id: ad.campaignId,
        date: dateStr,
        user_id: generateUUID(),
        ad_account_id: 'test_ad_account_id',
        ...adMetrics,
        created_at: new Date().toISOString()
      };
      
      adInsights.push(mainInsight);
      console.log(`[DEMO_GENERATOR] Generated metrics for ${ad.name} (${percentage}% of ad set metrics)`);
    }
    
    // Use the full ad set metrics for the ad set insight
    const adSetInsight = {
      ad_set_id: adSet.id,
      campaign_id: campaign.id,
      date: dateStr,
      user_id: generateUUID(),
      ad_account_id: 'test_ad_account_id',
      ...adSetMetrics,
      created_at: new Date().toISOString()
    };
    
    console.log(`[DEMO_GENERATOR] Generated main insight records with consistent metrics`);

    // Step 4: Insert ad insights data
    console.log(`[DEMO_GENERATOR] Inserting ${adInsights.length} ad insights...`);
    
    const insertAdResponse = await fetch(`${baseUrl}/api/demo-data/insert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        table: 'demo_ad_insights',
        data: adInsights
      })
    });
    
    if (!insertAdResponse.ok) {
      const errorData = await insertAdResponse.json().catch(() => ({}));
      console.error(`[DEMO_GENERATOR] Failed to insert ad insights:`, errorData);
      throw new Error(`Failed to insert ad insights data: ${errorData.error || insertAdResponse.statusText}`);
    }
    
    // Step 5: Insert ad set insight
    console.log(`[DEMO_GENERATOR] Inserting ad set insight...`);
    
    const insertAdSetResponse = await fetch(`${baseUrl}/api/demo-data/insert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        table: 'demo_ad_set_insights',
        data: [adSetInsight]
      })
    });
    
    if (!insertAdSetResponse.ok) {
      const errorData = await insertAdSetResponse.json().catch(() => ({}));
      console.error(`[DEMO_GENERATOR] Failed to insert ad set insight:`, errorData);
      throw new Error(`Failed to insert ad set insight data: ${errorData.error || insertAdSetResponse.statusText}`);
    }
    
    // Step 6: Generate and insert ad demographic breakdowns
    // For all age and gender combinations
    const ageGroups = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
    const genders = ['MALE', 'FEMALE', 'UNKNOWN'];
    const demographicBreakdowns = [];
    
    // Get inserted ad insights to know their IDs
    console.log('[DEMO_GENERATOR] Fetching inserted ad insights to generate breakdowns...');
    const fetchAdInsightsResponse = await fetch(`${baseUrl}/api/demo-data/get-insights?table=demo_ad_insights`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!fetchAdInsightsResponse.ok) {
      const errorText = await fetchAdInsightsResponse.text();
      console.error('[DEMO_GENERATOR] Failed to fetch ad insights:', errorText);
      throw new Error(`Failed to fetch inserted ad insights: ${errorText}`);
    }
    
    const insertedAdInsights = await fetchAdInsightsResponse.json();
    
    if (!insertedAdInsights.success) {
      console.error('[DEMO_GENERATOR] Error in ad insights response:', insertedAdInsights.error);
      throw new Error(`Failed to fetch inserted ad insights: ${insertedAdInsights.error}`);
    }
    
    console.log(`[DEMO_GENERATOR] Successfully fetched ${insertedAdInsights.data.length} ad insights`);
    
    // Create demographic breakdowns for each ad insight with consistent metrics
    for (const insight of insertedAdInsights.data) {
      // Generate a consistent distribution for demographics that will sum to 100%
      const demographicDistribution = generateDistribution(ageGroups.length * genders.length);
      
      let distributionIndex = 0;
      for (const age of ageGroups) {
        for (const gender of genders) {
          const percentage = demographicDistribution[distributionIndex++];
          const breakdownMetrics = applyPercentageToMetrics(insight, percentage);
          
          // Filter out any non-demographic fields that might cause issues
          const { id, ad_id, ad_set_id, campaign_id, date, created_at, user_id, ad_account_id, ...metrics } = breakdownMetrics;
          
          // Ensure we're using lowercase gender values to match expectations
          const normalizedGender = gender.toLowerCase();
          
          // Check for null or undefined metrics and replace with defaults
          const safeMetrics = {};
          for (const [key, value] of Object.entries(metrics)) {
            safeMetrics[key] = value === null || value === undefined ? 0 : value;
          }
          
          demographicBreakdowns.push({
            insight_id: insight.id,
            age,
            gender: normalizedGender,
            ...safeMetrics,
            created_at: new Date().toISOString()
          });
        }
      }
    }
    
    console.log(`[DEMO_GENERATOR] Generated ${demographicBreakdowns.length} demographic breakdowns with consistent metrics`);
    
    // Verify demographic data consistency for the first ad insight
    if (insertedAdInsights.data.length > 0 && demographicBreakdowns.length > 0) {
      const firstInsight = insertedAdInsights.data[0];
      const firstInsightBreakdowns = demographicBreakdowns.filter(bd => bd.insight_id === firstInsight.id);
      
      // Sum key metrics across all breakdowns
      const breakdownSums = {
        impressions: firstInsightBreakdowns.reduce((sum, bd) => sum + (bd.impressions || 0), 0),
        clicks: firstInsightBreakdowns.reduce((sum, bd) => sum + (bd.clicks || 0), 0),
        spend: firstInsightBreakdowns.reduce((sum, bd) => sum + (bd.spend || 0), 0)
      };
      
      console.log(`[DEMO_GENERATOR] Metrics consistency check for first insight (${firstInsight.id}):`);
      console.log(`[DEMO_GENERATOR] Parent impressions: ${firstInsight.impressions}, Sum of breakdown impressions: ${breakdownSums.impressions}`);
      console.log(`[DEMO_GENERATOR] Parent clicks: ${firstInsight.clicks}, Sum of breakdown clicks: ${breakdownSums.clicks}`);
      console.log(`[DEMO_GENERATOR] Parent spend: ${firstInsight.spend}, Sum of breakdown spend: ${breakdownSums.spend}`);
      console.log(`[DEMO_GENERATOR] Impressions difference: ${Math.abs(firstInsight.impressions - breakdownSums.impressions)} (${((Math.abs(firstInsight.impressions - breakdownSums.impressions) / firstInsight.impressions) * 100).toFixed(2)}%)`);
    }

    // Step 7: Insert demographic breakdowns
    console.log(`[DEMO_GENERATOR] Inserting demographic breakdowns - ${demographicBreakdowns.length} records`);
    console.log(`[DEMO_GENERATOR] First demographic breakdown record:`, JSON.stringify(demographicBreakdowns[0], null, 2));
    
    try {
      const insertDemographicsResponse = await fetch(`${baseUrl}/api/demo-data/insert-breakdown`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          table: 'demo_ad_insights_demographics',
          data: demographicBreakdowns
        })
      });
      
      // Log complete response details for debugging
      const responseStatus = insertDemographicsResponse.status;
      const responseText = await insertDemographicsResponse.text();
      console.log(`[DEMO_GENERATOR] Demographics insertion response status: ${responseStatus}`);
      console.log(`[DEMO_GENERATOR] Demographics insertion response text:`, responseText);
      
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        console.error(`[DEMO_GENERATOR] Failed to parse demographic response as JSON:`, e);
      }
      
      if (!insertDemographicsResponse.ok) {
        console.error(`[DEMO_GENERATOR] Failed to insert demographic breakdowns:`, responseData || responseText);
        
        // Try direct Supabase insertion as a fallback
        console.log(`[DEMO_GENERATOR] Trying direct Supabase insertion as fallback for demographics...`);
        const fallbackResult = await insertDemographicsWithDirectSupabase(
          'demo_ad_insights_demographics', 
          demographicBreakdowns
        );
        
        if (!fallbackResult.success) {
          throw new Error(`Failed to insert demographic breakdowns: ${fallbackResult.error}`);
        } else {
          console.log(`[DEMO_GENERATOR] Successfully inserted demographics using direct Supabase method`);
        }
      }
    } catch (error) {
      console.error(`[DEMO_GENERATOR] Error during demographic insertion:`, error);
      throw error;
    }

    // Step 8: Generate and insert ad set demographic breakdowns with consistent metrics
    // Get inserted ad set insight to know its ID
    console.log('[DEMO_GENERATOR] Fetching inserted ad set insights to generate breakdowns...');
    const fetchAdSetInsightsResponse = await fetch(`${baseUrl}/api/demo-data/get-insights?table=demo_ad_set_insights`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!fetchAdSetInsightsResponse.ok) {
      const errorText = await fetchAdSetInsightsResponse.text();
      console.error('[DEMO_GENERATOR] Failed to fetch ad set insights:', errorText);
      throw new Error(`Failed to fetch inserted ad set insights: ${errorText}`);
    }
    
    const insertedAdSetInsights = await fetchAdSetInsightsResponse.json();
    
    if (!insertedAdSetInsights.success) {
      console.error('[DEMO_GENERATOR] Error in ad set insights response:', insertedAdSetInsights.error);
      throw new Error(`Failed to fetch inserted ad set insights: ${insertedAdSetInsights.error}`);
    }
    
    console.log(`[DEMO_GENERATOR] Successfully fetched ${insertedAdSetInsights.data.length} ad set insights`);
    
    const adSetDemographicBreakdowns = [];
    
    // Create demographic breakdowns for the ad set with consistent metrics
    for (const adSetInsight of insertedAdSetInsights.data) {
      // Generate a consistent distribution for demographics that will sum to 100%
      const demographicDistribution = generateDistribution(ageGroups.length * genders.length);
      
      let distributionIndex = 0;
      for (const age of ageGroups) {
        for (const gender of genders) {
          const percentage = demographicDistribution[distributionIndex++];
          const breakdownMetrics = applyPercentageToMetrics(adSetInsight, percentage);
          
          // Filter out any non-demographic fields that might cause issues
          const { id, ad_set_id, campaign_id, date, created_at, user_id, ad_account_id, ...metrics } = breakdownMetrics;
          
          // Ensure we're using lowercase gender values to match expectations
          const normalizedGender = gender.toLowerCase();
          
          // Check for null or undefined metrics and replace with defaults
          const safeMetrics = {};
          for (const [key, value] of Object.entries(metrics)) {
            safeMetrics[key] = value === null || value === undefined ? 0 : value;
          }
          
          adSetDemographicBreakdowns.push({
            insight_id: adSetInsight.id,
            age,
            gender: normalizedGender,
            ...safeMetrics,
            created_at: new Date().toISOString()
          });
        }
      }
    }
    
    console.log(`[DEMO_GENERATOR] Generated ${adSetDemographicBreakdowns.length} ad set demographic breakdowns with consistent metrics`);
    
    // Verify demographic data consistency for the ad set insight
    if (insertedAdSetInsights.data.length > 0 && adSetDemographicBreakdowns.length > 0) {
      const adSetInsight = insertedAdSetInsights.data[0];
      const adSetBreakdowns = adSetDemographicBreakdowns.filter(bd => bd.insight_id === adSetInsight.id);
      
      // Sum key metrics across all breakdowns
      const breakdownSums = {
        impressions: adSetBreakdowns.reduce((sum, bd) => sum + (bd.impressions || 0), 0),
        clicks: adSetBreakdowns.reduce((sum, bd) => sum + (bd.clicks || 0), 0),
        spend: adSetBreakdowns.reduce((sum, bd) => sum + (bd.spend || 0), 0)
      };
      
      console.log(`[DEMO_GENERATOR] Metrics consistency check for ad set insight (${adSetInsight.id}):`);
      console.log(`[DEMO_GENERATOR] Parent impressions: ${adSetInsight.impressions}, Sum of breakdown impressions: ${breakdownSums.impressions}`);
      console.log(`[DEMO_GENERATOR] Parent clicks: ${adSetInsight.clicks}, Sum of breakdown clicks: ${breakdownSums.clicks}`);
      console.log(`[DEMO_GENERATOR] Parent spend: ${adSetInsight.spend}, Sum of breakdown spend: ${breakdownSums.spend}`);
      console.log(`[DEMO_GENERATOR] Impressions difference: ${Math.abs(adSetInsight.impressions - breakdownSums.impressions)} (${((Math.abs(adSetInsight.impressions - breakdownSums.impressions) / adSetInsight.impressions) * 100).toFixed(2)}%)`);
    }

    // Step 9: Insert ad set demographic breakdowns
    console.log(`[DEMO_GENERATOR] Inserting ad set demographic breakdowns - ${adSetDemographicBreakdowns.length} records`);
    console.log(`[DEMO_GENERATOR] First ad set demographic breakdown record:`, JSON.stringify(adSetDemographicBreakdowns[0], null, 2));
    
    try {
      const insertAdSetDemographicsResponse = await fetch(`${baseUrl}/api/demo-data/insert-breakdown`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          table: 'demo_ad_set_insights_demographics',
          data: adSetDemographicBreakdowns
        })
      });
      
      // Log complete response details for debugging
      const responseStatus = insertAdSetDemographicsResponse.status;
      const responseText = await insertAdSetDemographicsResponse.text();
      console.log(`[DEMO_GENERATOR] Ad set demographics insertion response status: ${responseStatus}`);
      console.log(`[DEMO_GENERATOR] Ad set demographics insertion response text:`, responseText);
      
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        console.error(`[DEMO_GENERATOR] Failed to parse ad set demographic response as JSON:`, e);
      }
      
      if (!insertAdSetDemographicsResponse.ok) {
        console.error(`[DEMO_GENERATOR] Failed to insert ad set demographic breakdowns:`, responseData || responseText);
        
        // Try direct Supabase insertion as a fallback
        console.log(`[DEMO_GENERATOR] Trying direct Supabase insertion as fallback for ad set demographics...`);
        const fallbackResult = await insertDemographicsWithDirectSupabase(
          'demo_ad_set_insights_demographics', 
          adSetDemographicBreakdowns
        );
        
        if (!fallbackResult.success) {
          throw new Error(`Failed to insert ad set demographic breakdowns: ${fallbackResult.error}`);
        } else {
          console.log(`[DEMO_GENERATOR] Successfully inserted ad set demographics using direct Supabase method`);
        }
      }
    } catch (error) {
      console.error(`[DEMO_GENERATOR] Error during ad set demographic insertion:`, error);
      throw error;
    }

    console.log('[DEMO_GENERATOR] Test data generation completed successfully!');
    
    // Return the test data summary
    return {
      success: true,
      summary: {
        campaigns: 1,
        adSets: 1,
        ads: 3,
        adInsights: adInsights.length,
        adInsightDemographics: demographicBreakdowns.length,
        adSetInsights: 1,
        adSetInsightDemographics: adSetDemographicBreakdowns.length,
        totalDataPoints: 
          adInsights.length + 
          demographicBreakdowns.length + 
          1 + // adSetInsight
          adSetDemographicBreakdowns.length
      }
    };
  } catch (error) {
    console.error('[DEMO_GENERATOR] Error generating test data:', error);
    console.error('[DEMO_GENERATOR] Error stack:', error.stack);
    console.error('[DEMO_GENERATOR] Error type:', error.name);
    console.error('[DEMO_GENERATOR] Error message:', error.message);
    
    return {
      success: false,
      error: error.message || 'Unknown error occurred',
      errorType: error.name || 'Unknown'
    };
  }
}

// Helper function to generate a valid UUID v4
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Helper function to insert demographics directly using Supabase
async function insertDemographicsWithDirectSupabase(table, data) {
  try {
    console.log(`[DEMO_GENERATOR] Using direct Supabase insertion for ${data.length} records into ${table}...`);
    
    // Create a Supabase client
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[DEMO_GENERATOR] Missing Supabase credentials for direct insertion');
      return { success: false, error: 'Missing Supabase credentials for direct insertion' };
    }
    
    console.log('[DEMO_GENERATOR] Creating direct Supabase client with service role key');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Insert in smaller batches
    const BATCH_SIZE = 3; // Very small batch size for maximum reliability
    const batches = [];
    
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      batches.push(data.slice(i, i + BATCH_SIZE));
    }
    
    console.log(`[DEMO_GENERATOR] Direct insertion: splitting ${data.length} records into ${batches.length} batches of ${BATCH_SIZE}`);
    
    // Check if data is valid
    if (data.length > 0) {
      console.log(`[DEMO_GENERATOR] Sample record for direct insertion:`, JSON.stringify(data[0], null, 2));
    }
    
    // Verify table structure first
    console.log(`[DEMO_GENERATOR] Validating table structure for ${table}`);
    const { data: tableInfo, error: tableError } = await supabase
      .from(table)
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.error(`[DEMO_GENERATOR] Error validating table structure:`, tableError);
    } else {
      console.log(`[DEMO_GENERATOR] Table validation successful. Table exists and is accessible.`);
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`[DEMO_GENERATOR] Direct insertion: batch ${i + 1}/${batches.length} (${batch.length} records)`);
      
      try {
        // Use upsert with onConflict to handle potential duplicates
        const { data: insertedData, error } = await supabase
          .from(table)
          .upsert(batch, { onConflict: 'insight_id,age,gender' })
          .select();
        
        if (error) {
          console.error(`[DEMO_GENERATOR] Error in direct insertion batch ${i + 1}:`, error);
          console.error(`[DEMO_GENERATOR] Error code:`, error.code);
          console.error(`[DEMO_GENERATOR] Error details:`, error.details);
          errorCount += batch.length;
          
          // Try one by one as last resort
          console.log(`[DEMO_GENERATOR] Attempting record-by-record insertion for batch ${i + 1}`);
          for (let j = 0; j < batch.length; j++) {
            try {
              const record = batch[j];
              const { error: singleError } = await supabase
                .from(table)
                .upsert(record);
              
              if (singleError) {
                console.error(`[DEMO_GENERATOR] Error inserting single record ${j}:`, singleError);
                errorCount++;
              } else {
                console.log(`[DEMO_GENERATOR] Successfully inserted single record ${j}`);
                successCount++;
                errorCount--; // Adjust because we already counted the whole batch as errors
              }
            } catch (singleError) {
              console.error(`[DEMO_GENERATOR] Exception inserting single record ${j}:`, singleError);
            }
          }
        } else {
          console.log(`[DEMO_GENERATOR] Successfully inserted batch ${i + 1} directly (${insertedData?.length || 0} records)`);
          successCount += batch.length;
        }
      } catch (batchError) {
        console.error(`[DEMO_GENERATOR] Exception in direct insertion batch ${i + 1}:`, batchError);
        errorCount += batch.length;
      }
      
      // Add a small delay between batches to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Verify records were actually inserted
    try {
      console.log(`[DEMO_GENERATOR] Verifying records were inserted in ${table}`);
      const { count, error: countError } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        console.error(`[DEMO_GENERATOR] Error counting records:`, countError);
      } else {
        console.log(`[DEMO_GENERATOR] Table ${table} now contains ${count} records`);
      }
    } catch (countError) {
      console.error(`[DEMO_GENERATOR] Error verifying insertion:`, countError);
    }
    
    return { 
      success: errorCount === 0, 
      successCount, 
      errorCount,
      error: errorCount > 0 ? `Failed to insert ${errorCount} records directly` : null
    };
  } catch (error) {
    console.error('[DEMO_GENERATOR] Error in direct Supabase insertion:', error);
    return { success: false, error: error.message };
  }
}

// ... existing code ... 