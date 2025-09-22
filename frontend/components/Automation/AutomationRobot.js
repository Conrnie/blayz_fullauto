import React from 'react';

const AutomationRobot = ({ currentStep, setupData }) => {
  const getRobotMessage = () => {
    switch (currentStep) {
      case 1:
        return {
          message: "Hi! I'm Blayz, your marketing assistant. Let's start by selecting which campaign you'd like me to assist!",
          suggestions: ['How do I choose a campaign?', 'What happens after I select a campaign?'],
        }
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
          message: "Final step! Tell me about your offer and landing page so I can create compelling ads.",
          tip: "Clear offer details help me generate high-converting ad creatives and copy."
        };
      case 5:
        return {
          message: "Excellent! Your automation is fully configured. Review everything and launch when ready!",
          tip: "Once launched, I'll start optimizing your campaigns 24/7 with real-time adjustments."
        };
      default:
        return {
          message: "I'm here to help automate your Meta campaigns!",
          tip: "Let's get your automation set up properly."
        };
    }
  };

  const { message, tip } = getRobotMessage();
  const completedSteps = Object.values(setupData).filter(Boolean).length;
  
  return (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-white/20 transition-all duration-300 hover:shadow-3xl">
      {/* Header Section */}
      <div className="text-center mb-8">
        {/* Modern Avatar */}
        <div className="relative inline-block mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg transform transition-transform duration-300 hover:scale-105">
            <div className="text-white text-2xl font-bold">B</div>
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          </div>
        </div>
        
        <h3 className="text-2xl font-bold text-gray-900 mb-1">Blayz</h3>
        <p className="text-gray-600 text-sm font-medium">AI Campaign Manager</p>
      </div>
      
      {/* Message Card */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 mb-6 border border-gray-200/50">
        <p className="text-gray-800 text-sm leading-relaxed font-medium">
          {message}
        </p>
      </div>
      
      {/* Tip Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-8 border border-blue-200/30">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-gray-700 text-xs leading-relaxed">
            {tip}
          </p>
        </div>
      </div>
      
      {/* Progress Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-gray-900 font-semibold text-sm">Setup Progress</h4>
          <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            {completedSteps}/5
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
          <div 
            className="bg-gradient-to-r from-orange-500 to-amber-600 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${(completedSteps / 5) * 100}%` }}
          ></div>
        </div>
        
        {/* Progress Items */}
        <div className="space-y-3">
          {[
            { key: 'selectedCampaign', label: 'Campaign', value: setupData.selectedCampaign?.name },
            { key: 'companyProfile', label: 'Profile', value: setupData.companyProfile?.name },
            { key: 'strategy', label: 'Strategy', value: setupData.strategy?.name },
            { key: 'offer', label: 'Offer', value: setupData.offer?.name },
            { key: 'launch', label: 'Launch', value: currentStep === 5 ? 'Ready' : null }
          ].map((item, index) => {
            const isCompleted = setupData[item.key];
            return (
              <div key={item.key} className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${
                isCompleted ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
              }`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${
                  isCompleted ? 'bg-green-500' : 'bg-gray-300'
                }`}>
                  {isCompleted ? (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  )}
                </div>
                <div className="flex-1">
                  <div className={`text-xs font-medium ${
                    isCompleted ? 'text-green-800' : 'text-gray-600'
                  }`}>
                    {item.label}
                  </div>
                  <div className={`text-xs ${
                    isCompleted ? 'text-green-600' : 'text-gray-400'
                  }`}>
                    {item.value || 'Not configured'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Action Section */}
      {currentStep < 5 && (
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 text-gray-500 text-xs">
              <span>Complete this step to continue</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
          </div>
        </div>
      )}
      
      {currentStep === 5 && (
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="text-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
            <div className="text-green-600 text-lg font-semibold mb-1">🎉 Ready to Launch!</div>
            <p className="text-green-700 text-xs">
              Your automation is fully configured and ready to optimize your campaigns.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutomationRobot;