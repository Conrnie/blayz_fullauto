import React, { useState } from 'react';

const AutomationFrequency = ({ onComplete, automationFrequency, setupData }) => {
  const [selectedFrequency, setSelectedFrequency] = useState(automationFrequency || '');
  const [customSettings, setCustomSettings] = useState({
    enableNightMode: true,
    pauseWeekends: false,
    maxDailyChanges: 3,
    notificationLevel: 'important'
  });
  const [launching, setLaunching] = useState(false);

  const frequencyOptions = [
    {
      id: 'every_6_hours',
      name: 'Every 6 Hours',
      description: 'Aggressive optimization for fast-moving campaigns',
      icon: '⚡',
      recommended: false,
      schedule: '4 times daily',
      goodFor: 'High-budget campaigns, competitive markets'
    },
    {
      id: 'every_12_hours', 
      name: 'Every 12 Hours',
      description: 'Balanced approach for most campaigns',
      icon: '⚖️',
      recommended: true,
      schedule: '2 times daily (morning & evening)',
      goodFor: 'Most lead gen campaigns, standard budgets'
    },
    {
      id: 'daily',
      name: 'Daily',
      description: 'Conservative optimization for stable campaigns',
      icon: '📅',
      recommended: false,
      schedule: 'Once daily at 9 AM',
      goodFor: 'Lower budgets, brand awareness campaigns'
    },
    {
      id: 'custom',
      name: 'Custom Schedule',
      description: 'Set your own optimization schedule',
      icon: '⚙️',
      recommended: false,
      schedule: 'You define',
      goodFor: 'Unique requirements, advanced users'
    }
  ];

  const handleFrequencySelect = (frequency) => {
    setSelectedFrequency(frequency);
  };

  const handleLaunchAutomation = async () => {
    setLaunching(true);
    
    // Simulate API call to set up automation
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const automationConfig = {
      automationFrequency: selectedFrequency,
      customSettings,
      setupData,
      createdAt: new Date().toISOString()
    };
    
    onComplete(automationConfig);
  };

  const getFrequencyOption = (id) => frequencyOptions.find(option => option.id === id);
  const isFormValid = selectedFrequency && !launching;

  if (launching) {
    return (
      <div className="text-center py-16">
        <div className="mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="text-white text-2xl animate-spin">⚙️</div>
          </div>
        </div>
        <h3 className="text-2xl font-bold text-white mb-4">
          Launching Your Automation
        </h3>
        <p className="text-slate-300 mb-8">
          Setting up your campaign automation with the selected rules...
        </p>
        <div className="space-y-2">
          <div className="flex items-center justify-center text-green-400 text-sm">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Connecting to Meta API
          </div>
          <div className="flex items-center justify-center text-green-400 text-sm">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Configuring automation rules
          </div>
          <div className="flex items-center justify-center text-yellow-400 text-sm">
            <div className="animate-spin w-4 h-4 mr-2 border border-yellow-400 border-t-transparent rounded-full"></div>
            Starting first optimization cycle
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">
        Set Automation Frequency
      </h2>
      <p className="text-slate-300 mb-8">
        How often should I check and optimize your campaigns? I'll monitor performance and make adjustments automatically.
      </p>
      
      <div className="space-y-4 mb-8">
        {frequencyOptions.map((option) => (
          <div
            key={option.id}
            onClick={() => handleFrequencySelect(option.id)}
            className={`
              p-6 rounded-lg border cursor-pointer transition-all
              ${selectedFrequency === option.id
                ? 'border-purple-600 bg-purple-900/20'
                : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
              }
            `}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-4">
                <div className="text-2xl">{option.icon}</div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-semibold text-white">
                      {option.name}
                    </h3>
                    {option.recommended && (
                      <span className="px-2 py-1 bg-green-900 text-green-300 rounded text-xs font-medium">
                        RECOMMENDED
                      </span>
                    )}
                  </div>
                  <p className="text-slate-300 text-sm mt-1">
                    {option.description}
                  </p>
                </div>
              </div>
              
              {selectedFrequency === option.id && (
                <div className="text-purple-400">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-slate-400">Schedule</div>
                <div className="text-white">{option.schedule}</div>
              </div>
              <div>
                <div className="text-slate-400">Good For</div>
                <div className="text-white">{option.goodFor}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Automation Summary */}
      {selectedFrequency && (
        <div className="bg-slate-700/50 rounded-lg p-6 border border-slate-600 mb-8">
          <h3 className="text-white font-semibold mb-4">🚀 Ready to Launch</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Campaign:</span>
              <span className="text-white">{setupData.selectedCampaign?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Strategy:</span>
              <span className="text-white">{setupData.strategy?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Offer:</span>
              <span className="text-white">{setupData.offer?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Frequency:</span>
              <span className="text-white">{getFrequencyOption(selectedFrequency)?.name}</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Launch Button */}
      <div className="pt-4">
        <button
          onClick={handleLaunchAutomation}
          disabled={!isFormValid}
          className={`
            w-full py-4 rounded-lg font-medium text-lg transition-all
            ${isFormValid
              ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }
          `}
        >
          🚀 Launch Full Automation
        </button>
      </div>
      
      {!selectedFrequency && (
        <div className="mt-4 p-4 bg-slate-700/50 rounded-lg border border-slate-600">
          <p className="text-slate-300 text-sm">
            💡 I recommend "Every 12 Hours" for most lead gen campaigns. It provides active optimization without over-adjustment.
          </p>
        </div>
      )}
    </div>
  );
};

export default AutomationFrequency;