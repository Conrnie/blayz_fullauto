"""
Input validation for agent system
Ensures data integrity and prevents errors
"""
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, validator, Field


class CampaignMetrics(BaseModel):
    """Validated campaign metrics structure"""
    campaign_id: str
    impressions: int = Field(ge=0)
    clicks: int = Field(ge=0)
    leads: int = Field(ge=0)
    spend: float = Field(ge=0)
    ctr: float = Field(ge=0, le=100)
    cost_per_click: float = Field(ge=0)
    cost_per_lead: float = Field(ge=0)
    frequency: float = Field(ge=0)
    daily_budget: float = Field(ge=0)
    
    @validator('ctr')
    def validate_ctr(cls, v, values):
        """Ensure CTR is calculated correctly"""
        if 'impressions' in values and 'clicks' in values:
            if values['impressions'] > 0:
                calculated_ctr = (values['clicks'] / values['impressions']) * 100
                # Allow small variance due to rounding
                if abs(v - calculated_ctr) > 0.1:
                    return calculated_ctr
        return v
    
    @validator('cost_per_lead')
    def validate_cpl(cls, v, values):
        """Ensure CPL is calculated correctly"""
        if 'spend' in values and 'leads' in values:
            if values['leads'] > 0:
                calculated_cpl = values['spend'] / values['leads']
                if abs(v - calculated_cpl) > 0.01:
                    return calculated_cpl
        return v


class AutomationInputData(BaseModel):
    """Validated input data for automation runs"""
    campaign_id: str
    automation_setup: Dict[str, Any]
    run_id: Optional[str] = None
    force_run: bool = False
    
    @validator('automation_setup')
    def validate_automation_setup(cls, v):
        """Ensure required fields are present"""
        required_fields = ['strategy_id', 'campaign_id', 'automation_frequency']
        for field in required_fields:
            if field not in v:
                raise ValueError(f"Missing required field in automation_setup: {field}")
        return v


class DecisionContext(BaseModel):
    """Context for decision-making with validation"""
    current_metrics: CampaignMetrics
    historical_metrics: Optional[CampaignMetrics] = None
    performance_trends: Dict[str, float] = {}
    campaign_config: Dict[str, Any] = {}
    confidence_factors: Dict[str, float] = {}
    
    @validator('confidence_factors')
    def validate_confidence(cls, v):
        """Ensure confidence scores are between 0 and 1"""
        for key, value in v.items():
            if not 0 <= value <= 1:
                v[key] = max(0, min(1, value))
        return v


def validate_agent_input(input_data: Dict[str, Any]) -> AutomationInputData:
    """Validate and sanitize agent input data"""
    try:
        return AutomationInputData(**input_data)
    except Exception as e:
        raise ValueError(f"Invalid input data for agent: {str(e)}")


def validate_campaign_metrics(metrics: Dict[str, Any]) -> CampaignMetrics:
    """Validate and sanitize campaign metrics"""
    try:
        # Handle missing fields with defaults
        defaults = {
            'impressions': 0,
            'clicks': 0, 
            'leads': 0,
            'spend': 0.0,
            'ctr': 0.0,
            'cost_per_click': 0.0,
            'cost_per_lead': 0.0,
            'frequency': 0.0,
            'daily_budget': 0.0
        }
        
        for key, default_value in defaults.items():
            if key not in metrics or metrics[key] is None:
                metrics[key] = default_value
        
        return CampaignMetrics(**metrics)
    except Exception as e:
        raise ValueError(f"Invalid campaign metrics: {str(e)}")