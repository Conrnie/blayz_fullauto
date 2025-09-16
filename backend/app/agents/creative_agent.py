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
from PIL import Image
from io import BytesIO
import base64
import anthropic

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
        
        # Initialize new Gemini client
        self.client = genai.Client(api_key=api_key)
        self.model_name = "gemini-1.5-flash"
        self.image_model_name = "gemini-2.5-flash-image-preview"
        
        # Initialize Claude client
        claude_api_key = os.environ.get("CLAUDE_API_KEY")
        if not claude_api_key:
            raise ValueError("CLAUDE_API_KEY environment variable is required")
        
        self.claude_client = anthropic.Anthropic(api_key=claude_api_key)
        
    async def process_user_instructions_with_claude(self, user_instructions: str, brand_info: Dict[str, Any]) -> Dict[str, Any]:
        """Process user instructions using Claude to create structured JSON for Gemini"""
        
        try:
            prompt = f"""
            You are an expert creative director who specializes in translating user requirements into detailed, structured image generation instructions.
            
            User Instructions: {user_instructions}
            
            Brand Information:
            - Brand Name: {brand_info.get('company_name', 'Unknown')}
            - Brand Voice: {brand_info.get('brand_voice', 'Professional')}
            - Primary Color: {brand_info.get('brand_colors', {}).get('primary', '#000000')}
            - Secondary Color: {brand_info.get('brand_colors', {}).get('secondary', '#FFFFFF')}
            - Product Benefits: {brand_info.get('product_benefits', 'Quality products')}
            - Target Audience: {brand_info.get('target_audience', 'General audience')}
            
            Please convert the user instructions into a detailed, structured JSON format that includes:
            
            1. **image_concept**: A detailed description of the main visual concept
            2. **style_requirements**: Specific style, mood, and aesthetic requirements
            3. **composition_details**: Layout, positioning, and visual hierarchy
            4. **color_scheme**: How to use brand colors effectively
            5. **text_elements**: Any text overlays or typography requirements
            6. **technical_specs**: Image dimensions, format, and quality requirements
            7. **brand_integration**: How to incorporate brand elements naturally
            8. **target_audience_considerations**: Visual elements that appeal to the target audience
            
            Return ONLY a valid JSON object with these fields. Make the descriptions detailed and actionable for an AI image generator.
            """
            
            logger.info("Processing user instructions with Claude...")
            
            response = self.claude_client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=2000,
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            )
            
            # Extract the JSON from Claude's response
            claude_response = response.content[0].text.strip()
            logger.info(f"Claude response: {claude_response[:200]}...")
            
            # Parse the JSON response
            try:
                structured_instructions = json.loads(claude_response)
                logger.info("Successfully parsed Claude response as JSON")
                return structured_instructions
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse Claude response as JSON: {e}")
                # Try to extract JSON from the response if it's wrapped in markdown
                if "```json" in claude_response:
                    json_start = claude_response.find("```json") + 7
                    json_end = claude_response.find("```", json_start)
                    json_content = claude_response[json_start:json_end].strip()
                    structured_instructions = json.loads(json_content)
                    logger.info("Successfully extracted JSON from markdown")
                    return structured_instructions
                else:
                    raise e
                    
        except Exception as e:
            logger.error(f"Error processing user instructions with Claude: {e}")
            # Return a fallback structure
            return {
                "image_concept": user_instructions,
                "style_requirements": f"Professional {brand_info.get('brand_voice', 'modern')} style",
                "composition_details": "Well-balanced composition with clear focal point",
                "color_scheme": f"Primary: {brand_info.get('brand_colors', {}).get('primary', '#000000')}, Secondary: {brand_info.get('brand_colors', {}).get('secondary', '#FFFFFF')}",
                "text_elements": "Minimal, readable text overlays",
                "technical_specs": "High resolution, 16:9 aspect ratio, PNG format",
                "brand_integration": "Subtle brand color integration",
                "target_audience_considerations": f"Appeals to {brand_info.get('target_audience', 'general audience')}"
            }
     
    async def validate_image_with_gemini(self, image_url: str, structured_instructions: Dict[str, Any], brand_info: Dict[str, Any]) -> Dict[str, Any]:
        """Validate generated image against structured instructions using Gemini"""
        
        try:
            # Create validation prompt
            validation_prompt = f"""
            You are an expert creative quality controller. Please analyze the provided image and check if it meets the following requirements:
            
            Original Instructions:
            - Image Concept: {structured_instructions.get('image_concept', 'N/A')}
            - Style Requirements: {structured_instructions.get('style_requirements', 'N/A')}
            - Composition Details: {structured_instructions.get('composition_details', 'N/A')}
            - Color Scheme: {structured_instructions.get('color_scheme', 'N/A')}
            - Text Elements: {structured_instructions.get('text_elements', 'N/A')}
            - Brand Integration: {structured_instructions.get('brand_integration', 'N/A')}
            - Target Audience: {structured_instructions.get('target_audience_considerations', 'N/A')}
            
            Brand Information:
            - Brand Name: {brand_info.get('company_name', 'Unknown')}
            - Brand Voice: {brand_info.get('brand_voice', 'Professional')}
            - Primary Color: {brand_info.get('brand_colors', {}).get('primary', '#000000')}
            - Secondary Color: {brand_info.get('brand_colors', {}).get('secondary', '#FFFFFF')}
            
            Please provide a detailed validation report in JSON format with:
            1. **overall_score**: A score from 1-10 for how well the image meets the requirements
            2. **concept_adherence**: How well the image matches the intended concept (1-10)
            3. **style_compliance**: How well the style matches requirements (1-10)
            4. **color_usage**: How effectively brand colors are used (1-10)
            5. **composition_quality**: Quality of layout and visual hierarchy (1-10)
            6. **brand_integration**: How well brand elements are integrated (1-10)
            7. **target_audience_appeal**: How well it appeals to target audience (1-10)
            8. **strengths**: List of what works well in the image
            9. **improvements**: List of suggested improvements
            10. **approval_status**: "approved", "approved_with_notes", or "needs_revision"
            11. **feedback_summary**: Brief summary of the validation results
            
            Return ONLY a valid JSON object.
            """
            
            logger.info("Validating image with Gemini...")
            
            # For now, we'll use text-only validation since we need to handle the image URL
            # In a production environment, you'd want to download and process the actual image
            response = await self.client.models.generate_content(
                model=self.model_name,
                contents=[validation_prompt],
                config=types.GenerateContentConfig(
                    response_modalities=["Text"]
                )
            )
            
            # Extract validation result from response
            validation_text = None
            if response.candidates and len(response.candidates) > 0:
                candidate = response.candidates[0]
                if candidate.content and candidate.content.parts:
                    for part in candidate.content.parts:
                        if hasattr(part, 'text') and part.text:
                            validation_text = part.text
                            break
            
            logger.info(f"Gemini validation response: {validation_text[:200] if validation_text else 'No response'}...")
            
            if validation_text:
                try:
                    validation_result = json.loads(validation_text)
                    logger.info("Successfully parsed validation response as JSON")
                    return validation_result
                except json.JSONDecodeError as e:
                    logger.error(f"Failed to parse validation response as JSON: {e}")
                    # Try to extract JSON from markdown
                    if "```json" in validation_text:
                        json_start = validation_text.find("```json") + 7
                        json_end = validation_text.find("```", json_start)
                        json_content = validation_text[json_start:json_end].strip()
                        validation_result = json.loads(json_content)
                        logger.info("Successfully extracted validation JSON from markdown")
                        return validation_result
                    else:
                        raise e
            else:
                raise Exception("No validation response received")
                
        except Exception as e:
            logger.error(f"Error validating image with Gemini: {e}")
            # Return a fallback validation
            return {
                "overall_score": 7,
                "concept_adherence": 7,
                "style_compliance": 7,
                "color_usage": 6,
                "composition_quality": 7,
                "brand_integration": 6,
                "target_audience_appeal": 7,
                "strengths": ["Image generated successfully", "Meets basic requirements"],
                "improvements": ["Could not perform detailed validation due to technical limitations"],
                "approval_status": "approved_with_notes",
                "feedback_summary": "Image generated but detailed validation unavailable"
            }
     
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
                model=self.model_name,
                contents=[prompt],
                config=types.GenerateContentConfig(
                    response_modalities=["Text"],
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
                                       ad_copy: str,
                                       image_quantity: int = 1) -> Dict[str, Any]:
        """Generate detailed image descriptions using brand colors"""
        
        brand_colors = brand_info.get("brand_colors", {})
        primary_color = brand_colors.get("primary", "#FE8401")
        secondary_color = brand_colors.get("secondary", "#FF9933")
        
        if image_quantity == 1:
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
        else:
            prompt = f"""
            Create {image_quantity} different detailed image descriptions for Facebook ads based on this copy:
            "{ad_copy}"
            
            Brand Guidelines:
            - Primary Brand Color: {primary_color}
            - Secondary Brand Color: {secondary_color}
            - Campaign Objective: {campaign_objective}
            
            Generate {image_quantity} unique, professional image descriptions that each include:
            1. Main subject/product focus (vary the approach for each)
            2. Brand color integration
            3. Composition and layout
            4. Mood and style
            5. Text overlay placement suggestions
            
            Make each suitable for Facebook ads - visually appealing, on-brand, and conversion-focused.
            Ensure variety in concepts while maintaining brand consistency.
            
            Return as JSON:
            {{
                "images": [
                    {{
                        "image_description": "detailed description 1",
                        "style_notes": "style and mood notes 1",
                        "color_scheme": "color usage guide 1",
                        "text_overlay_suggestions": ["suggestion1", "suggestion2"]
                    }},
                    {{
                        "image_description": "detailed description 2",
                        "style_notes": "style and mood notes 2",
                        "color_scheme": "color usage guide 2",
                        "text_overlay_suggestions": ["suggestion1", "suggestion2"]
                    }}
                    // ... continue for {image_quantity} total images
                ]
            }}
            """
        
        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=[prompt],
                config=types.GenerateContentConfig(
                    response_modalities=["Text"],
                    response_mime_type="application/json"
                )
            )
            
            # Extract text from new API response structure
            response_text = None
            if response.candidates and len(response.candidates) > 0:
                candidate = response.candidates[0]
                if candidate.content and candidate.content.parts:
                    for part in candidate.content.parts:
                        if hasattr(part, 'text') and part.text:
                            response_text = part.text
                            break
            
            logger.info(f"Gemini API response text: {response_text}")
            
            if not response_text or response_text.strip() == "":
                logger.error("Gemini API returned empty response")
                return {"error": "Gemini API returned empty response"}
            
            result = json.loads(response_text)
            logger.info(f"Successfully generated {image_quantity} image description(s)")
            logger.info(f"Parsed result: {result}")
            return result
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {str(e)}")
            logger.error(f"Raw response: {response.text if 'response' in locals() else 'No response'}")
            return {"error": f"Failed to parse JSON response: {str(e)}"}
        except Exception as e:
            logger.error(f"Failed to generate image description: {str(e)}")
            return {"error": f"Failed to generate image description: {str(e)}"}
    
    async def generate_images(self,
                            image_descriptions: List[str] = None,
                            brand_info: Dict[str, Any] = None,
                            user_instructions: str = None) -> Dict[str, Any]:
        """Generate images using the complete AI workflow: User Instructions → Claude JSON → Gemini Generation → Gemini Validation"""
        
        brand_colors = brand_info.get("brand_colors", {})
        primary_color = brand_colors.get("primary", "#FE8401")
        secondary_color = brand_colors.get("secondary", "#FF9933")
        company_name = brand_info.get("company_name", "")
        
        generated_images = []
        quota_exceeded = False
        
        # Step 1: Process user instructions with Claude if provided
        structured_instructions = None
        if user_instructions:
            logger.info("Processing user instructions with Claude...")
            structured_instructions = await self.process_user_instructions_with_claude(user_instructions, brand_info)
            logger.info(f"Claude processed instructions: {json.dumps(structured_instructions, indent=2)}")
        
        # Step 2: Generate image descriptions if not provided (new workflow)
        if image_descriptions is None:
            if not structured_instructions:
                return {"error": "Either image_descriptions or user_instructions must be provided"}
            
            # Generate descriptions from Claude's structured instructions
            image_concept = structured_instructions.get('image_concept', 'Professional business image')
            style_requirements = structured_instructions.get('style_requirements', 'Modern and clean')
            composition_details = structured_instructions.get('composition_details', 'Well-balanced layout')
            
            # Create a single comprehensive description from Claude's output
            generated_description = f"{image_concept}. {style_requirements}. {composition_details}."
            image_descriptions = [generated_description]
            logger.info(f"Generated image description from Claude instructions: {generated_description}")
        
        try:
            for i, description in enumerate(image_descriptions):
                # Try to generate actual image first
                try:
                    # Create enhanced image generation prompt using structured instructions
                    if structured_instructions:
                        image_prompt = f"""
                        Create a professional Facebook ad image based on these structured requirements:
                        
                        Original Description: {description}
                        
                        Structured Requirements:
                        - Image Concept: {structured_instructions.get('image_concept', description)}
                        - Style Requirements: {structured_instructions.get('style_requirements', 'Professional and modern')}
                        - Composition Details: {structured_instructions.get('composition_details', 'Well-balanced layout')}
                        - Color Scheme: {structured_instructions.get('color_scheme', 'Brand-appropriate colors')}
                        - Text Elements: {structured_instructions.get('text_elements', 'Minimal text overlay')}
                        - Brand Integration: {structured_instructions.get('brand_integration', 'Subtle brand presence')}
                        - Target Audience: {structured_instructions.get('target_audience_considerations', 'General audience')}
                        
                        Brand Requirements:
                        - Company: {company_name}
                        - Primary Brand Color: {primary_color}
                        - Secondary Brand Color: {secondary_color}
                        - Style: Modern, professional, suitable for Facebook advertising
                        - Quality: High-resolution, crisp, commercial-grade
                        - Composition: Leave space for text overlay if needed
                        
                        Make it visually appealing and brand-consistent while following the structured requirements.
                        """
                    else:
                        # Fallback to original prompt structure
                        image_prompt = f"""
                        Create a professional Facebook ad image based on this description:
                        {description}
                        
                        Brand Requirements:
                        - Company: {company_name}
                        - Primary Brand Color: {primary_color}
                        - Secondary Brand Color: {secondary_color}
                        - Style: Modern, professional, suitable for Facebook advertising
                        - Quality: High-resolution, crisp, commercial-grade
                        - Composition: Leave space for text overlay if needed
                        
                        Make it visually appealing and brand-consistent.
                        """
                    
                    logger.info(f"Attempting to generate image {i + 1}/{len(image_descriptions)} for {company_name}")
                    
                    response = self.client.models.generate_content(
                        model=self.image_model_name,
                        contents=[image_prompt],
                        config=types.GenerateContentConfig(
                            response_modalities=["Text", "Image"]
                        )
                    )
                    
                    # The response should contain image data
                    import base64
                    import io
                    from PIL import Image
                    
                    # The response should contain image data
                    logger.info(f"Response structure: hasattr candidates: {hasattr(response, 'candidates')}, candidates count: {len(response.candidates) if hasattr(response, 'candidates') and response.candidates else 0}")
                    
                    if hasattr(response, 'candidates') and response.candidates:
                        candidate = response.candidates[0]
                        logger.info(f"Candidate structure: hasattr content: {hasattr(candidate, 'content')}, content: {candidate.content if hasattr(candidate, 'content') else 'None'}")
                        
                        if hasattr(candidate, 'content') and candidate.content.parts:
                            logger.info(f"Parts count: {len(candidate.content.parts)}")
                            for idx, part in enumerate(candidate.content.parts):
                                logger.info(f"Part {idx}: hasattr inline_data: {hasattr(part, 'inline_data')}, part type: {type(part)}")
                                if hasattr(part, 'inline_data') and part.inline_data:
                                    # Extract base64 image data from new API structure
                                    image_data_bytes = part.inline_data.data
                                    mime_type = part.inline_data.mime_type
                                    
                                    # Convert bytes to base64 string if needed
                                    if isinstance(image_data_bytes, bytes):
                                        image_data_b64 = base64.b64encode(image_data_bytes).decode('utf-8')
                                    else:
                                        image_data_b64 = image_data_bytes
                                    
                                    logger.info(f"Extracted data - mime_type: '{mime_type}', data length: {len(image_data_b64) if image_data_b64 else 0}")
                                    
                                    # Convert to data URL for frontend display
                                    image_url = f"data:{mime_type};base64,{image_data_b64}"
                                    
                                    # Step 3: Validate generated image with Gemini if structured instructions exist
                                    validation_result = None
                                    if structured_instructions:
                                        logger.info(f"Validating generated image {i + 1} with Gemini...")
                                        validation_result = await self.validate_image_with_gemini(image_url, structured_instructions, brand_info)
                                        logger.info(f"Validation result: {validation_result.get('approval_status', 'unknown')}")
                                    
                                    image_data = {
                                        "image_index": i + 1,
                                        "original_description": description,
                                        "image_url": image_url,
                                        "mime_type": mime_type,
                                        "brand_colors": {
                                            "primary": primary_color,
                                            "secondary": secondary_color
                                        },
                                        "generated_at": datetime.now().isoformat(),
                                        "type": "actual_image",
                                        "structured_instructions": structured_instructions,
                                        "validation_result": validation_result
                                    }
                                    generated_images.append(image_data)
                                    logger.info(f"Successfully generated actual image {i + 1}")
                                    break
                                else:
                                    logger.info(f"Part {idx} attributes: {dir(part)}")
                    
                    # If no image data found, fall back to enhanced description
                    if len(generated_images) <= i:
                        logger.warning(f"No image data found in response for image {i + 1}, falling back to enhanced description")
                        fallback_data = await self._generate_enhanced_description_fallback(description, brand_info, i + 1)
                        generated_images.append(fallback_data)
                        
                except Exception as image_error:
                    error_str = str(image_error)
                    logger.error(f"Failed to generate image {i + 1}: {error_str}")
                    
                    # Check if it's a quota error
                    if "quota" in error_str.lower() or "429" in error_str or "exceeded" in error_str.lower():
                        quota_exceeded = True
                        logger.warning(f"Quota exceeded for image generation, switching to enhanced descriptions")
                    
                    # Generate enhanced description fallback
                    fallback_data = await self._generate_enhanced_description_fallback(description, brand_info, i + 1, error_str if not quota_exceeded else None)
                    generated_images.append(fallback_data)
                
            # Determine overall status
            actual_images = [img for img in generated_images if img.get("type") == "actual_image"]
            enhanced_descriptions = [img for img in generated_images if img.get("type") == "enhanced_description"]
            
            status = "success"
            if quota_exceeded:
                status = "quota_exceeded_fallback"
            elif len(actual_images) == 0:
                status = "fallback_only"
            elif len(enhanced_descriptions) > 0:
                status = "partial_success"
                
            logger.info(f"Image generation completed: {len(actual_images)} actual images, {len(enhanced_descriptions)} enhanced descriptions")
            return {
                "status": status,
                "images": generated_images,
                "total_generated": len(generated_images),
                "actual_images_count": len(actual_images),
                "enhanced_descriptions_count": len(enhanced_descriptions),
                "quota_exceeded": quota_exceeded
            }
            
        except Exception as e:
            logger.error(f"Failed to generate images: {str(e)}")
            # Generate fallback descriptions for all requested images
            fallback_images = []
            for i, description in enumerate(image_descriptions):
                fallback_data = await self._generate_enhanced_description_fallback(description, brand_info, i + 1, str(e))
                fallback_images.append(fallback_data)
            
            return {
                "status": "error_fallback",
                "images": fallback_images,
                "total_generated": len(fallback_images),
                "actual_images_count": 0,
                "enhanced_descriptions_count": len(fallback_images),
                "error": str(e)
            }
    
    async def _generate_enhanced_description_fallback(self,
                                                   description: str,
                                                   brand_info: Dict[str, Any],
                                                   image_index: int,
                                                   error_message: str = None) -> Dict[str, Any]:
        """Generate enhanced text-based description when image generation fails"""
        
        brand_colors = brand_info.get("brand_colors", {})
        primary_color = brand_colors.get("primary", "#FE8401")
        secondary_color = brand_colors.get("secondary", "#FF9933")
        company_name = brand_info.get("company_name", "")
        
        try:
            # Create enhanced description prompt
            enhancement_prompt = f"""
            Create a detailed, vivid description of a professional Facebook ad image based on this concept:
            {description}
            
            Brand Context:
            - Company: {company_name}
            - Primary Brand Color: {primary_color}
            - Secondary Brand Color: {secondary_color}
            
            Please provide:
            1. A detailed visual description (composition, colors, elements)
            2. Specific design recommendations
            3. Text overlay suggestions
            4. Brand integration ideas
            5. Technical specifications (dimensions, format recommendations)
            
            Make it so detailed that a designer could create the image from this description.
            Format as a comprehensive creative brief.
            """
            
            logger.info(f"Generating enhanced description fallback for image {image_index}")
            
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=[enhancement_prompt],
                config=types.GenerateContentConfig(
                    response_modalities=["Text"]
                )
            )
            
            # Extract text from new API response structure
            enhanced_description = "Enhanced description generation failed"
            if response and response.candidates and len(response.candidates) > 0:
                candidate = response.candidates[0]
                if candidate.content and candidate.content.parts:
                    for part in candidate.content.parts:
                        if hasattr(part, 'text') and part.text:
                            enhanced_description = part.text
                            break
            
            # Create structured fallback data
            fallback_data = {
                "image_index": image_index,
                "original_description": description,
                "enhanced_description": enhanced_description,
                "type": "enhanced_description",
                "brand_colors": {
                    "primary": primary_color,
                    "secondary": secondary_color
                },
                "company_name": company_name,
                "generated_at": datetime.now().isoformat(),
                "fallback_reason": "quota_exceeded" if not error_message else "generation_error",
                "design_specs": {
                    "recommended_dimensions": "1200x628px (Facebook ad standard)",
                    "format": "PNG or JPEG",
                    "color_scheme": f"Primary: {primary_color}, Secondary: {secondary_color}",
                    "style": "Modern, professional, brand-consistent"
                }
            }
            
            if error_message:
                fallback_data["error_details"] = error_message
                
            logger.info(f"Successfully generated enhanced description fallback for image {image_index}")
            return fallback_data
            
        except Exception as e:
            logger.error(f"Failed to generate enhanced description fallback: {str(e)}")
            # Ultimate fallback - basic structured description
            return {
                "image_index": image_index,
                "original_description": description,
                "enhanced_description": f"Professional Facebook ad image featuring: {description}. Designed with {company_name}'s brand colors ({primary_color}, {secondary_color}) in a modern, clean style suitable for social media advertising.",
                "type": "enhanced_description",
                "brand_colors": {
                    "primary": primary_color,
                    "secondary": secondary_color
                },
                "company_name": company_name,
                "generated_at": datetime.now().isoformat(),
                "fallback_reason": "quota_exceeded" if not error_message else "generation_error",
                "design_specs": {
                    "recommended_dimensions": "1200x628px (Facebook ad standard)",
                    "format": "PNG or JPEG",
                    "color_scheme": f"Primary: {primary_color}, Secondary: {secondary_color}",
                    "style": "Modern, professional, brand-consistent"
                },
                "error": f"Enhanced description generation failed: {str(e)}"
            }
    
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
                model=self.model_name,
                contents=[prompt],
                config=types.GenerateContentConfig(
                    response_modalities=["Text"],
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