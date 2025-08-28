import { useState } from 'react';
import { Button } from '@mui/material';

export default function AgentDemo() {
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState('struggling_campaign');

  // Demo scenarios with different campaign performance
  const scenarios = {
    struggling_campaign: {
      name: "Struggling Campaign",
      description: "Low CTR, high cost, ad fatigue",
      data: {
        ctr: 0.3,
        cost_per_lead: 95.0,
        frequency: 4.5,
        spend: 75.0,
        impressions: 20000,
        clicks: 60,
        leads: 0.8,
        target_cpl: 40.0,
        daily_budget: 150.0
      }
    },
    high_performer: {
      name: "High Performing Campaign", 
      description: "Great metrics, scaling opportunity",
      data: {
        ctr: 2.1,
        cost_per_lead: 18.0,
        frequency: 1.9,
        spend: 95.0,
        impressions: 8000,
        clicks: 168,
        leads: 9.3,
        target_cpl: 35.0,
        daily_budget: 200.0
      }
    },
    ad_fatigue: {
      name: "Ad Fatigue Issue",
      description: "High frequency affecting performance", 
      data: {
        ctr: 0.9,
        cost_per_lead: 42.0,
        frequency: 5.2,
        spend: 180.0,
        impressions: 15000,
        clicks: 135,
        leads: 3.2,
        target_cpl: 45.0,
        daily_budget: 200.0
      }
    },
    healthy_campaign: {
      name: "Healthy Campaign",
      description: "All metrics performing well",
      data: {
        ctr: 1.8,
        cost_per_lead: 28.0,
        frequency: 2.2,
        spend: 185.0,
        impressions: 12000,
        clicks: 216,
        leads: 7.7,
        target_cpl: 35.0,
        daily_budget: 200.0
      }
    }
  };

  const testAgentSystem = async (strategy = 'balanced') => {
    setLoading(true);
    setTestResult(null);

    try {
      const scenario = scenarios[selectedScenario];
      
      // Simulate the agent system logic locally since backend has server issues
      const result = await simulateAgentDecision(scenario.data, strategy);
      
      setTestResult({
        scenario: scenario.name,
        strategy: strategy,
        campaign_metrics: scenario.data,
        ...result
      });
    } catch (error) {
      console.error('Agent test failed:', error);
      setTestResult({
        error: 'Failed to test agent system: ' + error.message
      });
    } finally {
      setLoading(false);
    }
  };

  // Simulate the orchestrator agent logic
  const simulateAgentDecision = async (metrics, strategy) => {
    // Thresholds based on strategy
    const thresholds = {
      conservative: { ctr_low: 1.2, cpl_high_multiplier: 1.2, frequency_high: 3.0 },
      balanced: { ctr_low: 1.0, cpl_high_multiplier: 1.3, frequency_high: 3.5 },
      aggressive: { ctr_low: 0.8, cpl_high_multiplier: 1.5, frequency_high: 4.5 }
    };

    const thresh = thresholds[strategy];
    const issues = [];
    const opportunities = [];
    const agents_to_activate = [];
    let priority_score = 0;

    // Issue detection logic
    if (metrics.ctr < thresh.ctr_low) {
      issues.push(`Low click-through rate (${metrics.ctr}%) indicating poor ad resonance`);
      agents_to_activate.push('Copy', 'Creative');
      priority_score += 0.3;
    }

    if (metrics.cost_per_lead > metrics.target_cpl * thresh.cpl_high_multiplier) {
      issues.push(`Cost per lead too high: $${metrics.cost_per_lead} vs target $${metrics.target_cpl}`);
      agents_to_activate.push('Analytics', 'Scaling');
      priority_score += 0.4;
    }

    if (metrics.frequency > thresh.frequency_high) {
      issues.push(`Ad fatigue detected: frequency at ${metrics.frequency}`);
      agents_to_activate.push('Creative');
      priority_score += 0.2;
    }

    const budget_utilization = metrics.spend / metrics.daily_budget;
    if (budget_utilization < 0.7) {
      opportunities.push(`Budget underutilized: ${(budget_utilization * 100).toFixed(1)}% of daily budget spent`);
      agents_to_activate.push('Scaling');
      priority_score += 0.1;
    }

    // Calculate confidence based on data volume
    let confidence_score = 0.5;
    if (metrics.impressions > 1000) confidence_score += 0.2;
    if (metrics.clicks > 100) confidence_score += 0.2;
    if (metrics.leads > 5) confidence_score += 0.1;

    // Remove duplicates
    const unique_agents = [...new Set(agents_to_activate)];

    const reasoning = [];
    if (issues.length > 0) reasoning.push(`Issues detected: ${issues.slice(0, 2).join('; ')}`);
    if (opportunities.length > 0) reasoning.push(`Opportunities found: ${opportunities.slice(0, 2).join('; ')}`);
    if (unique_agents.length > 0) reasoning.push(`Activating agents: ${unique_agents.join(', ')}`);

    return {
      issues_identified: issues,
      opportunities_identified: opportunities,
      agents_to_activate: unique_agents,
      priority_score: Math.min(priority_score, 1.0),
      confidence_score: Math.min(confidence_score, 1.0),
      decision_reasoning: reasoning.join('. ') || 'No significant issues or opportunities detected'
    };
  };

  const getAgentIcon = (agent) => {
    const icons = {
      'Copy': '✍️',
      'Creative': '🎨', 
      'Analytics': '📊',
      'Scaling': '📈'
    };
    return icons[agent] || '🤖';
  };

  const getPriorityColor = (score) => {
    if (score > 0.7) return 'text-red-500';
    if (score > 0.4) return 'text-orange-500';
    if (score > 0.2) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-[#FE8401] to-[#FF9933] bg-clip-text text-transparent mb-4">
            🤖 AI Agent System Demo
          </h1>
          <p className="text-slate-300 text-lg">
            Test how AI agents make decisions based on campaign performance data
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Test Controls */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-6">📊 Campaign Scenarios</h2>
            
            {/* Scenario Selection */}
            <div className="space-y-4 mb-6">
              {Object.entries(scenarios).map(([key, scenario]) => (
                <div 
                  key={key}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedScenario === key 
                      ? 'border-[#FE8401] bg-[#FE8401]/10' 
                      : 'border-slate-600 hover:border-slate-500'
                  }`}
                  onClick={() => setSelectedScenario(key)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-white">{scenario.name}</h3>
                      <p className="text-sm text-slate-400">{scenario.description}</p>
                    </div>
                    <div className="text-xs text-slate-500">
                      <div>CTR: {scenario.data.ctr}%</div>
                      <div>CPL: ${scenario.data.cost_per_lead}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Strategy Buttons */}
            <div className="space-y-3">
              <h3 className="font-semibold text-white">🎯 Test Strategy:</h3>
              <div className="grid grid-cols-3 gap-2">
                {['conservative', 'balanced', 'aggressive'].map(strategy => (
                  <Button
                    key={strategy}
                    variant="outlined"
                    onClick={() => testAgentSystem(strategy)}
                    disabled={loading}
                    className="capitalize text-white border-slate-600 hover:border-[#FE8401]"
                    sx={{ 
                      color: 'white', 
                      borderColor: '#64748b',
                      '&:hover': { borderColor: '#FE8401' }
                    }}
                  >
                    {strategy}
                  </Button>
                ))}
              </div>
            </div>

            {loading && (
              <div className="mt-6 text-center">
                <div className="animate-spin w-8 h-8 border-2 border-[#FE8401] border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-slate-400">AI agents analyzing...</p>
              </div>
            )}
          </div>

          {/* Results */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-6">🎯 Agent Decisions</h2>
            
            {testResult ? (
              testResult.error ? (
                <div className="text-red-400 p-4 bg-red-900/20 rounded-lg">
                  ❌ {testResult.error}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Campaign Info */}
                  <div className="bg-slate-700 rounded-lg p-4">
                    <h3 className="font-semibold text-white mb-2">📈 Campaign: {testResult.scenario}</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>CTR: {testResult.campaign_metrics.ctr}%</div>
                      <div>CPL: ${testResult.campaign_metrics.cost_per_lead}</div>
                      <div>Frequency: {testResult.campaign_metrics.frequency}</div>
                      <div>Budget: {((testResult.campaign_metrics.spend / testResult.campaign_metrics.daily_budget) * 100).toFixed(1)}%</div>
                    </div>
                  </div>

                  {/* Issues */}
                  <div>
                    <h4 className="font-semibold text-red-400 mb-2">🚨 Issues Found ({testResult.issues_identified.length})</h4>
                    {testResult.issues_identified.length > 0 ? (
                      <ul className="space-y-1 text-sm">
                        {testResult.issues_identified.map((issue, i) => (
                          <li key={i} className="text-slate-300">• {issue}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-green-400 text-sm">✅ No issues detected</p>
                    )}
                  </div>

                  {/* Opportunities */}
                  <div>
                    <h4 className="font-semibold text-blue-400 mb-2">💡 Opportunities ({testResult.opportunities_identified.length})</h4>
                    {testResult.opportunities_identified.length > 0 ? (
                      <ul className="space-y-1 text-sm">
                        {testResult.opportunities_identified.map((opp, i) => (
                          <li key={i} className="text-slate-300">• {opp}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-slate-400 text-sm">📊 No optimization opportunities found</p>
                    )}
                  </div>

                  {/* Agents */}
                  <div>
                    <h4 className="font-semibold text-[#FE8401] mb-3">🤖 AI Agents Activated ({testResult.agents_to_activate.length})</h4>
                    {testResult.agents_to_activate.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {testResult.agents_to_activate.map((agent, i) => (
                          <div key={i} className="bg-slate-600 rounded-lg p-3 text-center">
                            <div className="text-2xl mb-1">{getAgentIcon(agent)}</div>
                            <div className="text-sm font-medium">{agent} Agent</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-green-400 text-sm">😌 No agents needed - campaign performing well!</p>
                    )}
                  </div>

                  {/* Metrics */}
                  <div className="bg-slate-700 rounded-lg p-4">
                    <h4 className="font-semibold text-white mb-3">📊 Decision Metrics</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Priority Score:</span>
                        <span className={`font-semibold ${getPriorityColor(testResult.priority_score)}`}>
                          {testResult.priority_score.toFixed(2)}/1.0
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Confidence:</span>
                        <span className="font-semibold text-blue-400">
                          {testResult.confidence_score.toFixed(2)}/1.0
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Strategy:</span>
                        <span className="font-semibold text-[#FE8401] capitalize">
                          {testResult.strategy}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Reasoning */}
                  <div className="bg-slate-700 rounded-lg p-4">
                    <h4 className="font-semibold text-white mb-2">💭 AI Reasoning</h4>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {testResult.decision_reasoning}
                    </p>
                  </div>
                </div>
              )
            ) : (
              <div className="text-center text-slate-400 py-12">
                <div className="text-6xl mb-4">🤖</div>
                <p>Select a scenario and strategy to test the AI agents</p>
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="mt-8 bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="font-semibold text-white mb-3">ℹ️ How It Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl mb-2">📊</div>
              <div className="font-medium text-white">Analytics Agent</div>
              <div className="text-slate-400">Performance analysis & optimization</div>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-2">✍️</div>
              <div className="font-medium text-white">Copy Agent</div>
              <div className="text-slate-400">Ad copy optimization & A/B testing</div>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-2">🎨</div>
              <div className="font-medium text-white">Creative Agent</div>
              <div className="text-slate-400">Creative generation & refresh</div>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-2">📈</div>
              <div className="font-medium text-white">Scaling Agent</div>
              <div className="text-slate-400">Budget optimization & scaling</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}