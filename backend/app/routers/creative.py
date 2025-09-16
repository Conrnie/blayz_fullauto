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

# Initialize Creative Agent lazily
creative_agent = None

def get_creative_agent():
    global creative_agent
    if creative_agent is None:
        creative_agent = CreativeAgent()
    return creative_agent

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
        
        result = await get_creative_agent().generate_ad_copy(
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
        logger.info(f"Received request data: {request_data}")
        
        brand_info = request_data.get("brand_info", {})
        campaign_objective = request_data.get("campaign_objective", "conversions")
        ad_copy = request_data.get("ad_copy", "")
        image_quantity = request_data.get("image_quantity", 1)
        
        logger.info(f"Extracted parameters - brand_info: {brand_info}, campaign_objective: {campaign_objective}, ad_copy: {ad_copy}, image_quantity: {image_quantity}")
        logger.info(f"Generating {image_quantity} image description(s) via Creative Agent")
        
        result = await get_creative_agent().generate_image_description(
            brand_info=brand_info,
            campaign_objective=campaign_objective,
            ad_copy=ad_copy,
            image_quantity=image_quantity
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

@router.post("/generate-images")
async def generate_images(
    request_data: Dict[str, Any]
):
    """Generate images using the complete AI workflow: User Instructions → Claude JSON → Gemini Generation → Gemini Validation"""
    try:
        image_descriptions = request_data.get("image_descriptions", [])
        brand_info = request_data.get("brand_info", {})
        user_instructions = request_data.get("user_instructions", None)
        image_quantity = request_data.get("image_quantity", 1)
        
        if not brand_info:
            raise HTTPException(status_code=400, detail="brand_info is required")
        
        # New workflow: if user_instructions provided but no image_descriptions, use direct workflow
        if user_instructions and not image_descriptions:
            logger.info(f"Using direct AI workflow with user instructions: {user_instructions[:100]}...")
            logger.info(f"Generating {image_quantity} images via complete AI pipeline")
            
            result = await get_creative_agent().generate_images(
                image_descriptions=None,  # Let Claude generate the descriptions
                brand_info=brand_info,
                user_instructions=user_instructions
            )
        else:
            # Legacy workflow: use provided image_descriptions
            if not image_descriptions:
                raise HTTPException(status_code=400, detail="Either user_instructions or image_descriptions are required")
            
            logger.info(f"Using legacy workflow with {len(image_descriptions)} image descriptions")
            if user_instructions:
                logger.info(f"Also using user instructions: {user_instructions[:100]}...")
            
            result = await get_creative_agent().generate_images(
                image_descriptions=image_descriptions,
                brand_info=brand_info,
                user_instructions=user_instructions
            )
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return {
            "success": True,
            "data": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to generate images: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate images: {str(e)}")

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