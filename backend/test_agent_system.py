"""
Comprehensive test suite for the AI Agent System
Tests different campaign scenarios and agent decision logic
"""
import asyncio
import json
from datetime import datetime
from typing import Dict, Any

from app.agents.orchestrator import OrchestratorAgent
from app.agents.orchestrator_config import StrategyProfile
from app.models_automation import AgentType

class AgentSystemTester:
    """Test harness for AI Agent System"""
    
    def __init__(self):
        self.orchestrator = OrchestratorAgent()
        self.test_scenarios = self._create_test_scenarios()
    
    def _create_test_scenarios(self) -> Dict[str, Dict[str, Any]]:
        """Create various campaign scenarios for testing"""
        return {
            "low_ctr_scenario": {
                "name": "Low CTR - Needs Creative Refresh",
                "campaign_metrics": {
                    "ctr": 0.3,  # Very low CTR
                    "cost_per_lead": 25.0,
                    "frequency": 2.1,
                    "spend": 180.0,
                    "impressions": 15000,
                    "clicks": 45,
                    "leads": 7
                },
                "campaign_config": {
                    "target_cpl": 30.0,
                    "daily_budget": 200.0
                },
                "strategy": "balanced",
                "expected_agents": [AgentType.COPY, AgentType.CREATIVE]
            },
            
            "high_cpl_scenario": {
                "name": "High CPL - Needs Optimization",
                "campaign_metrics": {
                    "ctr": 1.2,
                    "cost_per_lead": 85.0,  # Way above target
                    "frequency": 2.8,
                    "spend": 220.0,
                    "impressions": 18000,
                    "clicks": 216,
                    "leads": 2.6
                },
                "campaign_config": {
                    "target_cpl": 40.0,
                    "daily_budget": 250.0
                },
                "strategy": "conservative",
                "expected_agents": [AgentType.ANALYTICS, AgentType.SCALING]
            },
            
            "ad_fatigue_scenario": {
                "name": "Ad Fatigue - High Frequency",
                "campaign_metrics": {
                    "ctr": 1.1,
                    "cost_per_lead": 35.0,
                    "frequency": 4.8,  # High frequency
                    "spend": 190.0,
                    "impressions": 12000,
                    "clicks": 132,
                    "leads": 5.4
                },
                "campaign_config": {
                    "target_cpl": 40.0,
                    "daily_budget": 200.0
                },
                "strategy": "aggressive",
                "expected_agents": [AgentType.CREATIVE]
            },
            
            "scaling_opportunity": {
                "name": "Scaling Opportunity - Underutilized Budget",
                "campaign_metrics": {
                    "ctr": 2.1,  # Good CTR
                    "cost_per_lead": 22.0,  # Below target
                    "frequency": 1.8,
                    "spend": 95.0,  # Low spend vs budget
                    "impressions": 8500,
                    "clicks": 178,
                    "leads": 8.1
                },
                "campaign_config": {
                    "target_cpl": 35.0,
                    "daily_budget": 200.0
                },
                "strategy": "aggressive",
                "expected_agents": [AgentType.SCALING]
            },
            
            "multiple_issues": {
                "name": "Multiple Issues - Complex Scenario",
                "campaign_metrics": {
                    "ctr": 0.4,  # Low CTR
                    "cost_per_lead": 120.0,  # High CPL
                    "frequency": 4.2,  # High frequency
                    "spend": 85.0,  # Underutilized budget
                    "impressions": 20000,
                    "clicks": 80,
                    "leads": 0.7
                },
                "campaign_config": {
                    "target_cpl": 45.0,
                    "daily_budget": 200.0
                },
                "strategy": "balanced",
                "expected_agents": [AgentType.COPY, AgentType.CREATIVE, AgentType.ANALYTICS, AgentType.SCALING]
            },
            
            "healthy_campaign": {
                "name": "Healthy Campaign - No Action Needed",
                "campaign_metrics": {
                    "ctr": 1.8,  # Good CTR
                    "cost_per_lead": 28.0,  # Within target
                    "frequency": 2.2,  # Normal frequency
                    "spend": 185.0,  # Good budget utilization
                    "impressions": 12000,
                    "clicks": 216,
                    "leads": 7.7
                },
                "campaign_config": {
                    "target_cpl": 35.0,
                    "daily_budget": 200.0
                },
                "strategy": "balanced",
                "expected_agents": []  # No agents should be activated
            }
        }
    
    async def test_scenario(self, scenario_name: str) -> Dict[str, Any]:
        """Test a specific scenario"""
        scenario = self.test_scenarios[scenario_name]
        
        print(f"\n🧪 Testing: {scenario['name']}")
        print("=" * 50)
        
        # Create test input
        test_input = {
            "campaign_id": f"test_campaign_{scenario_name}",
            "automation_setup": {
                "strategy_id": scenario["strategy"],
                "automation_frequency": "daily"
            }
        }
        
        # Mock the API responses by directly setting up analysis data
        analysis_data = {
            "campaign_id": test_input["campaign_id"],
            "current_metrics": scenario["campaign_metrics"],
            "historical_metrics": scenario["campaign_metrics"],  # Simplified for testing
            "performance_trends": {
                "ctr_trend": 0.0,
                "cost_per_lead_trend": 0.0,
                "frequency_trend": 0.0,
                "spend_trend": 0.0
            },
            "campaign_config": scenario["campaign_config"],
            "analysis_timestamp": datetime.now().isoformat()
        }
        
        # Set strategy thresholds
        self.orchestrator.thresholds = self.orchestrator.config.get_thresholds_for_strategy(scenario["strategy"])
        
        try:
            # Test the decision logic
            decisions = await self.orchestrator.decide(analysis_data)
            
            # Analyze results
            activated_agents = decisions.get("agents_to_activate", [])
            expected_agents = scenario.get("expected_agents", [])
            
            print(f"📊 Campaign Metrics:")
            for key, value in scenario["campaign_metrics"].items():
                print(f"  • {key}: {value}")
            
            print(f"\n🎯 Strategy: {scenario['strategy']}")
            print(f"🤔 Issues Found: {len(decisions.get('issues_identified', []))}")
            for issue in decisions.get('issues_identified', []):
                print(f"  • {issue}")
            
            print(f"💡 Opportunities: {len(decisions.get('opportunities_identified', []))}")
            for opp in decisions.get('opportunities_identified', []):
                print(f"  • {opp}")
            
            print(f"\n🤖 Agents Activated: {len(activated_agents)}")
            for agent in activated_agents:
                print(f"  • {agent.value.replace('_', ' ').title()}")
            
            print(f"⚡ Priority Score: {decisions.get('priority_score', 0):.2f}")
            print(f"🎯 Confidence: {decisions.get('confidence_score', 0):.2f}")
            print(f"💭 Reasoning: {decisions.get('decision_reasoning', 'No reasoning')}")
            
            # Test validation
            agent_names_activated = [a.value for a in activated_agents]
            agent_names_expected = [a.value for a in expected_agents]
            
            test_passed = set(agent_names_activated) == set(agent_names_expected)
            
            if test_passed:
                print(f"✅ TEST PASSED: Expected agents activated")
            else:
                print(f"❌ TEST FAILED:")
                print(f"   Expected: {agent_names_expected}")
                print(f"   Actual: {agent_names_activated}")
            
            return {
                "scenario": scenario_name,
                "test_passed": test_passed,
                "decisions": decisions,
                "expected_agents": agent_names_expected,
                "actual_agents": agent_names_activated
            }
            
        except Exception as e:
            print(f"❌ ERROR: {str(e)}")
            return {
                "scenario": scenario_name,
                "test_passed": False,
                "error": str(e)
            }
    
    async def run_all_tests(self) -> Dict[str, Any]:
        """Run all test scenarios"""
        print("🚀 Starting AI Agent System Testing")
        print("="*60)
        
        results = []
        passed = 0
        total = len(self.test_scenarios)
        
        for scenario_name in self.test_scenarios:
            result = await self.test_scenario(scenario_name)
            results.append(result)
            
            if result.get("test_passed", False):
                passed += 1
        
        print(f"\n📈 TEST SUMMARY")
        print("="*30)
        print(f"✅ Passed: {passed}/{total}")
        print(f"❌ Failed: {total - passed}/{total}")
        print(f"📊 Success Rate: {(passed/total)*100:.1f}%")
        
        return {
            "total_tests": total,
            "passed": passed,
            "failed": total - passed,
            "success_rate": (passed/total)*100,
            "detailed_results": results
        }
    
    async def test_strategy_differences(self):
        """Test how different strategies affect decision making"""
        print(f"\n🎯 STRATEGY COMPARISON TEST")
        print("="*40)
        
        # Use the same metrics but different strategies
        test_metrics = {
            "ctr": 0.8,  # Borderline low CTR
            "cost_per_lead": 52.0,  # Slightly above target
            "frequency": 3.2,  # Moderate frequency
            "spend": 140.0,
            "impressions": 15000,
            "clicks": 120,
            "leads": 2.3
        }
        
        campaign_config = {
            "target_cpl": 40.0,
            "daily_budget": 200.0
        }
        
        analysis_data = {
            "campaign_id": "strategy_test_campaign",
            "current_metrics": test_metrics,
            "historical_metrics": test_metrics,
            "performance_trends": {
                "ctr_trend": 0.0,
                "cost_per_lead_trend": 0.0,
                "frequency_trend": 0.0,
                "spend_trend": 0.0
            },
            "campaign_config": campaign_config,
            "analysis_timestamp": datetime.now().isoformat()
        }
        
        strategies = ["conservative", "balanced", "aggressive"]
        
        for strategy in strategies:
            print(f"\n📋 Testing {strategy.upper()} strategy:")
            
            self.orchestrator.thresholds = self.orchestrator.config.get_thresholds_for_strategy(strategy)
            decisions = await self.orchestrator.decide(analysis_data)
            
            activated_agents = decisions.get("agents_to_activate", [])
            print(f"  🤖 Agents: {[a.value for a in activated_agents]}")
            print(f"  ⚡ Priority: {decisions.get('priority_score', 0):.2f}")
            print(f"  🎯 Issues: {len(decisions.get('issues_identified', []))}")


# Test runner function
async def run_agent_tests():
    """Main test runner"""
    tester = AgentSystemTester()
    
    # Run all scenario tests
    await tester.run_all_tests()
    
    # Test strategy differences
    await tester.test_strategy_differences()
    
    print(f"\n🎉 Agent system testing complete!")


if __name__ == "__main__":
    # Run the tests
    asyncio.run(run_agent_tests())