"""Creative Quality Controller

This controller validates generated creatives and provides feedback for improvements.
It acts as a quality gate between the creative agent and final output.
"""

import logging
from typing import Dict, Any, List, Optional
import re
from datetime import datetime

logger = logging.getLogger(__name__)

class CreativeQualityController:
    """
    Controller that validates creative outputs and provides feedback
    for quality improvements and brand compliance.
    """
    
    def __init__(self):
        self.quality_thresholds = {
            'min_headline_length': 10,
            'max_headline_length': 125,
            'min_primary_text_length': 20,
            'max_primary_text_length': 2200,
            'min_description_length': 10,
            'max_description_length': 155,
            'required_cta_words': ['learn', 'shop', 'buy', 'get', 'discover', 'try', 'start', 'join', 'sign up', 'download']
        }
        
        self.brand_compliance_checks = [
            'brand_voice_consistency',
            'brand_color_usage',
            'target_audience_alignment',
            'message_clarity'
        ]
    
    async def validate_creative(self, creative_data: Dict[str, Any], brand_info: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate a creative against quality standards and brand guidelines
        
        Args:
            creative_data: The generated creative content
            brand_info: Brand information for compliance checking
            
        Returns:
            Validation result with pass/fail status and feedback
        """
        try:
            validation_result = {
                'is_valid': True,
                'quality_score': 0,
                'feedback': [],
                'suggestions': [],
                'timestamp': datetime.now().isoformat()
            }
            
            # Perform quality checks
            quality_checks = await self._perform_quality_checks(creative_data)
            brand_checks = await self._perform_brand_compliance_checks(creative_data, brand_info)
            
            # Combine results
            all_checks = {**quality_checks, **brand_checks}
            
            # Calculate overall score
            passed_checks = sum(1 for check in all_checks.values() if check['passed'])
            total_checks = len(all_checks)
            validation_result['quality_score'] = (passed_checks / total_checks) * 100
            
            # Determine if creative passes validation
            validation_result['is_valid'] = validation_result['quality_score'] >= 70
            
            # Collect feedback and suggestions
            for check_name, check_result in all_checks.items():
                if not check_result['passed']:
                    validation_result['feedback'].append(check_result['message'])
                    if 'suggestion' in check_result:
                        validation_result['suggestions'].append(check_result['suggestion'])
            
            validation_result['detailed_checks'] = all_checks
            
            logger.info(f"Creative validation completed. Score: {validation_result['quality_score']:.1f}%, Valid: {validation_result['is_valid']}")
            
            return validation_result
            
        except Exception as e:
            logger.error(f"Error validating creative: {str(e)}")
            return {
                'is_valid': False,
                'quality_score': 0,
                'feedback': [f'Validation error: {str(e)}'],
                'suggestions': ['Please regenerate the creative'],
                'error': str(e)
            }
    
    async def _perform_quality_checks(self, creative_data: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
        """Perform technical quality checks on the creative"""
        checks = {}
        
        # Check headline length
        headline = creative_data.get('headline', '')
        headline_length = len(headline)
        checks['headline_length'] = {
            'passed': self.quality_thresholds['min_headline_length'] <= headline_length <= self.quality_thresholds['max_headline_length'],
            'message': f'Headline length: {headline_length} characters',
            'suggestion': f'Keep headline between {self.quality_thresholds["min_headline_length"]} and {self.quality_thresholds["max_headline_length"]} characters'
        }
        
        # Check primary text length
        primary_text = creative_data.get('primary_text', '')
        primary_length = len(primary_text)
        checks['primary_text_length'] = {
            'passed': self.quality_thresholds['min_primary_text_length'] <= primary_length <= self.quality_thresholds['max_primary_text_length'],
            'message': f'Primary text length: {primary_length} characters',
            'suggestion': f'Keep primary text between {self.quality_thresholds["min_primary_text_length"]} and {self.quality_thresholds["max_primary_text_length"]} characters'
        }
        
        # Check description length
        description = creative_data.get('description', '')
        desc_length = len(description)
        checks['description_length'] = {
            'passed': self.quality_thresholds['min_description_length'] <= desc_length <= self.quality_thresholds['max_description_length'],
            'message': f'Description length: {desc_length} characters',
            'suggestion': f'Keep description between {self.quality_thresholds["min_description_length"]} and {self.quality_thresholds["max_description_length"]} characters'
        }
        
        # Check CTA presence and quality
        cta = creative_data.get('cta', '').lower()
        has_strong_cta = any(word in cta for word in self.quality_thresholds['required_cta_words'])
        checks['cta_quality'] = {
            'passed': has_strong_cta,
            'message': f'CTA: "{creative_data.get("cta", "N/A")}"',
            'suggestion': 'Use action-oriented CTA words like "Learn More", "Shop Now", "Get Started"'
        }
        
        return checks
    
    async def _perform_brand_compliance_checks(self, creative_data: Dict[str, Any], brand_info: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
        """Perform brand compliance checks"""
        checks = {}
        
        # Check brand voice consistency
        brand_voice = brand_info.get('brand_voice', '').lower()
        creative_text = f"{creative_data.get('headline', '')} {creative_data.get('primary_text', '')}".lower()
        
        voice_keywords = {
            'professional': ['expert', 'quality', 'reliable', 'trusted'],
            'friendly': ['easy', 'simple', 'help', 'support'],
            'innovative': ['new', 'advanced', 'cutting-edge', 'revolutionary'],
            'casual': ['hey', 'awesome', 'cool', 'amazing']
        }
        
        voice_alignment = False
        if brand_voice in voice_keywords:
            voice_alignment = any(keyword in creative_text for keyword in voice_keywords[brand_voice])
        
        checks['brand_voice_consistency'] = {
            'passed': voice_alignment or not brand_voice,
            'message': f'Brand voice alignment for "{brand_voice}" voice',
            'suggestion': f'Include words that reflect the {brand_voice} brand voice'
        }
        
        # Check brand color usage in image description
        image_desc = creative_data.get('image_description', {})
        brand_colors = brand_info.get('brand_colors', {})
        primary_color = brand_colors.get('primary', '')
        
        color_mentioned = primary_color.lower() in str(image_desc).lower() if primary_color else True
        checks['brand_color_usage'] = {
            'passed': color_mentioned,
            'message': f'Brand color usage: {primary_color}',
            'suggestion': f'Incorporate primary brand color {primary_color} in the visual design'
        }
        
        return checks
    
    async def generate_improvement_suggestions(self, validation_result: Dict[str, Any], creative_data: Dict[str, Any]) -> List[str]:
        """
        Generate specific improvement suggestions based on validation results
        
        Args:
            validation_result: Result from validate_creative
            creative_data: Original creative data
            
        Returns:
            List of actionable improvement suggestions
        """
        suggestions = []
        
        if not validation_result.get('is_valid', False):
            # Add specific suggestions based on failed checks
            detailed_checks = validation_result.get('detailed_checks', {})
            
            for check_name, check_result in detailed_checks.items():
                if not check_result['passed'] and 'suggestion' in check_result:
                    suggestions.append(check_result['suggestion'])
            
            # Add general improvement suggestions
            if validation_result.get('quality_score', 0) < 50:
                suggestions.append('Consider completely regenerating the creative with clearer brand guidelines')
            elif validation_result.get('quality_score', 0) < 70:
                suggestions.append('Make minor adjustments to improve compliance and quality')
        
        return suggestions
    
    async def should_regenerate(self, validation_result: Dict[str, Any]) -> bool:
        """
        Determine if the creative should be completely regenerated
        
        Args:
            validation_result: Result from validate_creative
            
        Returns:
            True if creative should be regenerated, False if minor edits are sufficient
        """
        quality_score = validation_result.get('quality_score', 0)
        
        # Regenerate if quality score is very low
        if quality_score < 40:
            return True
        
        # Check for critical failures
        detailed_checks = validation_result.get('detailed_checks', {})
        critical_failures = ['headline_length', 'primary_text_length', 'brand_voice_consistency']
        
        failed_critical = any(
            not detailed_checks.get(check, {}).get('passed', True) 
            for check in critical_failures
        )
        
        return failed_critical and quality_score < 60