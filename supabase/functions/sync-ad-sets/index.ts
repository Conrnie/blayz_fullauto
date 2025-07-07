// supabase/functions/sync-ad-sets/index.ts
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log('Sync Ad Sets function booting up...');

// --- Initialize Supabase Client ---
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const EXPECTED_SHARED_SECRET = Deno.env.get('INTERNAL_SHARED_SECRET');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// --- Constants ---
const BASE_AD_SET_FIELDS = 'id,name,status,effective_status,campaign_id,account_id,optimization_goal,billing_event,bid_strategy,daily_budget,lifetime_budget,start_time,stop_time,created_time,updated_time,targeting';
const BASE_INSIGHT_FIELDS = [
  'spend',
  'impressions',
  'reach',
  'frequency',
  'clicks',
  'ctr',
  'cpm',
  'cpc',
  'cost_per_action_type',
  'actions',
  'action_values',
  'quality_ranking',
  'engagement_rate_ranking',
  'conversion_rate_ranking',
  'date_start',
  'adset_name' // For ad_set_insights table
].join(',');

// Hourly breakdown fields - excludes 'reach' and 'frequency' as per Meta's documentation
const HOURLY_INSIGHT_FIELDS = [
  'spend',
  'impressions',
  'clicks',
  'ctr',
  'cpm',
  'cpc',
  'actions',
  'action_values',
  'cost_per_action_type',
  'date_start',
  'adset_name'
].join(',');

let YESTERDAY_ISO_DATE: string;

// These will be initialized by the main function using a reliable time source
let SIXTY_DAY_TIME_PERIOD: { since: string; until: string };

const PLATFORM_POSITION_INSIGHT_FIELDS = [
  'spend',
  'impressions',
  'reach',
  'frequency',
  'clicks',
  'ctr',
  'cpm',
  'cpc',
  'date_start',
  'adset_name'
].join(',');

// --- Time Period Definitions ---
// These are now initialized in the main handler using a reliable time source.

// --- New Helper Functions for Breakdown Processing ---
function calculateBreakdownMetrics(insight: any) {
    const data: any = {
      spend: parseFloat(insight.spend || '0'),
      impressions: parseInt(insight.impressions || '0', 10),
      reach: parseInt(insight.reach || '0', 10),
      frequency: parseFloat(insight.frequency || '0'),
      clicks: parseInt(insight.clicks || '0', 10),
      link_clicks: 0,
      ctr: parseFloat(insight.ctr || '0'),
      cpm: parseFloat(insight.cpm || '0'),
      cpc: parseFloat(insight.cpc || '0'),
      link_click_ctr: 0.0,
      link_click_cpc: 0.0,
      quality_ranking: insight.quality_ranking || null,
      engagement_rate_ranking: insight.engagement_rate_ranking || null,
      conversion_rate_ranking: insight.conversion_rate_ranking || null,
      results: 0,
      cpa: 0,
      roas: 0,
      conversion_rate: 0,
      value_per_conversion: 0,
      post_reactions: 0,
      post_comments: 0,
      post_shares: 0,
      video_views: 0,
      video_completion_rate: 0,
      average_watch_time: 0,
      leads: 0,
      purchases: 0,
      registrations: 0,
      landing_page_views: 0
    };
  
    (insight.actions || []).forEach((action: any) => {
      const value = parseInt(action.value || '0', 10);
      if (action.action_type === 'link_click') data.link_clicks += value;
      if (action.action_type === 'post_reaction') data.post_reactions += value;
      if (action.action_type === 'comment') data.post_comments += value;
      if (action.action_type === 'post_share') data.post_shares += value;
      if (action.action_type === 'lead') data.leads += value;
      if (action.action_type === 'purchase') data.purchases += value;
      if (action.action_type === 'complete_registration') data.registrations += value;
      if (action.action_type === 'landing_page_view') data.landing_page_views += value;
    });
  
    if (data.impressions > 0 && data.link_clicks > 0) {
      data.link_click_ctr = (data.link_clicks / data.impressions) * 100;
    }
    if (data.spend > 0 && data.link_clicks > 0) {
      data.link_click_cpc = data.spend / data.link_clicks;
    }
    
    const purchaseValueActions = (insight.action_values || []);
    if (purchaseValueActions.length > 0) {
        const purchaseValues = purchaseValueActions.find((av: any) => av.action_type === 'purchase');
        if (purchaseValues && data.spend > 0) {
            data.roas = parseFloat(purchaseValues.value) / data.spend;
        }
    }

    return data;
}

function transformCountryInsight(insight: any, dbAdSetId: number, userId: string, timePeriod: { since: string; until: string }) {
    const calculatedMetrics = calculateBreakdownMetrics(insight);

    return {
        ...calculatedMetrics,
        ad_set_id: dbAdSetId,
        user_id: userId,
        country: insight.country,
        start_date: timePeriod.since,
        end_date: timePeriod.until,
    };
}

function transformRegionInsight(insight: any, dbAdSetId: number, userId: string, timePeriod: { since: string; until: string }) {
    const calculatedMetrics = calculateBreakdownMetrics(insight);

    return {
        ...calculatedMetrics,
        ad_set_id: dbAdSetId,
        user_id: userId,
        region: insight.region,
        start_date: timePeriod.since,
        end_date: timePeriod.until,
    };
}

function transformDmaInsight(insight: any, dbAdSetId: number, userId: string, timePeriod: { since: string; until: string }) {
    const calculatedMetrics = calculateBreakdownMetrics(insight);

    return {
        ...calculatedMetrics,
        ad_set_id: dbAdSetId,
        user_id: userId,
        dma: insight.dma,
        start_date: timePeriod.since,
        end_date: timePeriod.until,
    };
}

function transformPlatformInsight(insight: any, dbAdSetId: number, userId: string, timePeriod: { since: string; until: string }) {
    const calculatedMetrics = calculateBreakdownMetrics(insight);

    return {
        ...calculatedMetrics,
        ad_set_id: dbAdSetId,
        user_id: userId,
        device_platform: insight.device_platform || null,
        publisher_platform: insight.publisher_platform || null,
        platform_position: insight.platform_position || null,
        start_date: timePeriod.since,
        end_date: timePeriod.until,
    };
}

function transformDeviceInsight(insight: any, dbAdSetId: number, userId: string, timePeriod: { since: string; until: string }) {
    const calculatedMetrics = calculateBreakdownMetrics(insight);

    return {
        ...calculatedMetrics,
        ad_set_id: dbAdSetId,
        user_id: userId,
        action_device: insight.action_device || null,
        publisher_platform: insight.publisher_platform || null,
        platform_position: insight.platform_position || null,
        impression_device: insight.impression_device || null,
        start_date: timePeriod.since,
        end_date: timePeriod.until,
    };
}

function transformDemographicInsight(insight: any, dbAdSetId: number, userId: string, timePeriod: { since: string; until: string }) {
    const calculatedMetrics = calculateBreakdownMetrics(insight);

    return {
        ...calculatedMetrics,
        ad_set_id: dbAdSetId,
        user_id: userId,
        age: insight.age || null,
        gender: insight.gender || null,
        start_date: timePeriod.since,
        end_date: timePeriod.until,
    };
}

function transformHourlyInsight(insight: any, insightId: string, userId: string) {
    const calculatedMetrics = calculateBreakdownMetrics(insight);
    const hourString = insight.hourly_stats_aggregated_by_audience_time_zone;
    
    // Extract the start hour from the range (e.g., "00:00:00 - 00:59:59" -> "00:00:00") 
    const startHour = hourString.split(' - ')[0];
    const hour = parseInt(startHour.split(':')[0], 10);
    const timestamp = `${insight.date_start}T${startHour}`;

    return {
        ...calculatedMetrics,
        insight_id: insightId,
        user_id: userId,
        hour_of_day: hour,
        timestamp: timestamp,
        timezone: 'audience_time_zone', // Meta API uses audience timezone
    };
}

// --- End New Helper Functions ---

// --- Breakdown Configurations ---
const AD_SET_BREAKDOWN_CONFIGS = [
    { type: 'country', apiBreakdowns: ['country'], table: 'ad_set_insights_country', onConflict: 'ad_set_id,start_date,end_date,country,user_id', transform: transformCountryInsight, include_action_breakdown: true },
    { type: 'region', apiBreakdowns: ['region'], table: 'ad_set_insights_region', onConflict: 'ad_set_id,start_date,end_date,region,user_id', transform: transformRegionInsight, include_action_breakdown: true },
    { type: 'dma', apiBreakdowns: ['dma'], table: 'ad_set_insights_region', onConflict: 'ad_set_id,start_date,end_date,dma,user_id', transform: transformDmaInsight, include_action_breakdown: true },
    { type: 'impression_device', apiBreakdowns: ['impression_device'], table: 'ad_set_insights_device', onConflict: 'ad_set_id,start_date,end_date,action_device,publisher_platform,platform_position,impression_device,user_id', transform: transformDeviceInsight, include_action_breakdown: true },
    { type: 'device_platform', apiBreakdowns: ['device_platform'], table: 'ad_set_insights_device', onConflict: 'ad_set_id,start_date,end_date,action_device,publisher_platform,platform_position,impression_device,user_id', transform: transformDeviceInsight, include_action_breakdown: true },
    { type: 'publisher_platform', apiBreakdowns: ['publisher_platform'], table: 'ad_set_insights_device', onConflict: 'ad_set_id,start_date,end_date,action_device,publisher_platform,platform_position,impression_device,user_id', transform: transformDeviceInsight, include_action_breakdown: true },
    { type: 'demographics', apiBreakdowns: ['age', 'gender'], table: 'ad_set_insights_demographics', onConflict: 'ad_set_id,start_date,end_date,age,gender,user_id', transform: transformDemographicInsight, include_action_breakdown: true },
    { type: 'hourly_stats_aggregated_by_audience_time_zone', apiBreakdowns: ['hourly_stats_aggregated_by_audience_time_zone'], table: 'ad_set_insights_hourly', onConflict: 'insight_id,timestamp', transform: transformHourlyInsight, include_action_breakdown: false, timeIncrement: 1 }
];


// --- Helper: Fetch Meta Ad Sets ---
async function fetchMetaAdSets(accessToken: string, adAccountId: string): Promise<any[]> {
  const url = `https://graph.facebook.com/v19.0/${adAccountId}/adsets?fields=${BASE_AD_SET_FIELDS}&access_token=${accessToken}&limit=500`;
  const response = await fetch(url);
  if (!response.ok) {
    const errorData = await response.json();
    console.error('Error fetching Meta ad sets:', errorData);
    throw new Error(`Failed to fetch Meta ad sets: ${response.statusText}`);
  }
  const data = await response.json();
  return data.data || [];
}

// --- Helper: Fetch Meta Ad Set Insights with Breakdowns ---
async function fetchMetaAdSetInsights(adSetId: string, accessToken: string, config: any): Promise<any[]> {
    let fields = BASE_INSIGHT_FIELDS;
    if (config.type === 'platform_position') {
        fields = PLATFORM_POSITION_INSIGHT_FIELDS;
    } else if (config.type === 'hourly_stats_aggregated_by_audience_time_zone') {
        fields = HOURLY_INSIGHT_FIELDS;
    }
    let url = `https://graph.facebook.com/v19.0/${adSetId}/insights?fields=${fields}&breakdowns=${config.apiBreakdowns.join(
        ','
    )}&time_range=${JSON.stringify(config.timePeriod)}&time_increment=${config.timeIncrement}&access_token=${accessToken}&limit=500`;

    if (config.include_action_breakdown) {
        url += '&action_breakdowns=action_type';
    }

    // Log the API URL for hourly breakdown to debug
    if (config.type === 'hourly_stats_aggregated_by_audience_time_zone') {
        console.log(`Hourly breakdown time period: ${JSON.stringify(config.timePeriod)}`);
        console.log(`Hourly breakdown API URL: ${url.replace(accessToken, '[REDACTED]')}`);
    }

    const response = await fetch(url);
    if (!response.ok) {
        const errorData = await response.json();
        console.error(`Error fetching Meta ad set insights for breakdown ${config.type} (Ad Set ID: ${adSetId}):`, errorData.error?.message || response.statusText);
        throw new Error(`Failed to fetch Meta ad set insights for ${config.type}: ${errorData.error?.message || response.statusText}`);
    }
    const data = await response.json();
    
    // Log the response for hourly breakdown to debug
    if (config.type === 'hourly_stats_aggregated_by_audience_time_zone') {
        console.log(`Hourly breakdown API response data length: ${data.data?.length || 0}`);
        if (data.data && data.data.length > 0) {
            console.log(`Sample hourly data:`, JSON.stringify(data.data[0], null, 2));
        }
    }
    
    return data.data || [];
}

// --- Helper: Transform and Upsert Ad Set Data ---
async function transformAndUpsertAdSets(adSets: any[], dbAdAccountId: number, userId: string) {
  if (!adSets || adSets.length === 0) {
    console.log('No ad sets to process.');
    return;
  }

  const recordsToUpsert = adSets.map((adSet) => {
    const targeting = adSet.targeting || {};
    return {
      ad_set_id: adSet.id,
      name: adSet.name,
      status: adSet.status,
      effective_status: adSet.effective_status,
      campaign_id: adSet.campaign_id,
      ad_account_id: dbAdAccountId,
      optimization_goal: adSet.optimization_goal,
      billing_event: adSet.billing_event,
      bid_strategy: adSet.bid_strategy,
      daily_budget: adSet.daily_budget ? parseInt(adSet.daily_budget, 10) / 100 : null,
      lifetime_budget: adSet.lifetime_budget ? parseInt(adSet.lifetime_budget, 10) / 100 : null,
      created_time: adSet.created_time,
      updated_time: adSet.updated_time,
      targeting_info: {
        geo_locations: targeting.geo_locations,
        age_min: targeting.age_min,
        age_max: targeting.age_max,
        genders: targeting.genders,
        flexible_spec: targeting.flexible_spec,
        exclusions: targeting.exclusions,
      },
      user_id: userId,
    };
  });

  console.log(`Upserting ${recordsToUpsert.length} ad sets.`);
  const { error: upsertError } = await supabase.from('ad_sets').upsert(recordsToUpsert, {
    onConflict: 'ad_set_id, user_id',
    ignoreDuplicates: false,
  });

  if (upsertError) {
    console.error('Error upserting ad sets:', upsertError);
    throw upsertError;
  }

  console.log('Ad sets upserted successfully.');
}

function getActionValue(actions: any[], action_type: string): number {
  return actions.find(a => a.action_type === action_type)?.value || 0;
}

function getActionCost(actions: any[], action_type: string): number {
    const cost = actions?.find((a: any) => a.action_type === action_type)?.value;
    return cost ? parseFloat(cost) : 0;
}


function transformInsight(insight: any, adSetId: string, dbAdAccountId: number, userId: string, campaignId: string) {
  const actions = insight.actions || [];
  const costPerAction = insight.cost_per_action_type || [];
  const leads = getActionValue(actions, 'lead') + getActionValue(actions, 'onsite_conversion.post_save');
  const purchases = getActionValue(actions, 'purchase');
  const purchaseValues = (actions.find((a: any) => a.action_type === 'purchase')?.action_values || [])
      .reduce((sum: number, v: any) => sum + parseFloat(v.value || '0'), 0);

  const spend = parseFloat(insight.spend || '0');

  return {
      ad_set_id: adSetId,
      campaign_id: campaignId,
      meta_campaign_id: campaignId,
      ad_account_id: dbAdAccountId,
      user_id: userId,
      date: insight.date_start,
      spend: spend,
      impressions: parseInt(insight.impressions || '0', 10),
      reach: parseInt(insight.reach || '0', 10),
      frequency: parseFloat(insight.frequency || '0'),
      clicks: parseInt(insight.clicks || '0', 10),
      cpc: parseFloat(insight.cpc || '0'),
      cpm: parseFloat(insight.cpm || '0'),
      ctr: parseFloat(insight.ctr || '0'),
      leads: leads,
      purchases: purchases,
      adset_name: insight.adset_name,
      quality_ranking: insight.quality_ranking,
      engagement_rate_ranking: insight.engagement_rate_ranking,
      conversion_rate_ranking: insight.conversion_rate_ranking,
  };
}

function getBreakdownValue(config: any, insight: any) {
    const result: { [key: string]: any } = {};
    const breakdownKeys = Array.isArray(config.apiBreakdowns) ? config.apiBreakdowns : [config.apiBreakdowns];

    if (config.type === 'age' || config.type === 'gender') {
        result['age'] = insight.age || 'N/A';
        result['gender'] = insight.gender || 'N/A';
    } else {
        breakdownKeys.forEach((key: string) => {
            if (insight[key]) {
                result[key] = insight[key];
            }
        });
    }
    return result;
}

function transformBreakdownInsight(insight: any) {
  return {
    spend: parseFloat(insight.spend || '0'),
    impressions: parseInt(insight.impressions || '0', 10),
    reach: parseInt(insight.reach || '0', 10),
    clicks: parseInt(insight.clicks || '0', 10),
  };
}

async function transformAndUpsertAdSetInsights(
  insights: any[],
  adSetId: string, // Meta Ad Set ID
  dbAdSetId: number, // Our DB Ad Set ID
  campaignId: string,
  config: any,
  dbAdAccountId: number,
  userId: string
) {
  if (!insights || insights.length === 0) {
    return;
  }

  // Step 1: Create a daily summary record by aggregating all breakdown insights.
  const dailySummary = transformInsight(insights[0], adSetId, dbAdAccountId, userId, campaignId);

  dailySummary.spend = insights.reduce((sum, i) => sum + parseFloat(i.spend || '0'), 0);
  dailySummary.impressions = insights.reduce((sum, i) => sum + parseInt(i.impressions || '0', 10), 0);
  dailySummary.clicks = insights.reduce((sum, i) => sum + parseInt(i.clicks || '0', 10), 0);
  dailySummary.reach = Math.max(0, ...insights.map(i => parseInt(i.reach || '0', 10)));

  const allActions = insights.flatMap(i => i.actions || []);
  const leads = getActionValue(allActions, 'lead') + getActionValue(allActions, 'onsite_conversion.post_save');
  const purchases = getActionValue(allActions, 'purchase');
      
  dailySummary.leads = leads;
  dailySummary.purchases = purchases;

  dailySummary.cpc = dailySummary.spend > 0 && dailySummary.clicks > 0 ? dailySummary.spend / dailySummary.clicks : 0;
  dailySummary.cpm = dailySummary.spend > 0 && dailySummary.impressions > 0 ? (dailySummary.spend / dailySummary.impressions) * 1000 : 0;
  dailySummary.ctr = dailySummary.clicks > 0 && dailySummary.impressions > 0 ? (dailySummary.clicks / dailySummary.impressions) * 100 : 0;

  const { data: dailySummaryResult, error: dailySummaryError } = await supabase
    .from('ad_set_insights')
    .upsert(dailySummary, { onConflict: 'meta_ad_set_id, date, user_id', ignoreDuplicates: false })
    .select('id')
    .single();

  if (dailySummaryError || !dailySummaryResult) {
    console.error(`Error upserting daily summary for ${config.type} breakdown:`, JSON.stringify(dailySummaryError, null, 2));
    return;
  }
  const dailyInsightId = dailySummaryResult.id;

  // Step 2: Prepare and upsert the specific breakdown records.
  let recordsToUpsert: any[];
  if (config.type === 'hourly_stats_aggregated_by_audience_time_zone') {
    recordsToUpsert = insights.map(insight => ({
      ...transformBreakdownInsight(insight),
      ad_set_insight_id: dailyInsightId,
      hour_of_day: parseInt(insight.hourly_stats_aggregated_by_audience_time_zone.split(':')[0], 10),
    }));
  } else {
    recordsToUpsert = insights.map(insight => ({
      ...transformBreakdownInsight(insight),
      ad_set_insight_id: dailyInsightId,
      ...getBreakdownValue(config, insight),
    }));
  }

  if (recordsToUpsert && recordsToUpsert.length > 0) {
    // Deduplicate records based on the constraint keys to prevent duplicate errors
    const constraintKeys = config.onConflict.split(',').map(k => k.trim());
    const uniqueRecords = [];
    const seenKeys = new Set();
    
    for (const record of recordsToUpsert) {
      const key = constraintKeys.map(k => record[k]).join('|');
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        uniqueRecords.push(record);
      }
    }

    const { error: breakdownError } = await supabase.from(config.table).upsert(uniqueRecords, {
      onConflict: config.onConflict,
    });

    if (breakdownError) {
      console.error(`Error upserting ${config.type} breakdown for Ad Set ${adSetId}: ${JSON.stringify(breakdownError, null, 2)}`);
    } else {
      console.log(`Synced ${uniqueRecords.length} ${config.type} breakdown records for Ad Set ${adSetId}.`);
    }
  }
}

async function fetchDailyInsights(adSetId: string, accessToken: string, timePeriod: { since: string; until: string }) {
    console.log(`Fetching daily insights for Ad Set ${adSetId}`);
    const timeRange = JSON.stringify(timePeriod);
    const url = `https://graph.facebook.com/v19.0/${adSetId}/insights?fields=${BASE_INSIGHT_FIELDS}&time_range=${timeRange}&level=adset&time_increment=1&limit=1000&access_token=${accessToken}`;

    const response = await fetch(url);
    if (!response.ok) {
        const errorData = await response.json();
        console.error(`Error fetching daily insights for Ad Set ${adSetId}:`, JSON.stringify(errorData, null, 2));
        throw new Error(`Failed to fetch daily insights for Ad Set ${adSetId}: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.data || [];
}

async function getReliableCurrentTime() {
  try {
    const response = await fetch('http://worldtimeapi.org/api/timezone/Etc/UTC');
    if (!response.ok) {
      console.warn(`WorldTimeAPI failed: ${response.statusText}. Falling back to system time.`);
      return new Date();
    }
    const data = await response.json();
    return new Date(data.utc_datetime);
  } catch (error) {
    console.error("Error fetching reliable time:", error.message, "Falling back to system time.");
    return new Date();
  }
}

// --- Main Deno Serve Function ---
serve(async (req: Request) => {
  // First, set up CORS headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // --- Reliable Time Initialization ---
  const reliableCurrentTime = await getReliableCurrentTime();
  console.log(`Reliable current time (UTC): ${reliableCurrentTime.toISOString()}`);

  const yesterday = new Date(reliableCurrentTime);
  yesterday.setDate(yesterday.getDate() - 1);
  const YESTERDAY_ISO_DATE = yesterday.toISOString().split('T')[0];

  const startDate60 = new Date(reliableCurrentTime);
  startDate60.setDate(startDate60.getDate() - 60);
  const SIXTY_DAY_TIME_PERIOD = {
    since: startDate60.toISOString().split('T')[0],
    until: reliableCurrentTime.toISOString().split('T')[0]
  };
  
  const HOURLY_TIME_PERIOD = {
    since: startDate60.toISOString().split('T')[0],
    until: reliableCurrentTime.toISOString().split('T')[0]
  };

  // --- Authorization ---
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 });
  }
  const token = authHeader.replace('Bearer ', '');
  if (token !== EXPECTED_SHARED_SECRET && token !== SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 });
  }

  try {
    const { user_id, meta_ad_account_id, db_ad_account_id } = await req.json();

    if (!user_id || !meta_ad_account_id || !db_ad_account_id) {
      return new Response(JSON.stringify({ error: 'user_id, meta_ad_account_id, and db_ad_account_id are required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const { data: metaAccessToken, error: rpcError } = await supabase.rpc('get_meta_long_lived_token_by_user_id', { user_id_param: user_id });

    if (rpcError || !metaAccessToken) {
      return new Response(JSON.stringify({ error: `Failed to fetch meta access token: ${rpcError?.message || 'No token found'}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: rpcError ? 500 : 404,
      });
    }

    console.log(`Starting ad set sync for DB Ad Account ID: ${db_ad_account_id}, Meta Ad Account ID: ${meta_ad_account_id}`);

    // --- Fetch and Upsert Ad Sets ---
    const adSetsUrl = `https://graph.facebook.com/v19.0/${meta_ad_account_id}/adsets?fields=${BASE_AD_SET_FIELDS}&limit=500&access_token=${metaAccessToken}`;
    const adSetsResponse = await fetch(adSetsUrl);
    if (!adSetsResponse.ok) throw new Error('Failed to fetch ad sets from Meta API');
    const adSetsData = await adSetsResponse.json();
    const adSetsFromApi = adSetsData.data || [];

    if (adSetsFromApi.length === 0) {
      console.log(`No ad sets found for Meta account ${meta_ad_account_id}.`);
      return new Response(JSON.stringify({ message: "No ad sets found." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const adSetsToUpsert = adSetsFromApi.map((adSet: any) => ({
      ad_set_id: adSet.id,
      name: adSet.name,
      status: adSet.status,
      effective_status: adSet.effective_status,
      campaign_id: adSet.campaign_id,
      ad_account_id: db_ad_account_id,
      optimization_goal: adSet.optimization_goal,
      billing_event: adSet.billing_event,
      bid_strategy: adSet.bid_strategy,
      daily_budget: adSet.daily_budget ? parseFloat(adSet.daily_budget) / 100 : null,
      lifetime_budget: adSet.lifetime_budget ? parseFloat(adSet.lifetime_budget) / 100 : null,
      created_time: adSet.created_time,
      updated_time: adSet.updated_time,
      targeting_info: adSet.targeting,
      user_id: user_id,
    }));

    const { data: upsertedAdSets, error: adSetUpsertError } = await supabase
        .from('ad_sets')
      .upsert(adSetsToUpsert, { onConflict: 'ad_set_id, user_id' })
      .select('id, ad_set_id, optimization_goal, campaign_id');

    if (adSetUpsertError) throw adSetUpsertError;
    console.log(`Successfully synced ${upsertedAdSets.length} ad sets for Meta account ${meta_ad_account_id}.`);

    // --- Process Insights for Each Ad Set ---
    for (const adSet of upsertedAdSets) {
      const { id: dbAdSetId, ad_set_id: metaAdSetId, campaign_id: campaignId } = adSet;
      console.log(`Processing insights for Ad Set ${metaAdSetId} (DB ID: ${dbAdSetId})`);

      // STEP 1: Fetch and upsert daily insights to create parent records.
      const dailyInsightsFromApi = await fetchDailyInsights(metaAdSetId, metaAccessToken, SIXTY_DAY_TIME_PERIOD);
      const dailyInsightsMap = new Map<string, number>();

      if (dailyInsightsFromApi.length > 0) {
        const dailyInsightsToUpsert = dailyInsightsFromApi.map((insight: any) =>
          transformInsight(insight, metaAdSetId, db_ad_account_id, user_id, campaignId)
        );

        const { data: upsertedDailyInsights, error: dailyInsightError } = await supabase
          .from('ad_set_insights')
          .upsert(dailyInsightsToUpsert, { onConflict: 'ad_set_id, date, user_id' })
          .select('id, date');

        if (dailyInsightError) {
          console.error(`Error upserting daily insights for Ad Set ${metaAdSetId}:`, JSON.stringify(dailyInsightError, null, 2));
          // Continue to next ad set if daily insights fail
          continue;
      }
      
        upsertedDailyInsights.forEach((record: { id: number; date: string }) => {
            dailyInsightsMap.set(record.date, record.id);
        });
        console.log(`Synced ${dailyInsightsMap.size} daily insight records for Ad Set ${metaAdSetId}.`);
      } else {
        console.log(`No daily insights found for Ad Set ${metaAdSetId}.`);
      }


      // STEP 2: Fetch and process breakdown insights.
      for (const config of AD_SET_BREAKDOWN_CONFIGS) {
        const isHourly = config.type === 'hourly_stats_aggregated_by_audience_time_zone';
        const finalConfig = { 
          ...config,
          timePeriod: isHourly ? HOURLY_TIME_PERIOD : SIXTY_DAY_TIME_PERIOD,
          timeIncrement: isHourly ? 1 : 'all_days',
        };

        try {
          console.log(`Fetching ${finalConfig.type} for Ad Set ${metaAdSetId} with time range: ${JSON.stringify(finalConfig.timePeriod)}`);
          const breakdownInsights = await fetchMetaAdSetInsights(metaAdSetId, metaAccessToken, finalConfig);
          if (breakdownInsights.length > 0) {
            let recordsToUpsert;
            
            // Special handling for hourly breakdown which needs insight_id
            if (finalConfig.type === 'hourly_stats_aggregated_by_audience_time_zone') {
              recordsToUpsert = breakdownInsights.map((insight) => {
                const insightId = dailyInsightsMap.get(insight.date_start);
                if (insightId) {
                  return finalConfig.transform(insight, insightId, user_id);
                }
                console.warn(`Could not find matching daily insight for hourly data on ${insight.date_start}. Skipping.`);
                return null;
              }).filter(Boolean);
            } else {
              recordsToUpsert = breakdownInsights.map((insight) => finalConfig.transform(insight, dbAdSetId, user_id, finalConfig.timePeriod)).filter(Boolean);
            }

            if (recordsToUpsert.length > 0) {
              // Deduplicate records based on the constraint keys to prevent duplicate errors
              const constraintKeys = finalConfig.onConflict.split(',').map(k => k.trim());
              const uniqueRecords = [];
              const seenKeys = new Set();
              
              for (const record of recordsToUpsert) {
                const key = constraintKeys.map(k => record[k]).join('|');
                if (!seenKeys.has(key)) {
                  seenKeys.add(key);
                  uniqueRecords.push(record);
                }
              }

              const { error: breakdownError } = await supabase.from(finalConfig.table).upsert(uniqueRecords, {
                onConflict: finalConfig.onConflict,
              });

              if (breakdownError) {
                console.error(`Error upserting ${finalConfig.type} breakdown for Ad Set ${metaAdSetId}: ${JSON.stringify(breakdownError, null, 2)}`);
              } else {
                console.log(`Synced ${uniqueRecords.length} ${finalConfig.type} breakdown records for Ad Set ${metaAdSetId}.`);
              }
            } else {
              console.log(`No processable ${finalConfig.type} breakdown insights found for Ad Set ${metaAdSetId}.`);
            }
          } else {
            console.log(`No ${finalConfig.type} breakdown insights returned from API for Ad Set ${metaAdSetId}.`);
          }
        } catch (error) {
          console.error(`Error processing ${finalConfig.type} insights for Ad Set ${metaAdSetId}: ${error.message}`);
        }
      }
    }

    console.log(`Ad set and insights sync process completed for DB Ad Account ID: ${db_ad_account_id}.`);
    return new Response(JSON.stringify({ success: true, message: 'Ad Set sync process completed.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('--- UNHANDLED ERROR CAUGHT IN AD SETS SYNC ---');
    console.error(error);
    return new Response(JSON.stringify({ error: 'Ad sets sync failed: Unhandled error', details: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

/*
Example Test Payload for invoking the function:
{
  "ad_account_id": YOUR_DB_AD_ACCOUNT_ID, (e.g., 123)
  "user_id": "YOUR_USER_UUID" (e.g., "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx")
}

Testing with curl:
ASSERT_JWT=$(supabase tenants api --project-ref igvoqffkhbrlhbfteqgl get --role service_role --claim '{"aud":"authenticated","exp":1735689600,"sub":"YOUR_USER_ID","role":"authenticated"}'  | jq -r '.token')
APP_ORIGIN="https://blayz.io"
PROJECT_ID="igvoqffkhbrlhbfteqgl"
FUNCTION_NAME="sync-ad-sets"
PAYLOAD='{"ad_account_id": 1, "user_id": "YOUR_USER_ID_FROM_AUTH.USERS"}'


curl -i -X POST https://${PROJECT_ID}.supabase.co/functions/v1/${FUNCTION_NAME} \
  -H "Authorization: Bearer ${ASSERT_JWT}" \
  -H "Content-Type: application/json" \
  -H "Origin: ${APP_ORIGIN}" \
  -d "${PAYLOAD}"

To get YOUR_USER_ID_FROM_AUTH.USERS, you can run:
select id from auth.users limit 1;

Make sure the ad_account with id 1 (or whatever you use) exists in your ad_accounts table
and has valid meta_access_token and meta_account_id, and the user_id matches.

To view logs:
supabase functions logs ${FUNCTION_NAME} --project-ref ${PROJECT_ID} --iso-timestamps
*/
