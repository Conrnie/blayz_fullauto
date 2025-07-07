/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey);
const EXPECTED_SHARED_SECRET = Deno.env.get('YOUR_SHARED_SECRET');

// Log for debugging environment variables
console.log("SUPABASE_URL is set:", !!supabaseUrl);
console.log("SUPABASE_SERVICE_ROLE_KEY is set:", !!supabaseServiceKey);
console.log("YOUR_SHARED_SECRET is set:", !!EXPECTED_SHARED_SECRET);

// --- Constants ---
const BASE_CAMPAIGN_FIELDS = 'id,name,status,effective_status,objective,buying_type,daily_budget,lifetime_budget,start_time,stop_time,created_time,updated_time';

// Request actions needed for calculations
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
  'date_start'
].join(',');

// Updated to 60 days lookback for better data coverage
const today = new Date();
const endDate60Days = new Date(today);
const startDate60Days = new Date(today);
startDate60Days.setDate(startDate60Days.getDate() - 60); // Extended to 60 days for better data coverage
const DAILY_INSIGHTS_TIME_PERIOD = {
  since: startDate60Days.toISOString().split('T')[0],
  until: endDate60Days.toISOString().split('T')[0]
};

// --- Define Interface for Insight Results ---
interface InsightResult {
  metaCampaignId: string;
  success: boolean;
  insightsCount?: number;
  message?: string;
  error?: string;
}

// --- Helper function for calculating derived metrics ---
function calculateInsightMetrics(insight: any, campaignObjective: string | null = null, parentData: any = {}) {
  // Initialize with values directly from insight or defaults
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

  // --- Extract specific actions and aggregate ---
  (insight.actions || []).forEach((action: any) => {
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

  // --- Calculate Link Click specific metrics ---
  if (data.impressions > 0 && data.link_clicks > 0) {
    data.link_click_ctr = (data.link_clicks / data.impressions) * 100;
  }
  if (data.spend > 0 && data.link_clicks > 0) {
    data.link_click_cpc = data.spend / data.link_clicks;
  }

  // --- Calculate Results and CPA based on Objective ---
  // Use a mapping to handle variations of action types
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
    ]
  };

  let primaryGoalActionTypes: string[] = []; // Can be an array if objective maps to multiple actions

  if (campaignObjective) {
    switch(campaignObjective.toUpperCase()){
      case 'LEAD_GENERATION':
      case 'OUTCOME_LEADS':
        primaryGoalActionTypes = actionTypeMap.lead;
        break;
      case 'CONVERSIONS':
      case 'OUTCOME_SALES':
        primaryGoalActionTypes = actionTypeMap.purchase;
        break;
      case 'LINK_CLICKS':
      case 'OUTCOME_TRAFFIC':
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
        break; // Handle directly
      case 'IMPRESSIONS':
        data.results = data.impressions;
        break; // Handle directly
      case 'BRAND_AWARENESS':
        data.results = data.reach;
        break; // Handle directly
      case 'EVENT_RESPONSES':
        primaryGoalActionTypes = actionTypeMap.event_response;
        break;
      case 'MESSAGES':
        primaryGoalActionTypes = [
          'onsite_conversion.messaging_conversation_started_7d'
        ];
        break; // Example
      case 'VIDEO_VIEWS':
        primaryGoalActionTypes = actionTypeMap.video_view;
        break; // We'll refine video view results below
      default:
        console.warn(`Unmapped campaign objective for results calculation: ${campaignObjective}`);
        break;
    }
  }

  // Sum results if based on actions array and not already handled (like reach/impressions)
  if (primaryGoalActionTypes.length > 0) {
    (insight.actions || []).forEach((action: any) => {
      if (primaryGoalActionTypes.includes(action.action_type)) {
        data.results += parseInt(action.value || '0', 10);
      }
    });
  }

  // Refine video view results using video_play_actions if goal is VIDEO_VIEWS
  if (campaignObjective?.toUpperCase() === 'VIDEO_VIEWS') {
    const videoPlayAction = insight.video_play_actions?.find((a: any) => a.action_type === 'video_view');
    data.results = videoPlayAction ? parseInt(videoPlayAction.value || '0', 10) : 0;
  }

  // Calculate CPA
  if (data.results > 0 && data.spend >= 0) { // Allow cpa to be 0 if spend is 0 but results > 0
    data.cpa = data.spend / data.results;
  }

  // --- Calculate ROAS ---
  (insight.action_values || []).forEach((actionValue: any) => {
    if (actionTypeMap.purchase.includes(actionValue.action_type)) {
      data.value_per_conversion += parseFloat(actionValue.value || '0');
    }
  });

  if (data.value_per_conversion > 0 && data.spend > 0) {
    data.roas = data.value_per_conversion / data.spend;
  }

  // --- Calculate Conversion Rate ---
  // Example: Primary Goal Results per Link Click (Adjust denominator as needed)
  if (data.link_clicks > 0 && data.results > 0 && primaryGoalActionTypes.length > 0 && ![ 'link_click', 'reach', 'impression', 'post_engagement', 'video_view' ].some(type => primaryGoalActionTypes.includes(type))) {
    data.conversion_rate = (data.results / data.link_clicks) * 100;
  } else if (primaryGoalActionTypes.includes('link_click')) {
    data.conversion_rate = data.link_click_ctr; // Use link click CTR if goal is link clicks
  }

  // --- Calculate Video Metrics ---
  const videoPlayAction = insight.video_play_actions?.find((a: any) => a.action_type === 'video_view');
  data.video_views = videoPlayAction ? parseInt(videoPlayAction.value || '0', 10) : 0; // Use specific action value

  const videoP100 = insight.video_p100_watched_actions?.find((a: any) => a.action_type === 'video_view');
  if (data.video_views > 0 && videoP100) {
    data.video_completion_rate = (parseInt(videoP100.value || '0', 10) / data.video_views) * 100;
  } else {
    data.video_completion_rate = 0;
  }

  const avgTimeWatched = insight.video_avg_time_watched_actions?.find((a: any) => a.action_type === 'video_view');
  data.average_watch_time = avgTimeWatched ? parseInt(avgTimeWatched.value || '0', 10) : 0;

  // --- Data Cleansing --- 
  for (const key in data) {
    if (typeof data[key] === 'number' && !Number.isFinite(data[key])) {
      // console.warn(`Non-finite number calculated for ${key} in campaign ${parentData.metaCampaignId || 'unknown'}. Setting to 0. Original value: ${data[key]}`);
      data[key] = 0;
    }
    // Optional: Rounding
    if (key === 'link_click_cpc' || key === 'cpa' || key === 'cpc' || key === 'spend') {
        data[key] = parseFloat(data[key].toFixed(4));
    } else if (key === 'link_click_ctr' || key === 'ctr' || key === 'cpm' || key === 'roas' || key === 'frequency' || key === 'conversion_rate' || key === 'video_completion_rate' ) {
        data[key] = parseFloat(data[key].toFixed(4));
    }
  }
  return data;
}

async function handleRequest(req: Request) {
  // --- CORS Preflight ---
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) });
  }

  // --- Authorization Check ---
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    console.error('sync-campaigns: No Authorization header provided.');
    return new Response(JSON.stringify({ error: 'Unauthorized - No Authorization header provided.' }), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      status: 401
    });
  }

  const authParts = authHeader.split(' ');
  if (authParts.length !== 2 || authParts[0] !== 'Bearer') {
    console.error('sync-campaigns: Invalid Authorization header format. Expected: "Bearer <token>", Received: ' + authHeader);
    return new Response(JSON.stringify({ error: 'Unauthorized - Invalid Authorization header format.' }), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      status: 401
    });
  }

  const receivedToken = authParts[1];
  if (!EXPECTED_SHARED_SECRET && !supabaseServiceKey) {
    console.error('sync-campaigns: Server configuration error - Neither shared secret nor service role key is set in environment.');
    return new Response(JSON.stringify({ error: 'Server configuration error.' }), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      status: 500
    });
  }

  if ((EXPECTED_SHARED_SECRET && receivedToken === EXPECTED_SHARED_SECRET) || (supabaseServiceKey && receivedToken === supabaseServiceKey)) {
    console.log('sync-campaigns: Authorized successfully.');
  } else {
    console.error('sync-campaigns: Unauthorized - Shared secret mismatch, missing, or incorrect format. Expected: "Bearer ' + (EXPECTED_SHARED_SECRET || 'not set') + '", or Service Role Key, Received Header: "' + authHeader + '"');
    return new Response(JSON.stringify({ error: 'Unauthorized. Shared secret mismatch, missing, or incorrect format.' }), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      status: 401
    });
  }

  console.log("sync-campaigns: Received request, secret validated.");

  let receivedPayload: any;
  try {
    receivedPayload = await req.json();
    console.log("sync-campaigns: Parsed payload:", JSON.stringify(receivedPayload, null, 2));

    const userId = receivedPayload.user_id;
    const metaAdAccountId = receivedPayload.meta_ad_account_id; // This is the act_xxxxx id
    const dbAdAccountId = receivedPayload.db_ad_account_id; // This is our internal DB id for the ad account
    const specific_campaign_ids = receivedPayload.specific_campaign_ids; // Optional array of Meta campaign IDs

    if (!userId || !metaAdAccountId || !dbAdAccountId) {
      console.error("sync-campaigns: User ID, Meta Ad Account ID, and DB Ad Account ID are required.", {
        userIdReceived: userId,
        metaAdAccountIdReceived: metaAdAccountId,
        dbAdAccountIdReceived: dbAdAccountId,
        fullPayloadForDebug: receivedPayload
      });
      return new Response(JSON.stringify({ error: 'User ID, Meta Ad Account ID, and DB Ad Account ID are required' }), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 400
      });
    }
    console.log(`sync-campaigns: Processing for User ID: ${userId}, Meta Ad Account ID: ${metaAdAccountId}, DB Ad Account ID: ${dbAdAccountId}.`);

    const { data: accessToken, error: rpcError } = await supabase.rpc('get_meta_long_lived_token_by_user_id', { user_id_param: userId });

    if (rpcError || !accessToken) {
      console.error(`sync-campaigns: RPC Error or no token for User ID ${userId}:`, JSON.stringify(rpcError || 'No token'));
      return new Response(JSON.stringify({ error: `Failed to fetch meta access token: ${rpcError?.message || 'No token found'}` }), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: rpcError ? 500 : 404
      });
    }
    console.log(`sync-campaigns: Successfully fetched access token for User ID ${userId}.`);

    let rawCampaignsFromApi: any[] = [];
    let successfullyProcessedCampaigns: any[] = [];
    const campaignInsightsResults: InsightResult[] = [];

    if (specific_campaign_ids && specific_campaign_ids.length > 0) {
      // --- Mode: Sync specific campaigns ---
      console.log(`sync-campaigns: Mode: Syncing insights for specific Meta campaign IDs for ad account ${metaAdAccountId}:`, specific_campaign_ids);
      for (const metaId of specific_campaign_ids) {
        const { data: camp, error: campError } = await supabase
          .from('campaigns')
          .select('id, meta_campaign_id, objective, name')
          .eq('meta_campaign_id', metaId)
          .eq('ad_account_id', dbAdAccountId)
          .eq('user_id', userId)
          .single();

        if (campError || !camp) {
          console.warn(`sync-campaigns: Could not find internal DB record for Meta campaign ${metaId}... Skipping insights. Error: ${campError?.message}`);
          continue;
        }
        successfullyProcessedCampaigns.push({ metaCampaignId: camp.meta_campaign_id, internalCampaignId: camp.id, objective: camp.objective, name: camp.name });
      }
      if (successfullyProcessedCampaigns.length === 0) {
        console.log(`sync-campaigns: No valid specific campaigns found in DB to process for ad account ${metaAdAccountId}.`);
      }
    } else {
      // --- Mode: Sync all campaigns ---
      console.log(`sync-campaigns: Mode: Fetching all campaigns for Meta ad_account_id ${metaAdAccountId}.`);
      const campaignsApiUrl = `https://graph.facebook.com/v19.0/${metaAdAccountId}/campaigns?fields=${BASE_CAMPAIGN_FIELDS}&filtering=[{'field':'effective_status','operator':'IN','value':['ACTIVE','PAUSED','ARCHIVED','DELETED','PENDING_REVIEW','DISAPPROVED','PREAPPROVED','PENDING_BILLING_INFO','CAMPAIGN_PAUSED','ADSET_PAUSED','WITH_ISSUES','COMPLETED','SCHEDULED','IN_PROCESS','UNKNOWN']}]&limit=500&access_token=${accessToken}`;
      const campaignsResponse = await fetch(campaignsApiUrl);

      if (!campaignsResponse.ok) {
        const errorData = await campaignsResponse.json();
        console.error(`sync-campaigns: Failed to fetch campaigns from Meta API for ad_account_id ${metaAdAccountId}:`, JSON.stringify(errorData));
        return new Response(JSON.stringify({ error: 'Failed to fetch campaigns from Meta API', details: errorData }), {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          status: campaignsResponse.status
        });
      }
      const campaignsData = await campaignsResponse.json();
      rawCampaignsFromApi = campaignsData.data || [];
      console.log(`sync-campaigns: Fetched ${rawCampaignsFromApi.length} raw campaigns from Meta for ad_account_id ${metaAdAccountId}.`);

      if (rawCampaignsFromApi.length > 0) {
        const dbCampaignsToUpsert = rawCampaignsFromApi.map(fbCampaign => ({
          meta_campaign_id: fbCampaign.id,
          name: fbCampaign.name,
          status: fbCampaign.status,
          effective_status: fbCampaign.effective_status,
          objective: fbCampaign.objective,
          buying_type: fbCampaign.buying_type,
          daily_budget: fbCampaign.daily_budget ? parseFloat(fbCampaign.daily_budget) / 100 : null, // Budgets are in cents
          lifetime_budget: fbCampaign.lifetime_budget ? parseFloat(fbCampaign.lifetime_budget) / 100 : null,
          start_time: fbCampaign.start_time,
          stop_time: fbCampaign.stop_time,
          meta_created_time: fbCampaign.created_time,
          meta_updated_time: fbCampaign.updated_time,
          ad_account_id: dbAdAccountId,
          user_id: userId,
          synced_at: new Date().toISOString()
        }));

        console.log(`sync-campaigns: Upserting ${dbCampaignsToUpsert.length} campaigns into 'public.campaigns' for DB ad_account_id ${dbAdAccountId}.`);
        const { data: upsertedCampaigns, error: campaignUpsertError } = await supabase
          .from('campaigns')
          .upsert(dbCampaignsToUpsert, { onConflict: 'user_id, meta_campaign_id', ignoreDuplicates: false })
          .select('id, meta_campaign_id, objective, name');

        if (campaignUpsertError) {
          console.error(`sync-campaigns: Error upserting campaigns:`, JSON.stringify(campaignUpsertError));
          // Decide if we should stop or try to continue with what might exist
        }

        if (upsertedCampaigns && upsertedCampaigns.length > 0) {
          console.log(`sync-campaigns: Successfully upserted/retrieved ${upsertedCampaigns.length} campaigns.`);
          successfullyProcessedCampaigns = upsertedCampaigns.map(c => ({ metaCampaignId: c.meta_campaign_id, internalCampaignId: c.id, objective: c.objective, name: c.name }));
        } else if (!campaignUpsertError) {
          // If upsert didn't error but returned no campaigns (e.g., all conflicted and were ignored, or select was empty)
          // Try to fetch existing campaigns based on meta_campaign_ids from API response, to ensure insights are processed for existing campaigns.
          console.log(`sync-campaigns: No new or updated campaigns to upsert, or select query returned empty. Will attempt to fetch existing campaigns for insights.`);
          const metaIdsFromApi = rawCampaignsFromApi.map(c => c.id);
          if (metaIdsFromApi.length > 0) {
            const { data: existingCampaigns, error: existingError } = await supabase
              .from('campaigns')
              .select('id, meta_campaign_id, objective, name')
              .in('meta_campaign_id', metaIdsFromApi)
              .eq('ad_account_id', dbAdAccountId)
              .eq('user_id', userId);
            if (existingError) {
              console.error('sync-campaigns: Error fetching existing campaign details after upsert:', JSON.stringify(existingError));
            } else if (existingCampaigns && existingCampaigns.length > 0) {
              successfullyProcessedCampaigns = existingCampaigns.map(c => ({ metaCampaignId: c.meta_campaign_id, internalCampaignId: c.id, objective: c.objective, name: c.name }));
              console.log(`sync-campaigns: Found ${successfullyProcessedCampaigns.length} existing campaigns in DB to process for insights.`);
            }
          }
        }
      }
    }

    // --- Fetch and Upsert Insights ---
    if (successfullyProcessedCampaigns.length > 0) {
      console.log(`sync-campaigns: Starting to fetch insights for ${successfullyProcessedCampaigns.length} campaigns. Ad Account: ${metaAdAccountId}.`);
      for (const campDetail of successfullyProcessedCampaigns) {
        if (!campDetail.metaCampaignId) {
            console.warn("Skipping insight fetch for campaign detail with missing metaCampaignId:", campDetail);
            continue;
        }
        // Use BASE_INSIGHT_FIELDS - asks for 'actions' needed for calculations
        const insightsUrl = `https://graph.facebook.com/v19.0/${campDetail.metaCampaignId}/insights?fields=${BASE_INSIGHT_FIELDS}&time_range={'since':'${DAILY_INSIGHTS_TIME_PERIOD.since}','until':'${DAILY_INSIGHTS_TIME_PERIOD.until}'}&level=campaign&time_increment=1&limit=1000&access_token=${accessToken}`;
        const insightsResponse = await fetch(insightsUrl);

        if (insightsResponse.ok) {
          const insightsData = await insightsResponse.json();
          const rawInsights = insightsData.data || [];

          if (rawInsights.length > 0) {
            const dbInsightsToUpsert = rawInsights.map(insight => {
              const metrics = calculateInsightMetrics(insight, campDetail.objective, { metaCampaignId: campDetail.metaCampaignId, quality_ranking: insight.quality_ranking, engagement_rate_ranking: insight.engagement_rate_ranking, conversion_rate_ranking: insight.conversion_rate_ranking });
              return {
                campaign_id: campDetail.internalCampaignId,
                meta_campaign_id: campDetail.metaCampaignId,
                ad_account_id: dbAdAccountId,
                user_id: userId,
                date: insight.date_start,
                campaign_name: campDetail.name, // Add campaign_name for easier debugging/reporting
                // Map calculated metrics, including new link click ones
                spend: metrics.spend,
                impressions: metrics.impressions,
                reach: metrics.reach,
                frequency: metrics.frequency,
                clicks: metrics.clicks,
                link_clicks: metrics.link_clicks,
                ctr: metrics.ctr,
                cpm: metrics.cpm,
                cpc: metrics.cpc,
                link_click_ctr: metrics.link_click_ctr,
                link_click_cpc: metrics.link_click_cpc,
                results: metrics.results,
                cpa: metrics.cpa,
                roas: metrics.roas,
                conversion_rate: metrics.conversion_rate,
                value_per_conversion: metrics.value_per_conversion,
                quality_ranking: metrics.quality_ranking,
                engagement_rate_ranking: metrics.engagement_rate_ranking,
                conversion_rate_ranking: metrics.conversion_rate_ranking,
                post_reactions: metrics.post_reactions,
                post_comments: metrics.post_comments,
                post_shares: metrics.post_shares,
                video_views: metrics.video_views,
                video_completion_rate: metrics.video_completion_rate,
                average_watch_time: metrics.average_watch_time,
                leads: metrics.leads,
                purchases: metrics.purchases,
                registrations: metrics.registrations,
                landing_page_views: metrics.landing_page_views
              };
            });

            const { error: insightsUpsertError } = await supabase
              .from('campaigns_insights')
              .upsert(dbInsightsToUpsert, { onConflict: 'campaign_id, user_id, date' });

            if (insightsUpsertError) {
              console.error(`sync-campaigns: DB Error upserting insights for campaign ${campDetail.metaCampaignId}:`, JSON.stringify(insightsUpsertError));
              campaignInsightsResults.push({ metaCampaignId: campDetail.metaCampaignId, success: false, error: `DB upsert error for insights: ${insightsUpsertError.message}` });
            } else {
              console.log(`sync-campaigns: Successfully upserted ${dbInsightsToUpsert.length} insight records for campaign ${campDetail.metaCampaignId}.`);
              campaignInsightsResults.push({ metaCampaignId: campDetail.metaCampaignId, success: true, insightsCount: dbInsightsToUpsert.length });
            }
          } else {
            console.log(`sync-campaigns: No insights data found via API for campaign ${campDetail.metaCampaignId}.`);
            campaignInsightsResults.push({ metaCampaignId: campDetail.metaCampaignId, success: true, insightsCount: 0, message: "No insights data available" });
          }
        } else {
          const errorData = await insightsResponse.json();
          console.error(`sync-campaigns: API Error fetching insights for campaign ${campDetail.metaCampaignId}:`, JSON.stringify(errorData));
          campaignInsightsResults.push({ metaCampaignId: campDetail.metaCampaignId, success: false, error: `API error for insights: ${errorData.error?.message || 'Unknown API error'}` });
        }
      }
    } else {
      console.log(`sync-campaigns: No campaigns available to sync insights for ad_account_id ${metaAdAccountId}.`);
    }

    console.log(`sync-campaigns: Finished processing Ad Account ${metaAdAccountId}.`);
    return new Response(JSON.stringify({
      success: true,
      message: "Campaign and insights sync process completed for ad account.",
      ad_account_id: metaAdAccountId,
      processed_campaign_details: successfullyProcessedCampaigns.map(c => ({ meta_campaign_id: c.metaCampaignId, db_campaign_id: c.internalCampaignId, objective: c.objective })),
      campaigns_processed_count: successfullyProcessedCampaigns.length,
      insights_results: campaignInsightsResults
    }), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error("sync-campaigns: Critical error in handler:", error.message, error.stack);
    console.error("sync-campaigns: Payload at time of error (if parsed):", JSON.stringify(receivedPayload, null, 2)); // Log payload if available
    return new Response(JSON.stringify({ error: 'Internal Server Error in sync-campaigns', details: error.message }), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      status: 500
    });
  }
}

serve(handleRequest); 