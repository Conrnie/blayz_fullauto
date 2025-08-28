"""
Interactive demo for testing the AI Agent System
Allows manual input of campaign metrics to see agent decisions
"""
import asyncio
import json
from datetime import datetime

from app.agents.orchestrator import OrchestratorAgent
from app.agents.orchestrator_config import StrategyProfile


class InteractiveAgentDemo:
    """Interactive demo for testing agent decisions"""
    
    def __init__(self):
        self.orchestrator = OrchestratorAgent()
        
    def print_banner(self):
        """Print demo banner"""
        print("🤖 BLAYZ AI AGENT SYSTEM - INTERACTIVE DEMO")
        print("="*50)
        print("Test how the AI agents make decisions based on campaign performance")
        print("You can input custom metrics or use preset scenarios\n")
    
    def get_preset_scenarios(self):
        """Get preset scenarios for quick testing"""
        return {
            "1": {
                "name": "Struggling Campaign",
                "metrics": {
                    "ctr": 0.3,
                    "cost_per_lead": 95.0,
                    "frequency": 4.5,
                    "spend": 75.0,
                    "impressions": 20000,
                    "clicks": 60,
                    "leads": 0.8
                },
                "target_cpl": 40.0,
                "daily_budget": 150.0
            },
            "2": {
                "name": "High Performing Campaign",
                "metrics": {
                    "ctr": 2.1,
                    "cost_per_lead": 18.0,
                    "frequency": 1.9,
                    "spend": 95.0,
                    "impressions": 8000,
                    "clicks": 168,
                    "leads": 9.3
                },
                "target_cpl": 35.0,
                "daily_budget": 200.0
            },
            "3": {
                "name": "Ad Fatigue Issue",
                "metrics": {
                    "ctr": 0.9,
                    "cost_per_lead": 42.0,
                    "frequency": 5.2,
                    "spend": 180.0,
                    "impressions": 15000,
                    "clicks": 135,
                    "leads": 3.2
                },
                "target_cpl": 45.0,
                "daily_budget": 200.0
            }
        }
    
    def get_user_input_metrics(self):
        """Get campaign metrics from user input"""
        print("\n📊 Enter Campaign Metrics:")
        print("-" * 30)
        
        try:
            metrics = {
                "ctr": float(input("Click-through rate (CTR %) [e.g., 1.2]: ")),
                "cost_per_lead": float(input("Cost per lead ($) [e.g., 45.50]: ")),
                "frequency": float(input("Ad frequency [e.g., 2.8]: ")),
                "spend": float(input("Daily spend ($) [e.g., 180.00]: ")),
                "impressions": int(input("Impressions [e.g., 15000]: ")),
                "clicks": int(input("Clicks [e.g., 180]: ")),
                "leads": float(input("Leads [e.g., 4.0]: "))
            }
            
            target_cpl = float(input("\n🎯 Target cost per lead ($) [e.g., 40.00]: "))
            daily_budget = float(input("Daily budget ($) [e.g., 200.00]: "))
            
            return metrics, target_cpl, daily_budget
            
        except ValueError:
            print("❌ Invalid input! Please enter numeric values.")
            return None, None, None
    
    def choose_strategy(self):
        """Let user choose optimization strategy"""
        print("\n🎯 Choose Optimization Strategy:")
        print("1. Conservative (stricter thresholds)")
        print("2. Balanced (default thresholds)")
        print("3. Aggressive (relaxed thresholds)")
        
        choice = input("Enter choice (1-3) [default: 2]: ").strip() or "2"
        
        strategy_map = {
            "1": "conservative",
            "2": "balanced", 
            "3": "aggressive"
        }
        
        return strategy_map.get(choice, "balanced")
    
    async def analyze_campaign(self, metrics, target_cpl, daily_budget, strategy):
        """Analyze campaign and show agent decisions"""
        
        # Create analysis data
        analysis_data = {
            "campaign_id": f"demo_campaign_{datetime.now().strftime('%H%M%S')}",
            "current_metrics": metrics,
            "historical_metrics": metrics,  # Simplified for demo
            "performance_trends": {
                "ctr_trend": 0.0,
                "cost_per_lead_trend": 0.0,
                "frequency_trend": 0.0,
                "spend_trend": 0.0
            },
            "campaign_config": {
                "target_cpl": target_cpl,
                "daily_budget": daily_budget
            },
            "analysis_timestamp": datetime.now().isoformat()
        }
        
        # Set strategy thresholds
        self.orchestrator.thresholds = self.orchestrator.config.get_thresholds_for_strategy(strategy)
        
        print(f"\n🔍 ANALYZING CAMPAIGN...")
        print("="*40)
        
        # Get orchestrator decisions
        decisions = await self.orchestrator.decide(analysis_data)
        
        # Display results
        self.display_analysis_results(metrics, target_cpl, daily_budget, strategy, decisions)
        
        return decisions
    
    def display_analysis_results(self, metrics, target_cpl, daily_budget, strategy, decisions):
        """Display the analysis results in a formatted way"""
        
        print(f"📈 CAMPAIGN PERFORMANCE:")
        print(f"  CTR: {metrics['ctr']:.2f}%")
        print(f"  Cost per Lead: ${metrics['cost_per_lead']:.2f} (target: ${target_cpl:.2f})")
        print(f"  Frequency: {metrics['frequency']:.1f}")
        print(f"  Budget Utilization: {(metrics['spend']/daily_budget)*100:.1f}%")
        print(f"  Total Spend: ${metrics['spend']:.2f} / ${daily_budget:.2f}")
        
        print(f"\n🎯 STRATEGY: {strategy.upper()}")
        
        print(f"\n🚨 ISSUES DETECTED ({len(decisions.get('issues_identified', []))}):")
        issues = decisions.get('issues_identified', [])
        if issues:
            for i, issue in enumerate(issues, 1):
                print(f"  {i}. {issue}")
        else:
            print("  ✅ No issues detected")
        
        print(f"\n💡 OPPORTUNITIES ({len(decisions.get('opportunities_identified', []))}):")
        opportunities = decisions.get('opportunities_identified', [])
        if opportunities:
            for i, opp in enumerate(opportunities, 1):
                print(f"  {i}. {opp}")
        else:
            print("  📊 No optimization opportunities found")
        
        activated_agents = decisions.get('agents_to_activate', [])
        print(f"\n🤖 AI AGENTS TO ACTIVATE ({len(activated_agents)}):")
        if activated_agents:
            for agent in activated_agents:
                agent_name = agent.value.replace('_', ' ').title()
                print(f"  🔧 {agent_name} Agent")
        else:
            print("  😌 No agents needed - campaign is performing well!")
        
        priority = decisions.get('priority_score', 0)
        confidence = decisions.get('confidence_score', 0)
        
        print(f"\n📊 DECISION METRICS:")
        print(f"  Priority Score: {priority:.2f}/1.0 {'🔥' if priority > 0.5 else '📈' if priority > 0.2 else '😌'}")
        print(f"  Confidence: {confidence:.2f}/1.0 {'🎯' if confidence > 0.7 else '📊' if confidence > 0.5 else '⚠️'}")
        
        reasoning = decisions.get('decision_reasoning', 'No specific reasoning provided')
        print(f"\n💭 AI REASONING:")
        print(f"  {reasoning}")
        
        timeline = decisions.get('recommended_timeline', 'next_cycle')
        print(f"\n⏰ RECOMMENDED ACTION:")
        if timeline == 'immediate':
            print("  🚨 Take action IMMEDIATELY")
        else:
            print("  📅 Address in next optimization cycle")
    
    async def run_demo(self):
        """Run the interactive demo"""
        self.print_banner()
        
        while True:
            print("\n" + "="*50)
            print("SELECT TESTING MODE:")
            print("1. Use preset scenario")
            print("2. Enter custom metrics")
            print("3. Exit demo")
            
            choice = input("\nYour choice (1-3): ").strip()
            
            if choice == "3":
                print("\n👋 Thanks for testing the AI Agent System!")
                break
            elif choice == "1":
                # Preset scenarios
                scenarios = self.get_preset_scenarios()
                print("\n📋 PRESET SCENARIOS:")
                for key, scenario in scenarios.items():
                    print(f"  {key}. {scenario['name']}")
                
                scenario_choice = input("\nChoose scenario (1-3): ").strip()
                if scenario_choice in scenarios:
                    scenario = scenarios[scenario_choice]
                    metrics = scenario["metrics"]
                    target_cpl = scenario["target_cpl"]
                    daily_budget = scenario["daily_budget"]
                    
                    print(f"\n✅ Using: {scenario['name']}")
                else:
                    print("❌ Invalid choice!")
                    continue
                    
            elif choice == "2":
                # Custom input
                metrics, target_cpl, daily_budget = self.get_user_input_metrics()
                if not metrics:
                    continue
            else:
                print("❌ Invalid choice!")
                continue
            
            # Choose strategy
            strategy = self.choose_strategy()
            
            # Analyze campaign
            await self.analyze_campaign(metrics, target_cpl, daily_budget, strategy)
            
            input("\n⏸️  Press Enter to continue...")


async def main():
    """Run the interactive demo"""
    demo = InteractiveAgentDemo()
    await demo.run_demo()


if __name__ == "__main__":
    asyncio.run(main())