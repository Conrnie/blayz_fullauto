import httpx
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import asyncio
import time
from functools import wraps

logger = logging.getLogger(__name__)


class MetaAPIService:
    """
    Service for interacting with Meta's Marketing API
    Handles campaign data retrieval and optimization actions
    """
    
    def __init__(self):
        self.base_url = "https://graph.facebook.com/v18.0"
        self.timeout = 30.0
        self.rate_limit_delay = 1.0  # Delay between API calls
        self.last_api_call = 0
        self.max_retries = 3
        self.retry_delay = 2.0
    
    async def _rate_limit(self):
        """Implement rate limiting for API calls"""
        elapsed = time.time() - self.last_api_call
        if elapsed < self.rate_limit_delay:
            await asyncio.sleep(self.rate_limit_delay - elapsed)
        self.last_api_call = time.time()
    
    async def _retry_with_backoff(self, func, *args, **kwargs):
        """Retry failed API calls with exponential backoff"""
        for attempt in range(self.max_retries):
            try:
                return await func(*args, **kwargs)
            except Exception as e:
                if attempt == self.max_retries - 1:
                    raise
                wait_time = self.retry_delay * (2 ** attempt)
                logger.warning(f"API call failed, retrying in {wait_time}s: {str(e)}")
                await asyncio.sleep(wait_time)
    
    async def get_campaign_insights(self, campaign_id: str, date_range: str = "yesterday", access_token: Optional[str] = None) -> Dict[str, Any]:
        """
        Get campaign performance insights from Meta API
        
        Args:
            campaign_id: Meta campaign ID
            date_range: Date range for insights (yesterday, last_7_days, etc.)
            access_token: User's access token
            
        Returns:
            Campaign metrics dictionary
        """
        try:
            # For now, return mock data - will be replaced with actual API calls
            # when we have proper authentication flow
            
            mock_data = {
                "campaign_id": campaign_id,
                "impressions": 12500,
                "clicks": 150,
                "leads": 12,
                "spend": 125.50,
                "ctr": 1.2,
                "cost_per_click": 0.84,
                "cost_per_lead": 10.46,
                "frequency": 2.3,
                "daily_budget": 150.00,
                "date_range": date_range,
                "retrieved_at": datetime.now().isoformat()
            }
            
            logger.info(f"Retrieved insights for campaign {campaign_id}")
            return mock_data
            
        except Exception as e:
            logger.error(f"Failed to get campaign insights: {str(e)}")
            return {}
    
    async def get_campaign_details(self, campaign_id: str, access_token: Optional[str] = None) -> Dict[str, Any]:
        """
        Get campaign configuration details
        
        Args:
            campaign_id: Meta campaign ID
            access_token: User's access token
            
        Returns:
            Campaign configuration dictionary
        """
        try:
            # Mock campaign configuration
            mock_config = {
                "campaign_id": campaign_id,
                "name": "Lead Gen Q4 2025",
                "status": "ACTIVE",
                "daily_budget": 150.00,
                "target_cpl": 12.00,
                "objective": "LEAD_GENERATION",
                "active_ads_count": 3,
                "targeting": {
                    "age_min": 25,
                    "age_max": 55,
                    "genders": ["male", "female"],
                    "locations": ["US"],
                    "interests": ["business", "marketing"]
                },
                "retrieved_at": datetime.now().isoformat()
            }
            
            logger.info(f"Retrieved campaign details for {campaign_id}")
            return mock_config
            
        except Exception as e:
            logger.error(f"Failed to get campaign details: {str(e)}")
            return {}
    
    async def get_ad_creative_insights(self, campaign_id: str, access_token: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get performance data for individual ad creatives
        
        Args:
            campaign_id: Meta campaign ID
            access_token: User's access token
            
        Returns:
            List of ad creative performance data
        """
        try:
            # Mock ad creatives data
            mock_creatives = [
                {
                    "ad_id": "123456789",
                    "ad_name": "Lead Gen - Professional Services",
                    "creative_id": "987654321",
                    "impressions": 4200,
                    "clicks": 48,
                    "leads": 4,
                    "ctr": 1.14,
                    "cost_per_lead": 11.25,
                    "frequency": 2.1,
                    "status": "ACTIVE"
                },
                {
                    "ad_id": "123456790",
                    "ad_name": "Lead Gen - Small Business",
                    "creative_id": "987654322", 
                    "impressions": 5100,
                    "clicks": 63,
                    "leads": 5,
                    "ctr": 1.24,
                    "cost_per_lead": 10.10,
                    "frequency": 2.4,
                    "status": "ACTIVE"
                },
                {
                    "ad_id": "123456791",
                    "ad_name": "Lead Gen - Enterprise",
                    "creative_id": "987654323",
                    "impressions": 3200,
                    "clicks": 39,
                    "leads": 3,
                    "ctr": 1.22,
                    "cost_per_lead": 9.83,
                    "frequency": 2.6,
                    "status": "ACTIVE"
                }
            ]
            
            return mock_creatives
            
        except Exception as e:
            logger.error(f"Failed to get ad creative insights: {str(e)}")
            return []
    
    async def update_campaign_budget(self, campaign_id: str, new_daily_budget: float, access_token: Optional[str] = None) -> Dict[str, Any]:
        """
        Update campaign daily budget
        
        Args:
            campaign_id: Meta campaign ID
            new_daily_budget: New daily budget amount
            access_token: User's access token
            
        Returns:
            Update result dictionary
        """
        try:
            # Mock budget update
            result = {
                "success": True,
                "campaign_id": campaign_id,
                "old_budget": 150.00,
                "new_budget": new_daily_budget,
                "updated_at": datetime.now().isoformat(),
                "api_call": {
                    "endpoint": f"{self.base_url}/{campaign_id}",
                    "method": "POST",
                    "data": {"daily_budget": new_daily_budget}
                }
            }
            
            logger.info(f"Updated budget for campaign {campaign_id}: ${new_daily_budget}")
            return result
            
        except Exception as e:
            logger.error(f"Failed to update campaign budget: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def create_ad_creative(self, campaign_id: str, creative_data: Dict[str, Any], access_token: Optional[str] = None) -> Dict[str, Any]:
        """
        Create new ad creative for campaign
        
        Args:
            campaign_id: Meta campaign ID
            creative_data: Creative content and configuration
            access_token: User's access token
            
        Returns:
            Creation result dictionary
        """
        try:
            # Mock creative creation
            new_creative_id = f"creative_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            result = {
                "success": True,
                "creative_id": new_creative_id,
                "campaign_id": campaign_id,
                "creative_data": creative_data,
                "created_at": datetime.now().isoformat(),
                "api_call": {
                    "endpoint": f"{self.base_url}/adcreatives",
                    "method": "POST",
                    "data": creative_data
                }
            }
            
            logger.info(f"Created new creative {new_creative_id} for campaign {campaign_id}")
            return result
            
        except Exception as e:
            logger.error(f"Failed to create ad creative: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def update_ad_targeting(self, ad_set_id: str, targeting_updates: Dict[str, Any], access_token: Optional[str] = None) -> Dict[str, Any]:
        """
        Update ad set targeting parameters
        
        Args:
            ad_set_id: Meta ad set ID
            targeting_updates: New targeting configuration
            access_token: User's access token
            
        Returns:
            Update result dictionary
        """
        try:
            # Mock targeting update
            result = {
                "success": True,
                "ad_set_id": ad_set_id,
                "targeting_updates": targeting_updates,
                "updated_at": datetime.now().isoformat(),
                "api_call": {
                    "endpoint": f"{self.base_url}/{ad_set_id}",
                    "method": "POST", 
                    "data": {"targeting": targeting_updates}
                }
            }
            
            logger.info(f"Updated targeting for ad set {ad_set_id}")
            return result
            
        except Exception as e:
            logger.error(f"Failed to update ad targeting: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def pause_ad(self, ad_id: str, access_token: Optional[str] = None) -> Dict[str, Any]:
        """
        Pause an individual ad
        
        Args:
            ad_id: Meta ad ID
            access_token: User's access token
            
        Returns:
            Pause result dictionary
        """
        try:
            result = {
                "success": True,
                "ad_id": ad_id,
                "status": "PAUSED",
                "paused_at": datetime.now().isoformat(),
                "api_call": {
                    "endpoint": f"{self.base_url}/{ad_id}",
                    "method": "POST",
                    "data": {"status": "PAUSED"}
                }
            }
            
            logger.info(f"Paused ad {ad_id}")
            return result
            
        except Exception as e:
            logger.error(f"Failed to pause ad: {str(e)}")
            return {"success": False, "error": str(e)}