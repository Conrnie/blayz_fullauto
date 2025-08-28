import React from 'react';

const AutomationRobot = ({ currentStep, setupData }) => {
  const getRobotMessage = () => {
    switch (currentStep) {
      case 1:
        return {
          message: "Hi! I'm Blayz, your automation assistant. Let's start by selecting which campaign you'd like me to fully automate!",
          tip: "I'll handle creative generation, scaling decisions, and targeting optimization 24/7."
        };
      case 2:
        return {
          message: "Great choice! Now let's pick your company profile so I know your brand voice and style.",
          tip: "This helps me create on-brand creatives and messaging that matches your company."
        };
      case 3:
        return {
          message: "Perfect! Time to choose your automation strategy. This determines how I'll optimize your campaigns.",
          tip: "Different strategies work better for different business goals and campaign types."
        };
      case 4:
        return {
          message: "Almost there! Tell me about your offer and landing page so I can create compelling ads.",
          tip: "Clear offer details help me generate high-converting ad creatives and copy."
        };
      case 5:
        return {
          message: "Final step! Set how often you want me to check and optimize your campaigns.",
          tip: "I recommend every 6-12 hours for active monitoring without over-optimization."
        };
      default:
        return {
          message: "I'm here to help automate your Meta campaigns!",
          tip: "Let's get your automation set up properly."
        };
    }
  };

  const { message, tip } = getRobotMessage();
  
  return (
    <div className="bg-slate-800 rounded-xl p-6 sticky top-8 shadow-lg">
      {/* Robot Avatar */}
      <div className="flex justify-center mb-6">
        <div className="relative">
          <div className="w-20 h-20 bg-gradient-to-br from-[#FE8401] to-[#FF9933] rounded-full flex items-center justify-center">
            <div className="text-white text-3xl">🤖</div>
          </div>
          {/* Animated pulse */}
          <div className="absolute inset-0 w-20 h-20 bg-[#FE8401]/20 rounded-full animate-ping"></div>
        </div>
      </div>
      
      {/* Robot Name */}
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-white">Blayz Assistant</h3>
        <p className="text-[#FE8401] text-sm font-medium">Your AI Campaign Manager</p>
      </div>
      
      {/* Message Bubble */}
      <div className="bg-slate-700 rounded-lg p-4 mb-4 relative">
        <div className="absolute -top-2 left-6 w-4 h-4 bg-slate-700 transform rotate-45"></div>
        <p className="text-white text-sm leading-relaxed">
          {message}
        </p>
      </div>
      
      {/* Tip */}
      <div className="bg-[#FE8401]/10 border border-[#FE8401]/30 rounded-lg p-3 mb-6">
        <div className="flex items-start space-x-2">
          <div className="text-[#FE8401] mt-0.5">💡</div>
          <p className="text-white/90 text-xs leading-relaxed">
            {tip}
          </p>
        </div>
      </div>
      
      {/* Progress Summary */}
      <div className="space-y-2">
        <h4 className="text-white font-medium text-sm mb-3">Setup Progress</h4>
        
        <div className={`flex items-center text-xs ${setupData.selectedCampaign ? 'text-green-400' : 'text-slate-500'}`}>
          <div className={`w-2 h-2 rounded-full mr-2 ${setupData.selectedCampaign ? 'bg-green-400' : 'bg-slate-500'}`}></div>
          Campaign: {setupData.selectedCampaign?.name || 'Not selected'}
        </div>
        
        <div className={`flex items-center text-xs ${setupData.companyProfile ? 'text-green-400' : 'text-slate-500'}`}>
          <div className={`w-2 h-2 rounded-full mr-2 ${setupData.companyProfile ? 'bg-green-400' : 'bg-slate-500'}`}></div>
          Profile: {setupData.companyProfile?.name || 'Not selected'}
        </div>
        
        <div className={`flex items-center text-xs ${setupData.strategy ? 'text-green-400' : 'text-slate-500'}`}>
          <div className={`w-2 h-2 rounded-full mr-2 ${setupData.strategy ? 'bg-green-400' : 'bg-slate-500'}`}></div>
          Strategy: {setupData.strategy?.name || 'Not selected'}
        </div>
        
        <div className={`flex items-center text-xs ${setupData.offer ? 'text-green-400' : 'text-slate-500'}`}>
          <div className={`w-2 h-2 rounded-full mr-2 ${setupData.offer ? 'bg-green-400' : 'bg-slate-500'}`}></div>
          Offer: {setupData.offer?.name || 'Not configured'}
        </div>
        
        <div className={`flex items-center text-xs ${setupData.automationFrequency ? 'text-green-400' : 'text-slate-500'}`}>
          <div className={`w-2 h-2 rounded-full mr-2 ${setupData.automationFrequency ? 'bg-green-400' : 'bg-slate-500'}`}></div>
          Frequency: {setupData.automationFrequency || 'Not set'}
        </div>
      </div>
      
      {/* Next Action */}
      {currentStep < 5 && (
        <div className="mt-4 pt-4 border-t border-slate-700">
          <p className="text-slate-400 text-xs text-center">
            Complete this step to continue →
          </p>
        </div>
      )}
      
      {currentStep === 5 && Object.values(setupData).filter(Boolean).length === 5 && (
        <div className="mt-4 pt-4 border-t border-slate-700">
          <div className="text-center">
            <div className="text-green-400 text-sm font-medium">🎉 Ready to Launch!</div>
            <p className="text-slate-400 text-xs mt-1">
              Your automation is configured and ready to go.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutomationRobot;