from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Literal
from datetime import datetime
from enum import Enum
import uuid


class AutomationStatus(str, Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    ERROR = "error"


class AgentType(str, Enum):
    ORCHESTRATOR = "orchestrator"
    ANALYTICS = "analytics" 
    CREATIVE = "creative"
    COPY = "copy"
    SCALING = "scaling"


class AutomationFrequency(str, Enum):
    EVERY_6_HOURS = "every_6_hours"
    EVERY_12_HOURS = "every_12_hours"
    DAILY = "daily"
    CUSTOM = "custom"


class AutomationSetup(BaseModel):
    """Complete automation configuration from the frontend wizard"""
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    campaign_id: str
    campaign_name: str
    company_profile_id: str
    strategy_id: str
    offer_id: str
    automation_frequency: AutomationFrequency
    custom_settings: Dict[str, Any] = {}
    status: AutomationStatus = AutomationStatus.ACTIVE
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class AutomationRun(BaseModel):
    """Individual automation execution"""
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()))
    automation_id: str
    run_number: int
    status: Literal["running", "completed", "failed"] = "running"
    started_at: datetime = Field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    
    # Performance metrics before optimization
    performance_before: Dict[str, Any] = {}
    # Performance metrics after optimization  
    performance_after: Dict[str, Any] = {}
    
    # Summary of changes made
    changes_summary: Dict[str, Any] = {}


class AgentDecision(BaseModel):
    """Orchestrator's decision-making process"""
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()))
    automation_run_id: str
    agent_type: AgentType = AgentType.ORCHESTRATOR
    
    # Analysis results
    situation_analysis: Dict[str, Any] = {}
    identified_issues: List[str] = []
    identified_opportunities: List[str] = []
    
    # Decision logic
    decision_reasoning: str
    agents_to_activate: List[AgentType] = []
    priority_score: float = 0.0
    confidence_score: float = 0.0
    
    timestamp: datetime = Field(default_factory=datetime.now)


class AgentAction(BaseModel):
    """Actions taken by specialized agents"""
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()))
    automation_run_id: str
    agent_type: AgentType
    
    # What the agent analyzed
    input_data: Dict[str, Any] = {}
    analysis_results: Dict[str, Any] = {}
    
    # What the agent decided to do
    action_type: str  # e.g., "create_ad", "update_budget", "generate_copy"
    action_details: Dict[str, Any] = {}
    
    # Results of the action
    execution_status: Literal["pending", "completed", "failed"] = "pending"
    execution_result: Dict[str, Any] = {}
    error_message: Optional[str] = None
    
    # Meta API changes made
    meta_api_calls: List[Dict[str, Any]] = []
    
    timestamp: datetime = Field(default_factory=datetime.now)


class OptimizationResult(BaseModel):
    """Results of optimization changes"""
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()))
    automation_run_id: str
    
    # What was changed
    change_type: str  # e.g., "budget_increase", "new_creative", "copy_update"
    change_details: Dict[str, Any] = {}
    
    # Performance impact
    metrics_before: Dict[str, float] = {}
    metrics_after: Dict[str, float] = {}
    performance_delta: Dict[str, float] = {}
    
    # Success indicators
    is_successful: Optional[bool] = None
    success_criteria: Dict[str, Any] = {}
    
    timestamp: datetime = Field(default_factory=datetime.now)


class PerformanceSnapshot(BaseModel):
    """Campaign performance at specific moment"""
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()))
    automation_run_id: str
    campaign_id: str
    
    # Core metrics
    spend: float = 0.0
    impressions: int = 0
    clicks: int = 0
    leads: int = 0
    ctr: float = 0.0
    cpc: float = 0.0
    cpl: float = 0.0
    frequency: float = 0.0
    
    # Additional context
    daily_budget: float = 0.0
    budget_utilization: float = 0.0
    active_ads_count: int = 0
    
    timestamp: datetime = Field(default_factory=datetime.now)


# Request/Response models for API endpoints
class AutomationSetupRequest(BaseModel):
    campaign_id: str
    campaign_name: str
    company_profile_id: str
    strategy_id: str
    offer_id: str
    automation_frequency: AutomationFrequency
    custom_settings: Dict[str, Any] = {}


class AutomationRunRequest(BaseModel):
    automation_id: str
    force_run: bool = False


class AgentStatusResponse(BaseModel):
    agent_type: AgentType
    status: Literal["idle", "running", "error"]
    last_run: Optional[datetime] = None
    current_task: Optional[str] = None
    error_message: Optional[str] = None


class AutomationHistoryResponse(BaseModel):
    automation_id: str
    recent_runs: List[AutomationRun]
    performance_trend: Dict[str, List[float]] = {}
    total_optimizations: int = 0
    success_rate: float = 0.0