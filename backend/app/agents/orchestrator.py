from typing import Dict, Any, List
from datetime import datetime, timedelta

from app.agents.base_agent import BaseAgent
from app.agents.orchestrator_config import OrchestratorConfig
from app.agents.validators import validate_agent_input, validate_campaign_metrics, DecisionContext
from app.models_automation import AgentType, AgentDecision, PerformanceSnapshot
from app.services.meta_api_service import MetaAPIService
from app.services.database_service import DatabaseService
from app.utils.monitoring import AutomationLogger, log_execution_time, metrics
from app.utils.error_recovery import with_retry, CircuitBreaker

logger = AutomationLogger(__name__)


class OrchestratorAgent(BaseAgent):
    """
    Main coordinator agent that:
    - Analyzes campaign performance
    - Identifies issues and opportunities  
    - Decides which specialized agents to activate
    - Maintains decision history and context
    """
    
    def __init__(self):
        super().__init__(AgentType.ORCHESTRATOR)
        self.meta_api = MetaAPIService()
        self.db = DatabaseService()
        self.config = OrchestratorConfig()
        self.thresholds = {}  # Will be set based on strategy
    
    @log_execution_time
    @with_retry(max_attempts=3, delay=2.0)
    async def analyze(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze current campaign performance and identify issues/opportunities
        """
        # Validate input
        validated_input = validate_agent_input(input_data)
        campaign_id = validated_input.campaign_id
        automation_setup = validated_input.automation_setup
        
        # Set thresholds based on strategy (default to balanced since strategy step was removed)
        strategy = 'balanced'  # Default strategy since strategy selection was removed from setup
        self.thresholds = OrchestratorConfig.get_thresholds_for_strategy(strategy)
        
        logger.info(f"Orchestrator analyzing campaign {campaign_id}", campaign_id=campaign_id, strategy=strategy)
        
        # Record metrics for monitoring
        metrics.record_metric(
            "orchestrator.analysis_started",
            1.0,
            {"campaign_id": campaign_id, "strategy": strategy}
        )
        
        # Get current performance metrics
        current_metrics = await self.meta_api.get_campaign_insights(
            campaign_id=campaign_id,
            date_range="yesterday"  # Most recent complete day
        )
        
        # Get historical performance for comparison
        historical_metrics = await self.meta_api.get_campaign_insights(
            campaign_id=campaign_id, 
            date_range="last_7_days"
        )
        
        # Calculate performance trends
        performance_trends = self._calculate_trends(current_metrics, historical_metrics)
        
        # Get campaign configuration
        campaign_config = await self.meta_api.get_campaign_details(campaign_id)
        
        analysis = {
            "campaign_id": campaign_id,
            "current_metrics": current_metrics,
            "historical_metrics": historical_metrics,
            "performance_trends": performance_trends,
            "campaign_config": campaign_config,
            "analysis_timestamp": datetime.now().isoformat()
        }
        
        return analysis
    
    async def decide(self, analysis_results: Dict[str, Any]) -> Dict[str, Any]:
        """
        Make strategic decisions based on analysis
        """
        current_metrics = analysis_results.get("current_metrics", {})
        trends = analysis_results.get("performance_trends", {})
        campaign_config = analysis_results.get("campaign_config", {})
        
        issues = []
        opportunities = []
        agents_to_activate = []
        priority_score = 0.0
        
        # Issue Detection Logic
        
        # 1. Low CTR - needs copy/creative refresh
        if current_metrics.get("ctr", 0) < self.thresholds["ctr_low"]:
            issues.append("Low click-through rate indicating poor ad resonance")
            agents_to_activate.extend([AgentType.COPY, AgentType.CREATIVE])
            priority_score += 0.3
        
        # 2. High CPL - needs optimization
        target_cpl = campaign_config.get("target_cpl", 50)  # Default target
        if current_metrics.get("cost_per_lead", 999) > target_cpl * self.thresholds["cpl_high_multiplier"]:
            issues.append(f"Cost per lead too high: ${current_metrics.get('cost_per_lead', 0):.2f} vs target ${target_cpl}")
            agents_to_activate.extend([AgentType.ANALYTICS, AgentType.SCALING])
            priority_score += 0.4
        
        # 3. Ad Fatigue - frequency too high
        if current_metrics.get("frequency", 0) > self.thresholds["frequency_high"]:
            issues.append(f"Ad fatigue detected: frequency at {current_metrics.get('frequency', 0):.1f}")
            agents_to_activate.append(AgentType.CREATIVE)
            priority_score += 0.2
        
        # 4. Budget underutilization - scaling opportunity
        budget_utilization = current_metrics.get("spend", 0) / campaign_config.get("daily_budget", 1)
        if budget_utilization < self.thresholds["budget_underutilization"]:
            opportunities.append(f"Budget underutilized: {budget_utilization*100:.1f}% of daily budget spent")
            agents_to_activate.append(AgentType.SCALING)
            priority_score += 0.1
        
        # 5. Performance trends analysis
        if trends.get("cpl_trend", 0) < -0.15:  # CPL improved by 15%+
            opportunities.append("Strong CPL improvement trend detected - scaling opportunity")
            agents_to_activate.append(AgentType.SCALING)
            priority_score += 0.2
        
        if trends.get("ctr_trend", 0) < -0.20:  # CTR declined by 20%+
            issues.append("Significant CTR decline detected")
            agents_to_activate.extend([AgentType.COPY, AgentType.CREATIVE])
            priority_score += 0.3
        
        # Remove duplicates and prioritize agents
        agents_to_activate = list(set(agents_to_activate))
        
        # Calculate confidence score based on data quality
        confidence_score = self._calculate_confidence(current_metrics, trends)
        
        decision_reasoning = self._generate_reasoning(issues, opportunities, agents_to_activate)
        
        decisions = {
            "should_execute": len(agents_to_activate) > 0,
            "action_type": "coordinate_agents",
            "issues_identified": issues,
            "opportunities_identified": opportunities,
            "agents_to_activate": agents_to_activate,
            "priority_score": priority_score,
            "confidence_score": confidence_score,
            "decision_reasoning": decision_reasoning,
            "recommended_timeline": "immediate" if priority_score > 0.5 else "next_cycle"
        }
        
        logger.info(
            f"Orchestrator decisions: {len(agents_to_activate)} agents to activate, priority: {priority_score:.2f}",
            agents_count=len(agents_to_activate),
            priority_score=priority_score,
            confidence_score=confidence_score
        )
        
        # Record decision metrics
        metrics.record_metric(
            "orchestrator.decision_made",
            float(len(agents_to_activate)),
            {"priority": str(priority_score), "confidence": str(confidence_score)}
        )
        
        return decisions
    
    async def execute(self, decisions: Dict[str, Any]) -> Dict[str, Any]:
        """
        Coordinate the execution of specialized agents
        """
        agents_to_activate = decisions.get("agents_to_activate", [])
        execution_results = {}
        
        # For now, we'll prepare the coordination but not actually run agents
        # This will be expanded when we implement the specialized agents
        
        for agent_type in agents_to_activate:
            execution_results[agent_type.value] = {
                "status": "queued",
                "message": f"Agent {agent_type.value} queued for execution",
                "priority": decisions.get("priority_score", 0)
            }
        
        logger.info(f"Orchestrator coordinated {len(agents_to_activate)} agents")
        
        return {
            "coordination_complete": True,
            "agents_queued": len(agents_to_activate),
            "execution_results": execution_results,
            "next_action": "await_agent_completion"
        }
    
    def _calculate_trends(self, current: Dict[str, Any], historical: Dict[str, Any]) -> Dict[str, float]:
        """Calculate performance trends between current and historical data"""
        trends = {}
        
        metrics_to_compare = ["ctr", "cost_per_lead", "frequency", "spend"]
        
        for metric in metrics_to_compare:
            current_val = current.get(metric, 0)
            historical_val = historical.get(metric, 0)
            
            if historical_val > 0:
                trend = (current_val - historical_val) / historical_val
                trends[f"{metric}_trend"] = trend
            else:
                trends[f"{metric}_trend"] = 0
        
        return trends
    
    def _calculate_confidence(self, metrics: Dict[str, Any], trends: Dict[str, Any]) -> float:
        """Calculate confidence score based on data quality and sample size"""
        confidence = 0.5  # Base confidence
        
        # Increase confidence based on data completeness
        if metrics.get("impressions", 0) > 1000:
            confidence += 0.2
        if metrics.get("clicks", 0) > 100:
            confidence += 0.2
        if metrics.get("leads", 0) > 10:
            confidence += 0.1
        
        return min(confidence, 1.0)
    
    def _generate_reasoning(self, issues: List[str], opportunities: List[str], agents: List[AgentType]) -> str:
        """Generate human-readable reasoning for the decisions"""
        reasoning_parts = []
        
        if issues:
            reasoning_parts.append(f"Issues detected: {'; '.join(issues[:2])}")  # Top 2 issues
        
        if opportunities:
            reasoning_parts.append(f"Opportunities found: {'; '.join(opportunities[:2])}")
        
        if agents:
            agent_names = [agent.value.replace('_', ' ').title() for agent in agents]
            reasoning_parts.append(f"Activating agents: {', '.join(agent_names)}")
        
        return ". ".join(reasoning_parts) if reasoning_parts else "No significant issues or opportunities detected"
    
    async def create_performance_snapshot(self, automation_run_id: str, campaign_id: str, metrics: Dict[str, Any]) -> PerformanceSnapshot:
        """Create a performance snapshot for tracking"""
        return PerformanceSnapshot(
            automation_run_id=automation_run_id,
            campaign_id=campaign_id,
            spend=metrics.get("spend", 0),
            impressions=metrics.get("impressions", 0),
            clicks=metrics.get("clicks", 0),
            leads=metrics.get("leads", 0),
            ctr=metrics.get("ctr", 0),
            cpc=metrics.get("cost_per_click", 0),
            cpl=metrics.get("cost_per_lead", 0),
            frequency=metrics.get("frequency", 0),
            daily_budget=metrics.get("daily_budget", 0),
            budget_utilization=metrics.get("spend", 0) / metrics.get("daily_budget", 1) if metrics.get("daily_budget", 0) > 0 else 0,
            active_ads_count=metrics.get("active_ads_count", 0)
        )