/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
// --- Initialize Supabase Client ---
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey);
const EXPECTED_SHARED_SECRET = Deno.env.get('YOUR_SHARED_SECRET');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
// --- Constants ---
const BASE_AD_FIELDS = 'id,name,status,effective_status,adset_id,campaign_id,creative{id,body,call_to_action_type,image_url,link_url,object_type,title,video_id,image_hash,thumbnail_url,object_story_spec,account_id,actor_id,applink_treatment,effective_instagram_story_id,effective_object_story_id,image_crops,instagram_actor_id,instagram_permalink_url,instagram_story_id,link_deep_link_url,link_og_id,messenger_sponsored_message,name,object_id,object_story_id,object_url,platform_customizations,portrait_customizations,product_set_id,recommender_settings,status,template_url,template_url_spec,url_tags,use_page_actor_override},created_time,updated_time';
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
  'video_p25_watched_actions',
  'video_p50_watched_actions',
  'video_p75_watched_actions',
  'video_p100_watched_actions',
  'video_play_actions',
  'video_avg_time_watched_actions',
  'quality_ranking',
  'engagement_rate_ranking',
  'conversion_rate_ranking',
  'date_start',
  'ad_name'
].join(',');
// --- Time Period Definitions ---
const today = new Date();
// 60-day period for Daily Insights and ALL Breakdowns
const endDate60Days = new Date(today);
const startDate60Days = new Date(today);
startDate60Days.setDate(startDate60Days.getDate() - 60); // Changed to 60 days back
const SIXTY_DAY_TIME_PERIOD = {
  since: startDate60Days.toISOString().split('T')[0],
  until: endDate60Days.toISOString().split('T')[0]
};
// HOURLY_BREAKDOWN_TIME_PERIOD now also uses the 60-day range
const HOURLY_BREAKDOWN_TIME_PERIOD = SIXTY_DAY_TIME_PERIOD;
// --- Breakdown Configurations ---
const AD_BREAKDOWN_CONFIGS = [
  {
    type: 'region',
    apiBreakdowns: ['region'],
    table: 'ad_insights_region',
    uniqueCols: ['ad_id', 'start_date', 'end_date', 'region', 'user_id'],
    fieldMapping: { region: 'region' },
    timePeriod: SIXTY_DAY_TIME_PERIOD,
    timeIncrement: 1
  },
  {
    type: 'device',
    apiBreakdowns: ['device_platform', 'publisher_platform', 'platform_position', 'impression_device'],
    table: 'ad_insights_device',
    uniqueCols: ['ad_id', 'start_date', 'end_date', 'action_device', 'publisher_platform', 'platform_position', 'impression_device', 'user_id'],
    fieldMapping: {
      device_platform: 'action_device',
      publisher_platform: 'publisher_platform',
      platform_position: 'platform_position',
      impression_device: 'impression_device'
    },
    timePeriod: SIXTY_DAY_TIME_PERIOD,
    timeIncrement: 1
  },
  {
    type: 'demographics',
    apiBreakdowns: ['age', 'gender'],
    table: 'ad_insights_demographics',
    uniqueCols: ['ad_id', 'start_date', 'end_date', 'age', 'gender', 'user_id'],
    fieldMapping: { age: 'age', gender: 'gender' },
    timePeriod: SIXTY_DAY_TIME_PERIOD,
    timeIncrement: 1
  },
  {
    type: 'country',
    apiBreakdowns: ['country'],
    table: 'ad_insights_country',
    uniqueCols: ['ad_id', 'start_date', 'end_date', 'country', 'user_id'],
    fieldMapping: { country: 'country' },
    timePeriod: SIXTY_DAY_TIME_PERIOD,
    timeIncrement: 1
  },
  {
    type: 'hourly',
    apiBreakdowns: ['hourly_stats_aggregated_by_audience_time_zone'],
    table: 'ad_insights_hourly',
    uniqueCols: ['insight_id', 'timestamp'],
    fieldMapping: { hourly_stats_aggregated_by_audience_time_zone: 'hour_of_day' },
    timePeriod: HOURLY_BREAKDOWN_TIME_PERIOD,
    timeIncrement: 1
  }
];
// --- Helper function for calculating derived metrics ---
function calculateInsightMetrics(insight: any, optimizationGoal: string | null = null, parentData: any = {}) {
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
    quality_ranking: insight.quality_ranking || parentData.quality_ranking || null,
    engagement_rate_ranking: insight.engagement_rate_ranking || parentData.engagement_rate_ranking || null,
    conversion_rate_ranking: insight.conversion_rate_ranking || parentData.conversion_rate_ranking || null,
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
  (insight.actions || []).forEach((action) => {
    const value = parseInt(action.value || '0', 10);
    if (action.action_type === 'link_click') data.link_clicks += value;
    if (action.action_type === 'onsite_conversion.post_save' || action.action_type === 'post_reaction') data.post_reactions += value;
    if (action.action_type === 'comment') data.post_comments += value;
    if (action.action_type === 'post_share') data.post_shares += value;
    if (action.action_type === 'lead' || action.action_type === 'offsite_conversion.fb_pixel_lead') data.leads += value;
    if (action.action_type === 'purchase' || action.action_type === 'offsite_conversion.fb_pixel_purchase') data.purchases += value;
    if (action.action_type === 'complete_registration' || action.action_type === 'offsite_conversion.fb_pixel_complete_registration') data.registrations += value;
    if (action.action_type === 'landing_page_view') data.landing_page_views += value;
  });
  if (data.impressions > 0 && data.link_clicks > 0) data.link_click_ctr = data.link_clicks / data.impressions * 100;
  else data.link_click_ctr = 0;
  if (data.spend > 0 && data.link_clicks > 0) data.link_click_cpc = data.spend / data.link_clicks;
  else data.link_click_cpc = 0;
  const actionTypeMap: { [key: string]: string[] } = {
    lead: [
      'lead',
      'offsite_conversion.fb_pixel_lead'
    ],
    purchase: [
      'purchase',
      'offsite_conversion.fb_pixel_purchase'
    ],
    complete_registration: [
      'complete_registration',
      'offsite_conversion.fb_pixel_complete_registration'
    ],
    link_click: [
      'link_click'
    ],
    landing_page_view: [
      'landing_page_view'
    ],
    post_engagement: [
      'post_reaction',
      'comment',
      'post_share',
      'onsite_conversion.post_save'
    ],
    video_view: [
      'video_view'
    ],
    event_response: [
      'event_response'
    ],
    app_install: [
      'app_install'
    ]
  };
  let primaryGoalActionTypes: string[] = [];
  const goal = optimizationGoal;
  if (goal) {
    switch (goal.toUpperCase()) {
      case 'LEAD_GENERATION':
      case 'LEADS':
      case 'OUTCOME_LEADS':
        primaryGoalActionTypes = actionTypeMap.lead;
        break;
      case 'CONVERSIONS':
      case 'OFFSITE_CONVERSIONS':
      case 'OUTCOME_SALES':
        primaryGoalActionTypes = actionTypeMap.purchase;
        break;
      case 'LINK_CLICKS':
        primaryGoalActionTypes = actionTypeMap.link_click;
        break;
      case 'POST_ENGAGEMENT':
        primaryGoalActionTypes = actionTypeMap.post_engagement;
        break;
      case 'LANDING_PAGE_VIEWS':
        primaryGoalActionTypes = actionTypeMap.landing_page_view;
        break;
      case 'COMPLETE_REGISTRATION':
        primaryGoalActionTypes = actionTypeMap.complete_registration;
        break;
      case 'REACH':
        data.results = data.reach;
        break;
      case 'IMPRESSIONS':
        data.results = data.impressions;
        break;
      case 'BRAND_AWARENESS':
        data.results = data.reach;
        break;
      case 'EVENT_RESPONSES':
        primaryGoalActionTypes = actionTypeMap.event_response;
        break;
      case 'MESSAGES':
        primaryGoalActionTypes = ['onsite_conversion.messaging_conversation_started_7d'];
        break;
      case 'VIDEO_VIEWS':
        primaryGoalActionTypes = actionTypeMap.video_view;
        break;
      case 'APP_INSTALLS':
        primaryGoalActionTypes = actionTypeMap.app_install;
        break;
      case 'TRAFFIC':
        primaryGoalActionTypes = actionTypeMap.link_click;
        break;
      default:
        console.warn(`Unmapped optimization_goal for results calculation: ${goal}.`);
        break;
    }
  }
  if (primaryGoalActionTypes.length > 0) (insight.actions || []).forEach((action) => {
    if (primaryGoalActionTypes.includes(action.action_type)) data.results += parseInt(action.value || '0', 10);
  });
  if (goal?.toUpperCase() === 'VIDEO_VIEWS') {
    const videoPlayAction = insight.video_play_actions?.find((a) => a.action_type === 'video_view');
    data.results = videoPlayAction ? parseInt(videoPlayAction.value || '0', 10) : 0;
  }
  if (data.results > 0 && data.spend >= 0) data.cpa = data.spend / data.results;
  else if (data.results === 0 && data.spend > 0) data.cpa = data.spend;
  else data.cpa = 0;
  data.value_per_conversion = 0;
  (insight.action_values || []).forEach((actionValue: any) => {
    if ((actionTypeMap.purchase || []).includes(actionValue.action_type)) {
      data.value_per_conversion += parseFloat(actionValue.value || '0');
    }
  });
  if (data.value_per_conversion > 0 && data.spend > 0) data.roas = data.value_per_conversion / data.spend;
  else data.roas = 0;
  if (data.link_clicks > 0 && data.results > 0 && primaryGoalActionTypes.length > 0 && !['link_click', 'reach', 'impression', 'post_engagement', 'video_view'].some((type) => primaryGoalActionTypes.includes(type))) data.conversion_rate = data.results / data.link_clicks * 100;
  else if (primaryGoalActionTypes.includes('link_click') && data.impressions > 0) data.conversion_rate = data.link_clicks / data.impressions * 100;
  else data.conversion_rate = 0;
  const videoPlayAction = insight.video_play_actions?.find((a) => a.action_type === 'video_view');
  data.video_views = videoPlayAction ? parseInt(videoPlayAction.value || '0', 10) : 0;
  const videoP100 = insight.video_p100_watched_actions?.find((a) => a.action_type === 'video_view');
  if (data.video_views > 0 && videoP100) data.video_completion_rate = parseInt(videoP100.value || '0', 10) / data.video_views * 100;
  else data.video_completion_rate = 0;
  const avgTimeWatched = insight.video_avg_time_watched_actions?.find((a) => a.action_type === 'video_view');
  data.average_watch_time = avgTimeWatched ? parseInt(avgTimeWatched.value || '0', 10) : 0;
  for (const key in data) {
    if (typeof data[key] === 'number' && !Number.isFinite(data[key])) data[key] = 0;
    if (['link_click_cpc', 'cpa', 'cpc', 'spend', 'value_per_conversion'].includes(key)) data[key] = parseFloat(data[key].toFixed(4));
    else if (['link_click_ctr', 'ctr', 'cpm', 'roas', 'frequency', 'conversion_rate', 'video_completion_rate'].includes(key)) data[key] = parseFloat(data[key].toFixed(4));
  }
  return data;
}

async function getAdSetOptimizationGoal(adSetId: string, userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('ad_sets')
    .select('optimization_goal')
    .eq('ad_set_id', adSetId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    console.warn(`Could not fetch optimization goal for ad set ${adSetId}:`, error?.message);
    return null;
  }

  return data.optimization_goal;
}

// --- Helper: Fetch Meta Ads ---
async function fetchMetaAds(accessToken: string, adAccountId: string): Promise<any[]> {
  const url = `https://graph.facebook.com/v19.0/${adAccountId}/ads?fields=${BASE_AD_FIELDS}&access_token=${accessToken}&limit=500`;
  const response = await fetch(url);
  if (!response.ok) {
    const errorData = await response.json();
    console.error('Error fetching Meta ads:', errorData);
    throw new Error(`Failed to fetch Meta ads: ${response.statusText}`);
  }
  const data = await response.json();
  return data.data || [];
}

// --- Helper: Fetch Daily Insights for Ads ---
async function fetchDailyInsights(adId: string, accessToken: string, timePeriod: { since: string; until: string }) {
  const url = `https://graph.facebook.com/v19.0/${adId}/insights?fields=${BASE_INSIGHT_FIELDS}&time_range=${JSON.stringify(timePeriod)}&time_increment=1&access_token=${accessToken}&limit=500`;
  const response = await fetch(url);
  if (!response.ok) {
    const errorData = await response.json();
    console.error(`Error fetching daily insights for ad ${adId}:`, errorData);
    throw new Error(`Failed to fetch daily insights for ad ${adId}: ${response.statusText}`);
  }
  const data = await response.json();
  return data.data || [];
}

// --- Helper: Fetch Breakdown Insights for Ads ---
async function fetchAdBreakdownInsights(adId: string, accessToken: string, config: any): Promise<any[]> {
  let fields = BASE_INSIGHT_FIELDS;
  let url = `https://graph.facebook.com/v19.0/${adId}/insights?fields=${fields}&breakdowns=${config.apiBreakdowns.join(',')}&time_range=${JSON.stringify(config.timePeriod)}&time_increment=${config.timeIncrement}&access_token=${accessToken}&limit=500`;

  if (config.include_action_breakdown) {
    url += '&action_breakdowns=action_type';
  }

  const response = await fetch(url);
  if (!response.ok) {
    const errorData = await response.json();
    console.error(`Error fetching breakdown insights for ad ${adId}, breakdown ${config.type}:`, errorData);
    throw new Error(`Failed to fetch ${config.type} breakdown insights for ad ${adId}: ${response.statusText}`);
  }
  const data = await response.json();
  return data.data || [];
}

// --- Helper: Transform Country Breakdown Insight ---
function transformCountryInsight(insight: any, dbAdId: number, userId: string, timePeriod: { since: string; until: string }) {
  const calculatedMetrics = calculateInsightMetrics(insight);
  
  return {
    ad_id: dbAdId, // Use database ad ID
    country: insight.country || 'UNKNOWN',
    start_date: insight.date_start, // Use actual date from insight
    end_date: insight.date_stop || insight.date_start, // Use date_stop or fallback to date_start
    user_id: userId,
    created_at: new Date().toISOString(),
    // All performance metrics
    spend: calculatedMetrics.spend,
    impressions: calculatedMetrics.impressions,
    reach: calculatedMetrics.reach,
    frequency: calculatedMetrics.frequency,
    clicks: calculatedMetrics.clicks,
    ctr: calculatedMetrics.ctr,
    cpm: calculatedMetrics.cpm,
    cpc: calculatedMetrics.cpc,
    results: calculatedMetrics.results,
    cpa: calculatedMetrics.cpa,
    roas: calculatedMetrics.roas,
    conversion_rate: calculatedMetrics.conversion_rate,
    value_per_conversion: calculatedMetrics.value_per_conversion,
    quality_ranking: calculatedMetrics.quality_ranking,
    engagement_rate_ranking: calculatedMetrics.engagement_rate_ranking,
    conversion_rate_ranking: calculatedMetrics.conversion_rate_ranking,
    post_reactions: calculatedMetrics.post_reactions,
    post_comments: calculatedMetrics.post_comments,
    post_shares: calculatedMetrics.post_shares,
    video_views: calculatedMetrics.video_views,
    video_completion_rate: calculatedMetrics.video_completion_rate,
    average_watch_time: calculatedMetrics.average_watch_time,
    landing_page_views: calculatedMetrics.landing_page_views,
    leads: calculatedMetrics.leads,
    purchases: calculatedMetrics.purchases,
    registrations: calculatedMetrics.registrations,
    link_clicks: calculatedMetrics.link_clicks,
    link_click_cpc: calculatedMetrics.link_click_cpc,
    link_click_ctr: calculatedMetrics.link_click_ctr
  };
}

// --- Helper: Transform Demographics Breakdown Insight ---
function transformDemographicsInsight(insight: any, dbAdId: number, userId: string, timePeriod: { since: string; until: string }) {
  const calculatedMetrics = calculateInsightMetrics(insight);
  
  return {
    ad_id: dbAdId, // Use database ad ID
    age: insight.age || 'UNKNOWN',
    gender: insight.gender || 'UNKNOWN',
    start_date: insight.date_start, // Use actual date from insight
    end_date: insight.date_stop || insight.date_start, // Use date_stop or fallback to date_start
    user_id: userId,
    created_at: new Date().toISOString(),
    // All performance metrics
    spend: calculatedMetrics.spend,
    impressions: calculatedMetrics.impressions,
    reach: calculatedMetrics.reach,
    frequency: calculatedMetrics.frequency,
    clicks: calculatedMetrics.clicks,
    ctr: calculatedMetrics.ctr,
    cpm: calculatedMetrics.cpm,
    cpc: calculatedMetrics.cpc,
    results: calculatedMetrics.results,
    cpa: calculatedMetrics.cpa,
    roas: calculatedMetrics.roas,
    conversion_rate: calculatedMetrics.conversion_rate,
    value_per_conversion: calculatedMetrics.value_per_conversion,
    quality_ranking: calculatedMetrics.quality_ranking,
    engagement_rate_ranking: calculatedMetrics.engagement_rate_ranking,
    conversion_rate_ranking: calculatedMetrics.conversion_rate_ranking,
    post_reactions: calculatedMetrics.post_reactions,
    post_comments: calculatedMetrics.post_comments,
    post_shares: calculatedMetrics.post_shares,
    video_views: calculatedMetrics.video_views,
    video_completion_rate: calculatedMetrics.video_completion_rate,
    average_watch_time: calculatedMetrics.average_watch_time,
    landing_page_views: calculatedMetrics.landing_page_views,
    leads: calculatedMetrics.leads,
    purchases: calculatedMetrics.purchases,
    registrations: calculatedMetrics.registrations,
    link_clicks: calculatedMetrics.link_clicks,
    link_click_cpc: calculatedMetrics.link_click_cpc,
    link_click_ctr: calculatedMetrics.link_click_ctr
  };
}

// --- Helper: Transform Device Breakdown Insight ---
function transformDeviceInsight(insight: any, dbAdId: number, userId: string, timePeriod: { since: string; until: string }) {
  const calculatedMetrics = calculateInsightMetrics(insight);
  
  return {
    ad_id: dbAdId, // Use database ad ID
    action_device: insight.device_platform || null,
    publisher_platform: insight.publisher_platform || null,
    platform_position: insight.platform_position || null,
    impression_device: insight.impression_device || null,
    start_date: insight.date_start, // Use actual date from insight
    end_date: insight.date_stop || insight.date_start, // Use date_stop or fallback to date_start
    user_id: userId,
    created_at: new Date().toISOString(),
    // All performance metrics
    spend: calculatedMetrics.spend,
    impressions: calculatedMetrics.impressions,
    reach: calculatedMetrics.reach,
    frequency: calculatedMetrics.frequency,
    clicks: calculatedMetrics.clicks,
    ctr: calculatedMetrics.ctr,
    cpm: calculatedMetrics.cpm,
    cpc: calculatedMetrics.cpc,
    results: calculatedMetrics.results,
    cpa: calculatedMetrics.cpa,
    roas: calculatedMetrics.roas,
    conversion_rate: calculatedMetrics.conversion_rate,
    value_per_conversion: calculatedMetrics.value_per_conversion,
    quality_ranking: calculatedMetrics.quality_ranking,
    engagement_rate_ranking: calculatedMetrics.engagement_rate_ranking,
    conversion_rate_ranking: calculatedMetrics.conversion_rate_ranking,
    post_reactions: calculatedMetrics.post_reactions,
    post_comments: calculatedMetrics.post_comments,
    post_shares: calculatedMetrics.post_shares,
    video_views: calculatedMetrics.video_views,
    video_completion_rate: calculatedMetrics.video_completion_rate,
    average_watch_time: calculatedMetrics.average_watch_time,
    landing_page_views: calculatedMetrics.landing_page_views,
    leads: calculatedMetrics.leads,
    purchases: calculatedMetrics.purchases,
    registrations: calculatedMetrics.registrations,
    link_clicks: calculatedMetrics.link_clicks,
    link_click_cpc: calculatedMetrics.link_click_cpc,
    link_click_ctr: calculatedMetrics.link_click_ctr
  };
}

// --- Helper: Transform Region Breakdown Insight ---
function transformRegionInsight(insight: any, dbAdId: number, userId: string, timePeriod: { since: string; until: string }) {
  const calculatedMetrics = calculateInsightMetrics(insight);
  
  return {
    ad_id: dbAdId, // Use database ad ID
    region: insight.region || null,
    start_date: insight.date_start, // Use actual date from insight
    end_date: insight.date_stop || insight.date_start, // Use date_stop or fallback to date_start
    user_id: userId,
    created_at: new Date().toISOString(),
    // All performance metrics
    spend: calculatedMetrics.spend,
    impressions: calculatedMetrics.impressions,
    reach: calculatedMetrics.reach,
    frequency: calculatedMetrics.frequency,
    clicks: calculatedMetrics.clicks,
    ctr: calculatedMetrics.ctr,
    cpm: calculatedMetrics.cpm,
    cpc: calculatedMetrics.cpc,
    results: calculatedMetrics.results,
    cpa: calculatedMetrics.cpa,
    roas: calculatedMetrics.roas,
    conversion_rate: calculatedMetrics.conversion_rate,
    value_per_conversion: calculatedMetrics.value_per_conversion,
    quality_ranking: calculatedMetrics.quality_ranking,
    engagement_rate_ranking: calculatedMetrics.engagement_rate_ranking,
    conversion_rate_ranking: calculatedMetrics.conversion_rate_ranking,
    post_reactions: calculatedMetrics.post_reactions,
    post_comments: calculatedMetrics.post_comments,
    post_shares: calculatedMetrics.post_shares,
    video_views: calculatedMetrics.video_views,
    video_completion_rate: calculatedMetrics.video_completion_rate,
    average_watch_time: calculatedMetrics.average_watch_time,
    landing_page_views: calculatedMetrics.landing_page_views,
    leads: calculatedMetrics.leads,
    purchases: calculatedMetrics.purchases,
    registrations: calculatedMetrics.registrations,
    link_clicks: calculatedMetrics.link_clicks,
    link_click_cpc: calculatedMetrics.link_click_cpc,
    link_click_ctr: calculatedMetrics.link_click_ctr
  };
}

// --- Helper: Transform Hourly Breakdown Insight ---
function transformHourlyInsight(insight: any, adInsightId: number, userId: string, timePeriod: { since: string; until: string }) {
  const calculatedMetrics = calculateInsightMetrics(insight);
  
  // Extract hour from hourly_stats_aggregated_by_audience_time_zone if available
  let hourOfDay: number | null = null;
  let timestamp: string | null = null;
  let timezone: string | null = null;
  
  if (insight.hourly_stats_aggregated_by_audience_time_zone) {
    // The hourly breakdown comes as a string like "00:00:00 - 00:59:59"
    const hourString = insight.hourly_stats_aggregated_by_audience_time_zone;
    
    // Extract the start hour from the range (e.g., "00:00:00 - 00:59:59" -> "00:00:00") 
    const startHour = hourString.split(' - ')[0];
    hourOfDay = parseInt(startHour.split(':')[0], 10);
    timestamp = `${insight.date_start}T${startHour}`;
    timezone = 'audience_time_zone'; // Meta API uses audience timezone
  }
  
  // Fallback: extract hour from date_start if available
  if (hourOfDay === null && insight.date_start) {
    const date = new Date(insight.date_start);
    hourOfDay = date.getHours();
    timestamp = insight.date_start;
    timezone = 'UTC';
  }
  
  return {
    insight_id: adInsightId, // Reference to ad_insights table
    timestamp: timestamp || insight.date_start,
    hour_of_day: hourOfDay,
    timezone: timezone,
    user_id: userId,
    created_at: new Date().toISOString(),
    // All performance metrics
    spend: calculatedMetrics.spend,
    impressions: calculatedMetrics.impressions,
    reach: calculatedMetrics.reach,
    frequency: calculatedMetrics.frequency,
    clicks: calculatedMetrics.clicks,
    ctr: calculatedMetrics.ctr,
    cpm: calculatedMetrics.cpm,
    cpc: calculatedMetrics.cpc,
    results: calculatedMetrics.results,
    cpa: calculatedMetrics.cpa,
    roas: calculatedMetrics.roas,
    conversion_rate: calculatedMetrics.conversion_rate,
    value_per_conversion: calculatedMetrics.value_per_conversion,
    quality_ranking: calculatedMetrics.quality_ranking,
    engagement_rate_ranking: calculatedMetrics.engagement_rate_ranking,
    conversion_rate_ranking: calculatedMetrics.conversion_rate_ranking,
    post_reactions: calculatedMetrics.post_reactions,
    post_comments: calculatedMetrics.post_comments,
    post_shares: calculatedMetrics.post_shares,
    video_views: calculatedMetrics.video_views,
    video_completion_rate: calculatedMetrics.video_completion_rate,
    average_watch_time: calculatedMetrics.average_watch_time,
    landing_page_views: calculatedMetrics.landing_page_views,
    leads: calculatedMetrics.leads,
    purchases: calculatedMetrics.purchases,
    registrations: calculatedMetrics.registrations,
    link_clicks: calculatedMetrics.link_clicks,
    link_click_cpc: calculatedMetrics.link_click_cpc,
    link_click_ctr: calculatedMetrics.link_click_ctr
  };
}

// --- Helper: Transform Ad Data ---
function transformAd(ad: any, dbAdAccountId: number, userId: string) {
  const creative = ad.creative || {};
  
  // Determine media type based on creative assets
  let mediaType = 'UNKNOWN';
  if (creative.video_id) {
    mediaType = 'VIDEO';
  } else if (creative.image_url) {
    mediaType = 'IMAGE';
  } else if (creative.object_type === 'SHARE') {
    mediaType = 'LINK'; // For link/carousel/collection ads
  }
  
  return {
    ad_id: ad.id,
    ad_set_id: ad.adset_id,
    campaign_id: ad.campaign_id,
    name: ad.name,
    status: ad.status,
    effective_status: ad.effective_status,
    creative_id: creative.id,
    meta_creative_id: creative.id,
    media_type: mediaType, // Main media type field for database
    creative_media_type: mediaType,
    creative_media_url: creative.image_url || creative.video_id,
    created_time: ad.created_time,
    updated_time: ad.updated_time,
    ad_account_id: dbAdAccountId,
    user_id: userId,
    // Creative details
    primary_text: creative.body,
    headline: creative.title,
    description: null, // link_description field doesn't exist in Meta API
    call_to_action_type: creative.call_to_action_type,
    link_url: creative.link_url,
    image_url: creative.image_url,
    video_id: creative.video_id,
    // Meta IDs for reference
    meta_ad_id: ad.id,
    meta_ad_set_id: ad.adset_id,
    meta_campaign_id: ad.campaign_id,
    synced_at: new Date().toISOString()
  };
}

// --- Helper: Transform Ad Insight Data ---
function transformAdInsight(insight: any, adId: string, dbAdAccountId: number, userId: string, campaignId: string, adSetId: string, optimizationGoal: string | null = null, mediaType: string = 'UNKNOWN') {
  const calculatedMetrics = calculateInsightMetrics(insight, optimizationGoal);
  
  return {
    ad_id: adId,
    ad_set_id: adSetId,
    campaign_id: campaignId,
    ad_account_id: dbAdAccountId,
    user_id: userId,
    date: insight.date_start,
    ad_name: insight.ad_name,
    media_type: mediaType,
    created_at: new Date().toISOString(),
    // All calculated metrics from calculateInsightMetrics
    spend: calculatedMetrics.spend,
    impressions: calculatedMetrics.impressions,
    reach: calculatedMetrics.reach,
    frequency: calculatedMetrics.frequency,
    clicks: calculatedMetrics.clicks,
    ctr: calculatedMetrics.ctr,
    cpm: calculatedMetrics.cpm,
    cpc: calculatedMetrics.cpc,
    results: calculatedMetrics.results,
    cpa: calculatedMetrics.cpa,
    roas: calculatedMetrics.roas,
    conversion_rate: calculatedMetrics.conversion_rate,
    value_per_conversion: calculatedMetrics.value_per_conversion,
    quality_ranking: calculatedMetrics.quality_ranking,
    engagement_rate_ranking: calculatedMetrics.engagement_rate_ranking,
    conversion_rate_ranking: calculatedMetrics.conversion_rate_ranking,
    video_views: calculatedMetrics.video_views,
    video_completion_rate: calculatedMetrics.video_completion_rate,
    post_reactions: calculatedMetrics.post_reactions,
    post_comments: calculatedMetrics.post_comments,
    post_shares: calculatedMetrics.post_shares,
    average_watch_time: calculatedMetrics.average_watch_time,
    landing_page_views: calculatedMetrics.landing_page_views,
    leads: calculatedMetrics.leads,
    purchases: calculatedMetrics.purchases,
    registrations: calculatedMetrics.registrations,
    link_clicks: calculatedMetrics.link_clicks,
    link_click_cpc: calculatedMetrics.link_click_cpc,
    link_click_ctr: calculatedMetrics.link_click_ctr
  };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Authorization checks
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: 401 
    });
  }
  
  const token = authHeader.replace('Bearer ', '');
  if (token !== EXPECTED_SHARED_SECRET && token !== SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: 401 
    });
  }

  try {
    const { user_id, meta_ad_account_id, db_ad_account_id } = await req.json();

    if (!user_id || !meta_ad_account_id || !db_ad_account_id) {
      return new Response(JSON.stringify({ error: 'user_id, meta_ad_account_id, and db_ad_account_id are required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Get Meta access token
    const { data: metaAccessToken, error: rpcError } = await supabase.rpc('get_meta_long_lived_token_by_user_id', { 
      user_id_param: user_id 
    });

    if (rpcError || !metaAccessToken) {
      return new Response(JSON.stringify({ error: `Failed to fetch meta access token: ${rpcError?.message || 'No token found'}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: rpcError ? 500 : 404,
      });
    }

    console.log(`Starting ads sync for DB Ad Account ID: ${db_ad_account_id}, Meta Ad Account ID: ${meta_ad_account_id}`);

    // --- Fetch and Upsert Ads ---
    const adsFromApi = await fetchMetaAds(metaAccessToken, meta_ad_account_id);

    if (adsFromApi.length === 0) {
      console.log(`No ads found for Meta account ${meta_ad_account_id}.`);
      return new Response(JSON.stringify({ message: "No ads found." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const adsToUpsert = adsFromApi.map((ad: any) => transformAd(ad, db_ad_account_id, user_id));

    const { data: upsertedAds, error: adUpsertError } = await supabase
      .from('ads')
      .upsert(adsToUpsert, { onConflict: 'ad_id, user_id' })
      .select('id, ad_id, ad_set_id, campaign_id');

    if (adUpsertError) {
      console.error('Error upserting ads:', adUpsertError);
      throw adUpsertError;
    }

    console.log(`Successfully synced ${upsertedAds.length} ads for Meta account ${meta_ad_account_id}.`);

    // --- Process Insights for Each Ad ---
    for (const ad of upsertedAds) {
      const { ad_id: metaAdId, ad_set_id: adSetId, campaign_id: campaignId } = ad;
      console.log(`Processing insights for Ad ${metaAdId}`);

      try {
        // Get optimization goal from ad set
        const optimizationGoal = await getAdSetOptimizationGoal(adSetId, user_id);

        // Get the media type from the original ad data
        const originalAd = adsFromApi.find(a => a.id === metaAdId);
        let mediaType = 'UNKNOWN';
        if (originalAd?.creative) {
          const creative = originalAd.creative;
          if (creative.video_id) {
            mediaType = 'VIDEO';
          } else if (creative.image_url) {
            mediaType = 'IMAGE';
          } else if (creative.object_type === 'SHARE') {
            mediaType = 'LINK';
          }
        }

        // Fetch daily insights
        const dailyInsightsFromApi = await fetchDailyInsights(metaAdId, metaAccessToken, SIXTY_DAY_TIME_PERIOD);

        if (dailyInsightsFromApi.length > 0) {
          const dailyInsightsToUpsert = dailyInsightsFromApi.map((insight: any) =>
            transformAdInsight(insight, metaAdId, db_ad_account_id, user_id, campaignId, adSetId, optimizationGoal, mediaType)
          );

          const { error: dailyInsightError } = await supabase
            .from('ad_insights')
            .upsert(dailyInsightsToUpsert, { onConflict: 'ad_id, date, user_id' });

          if (dailyInsightError) {
            console.error(`Error upserting daily insights for Ad ${metaAdId}:`, dailyInsightError);
            continue;
          }

          console.log(`Synced ${dailyInsightsToUpsert.length} daily insight records for Ad ${metaAdId}.`);
        } else {
          console.log(`No daily insights found for Ad ${metaAdId}.`);
        }

        // --- Process Breakdown Insights for this Ad ---
        const dbAdId = ad.id; // Use the database ID for breakdown insights
        
        // Process Country Breakdown specifically
        const countryConfig = AD_BREAKDOWN_CONFIGS.find(config => config.type === 'country');
        if (countryConfig) {
          try {
            console.log(`Fetching country breakdown for Ad ${metaAdId}`);
            const countryInsights = await fetchAdBreakdownInsights(metaAdId, metaAccessToken, countryConfig);
            
            if (countryInsights.length > 0) {
              const countryInsightsToUpsert = countryInsights.map((insight: any) =>
                transformCountryInsight(insight, dbAdId, user_id, SIXTY_DAY_TIME_PERIOD)
              );

              // Deduplicate records based on unique constraint (ad_id, start_date, end_date, country, user_id)
              const uniqueRecords = [];
              const seenKeys = new Set();
              
              for (const record of countryInsightsToUpsert) {
                const key = `${record.ad_id}|${record.start_date}|${record.end_date}|${record.country}|${record.user_id}`;
                if (!seenKeys.has(key)) {
                  seenKeys.add(key);
                  uniqueRecords.push(record);
                }
              }

              const { error: countryInsightError } = await supabase
                .from('ad_insights_country')
                .upsert(uniqueRecords, { onConflict: 'ad_id, start_date, end_date, country, user_id' });

              if (countryInsightError) {
                console.error(`Error upserting country insights for Ad ${metaAdId}:`, countryInsightError);
              } else {
                console.log(`Synced ${uniqueRecords.length} unique country breakdown records for Ad ${metaAdId} (${countryInsightsToUpsert.length} total received).`);
              }
            } else {
              console.log(`No country breakdown insights found for Ad ${metaAdId}.`);
            }
          } catch (error) {
            console.error(`Error processing country breakdown for Ad ${metaAdId}: ${error.message}`);
          }
        }

        // Process Demographics Breakdown 
        const demographicsConfig = AD_BREAKDOWN_CONFIGS.find(config => config.type === 'demographics');
        if (demographicsConfig) {
          try {
            console.log(`Fetching demographics breakdown for Ad ${metaAdId}`);
            const demographicsInsights = await fetchAdBreakdownInsights(metaAdId, metaAccessToken, demographicsConfig);
            
            if (demographicsInsights.length > 0) {
              const demographicsInsightsToUpsert = demographicsInsights.map((insight: any) =>
                transformDemographicsInsight(insight, dbAdId, user_id, SIXTY_DAY_TIME_PERIOD)
              );

              // Deduplicate records based on unique constraint (ad_id, start_date, end_date, age, gender, user_id)
              const uniqueRecords = [];
              const seenKeys = new Set();
              
              for (const record of demographicsInsightsToUpsert) {
                const key = `${record.ad_id}|${record.start_date}|${record.end_date}|${record.age}|${record.gender}|${record.user_id}`;
                if (!seenKeys.has(key)) {
                  seenKeys.add(key);
                  uniqueRecords.push(record);
                }
              }

              const { error: demographicsInsightError } = await supabase
                .from('ad_insights_demographics')
                .upsert(uniqueRecords, { onConflict: 'ad_id, start_date, end_date, age, gender, user_id' });

              if (demographicsInsightError) {
                console.error(`Error upserting demographics insights for Ad ${metaAdId}:`, demographicsInsightError);
              } else {
                console.log(`Synced ${uniqueRecords.length} unique demographics breakdown records for Ad ${metaAdId} (${demographicsInsightsToUpsert.length} total received).`);
              }
            } else {
              console.log(`No demographics breakdown insights found for Ad ${metaAdId}.`);
            }
          } catch (error) {
            console.error(`Error processing demographics breakdown for Ad ${metaAdId}: ${error.message}`);
          }
        }

        // Process Device Breakdown 
        const deviceConfig = AD_BREAKDOWN_CONFIGS.find(config => config.type === 'device');
        if (deviceConfig) {
          try {
            console.log(`Fetching device breakdown for Ad ${metaAdId}`);
            const deviceInsights = await fetchAdBreakdownInsights(metaAdId, metaAccessToken, deviceConfig);
            
            if (deviceInsights.length > 0) {
              const deviceInsightsToUpsert = deviceInsights.map((insight: any) =>
                transformDeviceInsight(insight, dbAdId, user_id, SIXTY_DAY_TIME_PERIOD)
              );

              // Deduplicate records based on unique constraint (ad_id, start_date, end_date, action_device, publisher_platform, platform_position, impression_device, user_id)
              const uniqueRecords = [];
              const seenKeys = new Set();
              
              for (const record of deviceInsightsToUpsert) {
                const key = `${record.ad_id}|${record.start_date}|${record.end_date}|${record.action_device}|${record.publisher_platform}|${record.platform_position}|${record.impression_device}|${record.user_id}`;
                if (!seenKeys.has(key)) {
                  seenKeys.add(key);
                  uniqueRecords.push(record);
                }
              }

              const { error: deviceInsightError } = await supabase
                .from('ad_insights_device')
                .upsert(uniqueRecords, { onConflict: 'ad_id, start_date, end_date, action_device, publisher_platform, platform_position, impression_device, user_id' });

              if (deviceInsightError) {
                console.error(`Error upserting device insights for Ad ${metaAdId}:`, deviceInsightError);
              } else {
                console.log(`Synced ${uniqueRecords.length} unique device breakdown records for Ad ${metaAdId} (${deviceInsightsToUpsert.length} total received).`);
              }
            } else {
              console.log(`No device breakdown insights found for Ad ${metaAdId}.`);
            }
          } catch (error) {
            console.error(`Error processing device breakdown for Ad ${metaAdId}: ${error.message}`);
          }
        }

        // Process Region Breakdown 
        const regionConfig = AD_BREAKDOWN_CONFIGS.find(config => config.type === 'region');
        if (regionConfig) {
          try {
            console.log(`Fetching region breakdown for Ad ${metaAdId}`);
            const regionInsights = await fetchAdBreakdownInsights(metaAdId, metaAccessToken, regionConfig);
            
            if (regionInsights.length > 0) {
              const regionInsightsToUpsert = regionInsights.map((insight: any) =>
                transformRegionInsight(insight, dbAdId, user_id, SIXTY_DAY_TIME_PERIOD)
              );

              // Deduplicate records based on unique constraint (ad_id, start_date, end_date, region, user_id)
              const uniqueRecords = [];
              const seenKeys = new Set();
              
              for (const record of regionInsightsToUpsert) {
                const key = `${record.ad_id}|${record.start_date}|${record.end_date}|${record.region}|${record.user_id}`;
                if (!seenKeys.has(key)) {
                  seenKeys.add(key);
                  uniqueRecords.push(record);
                }
              }

              const { error: regionInsightError } = await supabase
                .from('ad_insights_region')
                .upsert(uniqueRecords, { onConflict: 'ad_id, start_date, end_date, region, user_id' });

              if (regionInsightError) {
                console.error(`Error upserting region insights for Ad ${metaAdId}:`, regionInsightError);
              } else {
                console.log(`Synced ${uniqueRecords.length} unique region breakdown records for Ad ${metaAdId} (${regionInsightsToUpsert.length} total received).`);
              }
            } else {
              console.log(`No region breakdown insights found for Ad ${metaAdId}.`);
            }
          } catch (error) {
            console.error(`Error processing region breakdown for Ad ${metaAdId}: ${error.message}`);
          }
        }

        // Process Hourly Breakdown (requires existing ad_insights records)
        if (dailyInsightsFromApi.length > 0) {
          const hourlyConfig = AD_BREAKDOWN_CONFIGS.find(config => config.type === 'hourly');
          if (hourlyConfig) {
            try {
              console.log(`Fetching hourly breakdown for Ad ${metaAdId}`);
              const hourlyInsights = await fetchAdBreakdownInsights(metaAdId, metaAccessToken, hourlyConfig);
              
              if (hourlyInsights.length > 0) {
                // Get the corresponding ad_insights records to link hourly data
                const { data: adInsightsRecords, error: fetchError } = await supabase
                  .from('ad_insights')
                  .select('id, date, ad_id')
                  .eq('ad_id', metaAdId)
                  .eq('user_id', user_id)
                  .gte('date', SIXTY_DAY_TIME_PERIOD.since)
                  .lte('date', SIXTY_DAY_TIME_PERIOD.until);

                if (fetchError) {
                  console.error(`Error fetching ad_insights records for hourly breakdown: ${fetchError.message}`);
                } else if (adInsightsRecords && adInsightsRecords.length > 0) {
                  const hourlyInsightsToUpsert = [];
                  
                  for (const hourlyInsight of hourlyInsights) {
                    // Find the corresponding ad_insights record by date
                    const matchingAdInsight = adInsightsRecords.find(record => 
                      record.date === hourlyInsight.date_start
                    );
                    
                    if (matchingAdInsight) {
                      const transformedHourly = transformHourlyInsight(
                        hourlyInsight, 
                        matchingAdInsight.id, 
                        user_id, 
                        SIXTY_DAY_TIME_PERIOD
                      );
                      hourlyInsightsToUpsert.push(transformedHourly);
                    }
                  }

                  if (hourlyInsightsToUpsert.length > 0) {
                    // Deduplicate records based on unique constraint (insight_id, timestamp, user_id)
                    const uniqueRecords = [];
                    const seenKeys = new Set();
                    
                    for (const record of hourlyInsightsToUpsert) {
                      const key = `${record.insight_id}|${record.timestamp}|${record.user_id}`;
                      if (!seenKeys.has(key)) {
                        seenKeys.add(key);
                        uniqueRecords.push(record);
                      }
                    }

                    const { error: hourlyInsightError } = await supabase
                      .from('ad_insights_hourly')
                      .upsert(uniqueRecords, { onConflict: 'insight_id, timestamp, user_id' });

                    if (hourlyInsightError) {
                      console.error(`Error upserting hourly insights for Ad ${metaAdId}:`, hourlyInsightError);
                    } else {
                      console.log(`Synced ${uniqueRecords.length} unique hourly breakdown records for Ad ${metaAdId} (${hourlyInsightsToUpsert.length} total received).`);
                    }
                  } else {
                    console.log(`No matching ad_insights records found for hourly breakdown for Ad ${metaAdId}.`);
                  }
                } else {
                  console.log(`No ad_insights records found to link hourly breakdown for Ad ${metaAdId}.`);
                }
              } else {
                console.log(`No hourly breakdown insights found for Ad ${metaAdId}.`);
              }
            } catch (error) {
              console.error(`Error processing hourly breakdown for Ad ${metaAdId}: ${error.message}`);
            }
          }
        }

      } catch (error) {
        console.error(`Error processing insights for Ad ${metaAdId}: ${error.message}`);
        continue;
      }
    }

    console.log(`Ads and insights sync process completed for DB Ad Account ID: ${db_ad_account_id}.`);
    return new Response(JSON.stringify({ success: true, message: 'Ads and insights synced successfully.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in sync-ads:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}); 