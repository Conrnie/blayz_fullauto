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
const ACTION_DEVICES = ['DESKTOP', 'MOBILE', 'TABLET', 'UNKNOWN'];
const PUBLISHER_PLATFORMS = ['FACEBOOK', 'INSTAGRAM', 'AUDIENCE_NETWORK', 'MESSENGER'];
const PLATFORM_POSITIONS = ['FEED', 'STORIES', 'REELS', 'RIGHT_HAND_COLUMN', 'MARKETPLACE'];
const IMPRESSION_DEVICES = ['DESKTOP', 'MOBILE', 'TABLET', 'UNKNOWN'];
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
export async function generateAndInsertDemoData({
  days = 30,
  adsPerAdSet = 2,
  adSetsPerCampaign = 3,
  campaignsPerAccount = 4,
  includeAdInsights = true,
  includeAdSetInsights = true,
  includeAudienceInsights = true,
  runProgressCallback = null,
} = {}) {
  try {
    showProgress(runProgressCallback, 0, 'Starting demo data generation...');
    
    // Checking that we have the necessary service role permissions
    const { data: { role } } = await supabase.auth.getUser();
    if (role !== 'service_role') {
      return { error: 'This function requires a service role key.' };
    }
    
    // Create demo ad accounts
    const adAccounts = await generateAndInsertAdAccounts();
    if (adAccounts.error) return adAccounts;
    showProgress(runProgressCallback, 5, 'Generated demo ad accounts');
    
    // Create demo campaigns
    const campaigns = await generateAndInsertCampaigns(adAccounts.data, campaignsPerAccount);
    if (campaigns.error) return campaigns;
    showProgress(runProgressCallback, 10, 'Generated demo campaigns');
    
    // Create demo ad sets
    const adSets = await generateAndInsertAdSets(campaigns.data, adSetsPerCampaign);
    if (adSets.error) return adSets;
    showProgress(runProgressCallback, 15, 'Generated demo ad sets');
    
    // Create demo ads
    const ads = await generateAndInsertAds(adSets.data, adsPerAdSet);
    if (ads.error) return ads;
    showProgress(runProgressCallback, 20, 'Generated demo ads');
    
    // Generate ad set insights
    let insertedAdSetInsights = { data: [] };
    if (includeAdSetInsights) {
      console.log('[DEMO_GENERATOR] Generating ad set insights...');
      for (const adSet of adSets.data) {
        for (const date of dates) {
          const dateStr = date.toISOString().split('T')[0];
          insertedAdSetInsights.data.push(
            generateAdSetInsight({
              adSetId: adSet.id,
              campaignId: adSet.campaignId,
              date: dateStr
            })
          );
        }
      }
      console.log(`[DEMO_GENERATOR] Generated ${insertedAdSetInsights.data.length} ad set insights`);
    }
    
    // Generate ad insights
    let insertedAdInsights = { data: [] };
    if (includeAdInsights) {
      console.log('[DEMO_GENERATOR] Generating ad insights...');
      for (const ad of ads.data) {
        for (const date of dates) {
          const dateStr = date.toISOString().split('T')[0];
          insertedAdInsights.data.push(
            generateAdInsight({
              adId: ad.id,
              adSetId: ad.ad_set_id,
              campaignId: ad.campaign_id,
              date: dateStr
            })
          );
        }
      }
      console.log(`[DEMO_GENERATOR] Generated ${insertedAdInsights.data.length} ad insights`);
    }
    
    // Insert ad demographics
    if (adDemographics.length > 0) {
      try {
        console.log(`[DEMO_GENERATOR] Inserting ${adDemographics.length} ad demographic breakdowns...`);
        const insertDemographicsResponse = await fetch(insertBreakdownUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            table: 'demo_ad_insights_demographics',
            data: adDemographics
          })
        });
        
        if (!insertDemographicsResponse.ok) {
          const errorText = await insertDemographicsResponse.text();
          console.error(`[DEMO_GENERATOR] Error inserting ad demographics: ${errorText}`);
          console.log(`[DEMO_GENERATOR] Attempting direct Supabase insertion as fallback...`);
          
          // Try direct Supabase insertion as a fallback
          const adminClient = createAdminClient();
          if (adminClient) {
            const { data, error } = await adminClient
              .from('demo_ad_insights_demographics')
              .insert(adDemographics);
              
            if (error) {
              console.error(`[DEMO_GENERATOR] Direct insertion also failed:`, error);
            } else {
              console.log(`[DEMO_GENERATOR] Successfully inserted ${adDemographics.length} ad demographic breakdowns via direct insertion`);
            }
          }
        } else {
          console.log(`[DEMO_GENERATOR] Successfully inserted ${adDemographics.length} ad demographic breakdowns`);
        }
      } catch (error) {
        console.error(`[DEMO_GENERATOR] Error during ad demographic insertion:`, error);
      }
    }
    
    // Insert ad set demographics
    if (adSetDemographics.length > 0) {
      try {
        console.log(`[DEMO_GENERATOR] Inserting ${adSetDemographics.length} ad set demographic breakdowns...`);
        const insertDemographicsResponse = await fetch(insertBreakdownUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            table: 'demo_ad_set_insights_demographics',
            data: adSetDemographics
          })
        });
        
        if (!insertDemographicsResponse.ok) {
          const errorText = await insertDemographicsResponse.text();
          console.error(`[DEMO_GENERATOR] Error inserting ad set demographics: ${errorText}`);
          console.log(`[DEMO_GENERATOR] Attempting direct Supabase insertion as fallback...`);
          
          // Try direct Supabase insertion as a fallback
          const adminClient = createAdminClient();
          if (adminClient) {
            const { data, error } = await adminClient
              .from('demo_ad_set_insights_demographics')
              .insert(adSetDemographics);
              
            if (error) {
              console.error(`[DEMO_GENERATOR] Direct insertion also failed:`, error);
            } else {
              console.log(`[DEMO_GENERATOR] Successfully inserted ${adSetDemographics.length} ad set demographic breakdowns via direct insertion`);
            }
          }
        } else {
          console.log(`[DEMO_GENERATOR] Successfully inserted ${adSetDemographics.length} ad set demographic breakdowns`);
        }
      } catch (error) {
        console.error(`[DEMO_GENERATOR] Error during ad set demographic insertion:`, error);
      }
    }
    
    // Insert ad device breakdowns
    if (adDeviceBreakdowns.length > 0) {
      try {
        console.log(`[DEMO_GENERATOR] Inserting ${adDeviceBreakdowns.length} ad device breakdowns...`);
        const insertDeviceResponse = await fetch(insertBreakdownUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            table: 'demo_ad_insights_device',
            data: adDeviceBreakdowns
          })
        });
        
        if (!insertDeviceResponse.ok) {
          const errorText = await insertDeviceResponse.text();
          console.error(`[DEMO_GENERATOR] Error inserting ad device breakdowns: ${errorText}`);
          console.log(`[DEMO_GENERATOR] Attempting direct Supabase insertion as fallback...`);
          
          // Try direct Supabase insertion as a fallback
          const adminClient = createAdminClient();
          if (adminClient) {
            const { data, error } = await adminClient
              .from('demo_ad_insights_device')
              .insert(adDeviceBreakdowns);
              
            if (error) {
              console.error(`[DEMO_GENERATOR] Direct insertion also failed:`, error);
            } else {
              console.log(`[DEMO_GENERATOR] Successfully inserted ${adDeviceBreakdowns.length} ad device breakdowns via direct insertion`);
            }
          }
        } else {
          console.log(`[DEMO_GENERATOR] Successfully inserted ${adDeviceBreakdowns.length} ad device breakdowns`);
        }
      } catch (error) {
        console.error(`[DEMO_GENERATOR] Error during ad device breakdown insertion:`, error);
      }
    }
    
    // Insert ad set device breakdowns
    if (adSetDeviceBreakdowns.length > 0) {
      try {
        console.log(`[DEMO_GENERATOR] Inserting ${adSetDeviceBreakdowns.length} ad set device breakdowns...`);
        const insertDeviceResponse = await fetch(insertBreakdownUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            table: 'demo_ad_set_insights_device',
            data: adSetDeviceBreakdowns
          })
        });
        
        if (!insertDeviceResponse.ok) {
          const errorText = await insertDeviceResponse.text();
          console.error(`[DEMO_GENERATOR] Error inserting ad set device breakdowns: ${errorText}`);
          console.log(`[DEMO_GENERATOR] Attempting direct Supabase insertion as fallback...`);
          
          // Try direct Supabase insertion as a fallback
          const adminClient = createAdminClient();
          if (adminClient) {
            const { data, error } = await adminClient
              .from('demo_ad_set_insights_device')
              .insert(adSetDeviceBreakdowns);
              
            if (error) {
              console.error(`[DEMO_GENERATOR] Direct insertion also failed:`, error);
            } else {
              console.log(`[DEMO_GENERATOR] Successfully inserted ${adSetDeviceBreakdowns.length} ad set device breakdowns via direct insertion`);
            }
          }
        } else {
          console.log(`[DEMO_GENERATOR] Successfully inserted ${adSetDeviceBreakdowns.length} ad set device breakdowns`);
        }
      } catch (error) {
        console.error(`[DEMO_GENERATOR] Error during ad set device breakdown insertion:`, error);
      }
    }
    
    // Return overview of generated data
    const result = {
      campaigns: campaigns.data.length,
      adSets: adSets.data.length,
      ads: ads.data.length,
      daysOfData: days,
      totalInsights: (insertedAdInsights.data?.length || 0) + (insertedAdSetInsights.data?.length || 0),
      adInsightDemographics: adDemographics.length,
      adSetInsightDemographics: adSetDemographics.length,
      adInsightDevices: adDeviceBreakdowns.length,
      adSetInsightDevices: adSetDeviceBreakdowns.length,
      success: true
    };
    
    console.log(`[DEMO_GENERATOR] Successfully generated demo data:`, result);
    showProgress(runProgressCallback, 100, 'Demo data generation complete!');
    
    return { data: result };
  } catch (error) {
    console.error(`[DEMO_GENERATOR] Error generating demo data:`, error);
    showProgress(runProgressCallback, 100, `Error: ${error.message}`);
    return { error: error.message };
  }
}

// Helper function to show progress
function showProgress(callback, percent, message) {
  if (typeof callback === 'function') {
    callback(percent, message);
  }
}

// Export the function
export { 
  generateAndInsertDemoData, 
  generateDemoData,
  DEFAULT_OPTIONS
}; 

// Export the function
export { generateAndInsertDemoData, generateDemoData, DEFAULT_OPTIONS };