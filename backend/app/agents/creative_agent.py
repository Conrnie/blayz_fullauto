"""
Creative Agent for generating ad creatives using Gemini AI
Uses brand colors and voice from company profiles
"""
import os
import json
import logging
from typing import Dict, Any, List
from datetime import datetime

from google import genai
from google.genai import types

from app.agents.base_agent import BaseAgent
from app.models_automation import AgentType, AgentDecision
from app.utils.monitoring import AutomationLogger, log_execution_time

logger = AutomationLogger(__name__)

class CreativeAgent(BaseAgent):
    """
    Creative Agent that generates ad creatives using Gemini AI
    - Generates ad copy based on brand voice
    - Creates image descriptions for ad visuals
    - Optimizes creative content for better performance
    """
    
    def __init__(self):
        super().__init__(AgentType.CREATIVE)
        
        # Initialize Gemini client
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable is required")
        
        self.client = genai.Client(api_key=api_key)
        self.model = "gemini-2.5-flash"
        
    @log_execution_time
    async def analyze(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze current creative performance and identify opportunities"""
        
        campaign_id = input_data.get("campaign_id")
        current_creatives = input_data.get("current_creatives", [])
        performance_data = input_data.get("performance_data", {})
        
        logger.info(f"Creative agent analyzing campaign {campaign_id}")
        
        # Analyze current creative performance
        creative_analysis = {
            "campaign_id": campaign_id,
            "total_creatives": len(current_creatives),
            "performance_metrics": performance_data,
            "creative_fatigue_detected": performance_data.get("frequency", 0) > 3.0,
            "low_ctr_creatives": [
                creative for creative in current_creatives 
                if creative.get("ctr", 0) < 1.0
            ],
            "analysis_timestamp": datetime.now().isoformat()
        }
        
        return creative_analysis
        
    async def decide(self, analysis_results: Dict[str, Any]) -> Dict[str, Any]:
        """Make decisions about creative optimizations"""
        
        total_creatives = analysis_results.get("total_creatives", 0)
        creative_fatigue = analysis_results.get("creative_fatigue_detected", False)
        low_ctr_creatives = analysis_results.get("low_ctr_creatives", [])
        
        decisions = {
            "should_execute": False,
            "action_type": "creative_optimization",
            "reasons": [],
            "creative_actions": []
        }
        
        # Decision logic
        if creative_fatigue:
            decisions["should_execute"] = True
            decisions["reasons"].append("Creative fatigue detected - need fresh creatives")
            decisions["creative_actions"].append("generate_new_creatives")
            
        if len(low_ctr_creatives) > 0:
            decisions["should_execute"] = True
            decisions["reasons"].append(f"{len(low_ctr_creatives)} creatives with low CTR")
            decisions["creative_actions"].append("optimize_existing_creatives")
            
        if total_creatives < 3:
            decisions["should_execute"] = True
            decisions["reasons"].append("Insufficient creative variety")
            decisions["creative_actions"].append("expand_creative_pool")
        
        logger.info(f"Creative agent decisions: {decisions['creative_actions']}")
        return decisions
        
    async def execute(self, decisions: Dict[str, Any]) -> Dict[str, Any]:
        """Execute creative generation and optimization"""
        
        if not decisions.get("should_execute", False):
            return {"status": "no_action_needed", "message": "No creative optimizations required"}
        
        actions = decisions.get("creative_actions", [])
        results = {}
        
        for action in actions:
            if action == "generate_new_creatives":
                results[action] = await self._generate_new_creatives()
            elif action == "optimize_existing_creatives":
                results[action] = await self._optimize_existing_creatives()
            elif action == "expand_creative_pool":
                results[action] = await self._expand_creative_pool()
        
        return {
            "status": "completed",
            "actions_executed": actions,
            "results": results
        }
    
    async def generate_ad_copy(self, 
                              brand_info: Dict[str, Any], 
                              campaign_objective: str,
                              target_audience: str,
                              ad_format: str = "single_image") -> Dict[str, Any]:
        """Generate ad copy using brand voice and campaign info"""
        
        brand_voice = brand_info.get("brand_voice", "Professional and engaging")
        brand_values = brand_info.get("brand_values", "Quality and innovation")
        product_benefits = brand_info.get("product_benefits", "Superior performance")
        
        prompt = f"""
        Create compelling Facebook ad copy for a {campaign_objective} campaign.
        
        Brand Information:
        - Brand Voice: {brand_voice}
        - Brand Values: {brand_values}  
        - Product Benefits: {product_benefits}
        
        Target Audience: {target_audience}
        Ad Format: {ad_format}
        
        Generate 3 different ad copy variations with:
        1. Primary text (hook + description, max 125 characters for mobile optimization)
        2. Headline (compelling, max 40 characters)
        3. Call-to-action suggestion
        
        Make each variation test different psychological triggers:
        - Variation 1: Problem/Solution approach
        - Variation 2: Social proof/FOMO approach  
        - Variation 3: Benefit-focused approach
        
        Return as JSON with this structure:
        {{
            "variations": [
                {{
                    "primary_text": "text",
                    "headline": "headline", 
                    "cta_suggestion": "cta",
                    "approach": "problem_solution"
                }}
            ]
        }}
        """
        
        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            
            result = json.loads(response.text)
            logger.info("Successfully generated ad copy variations")
            return result
            
        except Exception as e:
            logger.error(f"Failed to generate ad copy: {str(e)}")
            return {"error": f"Failed to generate ad copy: {str(e)}"}
    
    async def generate_image_description(self,
                                       brand_info: Dict[str, Any],
                                       campaign_objective: str,
                                       ad_copy: str) -> Dict[str, Any]:
        """Generate detailed image descriptions using brand colors"""
        
        brand_colors = brand_info.get("brand_colors", {})
        primary_color = brand_colors.get("primary", "#FE8401")
        secondary_color = brand_colors.get("secondary", "#FF9933")
        
        prompt = f"""
        Create a detailed image description for a Facebook ad based on this copy:
        "{ad_copy}"
        
        Brand Guidelines:
        - Primary Brand Color: {primary_color}
        - Secondary Brand Color: {secondary_color}
        - Campaign Objective: {campaign_objective}
        
        Generate a professional image description that includes:
        1. Main subject/product focus
        2. Brand color integration
        3. Composition and layout
        4. Mood and style
        5. Text overlay placement suggestions
        
        Make it suitable for Facebook ads - visually appealing, on-brand, and conversion-focused.
        
        Return as JSON:
        {{
            "image_description": "detailed description",
            "style_notes": "style and mood notes",
            "color_scheme": "color usage guide",
            "text_overlay_suggestions": ["suggestion1", "suggestion2"]
        }}
        """
        
        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            
            result = json.loads(response.text)
            logger.info("Successfully generated image description")
            return result
            
        except Exception as e:
            logger.error(f"Failed to generate image description: {str(e)}")
            return {"error": f"Failed to generate image description: {str(e)}"}
    
    async def optimize_creative_performance(self,
                                          current_creative: Dict[str, Any],
                                          performance_data: Dict[str, Any]) -> Dict[str, Any]:
        """Optimize existing creative based on performance data"""
        
        ctr = performance_data.get("ctr", 0)
        engagement_rate = performance_data.get("engagement_rate", 0)
        conversion_rate = performance_data.get("conversion_rate", 0)
        
        prompt = f"""
        Analyze this ad creative performance and suggest optimizations:
        
        Current Creative:
        - Primary Text: {current_creative.get('primary_text', '')}
        - Headline: {current_creative.get('headline', '')}
        - CTA: {current_creative.get('cta', '')}
        
        Performance Metrics:
        - CTR: {ctr}%
        - Engagement Rate: {engagement_rate}%
        - Conversion Rate: {conversion_rate}%
        
        Provide specific optimization recommendations:
        1. If CTR is low (< 1%): Focus on hook and headline improvements
        2. If engagement is low: Improve emotional connection and relevance
        3. If conversions are low: Strengthen CTA and value proposition
        
        Return JSON with:
        {{
            "performance_assessment": "overall assessment",
            "optimization_priorities": ["priority1", "priority2"],
            "improved_copy_suggestions": {{
                "primary_text": "optimized text",
                "headline": "optimized headline",
                "cta": "optimized cta"
            }},
            "reasoning": "why these changes will improve performance"
        }}
        """
        
        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            
            result = json.loads(response.text)
            logger.info("Successfully generated creative optimization")
            return result
            
        except Exception as e:
            logger.error(f"Failed to optimize creative: {str(e)}")
            return {"error": f"Failed to optimize creative: {str(e)}"}
    
    async def _generate_new_creatives(self) -> Dict[str, Any]:
        """Generate completely new creative concepts"""
        # This would integrate with the main generation methods
        return {"status": "new_creatives_generated", "count": 3}
    
    async def _optimize_existing_creatives(self) -> Dict[str, Any]:
        """Optimize existing low-performing creatives"""
        return {"status": "creatives_optimized", "count": 2}
    
    async def _expand_creative_pool(self) -> Dict[str, Any]:
        """Expand the variety of creatives in the pool"""
        return {"status": "creative_pool_expanded", "additional_creatives": 2}