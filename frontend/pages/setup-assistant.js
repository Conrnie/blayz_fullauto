import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import CampaignSelector from '../components/Assistant/CampaignSelector';
import CompanyProfileSelector from '../components/Assistant/CompanyProfileSelector';
import AvatarSelector from '../components/Assistant/AvatarSelector';

import OfferSetup from '../components/Assistant/OfferSetup';
import AutomationRobot from '../components/Assistant/AutomationRobot';
import { metaApi } from '../lib/api';
import supabase from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function SetupAssistant() {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [setupData, setSetupData] = useState({
    adAccount: null,
    campaign: null,
    companyProfile: null,
    avatar: null,
    offer: null,
    assistantName: ''
  });
  const [adAccounts, setAdAccounts] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loadingAdAccounts, setLoadingAdAccounts] = useState(true);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);

  const steps = [
    { id: 1, title: 'Select Campaign', icon: '🎯', description: 'Choose your ad account and campaign' },
    { id: 2, title: 'Define Persona', icon: '🏢', description: 'Set up your company information and target avatar' },
    { id: 3, title: 'Create Offer', icon: '💰', description: 'Configure your offer details' },
    { id: 4, title: 'Name Assistant', icon: '✏️', description: 'Give your AI assistant a custom name' },
    { id: 5, title: 'Launch', icon: '🚀', description: 'Review and launch your assistant' }
  ];

  // Fetch ad accounts on component mount
  useEffect(() => {
    const fetchAdAccounts = async () => {
      try {
        const data = await metaApi.getAdAccounts();
        setAdAccounts(data || []);
        setLoadingAdAccounts(false);
      } catch (error) {
        console.error('Error fetching ad accounts:', error);
        setLoadingAdAccounts(false);
      }
    };

    fetchAdAccounts();
  }, []);

  // Fetch campaigns when ad account is selected
  useEffect(() => {
    if (setupData.adAccount) {
      setLoadingCampaigns(true);
      const fetchCampaigns = async () => {
        try {
          // Use the ad account's internal ID for the API call
          const adAccountId = setupData.adAccount.id;
          const data = await metaApi.getCampaigns(adAccountId);
          
          // Transform the API response to match the expected format
          const formattedCampaigns = (data || []).map(campaign => ({
            id: campaign.id,
            name: campaign.name || 'Unnamed Campaign',
            status: campaign.status?.toLowerCase() || 'unknown',
            objective: campaign.objective || 'UNKNOWN',
            dailyBudget: campaign.daily_budget || 0,
            leads: campaign.leads || 0,
            cpl: campaign.cost_per_lead || 0,
            spend: campaign.spend || 0
          }));
          
          setCampaigns(formattedCampaigns);
          setLoadingCampaigns(false);
        } catch (error) {
          console.error('Error fetching campaigns:', error);
          setCampaigns([]);
          setLoadingCampaigns(false);
        }
      };

      fetchCampaigns();
    }
  }, [setupData.adAccount]);

  const handleAdAccountSelect = (adAccount) => {
    setSetupData(prev => ({
      ...prev,
      adAccount: adAccount,
      campaign: null // Reset campaign when ad account changes
    }));
  };

  const handleCampaignSelect = (campaign) => {
    setSetupData(prev => ({
      ...prev,
      campaign: campaign
    }));
  };

  const handleNext = () => {
    // Check if step 1 requirements are met
    if (currentStep === 1 && (!setupData.adAccount || !setupData.campaign)) {
      return; // Don't proceed if ad account or campaign not selected
    }
    
    // Check if step 2 requirements are met
    if (currentStep === 2 && (!setupData.companyProfile || !setupData.avatar)) {
      return; // Don't proceed if company profile or avatar not selected
    }
    
    // Check if step 3 requirements are met
    if (currentStep === 3 && !setupData.offer) {
      return; // Don't proceed if offer not configured
    }
    
    // Check if step 4 requirements are met
    if (currentStep === 4 && !setupData.assistantName.trim()) {
      return; // Don't proceed if assistant name not provided
    }
    
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepData = (stepKey, data) => {
    setSetupData(prev => ({
      ...prev,
      [stepKey]: data
    }));
  };

  const handleLaunchAssistant = async () => {
    if (!user) {
      alert('Please log in to launch your assistant');
      return;
    }

    setIsLaunching(true);
    
    try {
      // Validate required data
      console.log('Setup data before launch:', setupData);
      console.log('User data:', user);
      
      // For now, let's create a basic assistant even if some data is missing
      // We can make the validation more strict later
      const campaignName = setupData.campaign?.name || 'Default Campaign';
      const companyName = setupData.companyProfile?.name || 'Default Company';
      
      console.log('Using campaign name:', campaignName);
      console.log('Using company name:', companyName);

      // Create the assistant record with new dedicated columns
      const assistantData = {
        user_id: user.id,
        name: setupData.assistantName || `${setupData.campaign?.name || 'Campaign'} Assistant`,
        description: `AI advisor for ${setupData.campaign?.name || 'your campaign'} optimization`,
        system_prompt: `You are an AI campaign optimization advisor for ${setupData.companyProfile?.name || 'the user\'s company'}. Your role is to analyze campaign performance and provide actionable recommendations for ${setupData.campaign?.name || 'the campaign'}. Focus on optimization strategies and consider the target avatar: ${setupData.avatar?.name || 'general audience'}.`,
        // New dedicated columns for better data management
        campaign_id: setupData.campaign?.id,
        company_profile_id: setupData.companyProfile?.id,
        meta_campaign_id: setupData.campaign?.meta_campaign_id,
        ad_account_id: setupData.adAccount?.id,
        model_config: {
          // Keep essential context objects for AI reasoning
          offer: setupData.offer,
          avatar: setupData.avatar,
          campaign: setupData.campaign,
          companyProfile: setupData.companyProfile,
          adAccount: setupData.adAccount,
          // Reference IDs for quick lookup
          avatarId: setupData.avatar?.id,
          offerId: setupData.offer?.id
        },
        is_active: true
      };

      console.log('Creating assistant with data:', assistantData);

      const { data: assistant, error: assistantError } = await supabase
        .from('ai_assistants')
        .insert([assistantData])
        .select()
        .single();

      if (assistantError) {
        console.error('Assistant creation error:', assistantError);
        throw assistantError;
      }

      console.log('Assistant created successfully:', assistant);

      // Create an initial conversation
      const conversationData = {
        assistant_id: assistant.id,
        user_id: user.id,
        title: `${setupData.campaign?.name || 'Campaign'} Optimization Chat`,
        context: {
          campaign_id: setupData.campaign?.id,
          ad_account_id: setupData.adAccount?.id,
          setup_completed_at: new Date().toISOString()
        },
        status: 'active'
      };

      console.log('Creating conversation with data:', conversationData);

      const { data: conversation, error: conversationError } = await supabase
        .from('assistant_conversations')
        .insert([conversationData])
        .select()
        .single();

      if (conversationError) {
        console.error('Conversation creation error:', conversationError);
        throw conversationError;
      }

      console.log('Conversation created successfully:', conversation);

      // Add a welcome message
      const welcomeMessage = {
        conversation_id: conversation.id,
        role: 'assistant',
        content: `Hello! I'm your AI campaign optimization advisor for "${setupData.campaign?.name || 'your campaign'}". I'm here to help you optimize your campaign performance with data-driven insights and recommendations. How can I assist you today?`,
        metadata: {
          message_type: 'welcome',
          setup_data: setupData
        }
      };

      console.log('Creating welcome message with data:', welcomeMessage);

      const { error: messageError } = await supabase
        .from('assistant_messages')
        .insert([welcomeMessage]);

      if (messageError) {
        console.error('Message creation error:', messageError);
        throw messageError;
      }

      console.log('Welcome message created successfully');
      console.log('Assistant launch completed successfully, redirecting...');

      // Redirect to assistant dashboard
      window.location.href = '/assistant-dashboard';
      
    } catch (error) {
      console.error('Error launching assistant:', error);
      alert(`Failed to launch assistant: ${error.message || 'Please try again.'}`);
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <Layout>
      <div className="fixed inset-0 bg-gradient-to-br from-orange-50 via-white to-orange-100 overflow-y-auto z-10 pl-80 flex flex-col">
        {/* Header Section */}
        <div className="w-full bg-white border-b border-gray-200 shadow-sm">
          <div className="flex justify-center py-8">
            <div className="w-full max-w-3xl px-4">
              <div className="text-center">
                <h1 className="text-4xl md:text-5xl font-extrabold text-secondary mb-4 tracking-tight">
                  AI Campaign Manager
                  <span className="block text-primary mt-1 text-5xl md:text-6xl">Setup Assistant</span>
                </h1>
                <p className="mt-3 max-w-md mx-auto text-xl text-gray-600">
                  configure your marketing assistant
                </p>
              </div>
              
              {/* Progress Bar */}
              <div className="mt-8">
                <div className="flex items-center justify-center mb-8">
                  <div className="flex items-center space-x-2">
                    {steps.map((step, index) => (
                      <div key={step.id} className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          index + 1 <= currentStep 
                            ? 'bg-orange-500 text-white' 
                        : 'bg-gray-200 text-gray-500'
                        }`}>
                          {index + 1}
                        </div>
                        {index < steps.length - 1 && (
                          <div className={`w-6 h-0.5 mx-1 ${
                            index + 1 < currentStep ? 'bg-orange-500' : 'bg-gray-200'
                          }`} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="w-full flex justify-center py-8 flex-1 min-h-0">
          <div className="w-full max-w-5xl px-4 flex flex-col h-full">
            {/* Main Content */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex-1 flex flex-col">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch flex-1 min-h-[calc(100vh-400px)]">
                 {/* Left Column - Robot */}
                 <div className="flex items-start justify-center w-full">
                   <div className="w-full max-w-full">
                     <AutomationRobot 
                       currentStep={currentStep}
                       setupData={{
                         selectedCampaign: setupData.campaign,
                         companyProfile: setupData.companyProfile,
                         strategy: setupData.strategy,
                         offer: setupData.offer,
                         frequency: setupData.frequency
                       }}
                     />
                   </div>
                 </div>
                 
                 {/* Right Column - Step Content */}
                 <div className="flex flex-col h-full">
                   {/* Step-specific content */}
                   <div className="bg-white rounded-lg p-6 border border-orange-200 shadow-lg flex-1 overflow-y-auto h-full">
                     {currentStep === 1 && (
                       <div className="space-y-6">
                         {/* Ad Account Selection */}
                         <div>
                           <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                             <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                             Select Ad Account
                           </h3>
                           {loadingAdAccounts ? (
                             <div className="flex items-center justify-center py-4">
                               <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                               <span className="ml-2 text-gray-600 text-sm">Loading ad accounts...</span>
                             </div>
                           ) : (
                             <select
                               className="w-full px-4 py-3 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm bg-white text-gray-800 shadow-sm transition-all duration-200"
                               value={setupData.adAccount?.id || ''}
                               onChange={(e) => {
                                 const selectedAccount = adAccounts.find(acc => acc.id === parseInt(e.target.value));
                                 handleAdAccountSelect(selectedAccount);
                               }}
                             >
                               <option value="">Choose an ad account...</option>
                               {adAccounts.map((account) => (
                                 <option key={account.id} value={account.id}>
                                   {account.name} ({account.account_id}) - ${account.balance.toFixed(2)} {account.currency}
                                 </option>
                               ))}
                             </select>
                           )}
                         </div>
       
                         {/* Campaign Selection */}
                         {setupData.adAccount && (
                           <div>
                             <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                               <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                               Select Campaign
                             </h3>
                             {loadingCampaigns ? (
                               <div className="flex items-center justify-center py-4">
                                 <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                 <span className="ml-2 text-gray-600 text-sm">Loading campaigns...</span>
                               </div>
                             ) : campaigns.length > 0 ? (
                               <div className="space-y-2 max-h-64 overflow-y-auto">
                                 {campaigns.map((campaign) => (
                                   <div
                                     key={campaign.id}
                                     className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md ${
                                       setupData.campaign?.id === campaign.id
                                         ? 'border-orange-500 bg-orange-100 ring-2 ring-orange-500/30'
                                         : 'border-orange-200 hover:border-orange-400 bg-white hover:bg-orange-50'
                                     }`}
                                     onClick={() => handleCampaignSelect(campaign)}
                                   >
                                     <div className="flex items-start justify-between mb-2">
                                       <h4 className="font-medium text-gray-800 text-sm">{campaign.name}</h4>
                                       <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                                           campaign.status === 'active' 
                                             ? 'bg-green-100 text-green-700 border border-green-300' 
                                             : 'bg-orange-100 text-orange-600 border border-orange-300'
                                         }`}>
                                         {campaign.status}
                                       </span>
                                     </div>
                                     <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                                       <div>Budget: ${campaign.dailyBudget}</div>
                                       <div>Leads: {campaign.leads}</div>
                                       <div>CPL: ${campaign.cpl}</div>
                                       <div>Spend: ${campaign.spend}</div>
                                     </div>
                                   </div>
                                 ))}
                               </div>
                             ) : (
                               <div className="text-center py-4 text-gray-600 text-sm">
                                 No campaigns found for this ad account.
                               </div>
                             )}
                           </div>
                         )}
       
                         {!setupData.adAccount && (
                           <div className="text-center py-4 text-gray-600 text-sm">
                             Please select an ad account to view available campaigns.
                           </div>
                         )}
                       </div>
                     )}
                     
                     {currentStep === 2 && (
                       <div className="space-y-6">
                         <CompanyProfileSelector 
                           onSelect={(profile) => {
                             setSetupData(prev => ({ ...prev, companyProfile: profile, avatar: null }));
                           }}
                           selectedProfile={setupData.companyProfile}
                         />
                         
                         {setupData.companyProfile && (
                           <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg shadow-sm">
                             <div className="flex items-center">
                               <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                 <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                               </svg>
                               <span className="text-sm font-medium text-green-800">
                                 Company profile selected: {setupData.companyProfile.name}
                               </span>
                             </div>
                           </div>
                         )}
                         
                         {setupData.companyProfile && (
                           <div className="border-t pt-6">
                             <AvatarSelector 
                               companyProfileId={setupData.companyProfile.profile_id}
                               onSelect={(avatar) => {
                                 setSetupData(prev => ({ ...prev, avatar }));
                               }}
                               selectedAvatar={setupData.avatar}
                             />
                           </div>
                         )}
                       </div>
                     )}
                     
                     {currentStep === 3 && (
                       <div className="space-y-6">
                         <OfferSetup 
                           onComplete={(offer) => {
                             setSetupData(prev => ({ ...prev, offer }));
                             // Automatically advance to name setup section
                             setCurrentStep(4);
                           }}
                           offerData={setupData.offer}
                         />
                       </div>
                     )}
                     
                     {currentStep === 4 && (
                       <div className="space-y-6">
                         {/* Assistant Name Setup */}
                         <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                           <div className="mb-6">
                             <h3 className="text-xl font-bold text-gray-900 mb-2">Name Your AI Assistant</h3>
                             <p className="text-gray-600 text-sm">Give your AI campaign manager a custom name that reflects its purpose</p>
                           </div>
                           
                           <div className="space-y-4">
                             <div>
                               <label htmlFor="assistantName" className="block text-sm font-medium text-gray-700 mb-2">
                                 Assistant Name
                               </label>
                               <input
                                 type="text"
                                 id="assistantName"
                                 value={setupData.assistantName}
                                 onChange={(e) => setSetupData(prev => ({ ...prev, assistantName: e.target.value }))}
                                 placeholder={`${setupData.campaign?.name || 'Campaign'} Assistant`}
                                 className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
                               />
                             </div>
                           </div>
                         </div>
                       </div>
                     )}
                     
                     {currentStep === 5 && (
                       <div className="space-y-6">
                         {/* Automation Overview Section */}
                         <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                           <div className="mb-6">
                             <h3 className="text-xl font-bold text-gray-900 mb-2">Assistant Overview</h3>
                             <p className="text-gray-600 text-sm">Review your complete assistant configuration</p>
                           </div>
                           
                           <div className="space-y-6">
                             {/* Campaign */}
                             <div>
                               <h4 className="font-semibold text-gray-900 mb-2">Campaign</h4>
                               <p className="font-medium text-gray-800">Sample Marketing Campaign</p>
                               <p className="text-sm text-gray-600">Ad Account: Sample Ad Account</p>
                             </div>
                             
                             {/* Brand Profile */}
                             <div>
                               <h4 className="font-semibold text-gray-900 mb-2">Brand Profile</h4>
                               <p className="font-medium text-gray-800">Blayz</p>
                               <p className="text-sm text-gray-600">Avatar: Scaling In-House Marketing Manager</p>
                             </div>
                             

                             
                             {/* Offer */}
                             <div>
                               <h4 className="font-semibold text-gray-900 mb-2">Offer</h4>
                               <p className="font-medium text-gray-800">Ready to Launch!</p>
                               <p className="text-sm text-gray-600">Your AI advisor is fully configured and ready to provide campaign optimization insights.</p>
                             </div>
                             
                             {/* What happens next */}
                             <div>
                               <h4 className="font-semibold text-gray-900 mb-4">What happens next?</h4>
                               <div className="space-y-4">
                                 <div className="flex items-start">
                                   <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                                     <span className="text-sm font-bold text-orange-600">1</span>
                                   </div>
                                   <div>
                                     <p className="font-medium text-gray-800">AI Analysis & Insights</p>
                                     <p className="text-sm text-gray-600">Your AI advisor will analyze campaign performance and provide actionable optimization recommendations</p>
                                   </div>
                                 </div>
                                 <div className="flex items-start">
                                   <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                                     <span className="text-sm font-bold text-orange-600">2</span>
                                   </div>
                                   <div>
                                     <p className="font-medium text-gray-800">Expert Recommendations</p>
                                     <p className="text-sm text-gray-600">Receive intelligent advice on targeting, bidding, and creative strategies based on your data</p>
                                   </div>
                                 </div>
                                 <div className="flex items-start">
                                   <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                                     <span className="text-sm font-bold text-orange-600">3</span>
                                   </div>
                                   <div>
                                     <p className="font-medium text-gray-800">Ongoing Support</p>
                                     <p className="text-sm text-gray-600">Chat with your AI advisor anytime for campaign guidance and optimization tips</p>
                                   </div>
                                 </div>
                               </div>
                             </div>
                           </div>
                         </div>
                         
                         {/* Launch Campaign Section */}
                         <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-6">
                           <div className="text-center mb-6">
                             <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                               <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                                 <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                               </svg>
                             </div>
                             <h3 className="text-2xl font-bold text-gray-900 mb-2">Ready to Launch!</h3>
                             <p className="text-gray-700 mb-6">Your AI advisor is ready to help you optimize your campaigns with expert recommendations.</p>
                           </div>
                           
                           <button 
                             onClick={handleLaunchAssistant}
                             disabled={isLaunching}
                             className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] ${
                               isLaunching 
                                 ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                                 : 'bg-gradient-to-r from-orange-500 to-amber-600 text-white hover:from-orange-600 hover:to-amber-700'
                             }`}
                           >
                             {isLaunching ? (
                               <>
                                 <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                 </svg>
                                 Launching Assistant...
                               </>
                             ) : (
                               '🚀 Launch Assistant'
                             )}
                           </button>
                           
                           <p className="text-center text-sm text-gray-600 mt-4">
                             You can monitor and adjust your assistant settings anytime from the dashboard.
                           </p>
                         </div>
                       </div>
                     )}
                   </div>
                 </div>
               </div>
              
              {/* Navigation */}
              <div className="flex justify-between items-center pt-6 border-t border-gray-100">
                <button
                  onClick={handleBack}
                  disabled={currentStep === 1}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    currentStep === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Back
                </button>
                
                <span className="text-sm text-gray-500">
                  Step {currentStep} of {steps.length}
                </span>
                
                <button
                  onClick={handleNext}
                  disabled={currentStep === steps.length || 
                    (currentStep === 1 && (!setupData.adAccount || !setupData.campaign)) || 
                    (currentStep === 2 && (!setupData.companyProfile || !setupData.avatar)) ||
                    (currentStep === 3 && !setupData.strategy) ||
                    (currentStep === 4 && !setupData.offer) ||
                    (currentStep === 5 && !setupData.assistantName.trim())}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    currentStep === steps.length || 
                    (currentStep === 1 && (!setupData.adAccount || !setupData.campaign)) || 
                    (currentStep === 2 && (!setupData.companyProfile || !setupData.avatar)) ||
                    (currentStep === 3 && !setupData.strategy) ||
                    (currentStep === 4 && !setupData.offer) ||
                    (currentStep === 5 && !setupData.assistantName.trim())
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-orange-500 text-white hover:bg-orange-600'
                  }`}
                >
                  {currentStep === steps.length ? 'Complete' : 'Next'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}