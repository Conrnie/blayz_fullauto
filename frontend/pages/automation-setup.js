import React, { useState } from 'react';
import Layout from '../components/Layout/Layout';
import CampaignSelector from '../components/Automation/CampaignSelector';
import CompanyProfileSelector from '../components/Automation/CompanyProfileSelector';
import StrategySelector from '../components/Automation/StrategySelector';
import OfferSetup from '../components/Automation/OfferSetup';
import AutomationFrequency from '../components/Automation/AutomationFrequency';
import AutomationRobot from '../components/Automation/AutomationRobot';

export default function AutomationSetup() {
  const [currentStep, setCurrentStep] = useState(1);
  const [setupData, setSetupData] = useState({
    selectedCampaign: null,
    companyProfile: null,
    targetAvatar: null, // Future feature
    strategy: null,
    offer: null,
    landingPage: null,
    automationFrequency: null
  });

  const steps = [
    { id: 1, title: 'Select Campaign', component: 'campaign' },
    { id: 2, title: 'Company Profile', component: 'profile' },
    { id: 3, title: 'Choose Strategy', component: 'strategy' },
    { id: 4, title: 'Setup Offer', component: 'offer' },
    { id: 5, title: 'Automation Settings', component: 'frequency' }
  ];

  const handleStepComplete = (stepData) => {
    setSetupData(prev => ({ ...prev, ...stepData }));
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderCurrentStep = () => {
    const step = steps[currentStep - 1];
    
    switch (step.component) {
      case 'campaign':
        return (
          <CampaignSelector
            onSelect={(campaign) => handleStepComplete({ selectedCampaign: campaign })}
            selectedCampaign={setupData.selectedCampaign}
          />
        );
      case 'profile':
        return (
          <CompanyProfileSelector
            onSelect={(profile) => handleStepComplete({ companyProfile: profile })}
            selectedProfile={setupData.companyProfile}
          />
        );
      case 'strategy':
        return (
          <StrategySelector
            onSelect={(strategy) => handleStepComplete({ strategy: strategy })}
            selectedStrategy={setupData.strategy}
          />
        );
      case 'offer':
        return (
          <OfferSetup
            onComplete={(offerData) => handleStepComplete(offerData)}
            offerData={{ offer: setupData.offer, landingPage: setupData.landingPage }}
          />
        );
      case 'frequency':
        return (
          <AutomationFrequency
            onComplete={(frequencyData) => handleStepComplete(frequencyData)}
            automationFrequency={setupData.automationFrequency}
            setupData={setupData}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Full Automation Setup
            </h1>
            <p className="text-gray-600 text-lg">
              Set up your complete Meta campaign automation in 5 easy steps
            </p>
          </div>

          {/* Progress Steps */}
          <div className="flex justify-center mb-12">
            <div className="flex space-x-4">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex items-center ${index < steps.length - 1 ? 'flex-1' : ''}`}
                >
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold
                    ${currentStep >= step.id 
                      ? 'bg-[#FE8401] text-white shadow-lg' 
                      : 'bg-gray-100 text-gray-500'
                    }
                  `}>
                    {step.id}
                  </div>
                  <div className="ml-3">
                    <div className={`text-sm font-medium ${
                      currentStep >= step.id ? 'text-gray-900' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-4 ${
                      currentStep > step.id ? 'bg-[#FE8401]' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="max-w-6xl mx-auto">
            <div className="flex gap-8">
              {/* Robot Assistant */}
              <div className="w-80 flex-shrink-0">
                <AutomationRobot 
                  currentStep={currentStep}
                  setupData={setupData}
                />
              </div>

              {/* Step Content */}
              <div className="flex-1">
                <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200">
                {renderCurrentStep()}
                
                {/* Navigation */}
                <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
                  <button
                    onClick={handleBack}
                    disabled={currentStep === 1}
                    className={`px-6 py-2 rounded-lg font-medium ${
                      currentStep === 1
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Back
                  </button>
                  
                  <div className="text-gray-500">
                    Step {currentStep} of {steps.length}
                  </div>
                </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}