"""
Creative Agent API endpoints
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any
import logging

from ..agents.creative_agent import CreativeAgent
from ..auth import validate_token

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/creative", tags=["creative"])

# Initialize Creative Agent
creative_agent = CreativeAgent()

@router.post("/generate-copy")
async def generate_ad_copy(
    request_data: Dict[str, Any]
):
    """Generate ad copy using brand information and campaign objectives"""
    try:
        brand_info = request_data.get("brand_info", {})
        campaign_objective = request_data.get("campaign_objective", "conversions")
        target_audience = request_data.get("target_audience", "Business owners")
        ad_format = request_data.get("ad_format", "single_image")
        
        logger.info("Generating ad copy via Creative Agent")
        
        result = await creative_agent.generate_ad_copy(
            brand_info=brand_info,
            campaign_objective=campaign_objective,
            target_audience=target_audience,
            ad_format=ad_format
        )
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return {
            "success": True,
            "data": result
        }
        
    except Exception as e:
        logger.error(f"Failed to generate ad copy: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate ad copy: {str(e)}")

@router.post("/generate-image-description")
async def generate_image_description(
    request_data: Dict[str, Any]
):
    """Generate image description using brand information and ad copy"""
    try:
        brand_info = request_data.get("brand_info", {})
        campaign_objective = request_data.get("campaign_objective", "conversions")
        ad_copy = request_data.get("ad_copy", "")
        
        logger.info("Generating image description via Creative Agent")
        
        result = await creative_agent.generate_image_description(
            brand_info=brand_info,
            campaign_objective=campaign_objective,
            ad_copy=ad_copy
        )
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return {
            "success": True,
            "data": result
        }
        
    except Exception as e:
        logger.error(f"Failed to generate image description: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate image description: {str(e)}")

@router.post("/optimize-creative")
async def optimize_creative(
    request_data: Dict[str, Any]
):
    """Optimize existing creative based on performance data"""
    try:
        current_creative = request_data.get("current_creative", {})
        performance_data = request_data.get("performance_data", {})
        
        # Use sample performance data if none provided
        if not performance_data:
            performance_data = {
                "ctr": 0.8,  # Low CTR
                "engagement_rate": 2.1,
                "conversion_rate": 1.2
            }
        
        logger.info("Optimizing creative via Creative Agent")
        
        result = await creative_agent.optimize_creative_performance(
            current_creative=current_creative,
            performance_data=performance_data
        )
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return {
            "success": True,
            "data": result
        }
        
    except Exception as e:
        logger.error(f"Failed to optimize creative: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to optimize creative: {str(e)}")

@router.get("/health")
async def health_check():
    """Health check endpoint for Creative Agent"""
    try:
        # Test that Gemini API is available
        test_result = await creative_agent.generate_ad_copy(
            brand_info={"brand_voice": "Test", "brand_values": "Test", "product_benefits": "Test"},
            campaign_objective="test",
            target_audience="test",
            ad_format="test"
        )
        
        return {
            "status": "healthy",
            "creative_agent": "available",
            "gemini_api": "connected" if "variations" in test_result else "error"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "creative_agent": "error",
            "error": str(e)
        }