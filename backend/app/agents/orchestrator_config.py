"""
Configuration for Orchestrator Agent thresholds and decision rules
Centralized configuration for easy tuning and strategy customization
"""
from typing import Dict, Any
from enum import Enum


class StrategyProfile(str, Enum):
    CONSERVATIVE = "conservative"
    BALANCED = "balanced"
    AGGRESSIVE = "aggressive"
    CUSTOM = "custom"


class OrchestratorConfig:
    """Configurable thresholds for orchestrator decision-making"""
    
    # Default thresholds
    DEFAULT_THRESHOLDS = {
        "ctr_low": 1.0,                    # CTR below 1% needs attention
        "ctr_critical": 0.5,               # CTR below 0.5% is critical
        "cpl_high_multiplier": 1.3,        # CPL 30% above target
        "cpl_critical_multiplier": 1.5,    # CPL 50% above target is critical
        "frequency_high": 3.5,              # Ad fatigue threshold
        "frequency_critical": 5.0,          # Critical ad fatigue
        "budget_underutilization": 0.7,    # Using less than 70% of budget
        "budget_critical_under": 0.5,       # Using less than 50% is critical
        "spend_spike": 1.5,                 # 50% increase in daily spend
        "conversion_rate_low": 0.02,       # 2% conversion rate threshold
        "min_impressions_for_decision": 1000,  # Minimum impressions for reliable decisions
        "min_clicks_for_decision": 50,     # Minimum clicks for reliable CTR analysis
    }
    
    # Strategy-specific threshold overrides
    STRATEGY_THRESHOLDS = {
        StrategyProfile.CONSERVATIVE: {
            "cpl_high_multiplier": 1.2,      # More strict on CPL
            "frequency_high": 3.0,            # Lower frequency tolerance
            "budget_underutilization": 0.8,  # Higher budget utilization expected
            "min_impressions_for_decision": 2000,
        },
        StrategyProfile.BALANCED: DEFAULT_THRESHOLDS,
        StrategyProfile.AGGRESSIVE: {
            "cpl_high_multiplier": 1.5,      # More tolerance for higher CPL
            "frequency_high": 4.5,            # Higher frequency tolerance
            "budget_underutilization": 0.6,  # Lower budget utilization okay
            "min_impressions_for_decision": 500,
        }
    }
    
    # Decision weights for priority scoring
    DECISION_WEIGHTS = {
        "ctr_issue": 0.3,
        "cpl_issue": 0.4,
        "frequency_issue": 0.2,
        "budget_issue": 0.1,
        "trend_positive": 0.2,
        "trend_negative": 0.3,
    }
    
    # Agent activation rules
    AGENT_ACTIVATION_RULES = {
        "low_ctr": ["copy", "creative"],
        "critical_ctr": ["copy", "creative", "analytics"],
        "high_cpl": ["analytics", "scaling"],
        "critical_cpl": ["analytics", "scaling", "copy"],
        "ad_fatigue": ["creative"],
        "critical_fatigue": ["creative", "copy"],
        "budget_underutilization": ["scaling"],
        "critical_budget_under": ["scaling", "analytics"],
        "positive_trend": ["scaling"],
        "negative_trend": ["analytics", "copy", "creative"],
    }
    
    @classmethod
    def get_thresholds_for_strategy(cls, strategy: str) -> Dict[str, Any]:
        """Get thresholds based on strategy profile"""
        strategy_enum = StrategyProfile(strategy) if strategy in [s.value for s in StrategyProfile] else StrategyProfile.BALANCED
        base_thresholds = cls.DEFAULT_THRESHOLDS.copy()
        
        if strategy_enum in cls.STRATEGY_THRESHOLDS:
            strategy_overrides = cls.STRATEGY_THRESHOLDS[strategy_enum]
            base_thresholds.update(strategy_overrides)
        
        return base_thresholds
    
    @classmethod
    def get_decision_weight(cls, issue_type: str) -> float:
        """Get weight for a specific issue type"""
        return cls.DECISION_WEIGHTS.get(issue_type, 0.1)
    
    @classmethod
    def get_agents_for_issue(cls, issue_type: str) -> list:
        """Get list of agents to activate for a specific issue"""
        return cls.AGENT_ACTIVATION_RULES.get(issue_type, [])