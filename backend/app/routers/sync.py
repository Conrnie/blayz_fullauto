import os
import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Dict, Any, Optional, List
from supabase import Client
from app.auth import get_supabase_client
from pydantic import BaseModel, Field

# --- Environment Variables ---
# Ensure SUPABASE_SERVICE_ROLE_KEY is set in your environment for the backend
# This key might be used by the Supabase client for direct DB operations if the backend needs admin rights.
SUPABASE_SERVICE_KEY_FOR_DIRECT_DB = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
# This is the dedicated shared secret that the Supabase Edge Functions (like sync-campaigns) expect for invocation.
# Ensure this environment variable is set in your Python backend's environment with the same value as YOUR_SHARED_SECRET in the Edge Function's environment.
EDGE_FUNCTION_INVOCATION_SECRET = os.getenv("YOUR_SHARED_SECRET")

# You might want to get the Supabase URL base from env vars too for flexibility
SUPABASE_FUNCTION_BASE_URL = os.getenv("SUPABASE_FUNCTION_BASE_URL", "https://zrsevaevonthrspehpaj.supabase.co/functions/v1")

if not SUPABASE_SERVICE_KEY_FOR_DIRECT_DB:
    print("Warning: SUPABASE_SERVICE_ROLE_KEY environment variable is not set. This might be needed for direct Supabase client operations.")
    # Depending on your deployment, you might want to raise an error here if direct DB access with service role is critical
    # raise ValueError("SUPABASE_SERVICE_ROLE_KEY must be set")

if not EDGE_FUNCTION_INVOCATION_SECRET:
    print("CRITICAL Warning: YOUR_SHARED_SECRET environment variable is not set. Backend will be unable to call protected Edge Functions.")
    # raise ValueError("YOUR_SHARED_SECRET must be set for invoking Supabase Edge Functions.")

router = APIRouter(
    tags=["sync"],
)

# Define the function URLs
SYNC_CAMPAIGNS_URL = f"{SUPABASE_FUNCTION_BASE_URL}/sync-campaigns"
SYNC_ADSETS_URL = f"{SUPABASE_FUNCTION_BASE_URL}/sync-ad-sets"
SYNC_ADS_URL = f"{SUPABASE_FUNCTION_BASE_URL}/sync-ads"
# SYNC_META_DATA_URL = f"{SUPABASE_FUNCTION_BASE_URL}/sync-meta-data" # No longer calling the orchestrator

# --- Pydantic Model for Request Body --- (NEW)
class SyncAllMetaDataPayload(BaseModel):
    userId: str # Keep userId from ensure-data-is-fresh for clarity, though we get it from auth state
    dbAdAccountId: int
    selectedMetaCampaignId: Optional[str] = None

async def invoke_supabase_function(client: httpx.AsyncClient, url: str, payload: Dict[str, Any]):
    """Helper function to invoke a Supabase Edge Function."""
    if not EDGE_FUNCTION_INVOCATION_SECRET:
        print(f"Error: YOUR_SHARED_SECRET is not configured in the backend. Cannot invoke {url}.")
        raise HTTPException(status_code=500, detail="Backend configuration error: Missing secret for Edge Function invocation.")

    headers = {
        "Authorization": f"Bearer {EDGE_FUNCTION_INVOCATION_SECRET}", # Use the dedicated shared secret
        "Content-Type": "application/json"
    }
    try:
        print(f"Invoking Supabase function: {url} with payload: {payload}") # Log payload
        response = await client.post(url, headers=headers, json=payload, timeout=180.0)
        response.raise_for_status()
        print(f"Successfully invoked: {url}, Status: {response.status_code}")
        return response.json()
    except httpx.TimeoutException:
        print(f"Error: Timeout invoking Supabase function {url}")
        raise HTTPException(status_code=408, detail=f"Timeout invoking Supabase function: {url}")
    except httpx.HTTPStatusError as e:
        error_detail = f"Error invoking Supabase function {url}: Status {e.response.status_code}"
        try:
            # Try to get more specific error from function response
            error_body = e.response.json()
            error_detail += f" - {error_body.get('error') or error_body.get('message') or e.response.text}"
        except Exception:
             error_detail += f" - {e.response.text}"
        print(error_detail)
        raise HTTPException(status_code=e.response.status_code, detail=error_detail)
    except Exception as e:
        print(f"Unexpected error invoking Supabase function {url}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Unexpected error invoking {url}: {str(e)}")


@router.post("/sync-all-meta-data")
async def sync_all_meta_data(
    payload: SyncAllMetaDataPayload, # MODIFIED: Use Pydantic model for request body
    request: Request, # Still need request for auth state
    supabase: Client = Depends(get_supabase_client) # Supabase client for DB operations if needed
):
    """
    Triggers synchronization of Meta data. 
    If selectedMetaCampaignId is provided, it targets sync for that specific campaign's insights.
    Otherwise, it syncs all campaigns for the given dbAdAccountId.
    """
    if not request.state.user:
        raise HTTPException(status_code=401, detail="User not authenticated")

    authenticated_user_id = request.state.user.get('id') if isinstance(request.state.user, dict) else getattr(request.state.user, 'id', None)
    if not authenticated_user_id:
         raise HTTPException(status_code=401, detail="Could not determine user ID from authenticated state")

    # Verify that the userId from payload matches authenticated user if necessary, or just use authenticated_user_id
    if authenticated_user_id != payload.userId:
        # This might indicate a mismatch or an attempt to sync for another user if not properly secured by RLS on Supabase function calls.
        # For now, we'll proceed using authenticated_user_id for security.
        print(f"Warning: Authenticated user ID ({authenticated_user_id}) differs from payload userId ({payload.userId}). Using authenticated ID.")

    user_id_to_use = authenticated_user_id

    # This check is now for the secret needed to call the Edge Functions
    if not EDGE_FUNCTION_INVOCATION_SECRET: 
         raise HTTPException(status_code=500, detail="Backend configuration error: YOUR_SHARED_SECRET not set.")

    # Use dbAdAccountId from the payload directly
    db_ad_account_id_from_payload = payload.dbAdAccountId
    selected_meta_campaign_id_from_payload = payload.selectedMetaCampaignId

    meta_ad_account_id_str: str # This is the act_... string

    try:
        # We need to fetch the meta_ad_account_id (act_...) string using the db_ad_account_id_from_payload (int)
        print(f"Fetching Meta Ad Account ID (act_...) for DB Ad Account ID: {db_ad_account_id_from_payload} and user {user_id_to_use}")
        ad_account_details_response = supabase.table('ad_accounts') \
                                      .select('account_id') \
                                      .eq('id', db_ad_account_id_from_payload) \
                                      .eq('user_id', user_id_to_use) \
                                      .single() \
                                      .execute()
        
        if not ad_account_details_response.data or not ad_account_details_response.data.get('account_id'):
            print(f"No Meta Ad Account ID (act_...) found for DB Ad Account ID: {db_ad_account_id_from_payload} for user_id: {user_id_to_use}")
            raise HTTPException(
                status_code=404,
                detail=f"Meta Ad Account ID not found for the provided DB Ad Account ID {db_ad_account_id_from_payload}."
            )
        meta_ad_account_id_str = ad_account_details_response.data['account_id']
        print(f"Found Meta Ad Account ID (act_...): {meta_ad_account_id_str} for DB Ad Account ID: {db_ad_account_id_from_payload}")

    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Database error fetching Meta Ad Account ID for DB Ad Account {db_ad_account_id_from_payload} for user {user_id_to_use}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    # Overall results and errors tracking
    orchestration_results = {
        "campaign_sync": None,
        "ad_set_syncs": [],
        "ad_syncs": []
    }
    errors_encountered = []

    async with httpx.AsyncClient() as client:
        try:
            print(f"Preparing to invoke sync-campaigns for user {user_id_to_use}, Meta Ad Account {meta_ad_account_id_str}")
            campaign_payload_to_sync_func = {
                "userId": user_id_to_use,
                "metaAdAccountId": meta_ad_account_id_str, # The act_... string
                "dbAdAccountId": db_ad_account_id_from_payload # The integer ad_accounts.id
            }

            if selected_meta_campaign_id_from_payload:
                print(f"Targeted sync: Adding specific_campaign_ids: [{selected_meta_campaign_id_from_payload}]")
                campaign_payload_to_sync_func["specific_campaign_ids"] = [selected_meta_campaign_id_from_payload]
            else:
                print("Broad sync: No specific_campaign_ids provided. Syncing all campaigns for the ad account.")

            campaign_sync_response_data = await invoke_supabase_function(client, SYNC_CAMPAIGNS_URL, campaign_payload_to_sync_func)
            orchestration_results["campaign_sync"] = campaign_sync_response_data
            print(f"sync-campaigns finished. Response: {campaign_sync_response_data}")

            processed_campaign_details = campaign_sync_response_data.get("processed_campaign_details", [])
            if not processed_campaign_details:
                print(f"No campaigns processed or returned from sync-campaigns for Meta ad account {meta_ad_account_id_str}.")
            
            # 2. Sync Ad Sets (for each campaign)
            for campaign_detail in processed_campaign_details:
                meta_campaign_id = campaign_detail.get("meta_campaign_id")
                db_campaign_id = campaign_detail.get("db_campaign_id") # Supabase campaigns.id (UUID)
                campaign_objective = campaign_detail.get("objective")

                if not meta_campaign_id or not db_campaign_id:
                    msg = f"Skipping ad set sync for a campaign due to missing IDs: {campaign_detail}"
                    print(msg)
                    errors_encountered.append(msg)
                    orchestration_results["ad_set_syncs"].append({"campaign_id": meta_campaign_id, "status": "skipped", "reason": "missing campaign IDs"})
                    continue

                print(f"  Invoking sync-ad-sets for campaign {meta_campaign_id} (DB ID: {db_campaign_id})")
                ad_set_payload = {
                    "userId": user_id_to_use,
                    "metaAdAccountId": meta_ad_account_id_str,
                    "dbAdAccountId": db_ad_account_id_from_payload,
                    "metaCampaignId": meta_campaign_id,
                    "dbCampaignId": db_campaign_id,
                    "campaignObjective": campaign_objective
                }
                try:
                    ad_set_sync_response_data = await invoke_supabase_function(client, SYNC_ADSETS_URL, ad_set_payload)
                    orchestration_results["ad_set_syncs"].append(ad_set_sync_response_data)
                    print(f"  sync-ad-sets finished for campaign {meta_campaign_id}. Response: {ad_set_sync_response_data}")
                    
                    ad_set_ids_synced = ad_set_sync_response_data.get("ad_set_ids_synced", [])
                    if not ad_set_ids_synced:
                        print(f"  No ad sets processed or returned from sync-ad-sets for campaign {meta_campaign_id}.")

                    # 3. Sync Ads (for each ad set)
                    for ad_set_detail in ad_set_ids_synced:
                        meta_ad_set_id = ad_set_detail.get("meta_ad_set_id")
                        db_ad_set_id = ad_set_detail.get("db_ad_set_id") # Supabase ad_sets.id (UUID)

                        if not meta_ad_set_id or not db_ad_set_id:
                            msg = f"Skipping ad sync for an ad set due to missing IDs: {ad_set_detail}"
                            print(msg)
                            errors_encountered.append(msg)
                            orchestration_results["ad_syncs"].append({"ad_set_id": meta_ad_set_id, "status": "skipped", "reason": "missing ad set IDs"})
                            continue

                        print(f"    Invoking sync-ads for ad set {meta_ad_set_id} (DB ID: {db_ad_set_id})")
                        ad_payload = {
                            "userId": user_id_to_use,
                            "metaAdAccountId": meta_ad_account_id_str,
                            "dbAdAccountId": db_ad_account_id_from_payload,
                            "metaCampaignId": meta_campaign_id,
                            "dbCampaignId": db_campaign_id,
                            "metaAdSetId": meta_ad_set_id,
                            "dbAdSetId": db_ad_set_id,
                            "campaignObjective": campaign_objective # Or fetch ad_set.optimization_goal if more specific
                        }
                        try:
                            ad_sync_response_data = await invoke_supabase_function(client, SYNC_ADS_URL, ad_payload)
                            orchestration_results["ad_syncs"].append(ad_sync_response_data)
                            print(f"    sync-ads finished for ad set {meta_ad_set_id}. Response: {ad_sync_response_data}")
                        except HTTPException as e_ads:
                            msg = f"Error syncing ads for ad set {meta_ad_set_id}: {e_ads.detail}"
                            print(msg)
                            errors_encountered.append(msg)
                            orchestration_results["ad_syncs"].append({"ad_set_id": meta_ad_set_id, "status": "error", "detail": e_ads.detail})
                        except Exception as e_ads_gen:
                            msg = f"Unexpected error syncing ads for ad set {meta_ad_set_id}: {str(e_ads_gen)}"
                            print(msg)
                            errors_encountered.append(msg)
                            orchestration_results["ad_syncs"].append({"ad_set_id": meta_ad_set_id, "status": "error", "detail": str(e_ads_gen)})
                
                except HTTPException as e_ad_sets:
                    msg = f"Error syncing ad sets for campaign {meta_campaign_id}: {e_ad_sets.detail}"
                    print(msg)
                    errors_encountered.append(msg)
                    orchestration_results["ad_set_syncs"].append({"campaign_id": meta_campaign_id, "status": "error", "detail": e_ad_sets.detail})
                except Exception as e_ad_sets_gen:
                    msg = f"Unexpected error syncing ad sets for campaign {meta_campaign_id}: {str(e_ad_sets_gen)}"
                    print(msg)
                    errors_encountered.append(msg)
                    orchestration_results["ad_set_syncs"].append({"campaign_id": meta_campaign_id, "status": "error", "detail": str(e_ad_sets_gen)})

            if errors_encountered:
                 return {"status": "partial_success", "message": "Synchronization process completed with some errors.", "results": orchestration_results, "errors": errors_encountered}
            
            return {"status": "success", "message": "All Meta data synchronization steps invoked successfully.", "results": orchestration_results}

        except HTTPException as e_main:
            print(f"HTTPException during initial sync (campaigns likely): {e_main.detail}")
            errors_encountered.append(f"Initial sync error: {e_main.detail}")
            raise HTTPException(status_code=e_main.status_code, detail=f"Failed during campaign sync: {e_main.detail}")
        except Exception as e_general:
            print(f"Unexpected error during sync orchestration: {str(e_general)}")
            errors_encountered.append(f"Orchestration error: {str(e_general)}")
            raise HTTPException(status_code=500, detail=f"Error during sync orchestration: {str(e_general)}")

# Note: You'll need to include this router in your main FastAPI app (main.py)
# Example in main.py:
# from app.routers import sync
# app.include_router(sync.router) 