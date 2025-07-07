import os
from fastapi import HTTPException, status
from supabase import create_client, Client
import jwt
from datetime import datetime, timedelta
from typing import Dict, Optional
from dotenv import load_dotenv
import pathlib
import logging

# Load environment variables from .env file
env_path = pathlib.Path(__file__).parents[1] / '.env'
load_dotenv(dotenv_path=env_path) # Keep this to ensure env vars are loaded

# Initialize Supabase client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
supabase_jwt_secret = os.getenv("SUPABASE_JWT_SECRET")

logger = logging.getLogger(__name__) # Keep logger for other general logging

if not supabase_url or not supabase_key:
    logger.critical("Missing Supabase environment variables. SUPABASE_URL or SUPABASE_SERVICE_KEY not found.", extra={"event_type": "env_var_missing"})
    raise ValueError("Missing Supabase environment variables")

if not supabase_jwt_secret:
    logger.critical(
        "Missing SUPABASE_JWT_SECRET environment variable. This is required for JWT signature verification.", 
        extra={"event_type": "env_var_missing_jwt_secret"}
    )
    raise ValueError("Missing SUPABASE_JWT_SECRET environment variable")

supabase: Client = create_client(supabase_url, supabase_key)

def validate_token(token: str, source_ip: Optional[str] = None) -> Dict:
    """
    Validates a JWT token from Supabase and returns the user data
    
    Args:
        token: The JWT token
        source_ip: Optional source IP of the request for logging
        
    Returns:
        Dict containing user information
        
    Raises:
        HTTPException: If token is invalid or expired
    """
    claims_for_debug = None
    user_id_attempt = None
    try:
        claims_for_debug = jwt.decode(token, options={"verify_signature": False, "verify_exp": False, "verify_aud": False, "verify_iss": False, "verify_nbf": False})
        print(f"[AUTH_DEBUG PRINT] validate_token called. Received token claims (unverified): {claims_for_debug}")
        if isinstance(claims_for_debug, dict):
            user_id_attempt = claims_for_debug.get("sub")
    except Exception as debug_e:
        print(f"[AUTH_DEBUG PRINT] validate_token: Could not decode token for debug logging: {str(debug_e)}")

    try:
        expected_issuer = f"{supabase_url.rstrip('/')}/auth/v1"
        expected_audience = ["authenticated"] # Define expected audience

        # ADDED FOR DEBUGGING (and now corrected for jwt.decode arguments)
        print(f"[AUTH_DEBUG PRINT PRE-VERIFY] Token received for verification.")
        print(f"[AUTH_DEBUG PRINT PRE-VERIFY] Expected Issuer for decode(): {expected_issuer}")
        print(f"[AUTH_DEBUG PRINT PRE-VERIFY] Expected Audience for decode(): {expected_audience}")
        print(f"[AUTH_DEBUG PRINT PRE-VERIFY] Supabase JWT Secret (length): {len(supabase_jwt_secret) if supabase_jwt_secret else 'None'}")

        verification_flags = {
            "verify_signature": True,
            "verify_exp": True,
            "verify_aud": True,  # Verifies 'aud' claim exists and matches 'audience' param
            "verify_iss": True,  # Verifies 'iss' claim exists and matches 'issuer' param
            # Add other flags like "require_exp" if needed, e.g., "require_exp": True
        }
        print(f"[AUTH_DEBUG PRINT PRE-VERIFY] Verification Flags for decode() options: {verification_flags}")
        # END ADDED FOR DEBUGGING (and corrected)

        print(f"[AUTH_DEBUG PRINT DECODE_ATTEMPT] Attempting jwt.decode for user_id attempt: {user_id_attempt}")
        payload = jwt.decode(
            token,
            supabase_jwt_secret,
            algorithms=["HS256"],
            audience=expected_audience,  # Pass audience directly
            issuer=expected_issuer,      # Pass issuer directly
            options=verification_flags # Pass verification flags here
            )
        print(f"[AUTH_DEBUG PRINT DECODE_SUCCESS] jwt.decode successful for user_id attempt: {user_id_attempt}. Payload sub: {payload.get('sub')}")
        
        user_id = payload.get("sub")
        if not user_id:
            print(f"[AUTH_DEBUG PRINT validate_token] Invalid user ID (sub) in token after verification. User ID Attempt: {user_id_attempt}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid user ID in token"
            )
        
        print(f"[AUTH_DEBUG PRINT GET_USER_ATTEMPT] Attempting supabase.auth.admin.get_user_by_id for user_id: {user_id}")
        admin_user_response = supabase.auth.admin.get_user_by_id(user_id)
        print(f"[AUTH_DEBUG PRINT GET_USER_SUCCESS] supabase.auth.admin.get_user_by_id successful for user_id: {user_id}. Response: {admin_user_response is not None}")
        
        if not admin_user_response or not admin_user_response.user:
            print(f"[AUTH_DEBUG PRINT validate_token] User not found in Supabase for user_id: {user_id}. User ID Attempt: {user_id_attempt}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or invalid"
            )
        
        # Using logger for successful auth, as it's not an error path
        logger.info(
            f"User authenticated successfully: {user_id}", 
            extra={
                "event_type": "auth_success", 
                "user_id": user_id, 
                "source_ip": source_ip
            }
        )
        
        return {
            "id": admin_user_response.user.id,
            "email": admin_user_response.user.email,
            "app_metadata": admin_user_response.user.app_metadata if admin_user_response.user.app_metadata else {},
            "user_metadata": admin_user_response.user.user_metadata if admin_user_response.user.user_metadata else {},
            "aud": admin_user_response.user.aud,
            "created_at": admin_user_response.user.created_at.isoformat() if admin_user_response.user.created_at else None,
        }
        
    except jwt.ExpiredSignatureError as e:
        print(f"[AUTH_DEBUG PRINT validate_token] ExpiredSignatureError for user_id attempt: {user_id_attempt}. Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.InvalidTokenError as e: # This catches InvalidAudienceError, InvalidIssuerError, etc.
        print(f"[AUTH_DEBUG PRINT validate_token] InvalidTokenError for user_id attempt: {user_id_attempt}. Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication token: {str(e)}"
        )
    except HTTPException as e: # Re-raise if it's already an HTTPException (e.g. from user_id check)
        raise e 
    except Exception as e:
        print(f"[AUTH_DEBUG PRINT validate_token] Unexpected authentication error for user_id attempt: {user_id_attempt}. Error: {str(e)}")
        logger.error(
            f"Unexpected authentication error for user_id attempt: {user_id_attempt}: {str(e)}", 
            exc_info=True,
            extra={
                "event_type": "auth_unexpected_error_validate_token", 
                "user_id_attempt": user_id_attempt, 
                "source_ip": source_ip
            }
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An internal error occurred during authentication processing: {str(e)}"
        )

def get_supabase_client() -> Client:
    """
    Returns the Supabase client
    
    Returns:
        Supabase client
    """
    return supabase
