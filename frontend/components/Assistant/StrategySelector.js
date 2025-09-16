import React, { useState, useEffect } from 'react';
import { getSupabaseBrowserClient } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';

const StrategySelector = ({ onSelect, selectedStrategy }) => {
  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedStrategy, setExpandedStrategy] = useState(null);
  const { user } = useAuth();
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    const fetchStrategies = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('marketer_strategies')
          .select('*')
          .eq('user_id', user.id);

        if (error) {
          throw error;
        }

        const formattedStrategies = data.map(strategy => ({
          id: strategy.id,
          name: strategy.strategy_name,
          description: strategy.preferences.description || 'A custom strategy.', // Default description
          icon: strategy.preferences.icon || '⚙️', // Default icon
          settings: strategy.preferences.settings || {},
          bestFor: strategy.preferences.bestFor || [],
          automationLevel: strategy.preferences.automationLevel || 'Custom',
        }));

        // Add the default custom strategy
        const customStrategy = {
            id: 'custom',
            name: 'Custom Strategy',
            description: 'Create your own automation rules through our strategy builder',
            icon: '⚙️',
            settings: {
              note: 'Will be configured in strategy builder'
            },
            bestFor: ['Unique business models', 'Advanced users'],
            automationLevel: 'Custom'
        };


        setStrategies([...formattedStrategies, customStrategy]);
      } catch (error) {
        console.error('Error fetching strategies:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStrategies();
  }, [user, supabase]);

  const handleStrategySelect = (strategy) => {
    if (strategy.id === 'custom') {
      // Redirect to strategy builder or show builder modal
      // For now, just select it
      onSelect({ ...strategy });
    } else {
      onSelect({ ...strategy });
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full mx-auto mb-3"></div>
        <p className="text-gray-600 text-sm">Loading assistant strategies...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Choose Assistant Strategy
      </h2>
      <p className="text-gray-600 mb-6 text-sm">
        Help me understand your campaign strategy by selecting the appropriate strategy.
      </p>
      
      <div className="space-y-4 flex-1 overflow-y-auto">
        {strategies.map((strategy) => (
          <div
            key={strategy.id}
            className={`
              p-4 rounded-lg border transition-all
              ${selectedStrategy?.id === strategy.id
                ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-200'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              }
            `}
          >
            <div className="flex items-start justify-between mb-3">
              <div 
                className="flex items-center space-x-3 flex-1 cursor-pointer"
                onClick={() => handleStrategySelect(strategy)}
              >
                <div className="text-2xl">{strategy.icon}</div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-gray-900">
                    {strategy.name}
                  </h3>
                  <p className="text-gray-600 text-sm mt-1">
                    {strategy.description}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className={`
                  px-2 py-1 rounded-full text-xs font-medium
                  ${strategy.automationLevel === 'High' 
                    ? 'bg-red-100 text-red-800'
                    : strategy.automationLevel === 'Medium'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-blue-100 text-blue-800'
                  }
                `}>
                  {strategy.automationLevel} Automation
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedStrategy(expandedStrategy === strategy.id ? null : strategy.id);
                  }}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <svg 
                    className={`w-4 h-4 text-gray-500 transition-transform ${
                      expandedStrategy === strategy.id ? 'rotate-180' : ''
                    }`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>
            
            {expandedStrategy === strategy.id && (
              <>
                {strategy.id !== 'custom' ? (
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <div className="text-gray-500 text-xs mb-1">Creatives per Campaign</div>
                      <div className="text-gray-900 text-sm font-medium">{strategy.settings.creativesPerCampaign}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs mb-1">Refresh Frequency</div>
                      <div className="text-gray-900 text-sm font-medium">{strategy.settings.refreshFrequency}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs mb-1">Scaling Trigger</div>
                      <div className="text-gray-900 text-sm font-medium">{strategy.settings.scalingTrigger}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs mb-1">Kill Criteria</div>
                      <div className="text-gray-900 text-sm font-medium">{strategy.settings.killCriteria}</div>
                    </div>
                  </div>
                ) : (
                  <div className="mb-3">
                    <div className="text-gray-600 text-sm">
                      Configure your own automation rules with our strategy builder
                    </div>
                  </div>
                )}
                
                <div>
                  <div className="text-gray-500 text-xs mb-2">Best For</div>
                  <div className="flex flex-wrap gap-2">
                    {strategy.bestFor.map((use, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                      >
                        {use}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}
            
            {selectedStrategy?.id === strategy.id && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center text-orange-600">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium">Selected strategy - {strategy.name}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {!selectedStrategy && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-blue-800 text-sm">
            💡 Your strategy determines how aggressively I optimize campaigns. Conservative strategies are safer but slower to scale.
          </p>
        </div>
      )}
    </div>
  );
};

export default StrategySelector;