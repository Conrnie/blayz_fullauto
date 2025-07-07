from fastapi import APIRouter, Depends, HTTPException, Request, Query
from typing import Dict, List, Any, Optional
from app.facebook_api import (
    get_auth_url,
    exchange_code_for_token,
    get_long_lived_token,
    get_ad_accounts,
    get_campaigns,
    get_adsets,
    get_ads,
    get_insights,
    FacebookAPIError
)
from app.auth import get_supabase_client
from app.database import create_record, get_records
from datetime import datetime, timedelta
import json
import uuid

router = APIRouter()

@router.get("/auth-url")
async def get_facebook_auth_url(request: Request) -> Dict[str, str]:
    """
    Generate an authorization URL for Facebook OAuth
    """
    user = request.state.user
    state = user["id"]  # Use user ID as state for verification
    
    try:
        url = get_auth_url(state)
        return {"url": url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/auth-callback")
async def facebook_auth_callback(request: Request, code: str = None, state: str = None) -> Dict[str, Any]:
    """
    Handle the callback from Facebook OAuth
    """
    if not code:
        request_data = await request.json()
        code = request_data.get("code")
        state = request_data.get("state")
    
    if not code:
        raise HTTPException(status_code=400, detail="Authorization code is required")
    
    try:
        # Exchange code for token
        token_data_exchange = await exchange_code_for_token(code)
        
        # Get a long-lived token
        long_lived_token_response = await get_long_lived_token(token_data_exchange["access_token"])
        
        # Calculate expiration
        expires_in = long_lived_token_response.get("expires_in", 5184000)  # Default to 60 days
        expires_at_dt = datetime.utcnow() + timedelta(seconds=expires_in)
        
        # Store the token in the database
        user_id = state  # The state should be the user ID from the auth-url step
        
        supabase = get_supabase_client()
        
        # Check if token already exists for this user in meta_connections
        existing_token_response = supabase.table("meta_connections").select("id").eq("user_id", user_id).execute()
        
        # Prepare data for meta_connections table
        meta_connection_data = {
            "user_id": user_id,
            "long_lived_token": long_lived_token_response["access_token"],
            "token_expires_at": expires_at_dt.isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "provider": "facebook"
        }
        
        if existing_token_response.data and len(existing_token_response.data) > 0:
            # Update existing token in meta_connections
            connection_id = existing_token_response.data[0]["id"]
            supabase.table("meta_connections").update(meta_connection_data).eq("id", connection_id).execute()
        else:
            # Create new token record in meta_connections
            meta_connection_data["id"] = str(uuid.uuid4())
            meta_connection_data["created_at"] = datetime.utcnow().isoformat()
            supabase.table("meta_connections").insert(meta_connection_data).execute()
        
        # Fetch and store ad accounts
        await sync_ad_accounts(user_id, long_lived_token_response["access_token"])
        
        return {"success": True, "message": "Facebook authorization successful and meta_connections updated"}
    except FacebookAPIError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to complete Facebook authorization: {str(e)}")

async def get_facebook_token(user_id: str) -> str:
    """
    Get the Facebook access token for a user
    """
    supabase = get_supabase_client()
    
    # Query the meta_connections table instead of user_facebook_tokens
    # Select long_lived_token and token_expires_at
    token_data = supabase.table("meta_connections").select("long_lived_token,token_expires_at").eq("user_id", user_id).execute()
    
    if not token_data.data or len(token_data.data) == 0:
        # Update error message to reflect meta_connections
        raise HTTPException(status_code=404, detail="Meta account not connected or token not found in meta_connections")
    
    token_info = token_data.data[0] # Renamed for clarity
    
    # Check if token is expired, using token_expires_at
    expires_at_str = token_info.get("token_expires_at")
    if not expires_at_str:
        raise HTTPException(status_code=500, detail="Token expiration time not found in meta_connections")

    try:
        # Ensure expires_at is timezone-aware for correct comparison
        expires_at = datetime.fromisoformat(expires_at_str.replace("Z", "+00:00"))
        if datetime.utcnow().replace(tzinfo=expires_at.tzinfo) > expires_at: # Compare timezone-aware datetimes
            raise HTTPException(status_code=401, detail="Meta token has expired. Please reconnect your account.")
    except ValueError:
        raise HTTPException(status_code=500, detail="Invalid token expiration timestamp format in meta_connections")

    access_token = token_info.get("long_lived_token")
    if not access_token:
        raise HTTPException(status_code=500, detail="Access token (long_lived_token) not found in meta_connections")
        
    return access_token

async def sync_ad_accounts(user_id: str, access_token: str) -> List[Dict[str, Any]]:
    """
    Fetch and store ad accounts for a user, matching the DB schema.
    """
    try:
        fb_ad_accounts_data = await get_ad_accounts(access_token) 
        
        supabase = get_supabase_client()
        if supabase is None:
            print("Critical Error: Supabase client is None in sync_ad_accounts.")
            raise HTTPException(status_code=500, detail="Supabase client not available.")

        synced_accounts_for_response = []

        for fb_account in fb_ad_accounts_data:
            facebook_act_id_str = fb_account.get("id") 
            if not facebook_act_id_str:
                print(f"Skipping ad account due to missing 'id' from Facebook data: {fb_account}")
                continue

            account_data_to_upsert = {
                "user_id": user_id,
                "account_id": facebook_act_id_str,
                "name": fb_account.get("name"),
                "status": str(fb_account.get("account_status")) if fb_account.get("account_status") is not None else fb_account.get("status"),
                "currency": fb_account.get("currency"),
                "balance": fb_account.get("balance"), 
                "amount_spent": fb_account.get("amount_spent"), 
                "spend_cap": fb_account.get("spend_cap"), 
                "business_id": fb_account.get("business", {}).get("id"),
                "business_name": fb_account.get("business_name") or fb_account.get("business", {}).get("name"),
                "source": "facebook",
                "updated_at": datetime.utcnow().isoformat()
            }
            
            cleaned_account_data_to_upsert = {k: v for k, v in account_data_to_upsert.items() if v is not None}
            
            db_response = None # Initialize
            try:
                query_builder = supabase.table("ad_accounts").select("id, created_at", count='exact') \
                    .eq("account_id", facebook_act_id_str) \
                    .eq("user_id", user_id)
                # Removed .maybe_single() to see the raw response and count
                print(f"Attempting to execute select for: account_id={facebook_act_id_str}, user_id={user_id}")
                db_response = query_builder.execute()
                print(f"Supabase select query response type: {type(db_response)}")
                if hasattr(db_response, 'data'):
                    print(f"Supabase select query response data: {db_response.data}")
                if hasattr(db_response, 'count'):
                    print(f"Supabase select query response count: {db_response.count}")

            except Exception as e_query:
                print(f"Exception during Supabase select query for account_id {facebook_act_id_str}: {type(e_query).__name__} - {str(e_query)}")
                import traceback
                traceback.print_exc()
                raise HTTPException(status_code=500, detail=f"Error during DB query for ad account {facebook_act_id_str}: {str(e_query)}")

            if db_response is None:
                print(f"Critical Error: Supabase select query for account_id {facebook_act_id_str} returned None directly from execute().")
                raise HTTPException(status_code=500, detail=f"DB query failed for ad account {facebook_act_id_str}. Supabase response was None.")

            current_db_state = {}
            # Check if data exists and is not an empty list, and if count indicates presence
            record_found = db_response.data and len(db_response.data) > 0 and db_response.count is not None and db_response.count > 0

            if record_found:
                # Record exists, proceed with update
                # If multiple records were found (count > 1), this would take the first one.
                # Your schema has unique constraints so this should ideally be 0 or 1.
                existing_record_data = db_response.data[0]
                db_internal_pk_id = existing_record_data["id"]
                existing_created_at = existing_record_data.get("created_at") 
                
                update_op = supabase.table("ad_accounts").update(cleaned_account_data_to_upsert).eq("id", db_internal_pk_id)
                update_response = update_op.execute()
                
                if update_response is None:
                    print(f"Error: Supabase update query for id {db_internal_pk_id} returned None.")
                    raise HTTPException(status_code=500, detail=f"Failed to update ad account {facebook_act_id_str}. Supabase response was None.")

                if update_response.data and len(update_response.data) > 0:
                    current_db_state = update_response.data[0]
                else: 
                    current_db_state = {**cleaned_account_data_to_upsert, "id": db_internal_pk_id, "created_at": existing_created_at} 
            else:
                # No record found, proceed with insert
                print(f"No existing record found for account_id={facebook_act_id_str}, user_id={user_id}. Inserting new record.")
                cleaned_account_data_to_upsert["created_at"] = datetime.utcnow().isoformat()
                insert_op = supabase.table("ad_accounts").insert(cleaned_account_data_to_upsert)
                insert_response = insert_op.execute()
                
                if insert_response is None:
                    print(f"Error: Supabase insert query for account_id {facebook_act_id_str} returned None.")
                    raise HTTPException(status_code=500, detail=f"Failed to insert ad account {facebook_act_id_str}. Supabase response was None.")

                if insert_response.data and len(insert_response.data) > 0:
                    current_db_state = insert_response.data[0]
                else:
                    current_db_state = cleaned_account_data_to_upsert
            
            synced_accounts_for_response.append(current_db_state)
        
        return synced_accounts_for_response
    except FacebookAPIError as e:
        print(f"Facebook API Error in sync_ad_accounts: {str(e)}")
        # Ensure FacebookAPIError has status_code or provide a default
        raise HTTPException(status_code=getattr(e, 'status_code', 500), detail=str(e))
    except Exception as e:
        import traceback
        print(f"Generic error in sync_ad_accounts: {type(e).__name__} - {str(e)}")
        traceback.print_exc() 
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred while syncing ad accounts: {str(e)}")

@router.get("/ad-accounts")
async def list_ad_accounts(request: Request) -> List[Dict[str, Any]]:
    """
    Get all ad accounts for the authenticated user
    """
    user = request.state.user
    
    try:
        # Get the Facebook access token
        access_token = await get_facebook_token(user["id"])
        
        # Fetch and sync ad accounts
        return await sync_ad_accounts(user["id"], access_token)
    except FacebookAPIError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get ad accounts: {str(e)}")

@router.get("/campaigns")
async def list_campaigns(
    request: Request,
    ad_account_id: str = Query(..., description="Ad account ID")
) -> List[Dict[str, Any]]:
    """
    Get campaigns for a specific ad account
    """
    user = request.state.user
    
    try:
        # Get the Facebook access token
        access_token = await get_facebook_token(user["id"])
        
        # Fetch campaigns
        campaigns = await get_campaigns(access_token, ad_account_id)
        
        # Store campaigns in the database
        supabase = get_supabase_client()
        
        for campaign in campaigns:
            campaign_data = {
                "user_id": user["id"],
                "ad_account_id": ad_account_id,
                "name": campaign["name"],
                "status": campaign["status"],
                "objective": campaign.get("objective"),
                "daily_budget": campaign.get("daily_budget"),
                "lifetime_budget": campaign.get("lifetime_budget"),
                "start_time": campaign.get("start_time"),
                "stop_time": campaign.get("stop_time"),
                "budget_remaining": campaign.get("budget_remaining"),
                "updated_at": datetime.utcnow().isoformat()
            }
            
            # Check if campaign already exists
            existing = supabase.table("campaigns").select("id").eq("id", campaign["id"]).execute()
            
            if existing.data and len(existing.data) > 0:
                # Update existing campaign
                supabase.table("campaigns").update(campaign_data).eq("id", campaign["id"]).execute()
            else:
                # Create new campaign record
                campaign_data["id"] = campaign["id"]
                campaign_data["created_at"] = datetime.utcnow().isoformat()
                supabase.table("campaigns").insert(campaign_data).execute()
        
        return campaigns
    except FacebookAPIError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get campaigns: {str(e)}")

@router.get("/adsets")
async def list_adsets(
    request: Request,
    campaign_id: str = Query(..., description="Campaign ID")
) -> List[Dict[str, Any]]:
    """
    Get ad sets for a specific campaign
    """
    user = request.state.user
    
    try:
        # Get the Facebook access token
        access_token = await get_facebook_token(user["id"])
        
        # Fetch ad sets
        adsets = await get_adsets(access_token, campaign_id)
        
        # Store ad sets in the database
        supabase = get_supabase_client()
        
        for adset in adsets:
            adset_data = {
                "user_id": user["id"],
                "campaign_id": campaign_id,
                "name": adset["name"],
                "status": adset["status"],
                "daily_budget": adset.get("daily_budget"),
                "lifetime_budget": adset.get("lifetime_budget"),
                "targeting": adset.get("targeting"),
                "optimization_goal": adset.get("optimization_goal"),
                "bid_amount": adset.get("bid_amount"),
                "billing_event": adset.get("billing_event"),
                "updated_at": datetime.utcnow().isoformat()
            }
            
            # Check if ad set already exists
            existing = supabase.table("ad_sets").select("id").eq("id", adset["id"]).execute()
            
            if existing.data and len(existing.data) > 0:
                # Update existing ad set
                supabase.table("ad_sets").update(adset_data).eq("id", adset["id"]).execute()
            else:
                # Create new ad set record
                adset_data["id"] = adset["id"]
                adset_data["created_at"] = datetime.utcnow().isoformat()
                supabase.table("ad_sets").insert(adset_data).execute()
        
        return adsets
    except FacebookAPIError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get ad sets: {str(e)}")

@router.get("/ads")
async def list_ads(
    request: Request,
    adset_id: str = Query(..., description="Ad set ID")
) -> List[Dict[str, Any]]:
    """
    Get ads for a specific ad set
    """
    user = request.state.user
    
    try:
        # Get the Facebook access token
        access_token = await get_facebook_token(user["id"])
        
        # Fetch ads
        ads = await get_ads(access_token, adset_id)
        
        # Store ads in the database
        supabase = get_supabase_client()
        
        for ad in ads:
            ad_data = {
                "user_id": user["id"],
                "adset_id": adset_id,
                "campaign_id": ad.get("campaign_id"),
                "name": ad["name"],
                "status": ad["status"],
                "creative": ad.get("creative"),
                "updated_at": datetime.utcnow().isoformat()
            }
            
            # Check if ad already exists
            existing = supabase.table("ads").select("id").eq("id", ad["id"]).execute()
            
            if existing.data and len(existing.data) > 0:
                # Update existing ad
                supabase.table("ads").update(ad_data).eq("id", ad["id"]).execute()
            else:
                # Create new ad record
                ad_data["id"] = ad["id"]
                ad_data["created_at"] = datetime.utcnow().isoformat()
                supabase.table("ads").insert(ad_data).execute()
        
        return ads
    except FacebookAPIError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get ads: {str(e)}")

@router.get("/insights")
async def get_ad_insights(
    request: Request,
    ad_account_id: str = Query(..., description="Ad account ID"),
    level: str = Query("account", description="Data level: account, campaign, adset, ad"),
    time_range: str = Query("30d", description="Time range: 7d, 14d, 30d, 90d, or custom"),
    time_increment: Optional[int] = Query(None, description="Time increment in days"),
    breakdowns: Optional[str] = Query(None, description="Breakdowns to include, comma-separated"),
    metrics: Optional[str] = Query(None, description="Metrics to include, comma-separated")
) -> List[Dict[str, Any]]:
    """
    Get insights for a specific ad account, campaign, ad set, or ad
    """
    user = request.state.user
    
    try:
        # Get the Facebook access token
        access_token = await get_facebook_token(user["id"])
        
        # Parse time range
        time_range_dict = {}
        today = datetime.utcnow().date() # Get today's date

        if time_range == "7d":
            since_date = today - timedelta(days=7)
            time_range_dict = {"since": since_date.isoformat(), "until": today.isoformat()}
        elif time_range == "14d":
            since_date = today - timedelta(days=14)
            time_range_dict = {"since": since_date.isoformat(), "until": today.isoformat()}
        elif time_range == "30d":
            since_date = today - timedelta(days=30)
            time_range_dict = {"since": since_date.isoformat(), "until": today.isoformat()}
        elif time_range == "90d":
            since_date = today - timedelta(days=90)
            time_range_dict = {"since": since_date.isoformat(), "until": today.isoformat()}
        else:
            # Custom time range format: "YYYY-MM-DD_YYYY-MM-DD"
            current_time_range = str(time_range) if time_range is not None else ""
            dates = current_time_range.split("_")
            if len(dates) == 2:
                try:
                    # Validate YYYY-MM-DD format
                    datetime.strptime(dates[0], "%Y-%m-%d")
                    datetime.strptime(dates[1], "%Y-%m-%d")
                    time_range_dict = {"since": dates[0], "until": dates[1]}
                except ValueError:
                    # Fallback if custom format is invalid
                    since_date = today - timedelta(days=30) # Default to 30 days
                    time_range_dict = {"since": since_date.isoformat(), "until": today.isoformat()}
            else:
                # Fallback if split doesn't produce two parts or time_range was None initially
                since_date = today - timedelta(days=30) # Default to 30 days
                time_range_dict = {"since": since_date.isoformat(), "until": today.isoformat()}
        
        # Parse breakdowns
        # Ensure we only split if 'breakdowns' is a string (i.e., provided in the request)
        breakdowns_list = breakdowns.split(',') if isinstance(breakdowns, str) else None
        
        # Parse metrics
        # Ensure we only split if 'metrics' is a string (i.e., provided in the request)
        metrics_list = metrics.split(',') if isinstance(metrics, str) else None
        
        # Fetch insights
        insights_data = await get_insights(
            access_token=access_token,
            ad_account_id=ad_account_id,
            level=level,
            fields=metrics_list,
            breakdowns=breakdowns_list,
            time_range=time_range_dict,
            time_increment=time_increment
        )
        
        # Store insights in the database
        supabase = get_supabase_client()
        
        for insight in insights_data:
            # Create a unique ID for the insight
            insight_id = str(uuid.uuid4())
            
            # Extract relevant data
            insight_data = {
                "id": insight_id,
                "user_id": user["id"],
                "date_start": insight.get("date_start"),
                "date_stop": insight.get("date_stop"),
                "account_id": ad_account_id,
                "impressions": insight.get("impressions"),
                "clicks": insight.get("clicks"),
                "spend": insight.get("spend"),
                "ctr": insight.get("ctr"),
                "cpc": insight.get("cpc"),
                "reach": insight.get("reach"),
                "frequency": insight.get("frequency"),
                "actions": insight.get("actions"),
                "cost_per_action_type": insight.get("cost_per_action_type"),
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
            
            # Add level-specific data
            if level == "campaign" and "campaign_id" in insight:
                insight_data["campaign_id"] = insight["campaign_id"]
            elif level == "adset" and "adset_id" in insight:
                insight_data["adset_id"] = insight["adset_id"]
            elif level == "ad" and "ad_id" in insight:
                insight_data["ad_id"] = insight["ad_id"]
            
            # Add breakdown data if present
            if breakdowns_list and any(bd in insight for bd in breakdowns_list):
                breakdown_data = {}
                for bd in breakdowns_list:
                    if bd in insight:
                        breakdown_data[bd] = insight[bd]
                
                if breakdown_data:
                    insight_data["breakdowns"] = breakdown_data
            
            # Insert data - we always create new records for insights
            try:
                supabase.table("insights").insert(insight_data).execute()
            except Exception as e:
                print(f"Error storing insight: {str(e)}")
                # Continue even if storage fails - this is just for historical data
        
        return insights_data
    except FacebookAPIError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get insights: {str(e)}")
