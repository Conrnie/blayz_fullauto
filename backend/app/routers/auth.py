from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from app.auth import validate_token
from app.models import UserBase
from typing import Dict, Any
import os

router = APIRouter()

@router.get("/user")
async def get_user(request: Request) -> Dict[str, Any]:
    """
    Get the authenticated user's information
    """
    user = request.state.user
    
    return {
        "id": user.get("id"),
        "email": user.get("email"),
        "user_metadata": user.get("user_metadata"),
        "app_metadata": user.get("app_metadata")
    }

@router.get("/validate")
async def validate_token_route(request: Request) -> Dict[str, Any]:
    """
    Validate the auth token and return user info
    """
    user = request.state.user
    return {"valid": True, "user": user}

@router.post("/refresh")
async def refresh_token(request: Request) -> Dict[str, Any]:
    """
    Refresh the authentication token
    """
    # This would be handled by Supabase client on the frontend
    # Here we just validate the current token
    user = request.state.user
    return {"success": True, "user": user}
