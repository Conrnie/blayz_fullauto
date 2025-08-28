"""
API endpoints for testing the AI Agent System
"""
from fastapi import APIRouter, HTTPException
from typing import Dict, Any, Optional
from pydantic import BaseModel

from app.agents.orchestrator import OrchestratorAgent
from app.agents.orchestrator_config import StrategyProfile

router = APIRouter()

class CampaignTestInput(BaseModel):
    """Input model for testing campaign scenarios"""
    ctr: float
    cost_per_lead: float
    frequency: float
    spend: float
    impressions: int
    clicks: int
    leads: float
    target_cpl: float
    daily_budget: float
    strategy: str = "balanced"

class AgentTestResponse(BaseModel):
    """Response model for agent testing"""
    success: bool
    campaign_metrics: Dict[str, Any]
    issues_identified: list
    opportunities_identified: list
    agents_to_activate: list
    priority_score: float
    confidence_score: float
    decision_reasoning: str
    strategy_used: str

@router.post("/test-campaign", response_model=AgentTestResponse)
async def test_campaign_scenario(input_data: CampaignTestInput):
    """Test the AI agent system with custom campaign data"""
    
    try:
        orchestrator = OrchestratorAgent()
        
        # Create analysis data
        analysis_data = {
            "campaign_id": "test_campaign",
            "current_metrics": {
                "ctr": input_data.ctr,
                "cost_per_lead": input_data.cost_per_lead,
                "frequency": input_data.frequency,
                "spend": input_data.spend,
                "impressions": input_data.impressions,
                "clicks": input_data.clicks,
                "leads": input_data.leads
            },
            "historical_metrics": {
                "ctr": input_data.ctr,
                "cost_per_lead": input_data.cost_per_lead,
                "frequency": input_data.frequency,
                "spend": input_data.spend,
                "impressions": input_data.impressions,
                "clicks": input_data.clicks,
                "leads": input_data.leads
            },
            "performance_trends": {
                "ctr_trend": 0.0,
                "cost_per_lead_trend": 0.0,
                "frequency_trend": 0.0,
                "spend_trend": 0.0
            },
            "campaign_config": {
                "target_cpl": input_data.target_cpl,
                "daily_budget": input_data.daily_budget
            }
        }
        
        # Set strategy thresholds
        orchestrator.thresholds = orchestrator.config.get_thresholds_for_strategy(input_data.strategy)
        
        # Get agent decisions
        decisions = await orchestrator.decide(analysis_data)
        
        # Format agent names for response
        activated_agents = [agent.value.replace('_', ' ').title() for agent in decisions.get("agents_to_activate", [])]
        
        return AgentTestResponse(
            success=True,
            campaign_metrics={
                "ctr": input_data.ctr,
                "cost_per_lead": input_data.cost_per_lead,
                "frequency": input_data.frequency,
                "spend": input_data.spend,
                "budget_utilization": (input_data.spend / input_data.daily_budget) * 100
            },
            issues_identified=decisions.get("issues_identified", []),
            opportunities_identified=decisions.get("opportunities_identified", []),
            agents_to_activate=activated_agents,
            priority_score=decisions.get("priority_score", 0),
            confidence_score=decisions.get("confidence_score", 0),
            decision_reasoning=decisions.get("decision_reasoning", ""),
            strategy_used=input_data.strategy
        )
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Agent testing failed: {str(e)}")

@router.get("/test-scenarios")
async def get_test_scenarios():
    """Get preset test scenarios for quick testing"""
    
    scenarios = {
        "struggling_campaign": {
            "name": "Struggling Campaign",
            "description": "Low CTR, high CPL, ad fatigue",
            "data": {
                "ctr": 0.3,
                "cost_per_lead": 95.0,
                "frequency": 4.5,
                "spend": 75.0,
                "impressions": 20000,
                "clicks": 60,
                "leads": 0.8,
                "target_cpl": 40.0,
                "daily_budget": 150.0,
                "strategy": "balanced"
            }
        },
        "high_performer": {
            "name": "High Performing Campaign",
            "description": "Great metrics, scaling opportunity",
            "data": {
                "ctr": 2.1,
                "cost_per_lead": 18.0,
                "frequency": 1.9,
                "spend": 95.0,
                "impressions": 8000,
                "clicks": 168,
                "leads": 9.3,
                "target_cpl": 35.0,
                "daily_budget": 200.0,
                "strategy": "aggressive"
            }
        },
        "ad_fatigue": {
            "name": "Ad Fatigue Issue",
            "description": "High frequency affecting performance",
            "data": {
                "ctr": 0.9,
                "cost_per_lead": 42.0,
                "frequency": 5.2,
                "spend": 180.0,
                "impressions": 15000,
                "clicks": 135,
                "leads": 3.2,
                "target_cpl": 45.0,
                "daily_budget": 200.0,
                "strategy": "conservative"
            }
        }
    }
    
    return {"scenarios": scenarios}

@router.get("/strategy-comparison/{scenario_name}")
async def compare_strategies(scenario_name: str):
    """Compare how different strategies handle the same scenario"""
    
    # Get scenario data
    scenarios_response = await get_test_scenarios()
    scenarios = scenarios_response["scenarios"]
    
    if scenario_name not in scenarios:
        raise HTTPException(status_code=404, detail="Scenario not found")
    
    scenario_data = scenarios[scenario_name]["data"]
    strategies = ["conservative", "balanced", "aggressive"]
    
    results = {}
    
    for strategy in strategies:
        # Create a copy and override strategy
        input_data = scenario_data.copy()
        input_data["strategy"] = strategy
        test_input = CampaignTestInput(**input_data)
        result = await test_campaign_scenario(test_input)
        
        results[strategy] = {
            "agents_activated": result.agents_to_activate,
            "priority_score": result.priority_score,
            "issues_count": len(result.issues_identified),
            "opportunities_count": len(result.opportunities_identified)
        }
    
    return {
        "scenario": scenarios[scenario_name]["name"],
        "strategy_comparison": results
    }