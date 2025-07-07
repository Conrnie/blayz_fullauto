from fastapi import APIRouter, Depends, HTTPException, Request
from supabase import Client
from app.auth import get_supabase_client # Assuming this correctly provides an initialized Supabase client

router = APIRouter(
    tags=["data-status"],
)

@router.get("/campaigns-exist")
async def check_campaigns_exist(
    request: Request,
    supabase: Client = Depends(get_supabase_client)
):
    print(">>> INSIDE CHECK_CAMPAIGNS_EXIST") # DEBUG PRINT
    """
    Checks if campaign data exists in the database for the authenticated user.
    """
    if not request.state.user:
        raise HTTPException(status_code=401, detail="User not authenticated")

    user_id = request.state.user.get('id') if isinstance(request.state.user, dict) else getattr(request.state.user, 'id', None)
    if not user_id:
        raise HTTPException(status_code=401, detail="Could not determine user ID")

    try:
        # Query the campaigns table for any record matching the user_id
        # We only need to know if at least one exists, so count is efficient.
        # If your Supabase Python client version supports `count` directly in a more integrated way,
        # that might be slightly cleaner, but this approach is generally effective.
        
        # Check if Supabase client is version 2.x.x for count method
        # For older versions, select with limit 1 might be an alternative.
        # response = supabase.table('campaigns').select('id', count='exact').eq('user_id', user_id).limit(1).execute()
        # For Supabase client v2.x.x, the count is often part of the query directly
        response = supabase.table('campaigns').select("id", count="exact").eq('user_id', user_id).execute()
        
        # The response for a count query usually has the count in `response.count`
        if response.count is not None and response.count > 0:
            return {"campaigns_exist": True}
        else:
            # Fallback if count is not directly available or zero
            # Check if data list is present and has items (for older client patterns or if count isn't returned as expected)
            if response.data and len(response.data) > 0:
                 return {"campaigns_exist": True}
            return {"campaigns_exist": False}

    except Exception as e:
        # Log the error for debugging
        print(f"Error checking campaign existence for user {user_id}: {str(e)}")
        # Return a generic error to the client
        raise HTTPException(status_code=500, detail="Error checking campaign data status.")

# To make this router available, it needs to be included in your main.py (or wherever you set up your FastAPI app)
# Example in main.py:
# from app.routers import data_status
# app.include_router(data_status.router) 