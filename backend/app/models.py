from pydantic import BaseModel, Field, validator, root_validator
from typing import List, Dict, Any, Optional
from datetime import datetime
from enum import Enum
import uuid


class UserBase(BaseModel):
    id: str
    email: str
    user_metadata: Optional[Dict[str, Any]] = None
    app_metadata: Optional[Dict[str, Any]] = None

class UserProfile(BaseModel):
    id: str
    created_at: datetime
    updated_at: datetime
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    company: Optional[str] = None

class FacebookTokenCreate(BaseModel):
    access_token: str
    user_id: str
    expires_at: Optional[datetime] = None
    token_type: Optional[str] = "bearer"

class FacebookToken(FacebookTokenCreate):
    id: str
    created_at: datetime

class ConditionOperator(str, Enum):
    greater_than = "greater_than"
    less_than = "less_than"
    equal_to = "equal_to"
    contains = "contains"
    not_contains = "not_contains"

class RuleCondition(BaseModel):
    metric: str
    operator: ConditionOperator
    value: str

class RuleAction(str, Enum):
    increase_budget = "increase_budget"
    decrease_budget = "decrease_budget"
    pause_campaign = "pause_campaign"
    target_android = "target_android"
    target_ios = "target_ios"
    adjust_age_range = "adjust_age_range"
    focus_on_converting_audience = "focus_on_converting_audience"

class RuleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    conditions: List[RuleCondition]
    action: RuleAction
    actionValue: Optional[str] = None
    weight: int = 1
    isEnabled: bool = True
    user_id: str

    @validator('weight')
    def validate_weight(cls, v):
        if v < 1 or v > 10:
            raise ValueError('Weight must be between 1 and 10')
        return v

class Rule(RuleCreate):
    id: str
    created_at: datetime
    updated_at: datetime

class SeverityLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"

class SuggestionStatus(str, Enum):
    PENDING = "PENDING"
    APPLIED = "APPLIED"
    DISMISSED = "DISMISSED"

class SuggestionCreate(BaseModel):
    title: str
    description: str
    severity: SeverityLevel = SeverityLevel.MEDIUM
    rule_id: str
    user_id: str
    ad_account_id: str
    campaign_id: Optional[str] = None
    adset_id: Optional[str] = None
    ad_id: Optional[str] = None
    metrics: Optional[Dict[str, Any]] = None
    status: SuggestionStatus = SuggestionStatus.PENDING
    action_details: Dict[str, Any]

class Suggestion(SuggestionCreate):
    id: str
    created_at: datetime
    updated_at: datetime

class ActionCreate(BaseModel):
    suggestion_id: str
    user_id: str
    action_type: str
    action_details: Dict[str, Any]
    status: str = "PENDING"
    result: Optional[Dict[str, Any]] = None

class Action(ActionCreate):
    id: str
    created_at: datetime
    updated_at: datetime

class TimeRange(BaseModel):
    since: str
    until: str = "today"

class InsightsRequest(BaseModel):
    ad_account_id: str
    level: Optional[str] = "account"
    time_range: Optional[TimeRange] = None
    time_increment: Optional[int] = None
    breakdowns: Optional[List[str]] = None
    metrics: Optional[List[str]] = None
    filtering: Optional[List[Dict[str, Any]]] = None

class AdAccountCreate(BaseModel):
    id: str
    user_id: str
    name: str
    account_id: str
    status: str
    currency: str
    amount_spent: Optional[float] = None
    business_name: Optional[str] = None
    business_location: Optional[str] = None
    spend_cap: Optional[float] = None

class AdAccount(AdAccountCreate):
    created_at: datetime
    updated_at: datetime

class CampaignCreate(BaseModel):
    id: str
    ad_account_id: str
    user_id: str
    name: str
    status: str
    objective: Optional[str] = None
    daily_budget: Optional[float] = None
    lifetime_budget: Optional[float] = None
    start_time: Optional[datetime] = None
    stop_time: Optional[datetime] = None
    budget_remaining: Optional[float] = None

class Campaign(CampaignCreate):
    created_at: datetime
    updated_at: datetime

class AdSetCreate(BaseModel):
    id: str
    campaign_id: str
    user_id: str
    name: str
    status: str
    daily_budget: Optional[float] = None
    lifetime_budget: Optional[float] = None
    targeting: Optional[Dict[str, Any]] = None
    optimization_goal: Optional[str] = None
    bid_amount: Optional[float] = None
    billing_event: Optional[str] = None

class AdSet(AdSetCreate):
    created_at: datetime
    updated_at: datetime

class AdCreate(BaseModel):
    id: str
    adset_id: str
    campaign_id: str
    user_id: str
    name: str
    status: str
    creative: Optional[Dict[str, Any]] = None

class Ad(AdCreate):
    created_at: datetime
    updated_at: datetime

class InsightCreate(BaseModel):
    date_start: str
    date_stop: str
    account_id: Optional[str] = None
    campaign_id: Optional[str] = None
    adset_id: Optional[str] = None
    ad_id: Optional[str] = None
    impressions: Optional[int] = None
    clicks: Optional[int] = None
    spend: Optional[float] = None
    ctr: Optional[float] = None
    cpc: Optional[float] = None
    reach: Optional[int] = None
    frequency: Optional[float] = None
    actions: Optional[Dict[str, Any]] = None
    cost_per_action_type: Optional[Dict[str, Any]] = None
    conversions: Optional[int] = None
    cost_per_conversion: Optional[float] = None
    roas: Optional[float] = None
    user_id: str

class Insight(InsightCreate):
    id: str
    created_at: datetime

# Company Profile Models
class CompanyProfileStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class CompanyProfileCreate(BaseModel):
    company_name: str
    website_url: str
    blayz_user_id: str
    status: CompanyProfileStatus = CompanyProfileStatus.PENDING

class CompanyProfile(BaseModel):
    profile_id: str
    blayz_user_id: str
    created_at: datetime
    last_updated_at: datetime
    company_name: str
    website_url: Optional[str] = None
    status: CompanyProfileStatus
    general_summary: Optional[Dict[str, Any]] = None
    custom_knowledge_summary: Optional[Dict[str, Any]] = None
    llm_synthesized_profile: Optional[Dict[str, Any]] = None
    source_data_references: Optional[Dict[str, Any]] = None
    display_summary: Optional[Dict[str, Any]] = None
