import React, { useState, useEffect } from 'react';

const StrategySelector = ({ onSelect, selectedStrategy }) => {
  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Mock strategies - replace with actual data
  useEffect(() => {
    const mockStrategies = [
      {
        id: '1',
        name: 'High-Volume Creative Tester',
        description: 'Perfect for brands that want to test many creative variations quickly',
        icon: '🎨',
        settings: {
          creativesPerCampaign: 8,
          refreshFrequency: '7 days',
          ctrThreshold: '1.2%',
          scalingTrigger: 'CPL < $25 after 50 leads',
          killCriteria: 'CPL > $45 after 100 leads'
        },
        bestFor: ['E-commerce', 'Lead generation', 'App installs'],
        automationLevel: 'High'
      },
      {
        id: '2',
        name: 'Conservative Scaler',
        description: 'Gradual scaling approach for stable, long-term campaign growth',
        icon: '📈',
        settings: {
          creativesPerCampaign: 4,
          refreshFrequency: '14 days',
          ctrThreshold: '1.5%',
          scalingTrigger: 'CPL < $30 after 75 leads',
          killCriteria: 'CPL > $50 after 150 leads'
        },
        bestFor: ['B2B services', 'High-value products', 'Consultations'],
        automationLevel: 'Medium'
      },
      {
        id: '3',
        name: 'Angle-Focused Optimizer',
        description: 'Tests different messaging angles while maintaining creative consistency',
        icon: '🎯',
        settings: {
          creativesPerCampaign: 5,
          refreshFrequency: '10 days',
          ctrThreshold: '1.3%',
          scalingTrigger: 'CPL < $28 after 60 leads',
          killCriteria: 'CPL > $42 after 120 leads'
        },
        bestFor: ['SaaS', 'Coaching', 'Professional services'],
        automationLevel: 'Medium'
      },
      {
        id: 'custom',
        name: 'Custom Strategy',
        description: 'Create your own automation rules through our strategy builder',
        icon: '⚙️',
        settings: {
          note: 'Will be configured in strategy builder'
        },
        bestFor: ['Unique business models', 'Advanced users'],
        automationLevel: 'Custom'
      }
    ];
    
    setTimeout(() => {
      setStrategies(mockStrategies);
      setLoading(false);
    }, 600);
  }, []);

  const handleStrategySelect = (strategy) => {
    if (strategy.id === 'custom') {
      // Redirect to strategy builder or show builder modal
      // For now, just select it
      onSelect(strategy);
    } else {
      onSelect(strategy);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-slate-400">Loading automation strategies...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">
        Choose Automation Strategy
      </h2>
      <p className="text-slate-300 mb-8">
        Select the strategy that matches your campaign goals and risk tolerance.
      </p>
      
      <div className="space-y-6">
        {strategies.map((strategy) => (
          <div
            key={strategy.id}
            onClick={() => handleStrategySelect(strategy)}
            className={`
              p-6 rounded-lg border cursor-pointer transition-all
              ${selectedStrategy?.id === strategy.id
                ? 'border-purple-600 bg-purple-900/20'
                : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
              }
            `}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div className="text-3xl">{strategy.icon}</div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {strategy.name}
                  </h3>
                  <p className="text-slate-300 text-sm mt-1">
                    {strategy.description}
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <span className={`
                  px-3 py-1 rounded-full text-xs font-medium
                  ${strategy.automationLevel === 'High' 
                    ? 'bg-red-900 text-red-300'
                    : strategy.automationLevel === 'Medium'
                    ? 'bg-yellow-900 text-yellow-300'
                    : 'bg-blue-900 text-blue-300'
                  }
                `}>
                  {strategy.automationLevel} Automation
                </span>
              </div>
            </div>
            
            {strategy.id !== 'custom' ? (
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-slate-400 text-xs mb-1">Creatives per Campaign</div>
                  <div className="text-white text-sm">{strategy.settings.creativesPerCampaign}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-xs mb-1">Refresh Frequency</div>
                  <div className="text-white text-sm">{strategy.settings.refreshFrequency}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-xs mb-1">Scaling Trigger</div>
                  <div className="text-white text-sm">{strategy.settings.scalingTrigger}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-xs mb-1">Kill Criteria</div>
                  <div className="text-white text-sm">{strategy.settings.killCriteria}</div>
                </div>
              </div>
            ) : (
              <div className="mb-4">
                <div className="text-slate-400 text-sm">
                  Configure your own automation rules with our strategy builder
                </div>
              </div>
            )}
            
            <div>
              <div className="text-slate-400 text-xs mb-2">Best For</div>
              <div className="flex flex-wrap gap-2">
                {strategy.bestFor.map((use, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-slate-600 text-slate-300 rounded text-xs"
                  >
                    {use}
                  </span>
                ))}
              </div>
            </div>
            
            {selectedStrategy?.id === strategy.id && (
              <div className="mt-4 pt-4 border-t border-slate-600">
                <div className="flex items-center text-purple-400">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Selected strategy - {strategy.name}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {!selectedStrategy && (
        <div className="mt-6 p-4 bg-slate-700/50 rounded-lg border border-slate-600">
          <p className="text-slate-300 text-sm">
            💡 Your strategy determines how aggressively I optimize campaigns. Conservative strategies are safer but slower to scale.
          </p>
        </div>
      )}
    </div>
  );
};

export default StrategySelector;