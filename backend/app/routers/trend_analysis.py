from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any
import os
import httpx
from ..database import get_db, get_records
from ..auth import validate_token
from supabase import Client

router = APIRouter()

@router.post("/get-trend-analysis")
async def get_trend_analysis(campaign_data: Dict[str, Any]):
    """
    Get AI trend analysis for campaign data
    """
    try:
        # Get Chutes API token from environment
        chutes_api_token = os.getenv("CHUTES_API_TOKEN")
        if not chutes_api_token:
            raise HTTPException(status_code=500, detail="Chutes API token not configured")

        # Prepare the request to Chutes AI
        headers = {
            "Authorization": f"Bearer {chutes_api_token}",
            "Content-Type": "application/json"
        }
        
        # Prepare the analysis prompt
        analysis_request = {
            "model": "deepseek-ai/DeepSeek-V3-0324",
            "messages": [{
                "role": "user",
                "content": f"Analyze the following campaign data for trends and anomalies: {campaign_data}"
            }],
            "stream": False,
            "max_tokens": 1024,
            "temperature": 0.7
        }

        # Make the request to Chutes AI
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://llm.chutes.ai/v1/chat/completions",
                headers=headers,
                json=analysis_request,
                timeout=30.0  # 30 second timeout
            )
            
            if response.status_code != 200:
                print(f"Chutes AI Error: Status {response.status_code}")
                print(f"Response content: {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Error from Chutes AI: {response.text}"
                )
            
            result = response.json()
            
            if not result.get("choices") or not result["choices"][0].get("message"):
                raise HTTPException(
                    status_code=500,
                    detail="Invalid response format from Chutes AI"
                )
            
            return {
                "analysis": result["choices"][0]["message"]["content"],
                "status": "success"
            }

    except httpx.RequestError as e:
        print(f"Request error to Chutes AI: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to communicate with Chutes AI: {str(e)}"
        )
    except Exception as e:
        print(f"Unexpected error in trend analysis: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error performing trend analysis: {str(e)}"
        ) 