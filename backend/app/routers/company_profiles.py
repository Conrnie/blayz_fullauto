import httpx
import logging
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, HttpUrl
from typing import Optional, Dict, Any, List
import asyncio
import uuid
from datetime import datetime

from app.auth import validate_token
from app.database import get_db
from app.models import CompanyProfileStatus

logger = logging.getLogger(__name__)

router = APIRouter()

class CreateCompanyProfileRequest(BaseModel):
    company_name: str
    website_url: str
    user_context: Optional[str] = None
    
    def get_formatted_url(self) -> str:
        """Convert domain to proper URL format"""
        url = self.website_url.strip().lower()
        
        # If it already has a protocol, return as-is
        if url.startswith(('http://', 'https://')):
            return url
        
        # If it doesn't have www, suggest adding it
        if not url.startswith('www.'):
            raise ValueError("Please include 'www.' in your domain (e.g., 'www.example.com')")
        
        # Add https:// to the domain
        return f"https://{url}"

class CompanyProfileResponse(BaseModel):
    success: bool
    message: str
    profile_id: Optional[str] = None
    status: str = "processing"

class WebhookCallbackRequest(BaseModel):
    profile_id: str
    status: str
    profile_data: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None

class AssociateCampaignRequest(BaseModel):
    profile_id: uuid.UUID

@router.post("/create", response_model=CompanyProfileResponse)
async def create_company_profile(
    request: CreateCompanyProfileRequest,
    current_request: Request
):
    """
    Create a new company profile by calling the n8n webhook
    """
    logger.info("=== CREATE COMPANY PROFILE ENDPOINT STARTING ===")
    
    try:
        # Extract user info from JWT token
        auth_header = current_request.headers.get("authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
        
        token = auth_header.split(" ")[1]
        user = validate_token(token)  # Remove await - validate_token is not async
        user_id = user.get("id")
        
        logger.info(f"Creating company profile for user: {user_id}")
        logger.info(f"Company: {request.company_name}, Website: {request.website_url}")
        
        # Validate and format the URL
        try:
            formatted_url = request.get_formatted_url()
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))
        
        # Generate a unique profile ID
        profile_id = str(uuid.uuid4())
        
        # Create initial database record
        supabase = get_db()
        profile_data = {
            'profile_id': profile_id,
            'blayz_user_id': user_id,
            'company_name': request.company_name,
            'website_url': formatted_url,
            'status': 'pending',
            'created_at': datetime.utcnow().isoformat(),
            'last_updated_at': datetime.utcnow().isoformat()
        }
        
        result = supabase.table('company_profiles').insert(profile_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create profile record")
        
        logger.info(f"Created profile record with ID: {profile_id}")
        
        # Update status to processing
        supabase.table('company_profiles').update({
            'status': 'processing',
            'last_updated_at': datetime.utcnow().isoformat()
        }).eq('profile_id', profile_id).execute()
        
        # Trigger n8n webhook asynchronously (fire-and-forget)
        asyncio.create_task(trigger_n8n_webhook(profile_id, request.company_name, formatted_url, request.user_context))
        
        return CompanyProfileResponse(
            success=True,
            message="Company profile creation started. You'll be notified when it's ready!",
            profile_id=profile_id,
            status="processing"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating company profile: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create company profile: {str(e)}")

async def trigger_n8n_webhook(profile_id: str, company_name: str, website_url: str, user_context: str = None):
    """
    Trigger the n8n webhook for profile generation
    """
    n8n_webhook_url = "https://primary-production-7c692.up.railway.app/webhook-test/e978a23b-ada4-4ed5-8a59-027824d2adaf"
    
    webhook_payload = {
        "profile_id": profile_id,
        "company_name": company_name,
        "website_url": website_url,
        "user_context": user_context or "",
        "callback_url": f"http://localhost:8000/api/company-profiles/webhook-callback"
    }
    
    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            logger.info(f"Triggering n8n webhook for profile {profile_id}")
            print(f"[N8N_WEBHOOK_DEBUG] Calling webhook URL: {n8n_webhook_url}")
            print(f"[N8N_WEBHOOK_DEBUG] Payload: {webhook_payload}")
            
            response = await client.post(n8n_webhook_url, json=webhook_payload)
            
            logger.info(f"N8N webhook response: {response.status_code}")
            print(f"[N8N_WEBHOOK_DEBUG] Response status: {response.status_code}")
            print(f"[N8N_WEBHOOK_DEBUG] Response headers: {dict(response.headers)}")
            print(f"[N8N_WEBHOOK_DEBUG] Response text: {response.text}")
            
            if response.status_code != 200:
                logger.warning(f"N8N webhook returned status {response.status_code}: {response.text}")
            else:
                print(f"[N8N_WEBHOOK_DEBUG] Webhook call successful!")
                
        except httpx.TimeoutException:
            logger.info(f"N8N webhook request timed out (expected behavior for long-running process)")
            print(f"[N8N_WEBHOOK_DEBUG] Webhook request timed out - this is expected for long-running processes")
            # Don't mark as failed - the n8n workflow is still running
        except Exception as e:
            logger.error(f"Error calling n8n webhook: {str(e)}")
            print(f"[N8N_WEBHOOK_DEBUG] Error calling webhook: {str(e)}")
            # Update the profile status to failed
            supabase = get_db()
            supabase.table('company_profiles').update({
                'status': 'failed',
                'general_summary': {'error': f"Failed to trigger analysis: {str(e)}"},
                'last_updated_at': datetime.utcnow().isoformat()
            }).eq('profile_id', profile_id).execute()

@router.post("/webhook-callback")
async def webhook_callback(request: WebhookCallbackRequest):
    """
    Endpoint for n8n to call when profile generation is complete
    """
    try:
        logger.info(f"Received webhook callback for profile {request.profile_id} with status {request.status}")
        
        supabase = get_db()
        
        update_data = {
            'status': request.status,
            'last_updated_at': datetime.utcnow().isoformat()
        }
        
        if request.status == 'completed' and request.profile_data:
            # Store the complete profile data
            update_data.update({
                'llm_synthesized_profile': request.profile_data,
                'display_summary': {
                    'summary': request.profile_data.get('summary', ''),
                    'displayed_summary': request.profile_data.get('displayed_summary', ''),
                    'company_name': request.profile_data.get('name', ''),
                    'industry': request.profile_data.get('industry', ''),
                    'primary_offering': request.profile_data.get('primary_offering', '')
                }
            })
        elif request.status == 'failed':
            update_data.update({
                'general_summary': {'error': request.error_message or 'Unknown error'}
            })
        
        result = supabase.table('company_profiles').update(update_data).eq('profile_id', request.profile_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        logger.info(f"Updated profile {request.profile_id} status to {request.status}")
        
        return {"success": True, "message": "Profile updated successfully"}
        
    except Exception as e:
        logger.error(f"Error in webhook callback: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@router.get("/")
async def list_company_profiles(current_request: Request):
    """
    List company profiles for the current user
    """
    try:
        logger.info("=== COMPANY PROFILES ENDPOINT STARTING ===")
        
        auth_header = current_request.headers.get("authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
        
        token = auth_header.split(" ")[1]
        user = validate_token(token)
        user_id = user.get("id")

        logger.info(f"Fetching company profiles for user: {user_id}")
        
        # Query the database for company profiles
        logger.info("Getting database connection")
        supabase = get_db()
        
        logger.info("Executing database query")
        try:
            result = supabase.table('company_profiles').select('*').eq('blayz_user_id', user_id).order('created_at', desc=True).execute()
        except Exception as db_error:
            logger.error(f"Database query exception: {str(db_error)}")
            raise HTTPException(status_code=500, detail=f"Database query failed: {str(db_error)}")
        
        logger.info(f"Database query executed, result: {result}")
        if hasattr(result, 'error') and result.error:
            logger.error(f"Database query failed: {result.error}")
            raise HTTPException(status_code=500, detail=f"Database query failed: {result.error}")

        logger.info(f"Database query result: {len(result.data) if result.data else 0} profiles found")
        
        # Transform the data for the response using the new status column
        profiles = []
        
        if result.data:
            for profile in result.data:
                logger.info(f"Processing profile: {profile.get('profile_id', 'unknown')}")
                try:
                    # Handle general_summary safely - it can be None, a string, or a dict
                    general_summary = profile.get('general_summary', {})
                    error_message = None
                    if isinstance(general_summary, dict):
                        error_message = general_summary.get('error', None)
                    
                    # Create display_summary from llm_synthesized_profile if not present
                    display_summary = profile.get('display_summary', {})
                    if not display_summary and profile.get('llm_synthesized_profile'):
                        llm_profile = profile.get('llm_synthesized_profile', {})
                        display_summary = {
                            'summary': llm_profile.get('summary', ''),
                            'displayed_summary': llm_profile.get('displayed_summary', ''),
                            'company_name': llm_profile.get('business_name', llm_profile.get('name', '')),
                            'industry': llm_profile.get('industry', ''),
                            'primary_offering': llm_profile.get('primary_offering', '')
                        }
                    
                    profile_data = {
                        'profile_id': profile['profile_id'],
                        'company_name': profile['company_name'],
                        'website_url': profile['website_url'],
                        'created_at': profile['created_at'],
                        'last_updated_at': profile['last_updated_at'],
                        'status': profile.get('status', 'unknown'),
                        'display_summary': display_summary,
                        'full_profile': profile.get('llm_synthesized_profile', {}),
                        'error_message': error_message
                    }
                    profiles.append(profile_data)
                except Exception as profile_error:
                    logger.error(f"Error processing profile {profile.get('profile_id', 'unknown')}: {str(profile_error)}")
                    # Continue processing other profiles
                    continue
        
        logger.info(f"Successfully processed {len(profiles)} company profiles for user {user_id}")
        
        response_data = {
            "success": True,
            "profiles": profiles,
            "message": f"Successfully fetched {len(profiles)} company profiles"
        }
        
        logger.info(f"Returning response: {response_data}")
        return response_data
        
    except HTTPException as http_exc:
        logger.error(f"HTTP Exception in company profiles endpoint: {http_exc}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error in company profiles endpoint: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch company profiles: {str(e)}")

@router.get("/{profile_id}")
async def get_company_profile(profile_id: str, current_request: Request):
    """
    Get a specific company profile by ID
    """
    try:
        # Get the authenticated user from the request state (set by auth middleware)
        user = getattr(current_request.state, 'user', None)
        if not user:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        user_id = user.get("id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid user session")
        
        supabase = get_db()
        result = supabase.table('company_profiles').select('*').eq('profile_id', profile_id).eq('blayz_user_id', user_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        profile = result.data[0]
        
        # Transform the data for the response using the new status column
        # Handle general_summary safely - it can be None, a string, or a dict
        general_summary = profile.get('general_summary', {})
        error_message = None
        if isinstance(general_summary, dict):
            error_message = general_summary.get('error', None)
        
        profile_data = {
            'id': profile['profile_id'],
            'profile_id': profile['profile_id'],
            'company_name': profile['company_name'],
            'website_url': profile['website_url'],
            'created_at': profile['created_at'],
            'last_updated_at': profile['last_updated_at'],
            'status': profile.get('status', 'unknown'),
            'display_summary': profile.get('display_summary', {}),
            'full_profile': profile.get('llm_synthesized_profile', {}),
            'error_message': error_message
        }
        
        logger.info(f"Fetched company profile {profile_id} for user {user_id}")
        
        return {
            "success": True,
            "profile": profile_data,
            "message": "Company profile retrieved successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching company profile {profile_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch company profile")

@router.patch("/associate-campaign/{campaign_id}")
async def associate_campaign_with_profile(
    campaign_id: str,
    request_body: AssociateCampaignRequest,
    current_request: Request
):
    """
    Associate a company profile with a campaign.
    """
    try:
        logger.info(f"Attempting to associate profile {request_body.profile_id} with campaign {campaign_id}")
        
        # Authenticate user
        user = getattr(current_request.state, 'user', None)
        if not user:
            raise HTTPException(status_code=401, detail="Authentication required")
        user_id = user.get("id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid user session")

        supabase = get_db()

        # Verify the user owns the campaign
        campaign_res = supabase.table('campaigns').select('id').eq('id', campaign_id).eq('user_id', user_id).execute()
        if not campaign_res.data:
            logger.warning(f"User {user_id} does not own or campaign {campaign_id} does not exist.")
            raise HTTPException(status_code=404, detail="Campaign not found or access denied.")

        # Verify the user owns the company profile
        profile_res = supabase.table('company_profiles').select('profile_id').eq('profile_id', str(request_body.profile_id)).eq('blayz_user_id', user_id).execute()
        if not profile_res.data:
            logger.warning(f"User {user_id} does not own or profile {request_body.profile_id} does not exist.")
            raise HTTPException(status_code=404, detail="Company profile not found or access denied.")

        # Update the campaign record
        update_res = supabase.table('campaigns').update({'company_profile_id': str(request_body.profile_id)}).eq('id', campaign_id).execute()

        if not update_res.data:
             logger.error(f"Failed to update campaign {campaign_id} with profile {request_body.profile_id}. Response: {update_res}")
             raise HTTPException(status_code=500, detail="Failed to associate profile with campaign.")

        logger.info(f"Successfully associated profile {request_body.profile_id} with campaign {campaign_id} for user {user_id}")

        return {"success": True, "message": "Campaign associated successfully."}

    except HTTPException as http_exc:
        logger.error(f"HTTP exception while associating profile: {http_exc.detail}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error associating profile: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="An unexpected error occurred.") 