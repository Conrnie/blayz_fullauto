from fastapi import APIRouter, Depends, HTTPException, Request, Query
from typing import List, Dict, Any, Optional
from app.auth import get_supabase_client
from app.routers.facebook import get_ad_insights
from datetime import datetime, timedelta
import httpx
import os
from supabase import Client

# --- Environment Variables & Supabase Config (similar to sync.py) ---
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_FUNCTION_BASE_URL = os.getenv("SUPABASE_FUNCTION_BASE_URL", "https://zrsevaevonthrspehpaj.supabase.co/functions/v1") # Match your actual base URL
SYNC_META_DATA_URL = f"{SUPABASE_FUNCTION_BASE_URL}/sync-meta-data"

YOUR_SHARED_SECRET = os.getenv("YOUR_SHARED_SECRET")

if not SUPABASE_SERVICE_KEY:
    print("Warning: SUPABASE_SERVICE_ROLE_KEY environment variable is not set in insights.py.")
    # Consider how to handle this: raise error, or allow fallback if sync is optional

if not YOUR_SHARED_SECRET:
    # This is a critical configuration for secure communication with the Edge Function
    print("CRITICAL WARNING: YOUR_SHARED_SECRET environment variable is not set in insights.py. Calls to sync-meta-data Edge Function will likely fail or be insecure if the Edge Function expects it and this backend doesn't send it.")
    # Depending on desired behavior, you might want to raise an exception here to prevent startup
    # or handle it within the function call. For now, a warning.

router = APIRouter()

# --- Helper function to invoke Supabase Edge Function (adapted from sync.py) ---
async def invoke_sync_meta_data_function(
    request: Request, # To get user_id
    supabase_client: Client # To fetch meta_access_token
):
    """Fetches user details, meta token and invokes the sync-meta-data Edge Function."""
    if not request.state.user:
        raise HTTPException(status_code=401, detail="User not authenticated for sync")

    user_id = request.state.user.get('id') if isinstance(request.state.user, dict) else getattr(request.state.user, 'id', None)
    if not user_id:
        raise HTTPException(status_code=401, detail="Could not determine user ID for sync")

    # Use YOUR_SHARED_SECRET for invoking the function, not SUPABASE_SERVICE_KEY
    if not YOUR_SHARED_SECRET:
        print("Critical Error: YOUR_SHARED_SECRET not available in insights.py for invoking sync-meta-data function.")
        raise HTTPException(status_code=500, detail="Backend configuration error: Shared secret for function invocation is missing.")

    try:
        # print(f"Insights: Fetching meta connection for user_id: {user_id}")
        connection_response = supabase_client.table('meta_connections') \
                                        .select('long_lived_token') \
                                        .eq('user_id', user_id) \
                                        .maybe_single() \
                                        .execute()
        
        # print(f"Insights: Connection response: {connection_response}")


        if not connection_response.data or not connection_response.data.get('long_lived_token'):
            # print(f"Insights: No meta connection or long_lived_token found for user_id: {user_id}")
            raise HTTPException(
                status_code=404,
                detail="Meta connection not found or access token missing. Please connect your Meta account before generating insights."
            )
        meta_access_token = connection_response.data['long_lived_token']
        # print(f"Insights: Found long_lived_token for user_id: {user_id}")

    except HTTPException as e:
        raise e
    except Exception as e:
        # print(f"Insights: Database error fetching meta connection for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error fetching Meta connection for sync: {str(e)}")

    function_payload = {
        "meta_access_token": meta_access_token,
        "user_id": user_id,
        "ad_account_id": request.query_params.get("ad_account_id") # Ensure ad_account_id is included
    }

    headers = {
        "Authorization": f"Bearer {YOUR_SHARED_SECRET}",
        "Content-Type": "application/json"
    }
    async with httpx.AsyncClient() as client:
        try:
            # print(f"Insights: Invoking Supabase function: {SYNC_META_DATA_URL} for user {user_id}")
            response = await client.post(SYNC_META_DATA_URL, headers=headers, json=function_payload, timeout=180.0)
            response.raise_for_status()
            # print(f"Insights: Successfully invoked sync-meta-data for user {user_id}, Status: {response.status_code}")
            return response.json() # Or some status indication
        except httpx.TimeoutException:
            # print(f"Insights: Error: Timeout invoking Supabase function {SYNC_META_DATA_URL}")
            raise HTTPException(status_code=408, detail=f"Timeout invoking data sync service: {SYNC_META_DATA_URL}")
        except httpx.HTTPStatusError as e:
            error_detail = f"Error invoking data sync service {SYNC_META_DATA_URL}: Status {e.response.status_code}"
            try:
                error_body = e.response.json()
                error_detail += f" - {error_body.get('error') or error_body.get('message') or e.response.text}"
            except Exception:
                error_detail += f" - {e.response.text}"
            # print(f"Insights: {error_detail}")
            raise HTTPException(status_code=e.response.status_code, detail=error_detail)
        except Exception as e:
            # print(f"Insights: Unexpected error invoking Supabase function {SYNC_META_DATA_URL}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Unexpected error invoking data sync service: {str(e)}")


@router.get("/aggregate")
async def get_aggregated_metrics(
    request: Request,
    ad_account_id: str = Query(..., description="Ad account ID"),
    campaign_id: Optional[str] = Query(None, description="Campaign ID"),
    adset_id: Optional[str] = Query(None, description="Ad set ID"),
    ad_id: Optional[str] = Query(None, description="Ad ID"),
    time_range: str = Query("30d", description="Time range: 7d, 14d, 30d, 90d"),
    time_increment: Optional[int] = Query(1, description="Time increment in days"),
    supabase_client: Client = Depends(get_supabase_client)
) -> List[Dict[str, Any]]:
    """
    Get aggregated metrics for an ad account, optionally filtered by campaign, ad set, or ad
    """
    # user = request.state.user # user variable is already available via request.state.user

    # --- Sync Meta Data First ---
    try:
        # print(f"Aggregate Endpoint: Attempting to sync meta data for user {request.state.user.get('id') if request.state.user else 'Unknown'}")
        await invoke_sync_meta_data_function(request, supabase_client)
        # print(f"Aggregate Endpoint: Meta data sync successful for user.")
    except HTTPException as e:
        # If sync fails, we might want to decide if we proceed with stale data or return the error
        # For now, let's re-raise the error, as fresh data is preferred.
        # print(f"Aggregate Endpoint: Sync meta data failed: {e.detail}")
        raise HTTPException(status_code=e.status_code, detail=f"Data sync failed: {e.detail}. Cannot proceed with insight generation.")
    # --- End Sync Meta Data ---
    
    # Determine the level based on the provided IDs
    level = "account"
    entity_id = None
    
    if ad_id:
        level = "ad"
        entity_id = ad_id
    elif adset_id:
        level = "adset"
        entity_id = adset_id
    elif campaign_id:
        level = "campaign"
        entity_id = campaign_id
    
    try:
        # Get insights from Facebook
        insights = await get_ad_insights(
            request=request,
            ad_account_id=ad_account_id,
            level=level,
            time_range=time_range,
            time_increment=time_increment
        )
        
        return insights
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get aggregated metrics: {str(e)}")

@router.get("/breakdown")
async def get_breakdown_metrics(
    request: Request,
    ad_account_id: str = Query(..., description="Ad account ID"),
    breakdown: str = Query(..., description="Breakdown dimension: age, gender, platform, device"),
    campaign_id: Optional[str] = Query(None, description="Campaign ID"),
    adset_id: Optional[str] = Query(None, description="Ad set ID"),
    ad_id: Optional[str] = Query(None, description="Ad ID"),
    time_range: str = Query("30d", description="Time range: 7d, 14d, 30d, 90d"),
    supabase_client: Client = Depends(get_supabase_client)
) -> List[Dict[str, Any]]:
    """
    Get metrics broken down by a specific dimension
    """
    # user = request.state.user

    # --- Sync Meta Data First ---
    try:
        await invoke_sync_meta_data_function(request, supabase_client)
    except HTTPException as e:
        raise HTTPException(status_code=e.status_code, detail=f"Data sync failed: {e.detail}. Cannot proceed with insight generation.")
    # --- End Sync Meta Data ---
    
    # Map breakdown parameter to Facebook breakdowns
    breakdown_map = {
        "age": "age",
        "gender": "gender",
        "platform": "platform_position",
        "device": "device_platform"
    }
    
    if breakdown not in breakdown_map:
        raise HTTPException(status_code=400, detail=f"Invalid breakdown: {breakdown}. Must be one of: age, gender, platform, device")
    
    facebook_breakdown = breakdown_map[breakdown]
    
    # Determine the level based on the provided IDs
    level = "account"
    
    if ad_id:
        level = "ad"
    elif adset_id:
        level = "adset"
    elif campaign_id:
        level = "campaign"
    
    try:
        # Get insights from Facebook with the requested breakdown
        insights = await get_ad_insights(
            request=request,
            ad_account_id=ad_account_id,
            level=level,
            time_range=time_range,
            breakdowns=facebook_breakdown
        )
        
        return insights
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get breakdown metrics: {str(e)}")

@router.get("/performance")
async def get_performance_metrics(
    request: Request,
    ad_account_id: str = Query(..., description="Ad account ID"),
    metric: str = Query(..., description="Performance metric: spend, impressions, clicks, ctr, cpc, roas"),
    time_range: str = Query("30d", description="Time range: 7d, 14d, 30d, 90d"),
    time_increment: int = Query(1, description="Time increment in days"),
    supabase_client: Client = Depends(get_supabase_client)
) -> Dict[str, Any]:
    """
    Get performance metrics over time
    """
    # user = request.state.user

    # --- Sync Meta Data First ---
    try:
        await invoke_sync_meta_data_function(request, supabase_client)
    except HTTPException as e:
        raise HTTPException(status_code=e.status_code, detail=f"Data sync failed: {e.detail}. Cannot proceed with insight generation.")
    # --- End Sync Meta Data ---
    
    valid_metrics = ["spend", "impressions", "clicks", "ctr", "cpc", "roas"]
    if metric not in valid_metrics:
        raise HTTPException(status_code=400, detail=f"Invalid metric: {metric}. Must be one of: {', '.join(valid_metrics)}")
    
    try:
        # Get insights from Facebook
        insights = await get_ad_insights(
            request=request,
            ad_account_id=ad_account_id,
            level="account",
            time_range=time_range,
            time_increment=time_increment,
            metrics=metric
        )
        
        # Format the data for time series visualization
        dates = []
        values = []
        
        for insight in insights:
            dates.append(insight.get("date_start"))
            values.append(insight.get(metric, 0))
        
        return {
            "metric": metric,
            "dates": dates,
            "values": values
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get performance metrics: {str(e)}")

@router.get("/top-performing")
async def get_top_performing(
    request: Request,
    ad_account_id: str = Query(..., description="Ad account ID"),
    entity_type: str = Query("campaign", description="Entity type: campaign, adset, ad"),
    metric: str = Query("roas", description="Sort metric: roas, ctr, cpc, spend"),
    limit: int = Query(5, description="Number of results to return"),
    time_range: str = Query("30d", description="Time range: 7d, 14d, 30d, 90d"),
    supabase_client: Client = Depends(get_supabase_client)
) -> List[Dict[str, Any]]:
    """
    Get top performing campaigns, ad sets, or ads by a specific metric
    """
    # user = request.state.user

    # --- Sync Meta Data First ---
    try:
        await invoke_sync_meta_data_function(request, supabase_client)
    except HTTPException as e:
        raise HTTPException(status_code=e.status_code, detail=f"Data sync failed: {e.detail}. Cannot proceed with insight generation.")
    # --- End Sync Meta Data ---
    
    valid_entity_types = ["campaign", "adset", "ad"]
    if entity_type not in valid_entity_types:
        raise HTTPException(status_code=400, detail=f"Invalid entity_type: {entity_type}. Must be one of: {', '.join(valid_entity_types)}")
    
    valid_metrics = ["roas", "ctr", "cpc", "spend", "conversions"]
    if metric not in valid_metrics:
        raise HTTPException(status_code=400, detail=f"Invalid metric: {metric}. Must be one of: {', '.join(valid_metrics)}")
    
    try:
        # Get insights from Facebook
        insights = await get_ad_insights(
            request=request,
            ad_account_id=ad_account_id,
            level=entity_type,
            time_range=time_range
        )
        
        # Sort by the requested metric
        if metric == "roas" or metric == "ctr":
            # Higher is better
            sorted_insights = sorted(insights, key=lambda x: float(x.get(metric, 0)), reverse=True)
        elif metric == "cpc":
            # Lower is better
            sorted_insights = sorted(insights, key=lambda x: float(x.get(metric, 0)))
        elif metric == "spend":
            # Higher spend might be higher performance
            sorted_insights = sorted(insights, key=lambda x: float(x.get(metric, 0)), reverse=True)
        else:
            # Default sort
            sorted_insights = sorted(insights, key=lambda x: float(x.get(metric, 0)), reverse=True)
        
        # Limit the results
        return sorted_insights[:limit]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get top performing entities: {str(e)}")
