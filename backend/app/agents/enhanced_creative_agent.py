"""Enhanced Creative Agent with Gemini Flash Image Integration

This agent generates ad creatives using company profiles and integrates with
the quality controller for feedback-driven improvements.
"""

import logging
import os
import json
from typing import Dict, Any, List, Optional
from datetime import datetime
import google.generativeai as genai

from ..controllers.creative_quality_controller import CreativeQualityController

logger = logging.getLogger(__name__)

class EnhancedCreativeAgent:
    """
    Enhanced Creative Agent that generates high-quality ad creatives
    with integrated quality control and feedback loops.
    """
    
    def __init__(self):
        # Initialize Gemini API
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            logger.error("GEMINI_API_KEY environment variable not set")
            raise ValueError("GEMINI_API_KEY environment variable not set")
        
        genai.configure(api_key=api_key)
        
        # Initialize models
        self.text_model = genai.GenerativeModel('gemini-1.5-flash')
        self.vision_model = genai.GenerativeModel('gemini-2.5-flash-image-preview')
        
        # Initialize quality controller
        self.quality_controller = CreativeQualityController()
        
        # Creative generation settings
        self.max_regeneration_attempts = 3
        self.generation_config = {
            'temperature': 0.7,
            'top_p': 0.8,
            'top_k': 40,
            'max_output_tokens': 2048,
        }
        
        logger.info("Enhanced Creative Agent initialized with Gemini Flash")
    
    async def generate_complete_creative(self, 
                                       company_profile: Dict[str, Any], 
                                       campaign_objective: str = "conversions",
                                       target_audience: str = "Business owners",
                                       ad_format: str = "single_image",
                                       custom_prompt: Optional[str] = None) -> Dict[str, Any]:
        """
        Generate a complete ad creative with quality validation and feedback loop
        
        Args:
            company_profile: Complete company profile with brand information
            campaign_objective: Campaign goal (conversions, awareness, etc.)
            target_audience: Target audience description
            ad_format: Ad format type
            custom_prompt: Custom user prompt for ad description
            
        Returns:
            Complete creative package with validation results
        """
        try:
            # Extract brand information from company profile
            brand_info = self._extract_brand_info(company_profile)
            
            # Generate initial creative
            creative_data = await self._generate_initial_creative(
                brand_info=brand_info,
                campaign_objective=campaign_objective,
                target_audience=target_audience,
                ad_format=ad_format,
                custom_prompt=custom_prompt
            )
            
            # Quality validation and improvement loop
            final_creative = await self._quality_improvement_loop(creative_data, brand_info)
            
            return {
                'success': True,
                'creative': final_creative['creative'],
                'validation': final_creative['validation'],
                'generation_metadata': {
                    'attempts': final_creative.get('attempts', 1),
                    'timestamp': datetime.now().isoformat(),
                    'agent_version': 'enhanced_v1.0'
                }
            }
            
        except Exception as e:
            logger.error(f"Error generating complete creative: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
    
    def _extract_brand_info(self, company_profile: Dict[str, Any]) -> Dict[str, Any]:
        """Extract and structure brand information from company profile"""
        # Get profile data from different sources
        display_summary = company_profile.get('display_summary', {})
        llm_profile = company_profile.get('llm_synthesized_profile', {})
        
        # Extract brand information
        brand_info = {
            'company_name': company_profile.get('company_name', ''),
            'industry': company_profile.get('industry', ''),
            'website_url': company_profile.get('website_url', ''),
            'description': company_profile.get('description', ''),
        }
        
        # Extract from display_summary if available
        if display_summary:
            brand_info.update({
                'brand_voice': display_summary.get('brand_voice', display_summary.get('brandVoice', 'Professional and engaging')),
                'target_audience': display_summary.get('target_audience', display_summary.get('targetAudience', 'Business professionals')),
                'brand_values': display_summary.get('brand_values', display_summary.get('values', [])),
                'product_benefits': display_summary.get('product_benefits', display_summary.get('benefits', [])),
                'brand_colors': display_summary.get('brand_colors', {
                    'primary': '#FE8401',
                    'secondary': '#FF9933'
                })
            })
        
        # Extract from llm_profile if display_summary is not available
        if not display_summary and llm_profile:
            brand_info.update({
                'brand_voice': llm_profile.get('brand_voice', 'Professional and engaging'),
                'target_audience': llm_profile.get('target_audience', 'Business professionals'),
                'brand_values': llm_profile.get('brand_values', []),
                'product_benefits': llm_profile.get('product_benefits', []),
                'brand_colors': llm_profile.get('brand_colors', {
                    'primary': '#FE8401',
                    'secondary': '#FF9933'
                })
            })
        
        return brand_info
    
    async def _generate_initial_creative(self, 
                                       brand_info: Dict[str, Any],
                                       campaign_objective: str,
                                       target_audience: str,
                                       ad_format: str,
                                       custom_prompt: Optional[str] = None) -> Dict[str, Any]:
        """Generate initial creative content"""
        
        # Generate ad copy
        ad_copy = await self._generate_ad_copy(
            brand_info, campaign_objective, target_audience, ad_format, custom_prompt
        )
        
        # Generate image description
        image_description = await self._generate_image_description(brand_info, ad_copy, campaign_objective)
        
        return {
            'headline': ad_copy.get('headline', ''),
            'primary_text': ad_copy.get('primary_text', ''),
            'description': ad_copy.get('description', ''),
            'cta': ad_copy.get('cta', ''),
            'image_description': image_description,
            'brand_info': brand_info,
            'campaign_objective': campaign_objective,
            'target_audience': target_audience
        }
    
    async def _generate_ad_copy(self, 
                              brand_info: Dict[str, Any],
                              campaign_objective: str,
                              target_audience: str,
                              ad_format: str,
                              custom_prompt: Optional[str] = None) -> Dict[str, Any]:
        """Generate ad copy using Gemini"""
        
        # Build the base prompt
        prompt = f"""Generate Facebook ad copy for the following brand:

Company: {brand_info.get('company_name', 'N/A')}
Industry: {brand_info.get('industry', 'N/A')}
Brand Voice: {brand_info.get('brand_voice', 'Professional and engaging')}
Target Audience: {target_audience}
Campaign Objective: {campaign_objective}
Ad Format: {ad_format}

Brand Values: {', '.join(brand_info.get('brand_values', []))}
Product Benefits: {', '.join(brand_info.get('product_benefits', []))}
"""
        
        # Add custom prompt if provided
        if custom_prompt:
            prompt += f"\nCustom Ad Description: {custom_prompt}\n"
            prompt += "\nIncorporate the custom ad description into the creative while maintaining brand consistency."
        
        prompt += """\nGenerate ad copy that:
1. Aligns with the brand voice and values
2. Appeals to the target audience
3. Drives the campaign objective
4. Follows Facebook ad best practices"""
        
        if custom_prompt:
            prompt += "\n5. Incorporates the custom ad description naturally"
        
        prompt += """\nReturn the response as JSON with these fields:
- headline (10-125 characters)
- primary_text (20-2200 characters)
- description (10-155 characters)
- cta (clear call-to-action)

Ensure the copy is engaging, compliant, and conversion-focused.
"""
        
        try:
            response = await self.text_model.generate_content_async(
                prompt,
                generation_config=self.generation_config
            )
            
            # Parse JSON response
            response_text = response.text.strip()
            if response_text.startswith('```json'):
                response_text = response_text[7:-3].strip()
            elif response_text.startswith('```'):
                response_text = response_text[3:-3].strip()
            
            return json.loads(response_text)
            
        except Exception as e:
            logger.error(f"Error generating ad copy: {str(e)}")
            # Return fallback copy
            return {
                'headline': f"Discover {brand_info.get('company_name', 'Our Solution')}",
                'primary_text': f"Transform your business with {brand_info.get('company_name', 'our innovative solution')}. Join thousands of satisfied customers.",
                'description': f"Get started with {brand_info.get('company_name', 'us')} today.",
                'cta': 'Learn More'
            }
    
    async def _generate_image_description(self, 
                                        brand_info: Dict[str, Any],
                                        ad_copy: Dict[str, Any],
                                        campaign_objective: str) -> Dict[str, Any]:
        """Generate detailed image description for ad creative"""
        
        brand_colors = brand_info.get('brand_colors', {})
        primary_color = brand_colors.get('primary', '#FE8401')
        secondary_color = brand_colors.get('secondary', '#FF9933')
        
        prompt = f"""Generate a detailed image description for a Facebook ad creative:

Brand: {brand_info.get('company_name', 'N/A')}
Industry: {brand_info.get('industry', 'N/A')}
Headline: {ad_copy.get('headline', '')}
Primary Text: {ad_copy.get('primary_text', '')}
Campaign Objective: {campaign_objective}

Brand Colors:
- Primary: {primary_color}
- Secondary: {secondary_color}

Create a compelling visual description that:
1. Supports the ad copy message
2. Incorporates brand colors naturally
3. Appeals to the target audience
4. Drives the campaign objective
5. Follows Facebook ad image guidelines

Return as JSON with these fields:
- main_subject (primary focus of the image)
- composition (layout and arrangement)
- color_scheme (how brand colors are used)
- mood_and_style (visual tone and aesthetic)
- text_overlay (any text elements on the image)
- background (background elements and setting)

Make it visually striking and brand-consistent.
"""
        
        try:
            response = await self.vision_model.generate_content_async(
                prompt,
                generation_config=self.generation_config
            )
            
            # Parse JSON response
            response_text = response.text.strip()
            if response_text.startswith('```json'):
                response_text = response_text[7:-3].strip()
            elif response_text.startswith('```'):
                response_text = response_text[3:-3].strip()
            
            return json.loads(response_text)
            
        except Exception as e:
            logger.error(f"Error generating image description: {str(e)}")
            # Return fallback description
            return {
                'main_subject': f"Professional representation of {brand_info.get('company_name', 'the brand')}",
                'composition': 'Clean, modern layout with focus on the main subject',
                'color_scheme': f'Primarily {primary_color} with {secondary_color} accents',
                'mood_and_style': 'Professional, trustworthy, and engaging',
                'text_overlay': ad_copy.get('headline', ''),
                'background': 'Clean, minimalist background that doesn\'t distract from the main message'
            }
    
    async def _quality_improvement_loop(self, 
                                      creative_data: Dict[str, Any], 
                                      brand_info: Dict[str, Any]) -> Dict[str, Any]:
        """
        Iteratively improve creative quality through validation and feedback
        """
        attempts = 0
        current_creative = creative_data.copy()
        
        while attempts < self.max_regeneration_attempts:
            attempts += 1
            
            # Validate current creative
            validation_result = await self.quality_controller.validate_creative(
                current_creative, brand_info
            )
            
            # If creative passes validation, return it
            if validation_result.get('is_valid', False):
                logger.info(f"Creative passed validation on attempt {attempts}")
                return {
                    'creative': current_creative,
                    'validation': validation_result,
                    'attempts': attempts
                }
            
            # If this is the last attempt, return what we have
            if attempts >= self.max_regeneration_attempts:
                logger.warning(f"Max regeneration attempts reached. Returning best effort.")
                return {
                    'creative': current_creative,
                    'validation': validation_result,
                    'attempts': attempts
                }
            
            # Determine if we should regenerate or refine
            should_regenerate = await self.quality_controller.should_regenerate(validation_result)
            
            if should_regenerate:
                logger.info(f"Regenerating creative (attempt {attempts + 1})")
                # Generate completely new creative
                current_creative = await self._generate_initial_creative(
                    brand_info=brand_info,
                    campaign_objective=current_creative.get('campaign_objective', 'conversions'),
                    target_audience=current_creative.get('target_audience', 'Business owners'),
                    ad_format='single_image'
                )
            else:
                logger.info(f"Refining creative (attempt {attempts + 1})")
                # Refine existing creative
                current_creative = await self._refine_creative(
                    current_creative, validation_result, brand_info
                )
        
        # Return final result
        return {
            'creative': current_creative,
            'validation': validation_result,
            'attempts': attempts
        }
    
    async def _refine_creative(self, 
                             creative_data: Dict[str, Any],
                             validation_result: Dict[str, Any],
                             brand_info: Dict[str, Any]) -> Dict[str, Any]:
        """
        Refine existing creative based on validation feedback
        """
        suggestions = validation_result.get('suggestions', [])
        feedback = validation_result.get('feedback', [])
        
        refinement_prompt = f"""Refine the following ad creative based on quality feedback:

Current Creative:
- Headline: {creative_data.get('headline', '')}
- Primary Text: {creative_data.get('primary_text', '')}
- Description: {creative_data.get('description', '')}
- CTA: {creative_data.get('cta', '')}

Quality Feedback:
{chr(10).join(feedback)}

Improvement Suggestions:
{chr(10).join(suggestions)}

Brand Information:
- Company: {brand_info.get('company_name', '')}
- Brand Voice: {brand_info.get('brand_voice', '')}
- Industry: {brand_info.get('industry', '')}

Refine the creative to address the feedback while maintaining brand consistency.
Return as JSON with the same structure: headline, primary_text, description, cta.
"""
        
        try:
            response = await self.text_model.generate_content_async(
                refinement_prompt,
                generation_config=self.generation_config
            )
            
            # Parse JSON response
            response_text = response.text.strip()
            if response_text.startswith('```json'):
                response_text = response_text[7:-3].strip()
            elif response_text.startswith('```'):
                response_text = response_text[3:-3].strip()
            
            refined_copy = json.loads(response_text)
            
            # Update creative data with refined copy
            refined_creative = creative_data.copy()
            refined_creative.update(refined_copy)
            
            return refined_creative
            
        except Exception as e:
            logger.error(f"Error refining creative: {str(e)}")
            return creative_data  # Return original if refinement fails