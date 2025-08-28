import React, { useState, useEffect } from 'react';

const CampaignSelector = ({ onSelect, selectedCampaign }) => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  // Mock campaigns data - replace with actual Meta API call
  useEffect(() => {
    const mockCampaigns = [
      {
        id: '1',
        name: 'Lead Gen Q4 2025',
        status: 'active',
        objective: 'LEAD_GENERATION',
        dailyBudget: 100,
        leads: 245,
        cpl: 28.50,
        spend: 2840
      },
      {
        id: '2', 
        name: 'SaaS Demo Signups',
        status: 'active',
        objective: 'LEAD_GENERATION',
        dailyBudget: 75,
        leads: 89,
        cpl: 32.10,
        spend: 1205
      },
      {
        id: '3',
        name: 'Webinar Registration',
        status: 'paused',
        objective: 'LEAD_GENERATION', 
        dailyBudget: 50,
        leads: 156,
        cpl: 19.75,
        spend: 980
      }
    ];
    
    setTimeout(() => {
      setCampaigns(mockCampaigns);
      setLoading(false);
    }, 1000);
  }, []);

  const handleCampaignSelect = (campaign) => {
    onSelect(campaign);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-slate-400">Loading your Meta campaigns...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">
        Select Campaign to Automate
      </h2>
      
      <div className="space-y-4">
        {campaigns.map((campaign) => (
          <div
            key={campaign.id}
            onClick={() => handleCampaignSelect(campaign)}
            className={`
              p-6 rounded-lg border cursor-pointer transition-all
              ${selectedCampaign?.id === campaign.id
                ? 'border-purple-600 bg-purple-900/20'
                : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
              }
            `}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {campaign.name}
                </h3>
                <div className="flex items-center space-x-4 mt-1">
                  <span className={`
                    px-2 py-1 rounded text-xs font-medium
                    ${campaign.status === 'active' 
                      ? 'bg-green-900 text-green-300'
                      : 'bg-yellow-900 text-yellow-300'
                    }
                  `}>
                    {campaign.status.toUpperCase()}
                  </span>
                  <span className="text-slate-400 text-sm">
                    {campaign.objective}
                  </span>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-2xl font-bold text-white">
                  ${campaign.cpl}
                </div>
                <div className="text-slate-400 text-sm">Cost per Lead</div>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-slate-400">Daily Budget</div>
                <div className="text-white font-medium">${campaign.dailyBudget}</div>
              </div>
              <div>
                <div className="text-slate-400">Total Leads</div>
                <div className="text-white font-medium">{campaign.leads}</div>
              </div>
              <div>
                <div className="text-slate-400">Total Spend</div>
                <div className="text-white font-medium">${campaign.spend}</div>
              </div>
            </div>
            
            {selectedCampaign?.id === campaign.id && (
              <div className="mt-4 pt-4 border-t border-slate-600">
                <div className="flex items-center text-purple-400">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Selected for automation
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {!selectedCampaign && (
        <div className="mt-6 p-4 bg-slate-700/50 rounded-lg border border-slate-600">
          <p className="text-slate-300 text-sm">
            💡 Select a campaign above to set up full automation. The system will optimize creatives, scaling, and targeting based on your strategy.
          </p>
        </div>
      )}
    </div>
  );
};

export default CampaignSelector;