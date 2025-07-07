import os
import requests
import json
import time
from datetime import date, timedelta, datetime
from typing import Dict, List, Any, Optional
from fastapi import HTTPException, status
from urllib.parse import urlencode, urlparse, parse_qs
from dotenv import load_dotenv
import pathlib

# Load environment variables from .env file
env_path = pathlib.Path(__file__).parents[2] / '.env'
load_dotenv(dotenv_path=env_path)

# Facebook API version to use
FB_API_VERSION = 'v22.0'  # Updated to match Edge Function
FB_API_BASE_URL = f'https://graph.facebook.com/{FB_API_VERSION}'

# App credentials
FB_APP_ID = os.getenv("FACEBOOK_APP_ID")
FB_APP_SECRET = os.getenv("FACEBOOK_APP_SECRET")
FB_REDIRECT_URI = os.getenv("FACEBOOK_REDIRECT_URI", "http://localhost:5000/api/auth/meta-callback")

if not FB_APP_ID or not FB_APP_SECRET:
    raise ValueError("Missing Facebook/Meta API credentials in environment variables")

class FacebookAPIError(Exception):
    """Custom exception for Facebook API errors"""
    def __init__(self, message: str, status_code: int = 500, fb_error_code: Optional[str] = None):
        self.message = message
        self.status_code = status_code
        self.fb_error_code = fb_error_code
        super().__init__(self.message)

def get_auth_url(state: str = None) -> str:
    """
    Generate the Facebook OAuth URL for user authorization
    
    Args:
        state: Optional state parameter for CSRF protection
    
    Returns:
        The authorization URL
    """
    params = {
        'client_id': FB_APP_ID,
        'redirect_uri': FB_REDIRECT_URI,
        'response_type': 'code',
        'scope': 'ads_management,ads_read,business_management',  # Permissions needed
    }
    
    if state:
        params['state'] = state
    
    return f"https://www.facebook.com/{FB_API_VERSION}/dialog/oauth?{urlencode(params)}"

async def exchange_code_for_token(code: str) -> Dict[str, Any]:
    """
    Exchange authorization code for access token
    
    Args:
        code: The authorization code from OAuth callback
    
    Returns:
        Dict containing access_token, token_type, and expires_in
    """
    params = {
        'client_id': FB_APP_ID,
        'client_secret': FB_APP_SECRET,
        'redirect_uri': FB_REDIRECT_URI,
        'code': code
    }
    
    try:
        response = requests.get(f"{FB_API_BASE_URL}/oauth/access_token", params=params)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        error_msg = "Failed to exchange code for token"
        try:
            error_data = e.response.json()
            error_msg = error_data.get('error', {}).get('message', error_msg)
            raise FacebookAPIError(
                message=f"{error_msg}",
                status_code=e.response.status_code,
                fb_error_code=error_data.get('error', {}).get('code')
            )
        except (ValueError, AttributeError):
            pass
        
        raise FacebookAPIError(message=f"{error_msg}: {str(e)}", status_code=500)

async def get_long_lived_token(access_token: str) -> Dict[str, Any]:
    """
    Exchange short-lived token for a long-lived token
    
    Args:
        access_token: The short-lived access token
    
    Returns:
        Dict containing access_token, token_type, and expires_in
    """
    params = {
        'grant_type': 'fb_exchange_token',
        'client_id': FB_APP_ID,
        'client_secret': FB_APP_SECRET,
        'fb_exchange_token': access_token
    }
    
    try:
        response = requests.get(f"{FB_API_BASE_URL}/oauth/access_token", params=params)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        error_msg = "Failed to get long-lived token"
        try:
            error_data = e.response.json()
            error_msg = error_data.get('error', {}).get('message', error_msg)
        except (ValueError, AttributeError):
            pass
        
        raise FacebookAPIError(message=f"{error_msg}: {str(e)}", status_code=500)

async def get_ad_accounts(access_token: str) -> List[Dict[str, Any]]:
    """
    Fetch ad accounts for the authenticated user
    
    Args:
        access_token: The Facebook access token
    
    Returns:
        List of ad account objects
    """
    params = {
        'access_token': access_token,
        'fields': 'id,name,account_id,account_status,age,amount_spent,business_name,business_city,business_state,business_country_code,currency,min_campaign_group_spend_cap,spend_cap'
    }
    
    try:
        response = requests.get(f"{FB_API_BASE_URL}/me/adaccounts", params=params)
        response.raise_for_status()
        
        # Process the data
        result = response.json().get('data', [])
        
        # Format the ad accounts data
        formatted_accounts = []
        for account in result:
            # Map account_status to a readable format
            status_map = {
                1: "ACTIVE",
                2: "DISABLED",
                3: "UNSETTLED",
                7: "PENDING_RISK_REVIEW",
                9: "IN_GRACE_PERIOD",
                100: "PENDING_CLOSURE",
                101: "CLOSED",
                201: "ANY_ACTIVE",
                202: "ANY_CLOSED"
            }
            
            status = status_map.get(account.get('account_status'), "UNKNOWN")
            
            formatted_accounts.append({
                'id': account.get('id'),
                'name': account.get('name'),
                'account_id': account.get('account_id'),
                'status': status,
                'currency': account.get('currency'),
                'amount_spent': account.get('amount_spent'),
                'business_name': account.get('business_name'),
                'business_location': f"{account.get('business_city')}, {account.get('business_state')}, {account.get('business_country_code')}",
                'spend_cap': account.get('spend_cap')
            })
        
        return formatted_accounts
    except requests.RequestException as e:
        error_msg = "Failed to fetch ad accounts"
        try:
            error_data = e.response.json()
            error_msg = error_data.get('error', {}).get('message', error_msg)
        except (ValueError, AttributeError):
            pass
        
        raise FacebookAPIError(message=f"{error_msg}: {str(e)}", status_code=500)

async def get_campaigns(access_token: str, ad_account_id: str) -> List[Dict[str, Any]]:
    """
    Fetch campaigns for a specific ad account
    
    Args:
        access_token: The Facebook access token
        ad_account_id: The ad account ID
    
    Returns:
        List of campaign objects
    """
    params = {
        'access_token': access_token,
        'fields': 'id,name,objective,status,daily_budget,lifetime_budget,start_time,stop_time,budget_remaining,created_time,updated_time'
    }
    
    try:
        response = requests.get(f"{FB_API_BASE_URL}/act_{ad_account_id}/campaigns", params=params)
        response.raise_for_status()
        
        return response.json().get('data', [])
    except requests.RequestException as e:
        error_msg = "Failed to fetch campaigns"
        try:
            error_data = e.response.json()
            error_msg = error_data.get('error', {}).get('message', error_msg)
        except (ValueError, AttributeError):
            pass
        
        raise FacebookAPIError(message=f"{error_msg}: {str(e)}", status_code=500)

async def get_adsets(access_token: str, campaign_id: str) -> List[Dict[str, Any]]:
    """
    Fetch ad sets for a specific campaign
    
    Args:
        access_token: The Facebook access token
        campaign_id: The campaign ID
    
    Returns:
        List of ad set objects
    """
    params = {
        'access_token': access_token,
        'fields': 'id,name,status,daily_budget,lifetime_budget,targeting,optimization_goal,bid_amount,billing_event,campaign_id'
    }
    
    try:
        response = requests.get(f"{FB_API_BASE_URL}/{campaign_id}/adsets", params=params)
        response.raise_for_status()
        
        return response.json().get('data', [])
    except requests.RequestException as e:
        error_msg = "Failed to fetch ad sets"
        try:
            error_data = e.response.json()
            error_msg = error_data.get('error', {}).get('message', error_msg)
        except (ValueError, AttributeError):
            pass
        
        raise FacebookAPIError(message=f"{error_msg}: {str(e)}", status_code=500)

async def get_ads(access_token: str, adset_id: str) -> List[Dict[str, Any]]:
    """
    Fetch ads for a specific ad set
    
    Args:
        access_token: The Facebook access token
        adset_id: The ad set ID
    
    Returns:
        List of ad objects
    """
    params = {
        'access_token': access_token,
        'fields': 'id,name,status,creative,adset_id,campaign_id,created_time,updated_time'
    }
    
    try:
        response = requests.get(f"{FB_API_BASE_URL}/{adset_id}/ads", params=params)
        response.raise_for_status()
        
        return response.json().get('data', [])
    except requests.RequestException as e:
        error_msg = "Failed to fetch ads"
        try:
            error_data = e.response.json()
            error_msg = error_data.get('error', {}).get('message', error_msg)
        except (ValueError, AttributeError):
            pass
        
        raise FacebookAPIError(message=f"{error_msg}: {str(e)}", status_code=500)

async def get_insights(
    access_token: str, 
    ad_account_id: str, 
    level: str = 'account',
    fields: List[str] = None,
    breakdowns: List[str] = None,
    time_range: Dict[str, str] = None,
    time_increment: int = None,
    filtering: List[Dict] = None
) -> List[Dict[str, Any]]:
    """
    Fetch insights for a specific ad account, campaign, ad set or ad
    
    Args:
        access_token: The Facebook access token
        ad_account_id: The ad account ID
        level: The level of insights (account, campaign, adset, ad)
        fields: List of fields to fetch
        breakdowns: List of breakdowns to apply
        time_range: Dict with since and until dates
        time_increment: Time increment for the report
        filtering: List of filters to apply
    
    Returns:
        List of insight objects
    """
    if fields is None:
        fields = [
            'impressions',
            'clicks',
            'spend',
            'ctr',
            'cpc',
            'reach',
            'frequency',
            'actions',
            'cost_per_action_type'
        ]
    
    params = {
        'access_token': access_token,
        'level': level,
        'fields': ','.join(fields)
    }
    
    if breakdowns:
        params['breakdowns'] = ','.join(breakdowns)
    
    if time_range:
        params['time_range'] = json.dumps(time_range)
    
    if time_increment:
        params['time_increment'] = time_increment
    
    if filtering:
        params['filtering'] = json.dumps(filtering)
    
    try:
        response = requests.get(f"{FB_API_BASE_URL}/act_{ad_account_id}/insights", params=params)
        response.raise_for_status()
        
        return response.json().get('data', [])
    except requests.RequestException as e:
        error_msg = "Failed to fetch insights"
        try:
            error_data = e.response.json()
            error_msg = error_data.get('error', {}).get('message', error_msg)
        except (ValueError, AttributeError):
            pass
        
        raise FacebookAPIError(message=f"{error_msg}: {str(e)}", status_code=500)

async def update_campaign(access_token: str, campaign_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Update a campaign
    
    Args:
        access_token: The Facebook access token
        campaign_id: The campaign ID
        data: The data to update
    
    Returns:
        Success response
    """
    params = {
        'access_token': access_token,
        **data
    }
    
    try:
        response = requests.post(f"{FB_API_BASE_URL}/{campaign_id}", params=params)
        response.raise_for_status()
        
        return response.json()
    except requests.RequestException as e:
        error_msg = "Failed to update campaign"
        try:
            error_data = e.response.json()
            error_msg = error_data.get('error', {}).get('message', error_msg)
        except (ValueError, AttributeError):
            pass
        
        raise FacebookAPIError(message=f"{error_msg}: {str(e)}", status_code=500)

async def update_adset(access_token: str, adset_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Update an ad set
    
    Args:
        access_token: The Facebook access token
        adset_id: The ad set ID
        data: The data to update
    
    Returns:
        Success response
    """
    params = {
        'access_token': access_token,
        **data
    }
    
    try:
        response = requests.post(f"{FB_API_BASE_URL}/{adset_id}", params=params)
        response.raise_for_status()
        
        return response.json()
    except requests.RequestException as e:
        error_msg = "Failed to update ad set"
        try:
            error_data = e.response.json()
            error_msg = error_data.get('error', {}).get('message', error_msg)
        except (ValueError, AttributeError):
            pass
        
        raise FacebookAPIError(message=f"{error_msg}: {str(e)}", status_code=500)

async def update_ad(access_token: str, ad_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Update an ad
    
    Args:
        access_token: The Facebook access token
        ad_id: The ad ID
        data: The data to update
    
    Returns:
        Success response
    """
    params = {
        'access_token': access_token,
        **data
    }
    
    try:
        response = requests.post(f"{FB_API_BASE_URL}/{ad_id}", params=params)
        response.raise_for_status()
        
        return response.json()
    except requests.RequestException as e:
        error_msg = "Failed to update ad"
        try:
            error_data = e.response.json()
            error_msg = error_data.get('error', {}).get('message', error_msg)
        except (ValueError, AttributeError):
            pass
        
        raise FacebookAPIError(message=f"{error_msg}: {str(e)}", status_code=500)

# Constants
BASE_URL = "https://graph.facebook.com/v22.0"
# Ensure this list is comprehensive for your needs.
BASE_INSIGHT_FIELDS = [
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
    'conversion_rate_ranking'
]

def get_facebook_app_access_token():
    """Retrieves a Facebook app access token."""
    app_id = os.getenv("FACEBOOK_APP_ID")
    app_secret = os.getenv("FACEBOOK_APP_SECRET")
    if not app_id or not app_secret:
        raise ValueError("FACEBOOK_APP_ID and FACEBOOK_APP_SECRET must be set in environment variables.")
    
    url = f"{BASE_URL}/oauth/access_token"
    params = {
        "client_id": app_id,
        "client_secret": app_secret,
        "grant_type": "client_credentials"
    }
    response = requests.get(url, params=params)
    response.raise_for_status()  # Raises an HTTPError for bad responses (4XX or 5XX)
    return response.json()["access_token"]

def get_fetch_date_range():
    """
    Calculates the date range for fetching insights: today and the 14 previous days.
    Returns a tuple (since_date_str, until_date_str).
    """
    today = datetime.now()
    fifteen_days_ago = today - timedelta(days=14) 
    
    # Facebook API expects 'YYYY-MM-DD'
    return fifteen_days_ago.strftime('%Y-%m-%d'), today.strftime('%Y-%m-%d')

def calculate_insight_metrics(
    insight: Dict[str, Any], 
    optimization_goal: Optional[str] = None, 
    billing_event: Optional[str] = None, 
    campaign_objective: Optional[str] = None,
    parent_data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Calculates derived metrics from raw Facebook insight data.
    Translated from the TypeScript version.
    """
    if parent_data is None:
        parent_data = {}

    data = {
        "spend": float(insight.get("spend", 0)),
        "impressions": int(insight.get("impressions", 0)),
        "reach": int(insight.get("reach", 0)),
        "frequency": float(insight.get("frequency", 0)),
        "clicks": int(insight.get("clicks", 0)),
        "ctr": float(insight.get("ctr", 0)),
        "cpm": float(insight.get("cpm", 0)),
        "cpc": float(insight.get("cpc", 0)),
        "quality_ranking": insight.get("quality_ranking") or parent_data.get("quality_ranking"),
        "engagement_rate_ranking": insight.get("engagement_rate_ranking") or parent_data.get("engagement_rate_ranking"),
        "conversion_rate_ranking": insight.get("conversion_rate_ranking") or parent_data.get("conversion_rate_ranking"),
        "results": 0,
        "cpa": 0.0,
        "roas": 0.0,
        "conversion_rate": 0.0,
        "value_per_conversion": 0.0,
        "post_reactions": 0,
        "post_comments": 0,
        "post_shares": 0,
        "video_views": 0,
        "video_completion_rate": 0.0,
        "average_watch_time": 0.0,
        "leads": 0,
        "purchases": 0,
        "registrations": 0,
        "link_clicks": 0,
        "landing_page_views": 0,
        # Ensure all fields from the original object that are not recalculated are carried over
        # This is important if these fields are directly stored in Supabase.
        "date_start": insight.get("date_start"),
        "date_stop": insight.get("date_stop"),
        # Add any other object-specific IDs if they come with the insight
        "campaign_id": insight.get("campaign_id"),
        "adset_id": insight.get("adset_id"),
        "ad_id": insight.get("ad_id"),
    }

    primary_goal_action_type = None
    goal = optimization_goal or billing_event or campaign_objective

    if goal:
        goal_upper = goal.upper() # Normalize for case-insensitivity
        if goal_upper in ["LEAD_GENERATION", "LEAD", "OUTCOME_LEADS"]:
            primary_goal_action_type = "lead"
        elif goal_upper in ["CONVERSIONS", "OFFSITE_CONVERSIONS"]:
            primary_goal_action_type = "purchase"
        elif goal_upper == "LINK_CLICKS":
            primary_goal_action_type = "link_click"
        elif goal_upper == "POST_ENGAGEMENT":
            primary_goal_action_type = "post_engagement"
        elif goal_upper in ["IMPRESSIONS", "REACH"]:
            primary_goal_action_type = None # Results not based on a specific action type
        elif goal_upper == "LANDING_PAGE_VIEWS":
            primary_goal_action_type = "landing_page_view"
        elif goal_upper == "EVENT_RESPONSES": # Common for event promotion
             primary_goal_action_type = "event_response" # Example, adjust if Meta uses a different key
        elif goal_upper == "APP_INSTALLS":
            primary_goal_action_type = "app_install" # Example
        # Add more goal mappings as needed based on Meta's possible values

    actions = insight.get("actions", [])
    if actions:
        for action in actions:
            action_value = int(action.get("value", 0))
            action_type = action.get("action_type")

            if primary_goal_action_type and action_type:
                if (
                    (primary_goal_action_type == "lead" and action_type in ["lead", "onsite_conversion.lead", "offsite_conversion.fb_pixel_lead"]) or
                    (primary_goal_action_type == "purchase" and action_type in ["purchase", "offsite_conversion.fb_pixel_purchase"] or "omni_purchase" in action_type) or
                    (primary_goal_action_type == "link_click" and action_type == "link_click") or
                    (primary_goal_action_type == "post_engagement" and action_type == "post_engagement") or
                    (primary_goal_action_type == "landing_page_view" and action_type == "landing_page_view") or
                    (primary_goal_action_type == "complete_registration" and action_type in ["complete_registration", "offsite_conversion.fb_pixel_complete_registration"]) or
                    (primary_goal_action_type == "event_response" and action_type == "event_response") or # Example
                    (primary_goal_action_type == "app_install" and action_type == "app_install") # Example
                ):
                    data["results"] += action_value
            
            if action_type:
                if action_type == "post_reaction": data["post_reactions"] += action_value
                elif action_type == "comment": data["post_comments"] += action_value
                elif action_type == "post": data["post_shares"] += action_value # Meta often uses 'post' for shares
                elif action_type == "link_click": data["link_clicks"] += action_value
                elif action_type == "landing_page_view": data["landing_page_views"] += action_value
                elif action_type in ["lead", "onsite_conversion.lead", "offsite_conversion.fb_pixel_lead"]:
                    data["leads"] += action_value
                elif action_type in ["purchase", "offsite_conversion.fb_pixel_purchase"] or ("omni_purchase" in action_type if action_type else False):
                    data["purchases"] += action_value
                elif action_type in ["complete_registration", "offsite_conversion.fb_pixel_complete_registration"]:
                    data["registrations"] += action_value
                # ... other specific action counts ...

    if data["results"] > 0 and data["spend"] > 0:
        data["cpa"] = data["spend"] / data["results"]
    
    conversion_denominator = data["clicks"] if data["clicks"] > 0 else data["impressions"]
    if goal and goal.upper() in ["IMPRESSIONS", "REACH", "POST_ENGAGEMENT"]:
        conversion_denominator = data["impressions"]
    
    if data["results"] > 0 and conversion_denominator > 0:
        data["conversion_rate"] = (data["results"] / conversion_denominator) * 100

    action_values_list = insight.get("action_values", [])
    if action_values_list:
        total_value = 0.0
        for action_val_obj in action_values_list:
            action_type = action_val_obj.get("action_type")
            if action_type in ["purchase", "offsite_conversion.fb_pixel_purchase"] or \
               ("omni_purchase" in action_type if action_type else False):
                total_value += float(action_val_obj.get("value", 0))
        
        purchase_count = data["purchases"]
        if total_value > 0 and data["spend"] > 0:
            data["roas"] = total_value / data["spend"]
        elif total_value > 0: # Spend is 0 but there's value
            data["roas"] = float('inf') 
        
        if total_value > 0 and purchase_count > 0:
            data["value_per_conversion"] = total_value / purchase_count

    video_play_actions = insight.get("video_play_actions", [])
    if video_play_actions:
        video_plays_action = next((a for a in video_play_actions if a.get("action_type") == "video_view"), None)
        video_plays_value = int(video_plays_action.get("value", 0)) if video_plays_action else 0
        data["video_views"] = video_plays_value

        video_p100_actions = insight.get("video_p100_watched_actions", [])
        video_completes_action = next((a for a in video_p100_actions if a.get("action_type") == "video_view"), None)
        video_completes_value = int(video_completes_action.get("value", 0)) if video_completes_action else 0
        
        if video_plays_value > 0:
            data["video_completion_rate"] = (video_completes_value / video_plays_value) * 100

        video_avg_time_actions = insight.get("video_avg_time_watched_actions", [])
        avg_watch_time_action = next((a for a in video_avg_time_actions if a.get("action_type") == "video_view"), None)
        data["average_watch_time"] = float(avg_watch_time_action.get("value", 0)) if avg_watch_time_action else 0.0
        
    return data

def fetch_daily_insights(
    object_id: str, 
    access_token: str, 
    level: str, # 'campaign', 'adset', or 'ad'
    optimization_goal: Optional[str] = None, # Passed from campaign/adset
    billing_event: Optional[str] = None,   # Passed from campaign/adset
    campaign_objective: Optional[str] = None # Passed from campaign
) -> List[Dict[str, Any]]:
    """
    Fetches daily insights for a specific campaign, ad set, or ad.
    Processes insights using calculate_insight_metrics.
    """
    since, until = get_fetch_date_range()
    url = f"{BASE_URL}/{object_id}/insights"
    params = {
        "access_token": access_token,
        "level": level,
        "fields": ",".join(BASE_INSIGHT_FIELDS),
        "time_range": f"{{'since':'{since}','until':'{until}'}}",
        "time_increment": 1,  # Daily data
        "limit": 500 # Maximize records per call, handle pagination if necessary
    }

    all_insights = []
    processed_insights = []
    
    while url:
        response = requests.get(url, params=params if url.startswith(BASE_URL) else {}) # params only for the first request
        response.raise_for_status()
        data = response.json()
        raw_insights = data.get("data", [])
        all_insights.extend(raw_insights)
        
        # Process raw insights
        for raw_insight in raw_insights:
            # Add object_id and level to the raw_insight if not already present,
            # as calculate_insight_metrics might use them (e.g. for context in logging, not currently but good practice)
            # Also, ensure 'date_start' and 'date_stop' are present for Supabase.
            # The `calculate_insight_metrics` function now handles carrying over these date fields
            # and object IDs if they are part of the raw_insight structure.

            # We need to pass the correct campaign_objective, optimization_goal, and billing_event
            # This information typically comes from the parent object (campaign or ad set)
            # For simplicity in this example, we are passing them as arguments to fetch_daily_insights
            # In a real scenario, you might fetch the parent object's details first.
            
            # Add the object_id based on the level to the insight data for easier processing later
            if level == 'campaign':
                raw_insight['campaign_id'] = object_id
            elif level == 'adset':
                raw_insight['adset_id'] = object_id
            elif level == 'ad':
                raw_insight['ad_id'] = object_id

            processed_insight = calculate_insight_metrics(
                raw_insight,
                optimization_goal=optimization_goal,
                billing_event=billing_event,
                campaign_objective=campaign_objective
            )
            processed_insights.append(processed_insight)
            
        # Pagination
        url = data.get("paging", {}).get("next")
        params = {} # Clear params for subsequent paginated requests

    return processed_insights

# --- Functions to fetch Campaigns, Ad Sets, Ads ---
# These functions might need to be adjusted to also fetch optimization_goal, billing_event, or objective
# if they are not already doing so, to pass them to fetch_daily_insights.

def get_campaigns(ad_account_id: str, access_token: str) -> List[Dict[str, Any]]:
    """Fetches all campaigns for a given ad account."""
    url = f"{BASE_URL}/{ad_account_id}/campaigns"
    params = {
        "access_token": access_token,
        "fields": "id,name,status,objective,buying_type,daily_budget,lifetime_budget,bid_strategy,effective_status,optimization_goal,billing_event", # Added optimization_goal, billing_event
        "limit": 500 
    }
    all_campaigns = []
    while url:
        response = requests.get(url, params=params if url.startswith(BASE_URL) else {})
        response.raise_for_status()
        data = response.json()
        all_campaigns.extend(data.get("data", []))
        url = data.get("paging", {}).get("next")
        params = {}
    return all_campaigns

def get_adsets(campaign_id: str, access_token: str) -> List[Dict[str, Any]]:
    """Fetches all ad sets for a given campaign."""
    url = f"{BASE_URL}/{campaign_id}/adsets"
    params = {
        "access_token": access_token,
        "fields": "id,name,status,campaign_id,daily_budget,lifetime_budget,bid_strategy,optimization_goal,billing_event,effective_status,targeting,start_time,end_time", # Added optimization_goal, billing_event
        "limit": 500
    }
    all_adsets = []
    while url:
        response = requests.get(url, params=params if url.startswith(BASE_URL) else {})
        response.raise_for_status()
        data = response.json()
        all_adsets.extend(data.get("data", []))
        url = data.get("paging", {}).get("next")
        params = {}
    return all_adsets

def get_ads(ad_set_id: str, access_token: str) -> List[Dict[str, Any]]:
    """Fetches all ads for a given ad set."""
    url = f"{BASE_URL}/{ad_set_id}/ads"
    params = {
        "access_token": access_token,
        # Note: Ads themselves don't have optimization_goal or billing_event directly;
        # these are typically inherited from the ad set.
        "fields": "id,name,status,adset_id,campaign_id,creative{id,name,object_story_spec,image_url,thumbnail_url,body,title},effective_status",
        "limit": 500
    }
    all_ads = []
    while url:
        response = requests.get(url, params=params if url.startswith(BASE_URL) else {})
        response.raise_for_status()
        data = response.json()
        all_ads.extend(data.get("data", []))
        url = data.get("paging", {}).get("next")
        params = {}
    return all_ads


# --- Example Usage (for testing) ---
if __name__ == "__main__":
    print("Running facebook_api.py as a script for testing...")

    # IMPORTANT: Set these environment variables before running for testing.
    # For actual deployment, these should be managed securely.
    # os.environ["FACEBOOK_APP_ID"] = "YOUR_APP_ID"        # Replace or set in your env
    # os.environ["FACEBOOK_APP_SECRET"] = "YOUR_APP_SECRET" # Replace or set in your env
    
    # Use a User Access Token for testing insights directly related to an ad account you manage.
    # App Access Token can be used for some calls, but user-specific data like ad account insights
    # typically requires a User Access Token with ads_read permission.
    # Ensure your test token has 'ads_read' and 'read_insights' permissions.
    
    # Example: Test fetching daily insights for a specific Ad Set
    # Replace with your actual Ad Set ID and a valid User Access Token
    test_ad_set_id = os.getenv("TEST_AD_SET_ID") # e.g., "act_1234567890/111111111" - use ad_set_id or ad_id or campaign_id
    test_user_access_token = os.getenv("TEST_USER_ACCESS_TOKEN")

    if not test_ad_set_id or not test_user_access_token:
        print("Please set TEST_AD_SET_ID and TEST_USER_ACCESS_TOKEN environment variables for testing.")
        print("Example: TEST_AD_SET_ID=1234567890 (for an ad set)")
        print("         TEST_USER_ACCESS_TOKEN=your_long_lived_token")
    else:
        try:
            print(f"Attempting to fetch daily insights for Ad Set ID: {test_ad_set_id}")
            # For testing calculate_insight_metrics, you might need to know the optimization_goal
            # of the ad set or its campaign. For this example, we'll pass None.
            # You would fetch the adset details first to get these if needed.
            
            # First, let's fetch the adset's details to get its optimization_goal and billing_event
            # Assuming get_adsets can be modified to fetch a single adset by ID or you have a direct way
            # For this example, we'll simulate having them.
            # In a real scenario, you'd call:
            # adset_details = get_adset_details(test_ad_set_id, test_user_access_token) # A hypothetical function
            # optimization_goal = adset_details.get("optimization_goal")
            # billing_event = adset_details.get("billing_event")
            # campaign_id = adset_details.get("campaign_id")
            # campaign_details = get_campaign_details(campaign_id, test_user_access_token) # hypothetical
            # campaign_objective = campaign_details.get("objective")

            # --- For testing purposes, let's assume some values ---
            mock_optimization_goal = "LINK_CLICKS" # Example
            mock_billing_event = "IMPRESSIONS" # Example
            mock_campaign_objective = "LINK_CLICKS" # Example
            
            # To properly test, you'd first get the campaign/adset details to pass the correct goals
            print(f"Using mock optimization_goal: {mock_optimization_goal}, billing_event: {mock_billing_event}, campaign_objective: {mock_campaign_objective} for adset-level insights.")

            insights = fetch_daily_insights(
                object_id=test_ad_set_id,
                access_token=test_user_access_token,
                level="adset", # or 'campaign' or 'ad'
                optimization_goal=mock_optimization_goal, # Pass from adset or campaign
                billing_event=mock_billing_event,     # Pass from adset or campaign
                campaign_objective=mock_campaign_objective # Pass from campaign
            )
            
            if insights:
                print(f"Successfully fetched and processed {len(insights)} insight records.")
                for i, insight_data in enumerate(insights[:2]): # Print first 2 for brevity
                    print(f"--- Processed Insight Record {i+1} ---")
                    for key, value in insight_data.items():
                        print(f"  {key}: {value}")
                if len(insights) > 2:
                    print(f"... and {len(insights) - 2} more records.")
            else:
                print("No insights found or an error occurred during processing.")

        except ValueError as ve:
            print(f"Configuration Error: {ve}")
        except requests.exceptions.HTTPError as e:
            print(f"HTTP Error: {e.response.status_code} - {e.response.text}")
        except Exception as e:
            print(f"An unexpected error occurred: {e}")
            import traceback
            traceback.print_exc()

    # Example: Test fetching campaigns (if APP_ID and APP_SECRET are set for app token)
    # This part might fail if you only have a user access token configured above
    # and get_facebook_app_access_token() is called by these main functions.
    # It's better to pass the user_access_token to them directly for testing.
    # For now, this illustrates the structure.
    # try:
    #     app_token = get_facebook_app_access_token()
    #     print(f"App Access Token: {app_token[:20]}...") # Print part of token
        
    #     # Replace with your Ad Account ID
    #     test_ad_account_id = os.getenv("TEST_AD_ACCOUNT_ID") # e.g., "act_1234567890"
    #     if test_ad_account_id:
    #         print(f"Attempting to fetch campaigns for Ad Account ID: {test_ad_account_id}")
    #         campaign_list = get_campaigns(test_ad_account_id, app_token) # or use test_user_access_token
    #         print(f"Found {len(campaign_list)} campaigns.")
    #         if campaign_list:
    #             print(f"First campaign: {campaign_list[0]['name']} (ID: {campaign_list[0]['id']})")
    #     else:
    #         print("TEST_AD_ACCOUNT_ID not set, skipping campaign fetch test.")

    # except ValueError as ve:
    #     print(f"Skipping app token dependent tests: {ve}")
    # except requests.exceptions.HTTPError as e:
    #     print(f"HTTP Error during app token tests: {e.response.status_code} - {e.response.text}")
    # except Exception as e:
    #     print(f"An unexpected error occurred during app token tests: {e}")

# Ensure to add proper error handling, logging, and potentially async operations for a production environment.
