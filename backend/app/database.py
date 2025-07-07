import os
from supabase import create_client, Client
from fastapi import HTTPException, status
from typing import Dict, List, Any, Optional
from dotenv import load_dotenv
import pathlib

# Load environment variables from .env file
env_path = pathlib.Path(__file__).parents[2] / '.env'
load_dotenv(dotenv_path=env_path)

# Initialize Supabase client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY")

if not supabase_url or not supabase_key:
    print(f"Environment variables not found. Looking in: {env_path}")
    print(f"Current environment variables: {dict(os.environ)}")
    raise ValueError("Missing Supabase environment variables")

supabase: Client = create_client(supabase_url, supabase_key)

async def init_db():
    """
    Initialize database tables if they don't exist
    This is called on application startup
    """
    # Check for required tables and create them if they don't exist
    # This would normally be handled by Supabase migrations
    # For this project, we'll just check if tables exist
    
    try:
        # These checks are simplified - in a production app,
        # you would use more robust migrations via Supabase UI
        # or other migration tools
        
        # Verify meta_connections table (was user_facebook_tokens)
        tokens = supabase.table("meta_connections").select("id").limit(1).execute()
        
        # Verify ad_accounts table
        ad_accounts = supabase.table("ad_accounts").select("id").limit(1).execute()
        
        # Verify campaigns table
        campaigns = supabase.table("campaigns").select("id").limit(1).execute()
        
        # Verify ad_sets table
        ad_sets = supabase.table("ad_sets").select("id").limit(1).execute()
        
        # Verify ads table
        ads = supabase.table("ads").select("id").limit(1).execute()
        
        # Verify ad_insights table
        ad_insights = supabase.table("ad_insights").select("id").limit(1).execute()

        # Verify ad_set_insights table
        ad_set_insights = supabase.table("ad_set_insights").select("id").limit(1).execute()

        # Verify campaigns_insights table
        campaigns_insights = supabase.table("campaigns_insights").select("id").limit(1).execute()
        
        print("Database connection and tables verified successfully")
        
    except Exception as e:
        # Log the error but don't crash the app
        print(f"Error checking database tables: {str(e)}")
        print("The application will continue, but some features may not work correctly.")
        print("Please make sure Supabase tables are created correctly.")

def get_db():
    """
    Returns a database connection object
    """
    return supabase

# Helper functions for database operations

async def create_record(table: str, data: Dict) -> Dict:
    """
    Create a new record in a table
    
    Args:
        table: The table name
        data: The data to insert
        
    Returns:
        The created record
    """
    try:
        response = supabase.table(table).insert(data).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create record in {table}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

async def get_record(table: str, id: str) -> Dict:
    """
    Get a record by ID
    
    Args:
        table: The table name
        id: The record ID
        
    Returns:
        The record
    """
    try:
        response = supabase.table(table).select("*").eq("id", id).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Record not found in {table}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

async def update_record(table: str, id: str, data: Dict) -> Dict:
    """
    Update a record by ID
    
    Args:
        table: The table name
        id: The record ID
        data: The data to update
        
    Returns:
        The updated record
    """
    try:
        response = supabase.table(table).update(data).eq("id", id).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Record not found in {table}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

async def delete_record(table: str, id: str) -> Dict:
    """
    Delete a record by ID
    
    Args:
        table: The table name
        id: The record ID
        
    Returns:
        The deleted record
    """
    try:
        response = supabase.table(table).delete().eq("id", id).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Record not found in {table}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

async def get_records(table: str, user_id: Optional[str] = None, filters: Optional[Dict] = None) -> List[Dict]:
    """
    Get records from a table with optional filters
    
    Args:
        table: The table name
        user_id: Optional user ID filter
        filters: Optional additional filters
        
    Returns:
        List of records
    """
    try:
        query = supabase.table(table).select("*")
        
        if user_id:
            query = query.eq("user_id", user_id)
            
        if filters:
            for key, value in filters.items():
                query = query.eq(key, value)
                
        response = query.execute()
        return response.data or []
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

async def search_records(table: str, column: str, search_term: str, user_id: Optional[str] = None) -> List[Dict]:
    """
    Search records in a table
    
    Args:
        table: The table name
        column: The column to search
        search_term: The search term
        user_id: Optional user ID filter
        
    Returns:
        List of matching records
    """
    try:
        query = supabase.table(table).select("*").ilike(column, f"%{search_term}%")
        
        if user_id:
            query = query.eq("user_id", user_id)
            
        response = query.execute()
        return response.data or []
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
