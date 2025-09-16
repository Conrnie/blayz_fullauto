"""
Enhanced Creative Agent API endpoints with quality control
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, Optional
import logging

from ..agents.enhanced_creative_agent import EnhancedCreativeAgent
from ..controllers.creative_quality_controller import CreativeQualityController
from ..auth import validate_token

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/enhanced-creative", tags=["enhanced-creative"])

# Initialize Enhanced Creative Agent and Quality Controller
try:
    enhanced_creative_agent = EnhancedCreativeAgent()
    quality_controller = CreativeQualityController()
    logger.info("Enhanced Creative Agent and Quality Controller initialized")
except Exception as e:
    logger.error(f"Failed to initialize Enhanced Creative Agent: {str(e)}")
    enhanced_creative_agent = None
    quality_controller = None

@router.post("/generate-complete-creative")
async def generate_complete_creative(
    request_data: Dict[str, Any]
):
    """
    Generate a complete ad creative with quality validation and feedback loop
    """
    if not enhanced_creative_agent:
        raise HTTPException(status_code=503, detail="Enhanced Creative Agent not available")
    
    try:
        company_profile = request_data.get("company_profile", {})
        campaign_objective = request_data.get("campaign_objective", "conversions")
        target_audience = request_data.get("target_audience", "Business owners")
        ad_format = request_data.get("ad_format", "single_image")
        custom_prompt = request_data.get("custom_prompt")
        
        if not company_profile:
            raise HTTPException(status_code=400, detail="Company profile is required")
        
        logger.info(f"Generating complete creative for company: {company_profile.get('company_name', 'Unknown')}")
        if custom_prompt:
            logger.info(f"Using custom prompt: {custom_prompt[:100]}...")
        
        result = await enhanced_creative_agent.generate_complete_creative(
            company_profile=company_profile,
            campaign_objective=campaign_objective,
            target_audience=target_audience,
            ad_format=ad_format,
            custom_prompt=custom_prompt
        )
        
        if not result.get("success", False):
            raise HTTPException(status_code=400, detail=result.get("error", "Failed to generate creative"))
        
        return {
            "success": True,
            "data": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to generate complete creative: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate complete creative: {str(e)}")

@router.post("/validate-creative")
async def validate_creative(
    request_data: Dict[str, Any]
):
    """
    Validate a creative against quality standards and brand guidelines
    """
    if not quality_controller:
        raise HTTPException(status_code=503, detail="Quality Controller not available")
    
    try:
        creative_data = request_data.get("creative_data", {})
        brand_info = request_data.get("brand_info", {})
        
        if not creative_data:
            raise HTTPException(status_code=400, detail="Creative data is required")
        
        logger.info("Validating creative quality")
        
        validation_result = await quality_controller.validate_creative(
            creative_data=creative_data,
            brand_info=brand_info
        )
        
        return {
            "success": True,
            "validation": validation_result
        }
        
    except Exception as e:
        logger.error(f"Failed to validate creative: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to validate creative: {str(e)}")

@router.post("/generate-improvement-suggestions")
async def generate_improvement_suggestions(
    request_data: Dict[str, Any]
):
    """
    Generate specific improvement suggestions for a creative
    """
    if not quality_controller:
        raise HTTPException(status_code=503, detail="Quality Controller not available")
    
    try:
        validation_result = request_data.get("validation_result", {})
        creative_data = request_data.get("creative_data", {})
        
        if not validation_result:
            raise HTTPException(status_code=400, detail="Validation result is required")
        
        logger.info("Generating improvement suggestions")
        
        suggestions = await quality_controller.generate_improvement_suggestions(
            validation_result=validation_result,
            creative_data=creative_data
        )
        
        return {
            "success": True,
            "suggestions": suggestions
        }
        
    except Exception as e:
        logger.error(f"Failed to generate improvement suggestions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate improvement suggestions: {str(e)}")

@router.get("/quality-standards")
async def get_quality_standards():
    """
    Get the current quality standards and thresholds
    """
    if not quality_controller:
        raise HTTPException(status_code=503, detail="Quality Controller not available")
    
    try:
        return {
            "success": True,
            "quality_thresholds": quality_controller.quality_thresholds,
            "brand_compliance_checks": quality_controller.brand_compliance_checks
        }
        
    except Exception as e:
        logger.error(f"Failed to get quality standards: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get quality standards: {str(e)}")

@router.post("/batch-generate")
async def batch_generate_creatives(
    request_data: Dict[str, Any]
):
    """
    Generate multiple creative variations for A/B testing
    """
    if not enhanced_creative_agent:
        raise HTTPException(status_code=503, detail="Enhanced Creative Agent not available")
    
    try:
        company_profile = request_data.get("company_profile", {})
        campaign_objective = request_data.get("campaign_objective", "conversions")
        target_audience = request_data.get("target_audience", "Business owners")
        ad_format = request_data.get("ad_format", "single_image")
        custom_prompt = request_data.get("custom_prompt")
        variation_count = request_data.get("variation_count", 3)
        
        if not company_profile:
            raise HTTPException(status_code=400, detail="Company profile is required")
        
        if variation_count > 5:
            raise HTTPException(status_code=400, detail="Maximum 5 variations allowed")
        
        logger.info(f"Generating {variation_count} creative variations")
        
        variations = []
        for i in range(variation_count):
            logger.info(f"Generating variation {i + 1}/{variation_count}")
            
            result = await enhanced_creative_agent.generate_complete_creative(
                company_profile=company_profile,
                campaign_objective=campaign_objective,
                target_audience=target_audience,
                ad_format=ad_format,
                custom_prompt=custom_prompt
            )
            
            if result.get("success", False):
                variations.append({
                    "variation_id": i + 1,
                    "creative": result.get("creative", {}),
                    "validation": result.get("validation", {}),
                    "metadata": result.get("generation_metadata", {})
                })
            else:
                logger.warning(f"Failed to generate variation {i + 1}: {result.get('error', 'Unknown error')}")
        
        if not variations:
            raise HTTPException(status_code=500, detail="Failed to generate any creative variations")
        
        return {
            "success": True,
            "variations": variations,
            "total_generated": len(variations),
            "requested_count": variation_count
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to batch generate creatives: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to batch generate creatives: {str(e)}")

@router.get("/health")
async def health_check():
    """
    Health check endpoint for Enhanced Creative Agent
    """
    try:
        # Check if agents are initialized
        agent_status = "available" if enhanced_creative_agent else "unavailable"
        controller_status = "available" if quality_controller else "unavailable"
        
        # Test basic functionality if available
        if enhanced_creative_agent and quality_controller:
            # Test with minimal data
            test_profile = {
                "company_name": "Test Company",
                "industry": "Technology",
                "display_summary": {
                    "brand_voice": "Professional",
                    "brand_colors": {"primary": "#FE8401", "secondary": "#FF9933"}
                }
            }
            
            try:
                result = await enhanced_creative_agent.generate_complete_creative(
                    company_profile=test_profile,
                    campaign_objective="test",
                    target_audience="test",
                    ad_format="test"
                )
                
                system_status = "healthy" if result.get("success", False) else "degraded"
                
            except Exception as e:
                logger.warning(f"Health check test failed: {str(e)}")
                system_status = "degraded"
        else:
            system_status = "unavailable"
        
        return {
            "status": system_status,
            "enhanced_creative_agent": agent_status,
            "quality_controller": controller_status,
            "gemini_api": "connected" if agent_status == "available" else "unknown"
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "enhanced_creative_agent": "error",
            "quality_controller": "error",
            "error": str(e)
        }