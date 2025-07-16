import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import supabase from '../../lib/supabase.js';
import { fetchWithAuth, getCompanyProfiles, associateProfileToCampaign } from '../../lib/apiClient.js';
import toast from 'react-hot-toast';

export default function ReportsList() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [error, setError] = useState(null);
  const [companyProfiles, setCompanyProfiles] = useState([]);

  // State for the NEW multi-step report generation
  const [isGeneratingFullReport, setIsGeneratingFullReport] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [currentStage, setCurrentStage] = useState('');

  // --- New states for conditional button ---
  const [hasCampaignData, setHasCampaignData] = useState(null); // null initially, then boolean
  const [checkingCampaignData, setCheckingCampaignData] = useState(true);
  const [isSyncingInitialData, setIsSyncingInitialData] = useState(false);
  // --- End new states ---

  // State for progress bar and loading messages (can keep if desired)
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [messageOpacity, setMessageOpacity] = useState(1);
  const [progressValue, setProgressValue] = useState(0);
  
  const loadingMessages = [
    "This may take some minutes...",
    "Sometimes good quality takes some time",
    "Already had coffee? ☕",
    "Crunching the numbers...",
    "Finding actionable insights...",
    "Analyzing ad performance...",
    "Magic happening behind the scenes...",
    "AI is doing its thing...",
    "Almost there!",
    "Analyzing conversion patterns...",
    "Discovering audience trends...",
    "Generating campaign recommendations...",
    "Optimizing insights for your business...",
    "Preparing detailed performance metrics...",
    "Comparing with industry benchmarks...",
    "Reading the digital tea leaves... 🍵",
    "Our AI is writing a masterpiece for you...",
    "Making your data beautiful and insightful...",
    "Good reports are worth waiting for!"
  ];

  // --- New state for ad accounts ---
  const [adAccounts, setAdAccounts] = useState([]);
  const [selectedAdAccount, setSelectedAdAccount] = useState('');
  const [loadingAdAccounts, setLoadingAdAccounts] = useState(true);

  // --- Fetch ad accounts on mount ---
  useEffect(() => {
    async function loadInitialData() {
      setLoadingAdAccounts(true);
      try {
        const accountsRes = await fetchWithAuth('/api/ad-accounts');
        setAdAccounts(accountsRes);
        if (accountsRes.length > 0) {
          setSelectedAdAccount(accountsRes[0].account_id);
        }

        const profilesResponse = await getCompanyProfiles();
        if (profilesResponse && profilesResponse.profiles) {
          const completedProfiles = profilesResponse.profiles.filter(p => p.status === 'completed');
          setCompanyProfiles(completedProfiles);
        }

      } catch (err) {
        setAdAccounts([]);
        console.error('Error fetching initial data:', err);
        setError('Failed to load initial account and profile data.');
      } finally {
        setLoadingAdAccounts(false);
      }
    }
    loadInitialData();
  }, []);

  // --- Fetch campaigns when ad account changes ---
  useEffect(() => {
    if (selectedAdAccount) {
      loadCampaigns(selectedAdAccount);
    } else {
      setCampaigns([]);
      setSelectedCampaign(null);
    }
  }, [selectedAdAccount]);

  // --- Update loadCampaigns to accept adAccountId ---
  async function loadCampaigns(adAccountId) {
    setLoadingCampaigns(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user) {
        setGenerationError('Your session may have expired. Please try logging in again.');
        setCampaigns([]);
        setHasCampaignData(false);
        setLoadingCampaigns(false);
        return; 
      }
      const userId = session.user.id;
      
      // Convert Meta Ad Account ID to internal database ID for campaigns query
      let internalAdAccountId = adAccountId;
      if (adAccountId && adAccountId.startsWith('act_')) {
        // Look up the internal database ID for this Meta Ad Account ID
        const { data: adAccountData, error: adAccountError } = await supabase
          .from('ad_accounts')
          .select('id')
          .eq('user_id', userId)
          .eq('account_id', adAccountId.replace('act_', '')) // Remove 'act_' prefix to match database
          .single();
        
        if (adAccountError || !adAccountData) {
          console.error('Error finding internal ad account ID:', adAccountError);
          setGenerationError('Could not find the selected ad account. Please try refreshing the page.');
          setLoadingCampaigns(false);
          return;
        }
        internalAdAccountId = adAccountData.id;
      }
      
      // Only query if we have a valid ad account ID
      if (!internalAdAccountId) {
        console.warn('No ad account selected, skipping campaigns load');
        setCampaigns([]);
        setHasCampaignData(false);
        setLoadingCampaigns(false);
        return;
      }

      const { data, error: campaignError } = await supabase
        .from('campaigns')
        .select('id, name, meta_campaign_id')
        .eq('user_id', userId)
        .eq('ad_account_id', internalAdAccountId)
        .order('name');
      if (campaignError) throw campaignError;
      setCampaigns(data || []);
      if (data && data.length > 0) {
        // No longer auto-selecting the first campaign
        setHasCampaignData(true);
      } else {
        setHasCampaignData(false);
      }
    } catch (err) {
      setGenerationError(`Failed to load campaigns: ${err.message}. Please ensure you are connected and try again.`);
      setCampaigns([]);
      setHasCampaignData(false);
    } finally {
      setLoadingCampaigns(false);
    }
  }

  // --- Effects for loading messages and progress bar (can be kept/adapted) ---
  useEffect(() => {
    if (!isGeneratingFullReport && !isSyncingInitialData) { // Also check isSyncingInitialData
      setProgressValue(0);
      return;
    }
    
    setProgressValue(5); // Initial progress for any loading state
    
    const progressInterval = setInterval(() => {
      setProgressValue(prevValue => {
        let target = 5;
        if (isGeneratingFullReport) {
            target = currentStage.startsWith('Syn') ? 85 :
                           currentStage.startsWith('Running P') ? 65 :
                           currentStage.startsWith('Running An') ? 45 :
                           currentStage.startsWith('Running T') ? 25 :
                           5;
        } else if (isSyncingInitialData) {
            target = 50; // Or some other appropriate target for initial sync
        }
        const increment = Math.max(0.5, (target - prevValue) * 0.1);
        const newValue = prevValue + increment;
        return newValue < 95 ? newValue : 95;
      });
    }, 500);
    
    const messageInterval = setInterval(() => {
      setMessageOpacity(0);
      setTimeout(() => {
        setLoadingMessageIndex((prevIndex) => 
          (prevIndex + 1) % loadingMessages.length
        );
        setMessageOpacity(1);
      }, 500);
    }, 4000);
    
    return () => {
      clearInterval(messageInterval);
      clearInterval(progressInterval);
    };
  }, [isGeneratingFullReport, isSyncingInitialData, currentStage, loadingMessages.length]);
  
  // --- Effect to check for existing campaign data on mount ---
  useEffect(() => {
    async function checkInitialCampaignData() {
      setCheckingCampaignData(true);
      setGenerationError(null); // Clear previous errors
      try {
        const backendApiUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
        if (!backendApiUrl) {
          throw new Error("Backend API URL is not configured.");
        }
        // Correctly await getSession and access the token
        const sessionData = await supabase.auth.getSession();
        const userAuthToken = sessionData?.data?.session?.access_token;

        if (!userAuthToken) {
          // Handle case where user is not logged in or token is unavailable
          // This might happen if the initial session load in _app.js hasn't completed
          // or if the user is genuinely logged out.
          console.warn("[Reports Page] No auth token found during initial campaign check. User might be logged out or session not yet ready.");
          setHasCampaignData(false); // Assume no data if no token
          // Optionally, you could set an error message or guide user to log in
          // setGenerationError("User session not found. Please log in.");
          return; // Exit early
        }

        const response = await fetch(`${backendApiUrl}/api/v1/data-status/campaigns-exist`, {
          headers: {
            'Authorization': `Bearer ${userAuthToken}`,
          }
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || `Failed to check campaign status: ${response.statusText}`);
        }
        const data = await response.json();
        setHasCampaignData(data.campaigns_exist);
        if (data.campaigns_exist) {
          loadCampaigns(selectedAdAccount); // If campaigns exist, load them
        }
      } catch (err) {
        console.error('Error checking campaign data:', err);
        setGenerationError(`Failed to check campaign data: ${err.message}. You might need to connect your Meta account or try syncing manually if the issue persists.`);
        setHasCampaignData(false); // Assume no data on error, or user has to manually sync
      } finally {
        setCheckingCampaignData(false);
      }
    }
    checkInitialCampaignData();
  }, [selectedAdAccount]); // Run once on mount
  
  // --- Function to load reports for a selected campaign ---
  const loadReports = useCallback(async (campaignIdToLoad, forceRefresh = false) => {
    if (!campaignIdToLoad) {
      setReports([]); // Clear reports if no campaign is selected
      return;
    }
    setLoadingReports(true);
    if (!forceRefresh) {
      setGenerationError(null); // Clear previous errors specific to report list loading
    }
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user) {
        console.warn('Error loading reports: User not authenticated or session expired.', sessionError);
        if (!forceRefresh) {
          setGenerationError('Your session may have expired. Please log in again to view reports.');
        }
        setReports([]);
        setLoadingReports(false);
        return;
      }
      const userId = session.user.id;

      console.log(`[Reports Page] Loading reports for campaignId: ${campaignIdToLoad}, userId: ${userId}${forceRefresh ? ' (force refresh)' : ''}`);
      
      // Build query with cache busting if force refresh
      let query = supabase
        .from('campaign_reports')
        .select('id, report_date, created_at') // Adjust fields as needed
        .eq('campaign_id', campaignIdToLoad)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // Add cache busting for force refresh
      if (forceRefresh) {
        // Add a random parameter to bust any caching
        query = query.limit(1000); // Set reasonable limit
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading reports:', error);
        throw error; // Let the main catch handle it for user message
      }
      setReports(data || []);
      console.log(`[Reports Page] Loaded ${data?.length || 0} reports${forceRefresh ? ' (force refresh)' : ''}.`);

    } catch (err) {
      console.error('Error in loadReports:', err);
      if (!forceRefresh) {
        setGenerationError(`Failed to load reports: ${err.message}. Please try again.`);
      }
      setReports([]); // Clear reports on error
    } finally {
      setLoadingReports(false);
    }
  }, [supabase, setReports, setLoadingReports, setGenerationError]); // Added dependencies

  // --- Effect to load reports when selectedCampaign changes ---
  useEffect(() => {
    if (selectedCampaign) {
      loadReports(selectedCampaign.id);
    }
  }, [selectedCampaign, loadReports]); // Dependency on selectedCampaign AND loadReports

  // --- Report Generation Handler (Direct Supabase Edge Functions) ---
  const handleGenerateFullReport = async () => {
    console.log("[Report Gen] Starting simplified report generation...");
    if (!selectedCampaign || !selectedCampaign.id) {
      setGenerationError('Please select a Campaign.');
      return;
    }

    console.log(`[Report Gen] Using 90-day analysis period for campaign: ${selectedCampaign.id}`);
    console.log(`[Report Gen] Using internal Edge Functions (no timeout limits)`);

    setIsGeneratingFullReport(true);
    setGenerationError(null);
    setCurrentStage('Initializing report generation...'); 
    setProgressValue(10);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('User session not found. Please log in again.');
      }
      const userId = session.user.id;

      // Simplified payload - only campaignId and userId required
      const reportPayload = {
        campaignId: selectedCampaign.id,
        userId,
        numDays: 90  // 90-day analysis period
      };

      console.log('[Report Gen] Calling get-synthesized-report directly (bypassing Netlify proxy)...');
      setCurrentStage('Generating comprehensive analysis...');
      setProgressValue(25);

      // Call Supabase Edge Function directly to avoid Netlify timeout
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const edgeUrl = `${supabaseUrl}/functions/v1/get-synthesized-report`;

      console.log(`[Report Gen] Calling Edge Function directly: ${edgeUrl}`);

      const response = await fetch(edgeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          // No X-Shared-Secret header - using user authentication for direct calls
        },
        body: JSON.stringify(reportPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Report Gen] Direct Edge Function call failed:', errorText);
        throw new Error(`Report generation failed: ${response.status} ${errorText.substring(0, 200)}`);
      }

      const synthesizeResult = await response.json();
      console.log('[Report Gen] Report synthesis completed:', synthesizeResult);

      setCurrentStage('Report Complete!');
      setProgressValue(100);
      
      // Enhanced report polling mechanism for reliable report display
      if (synthesizeResult?.report_id) {
        await pollForNewReport(selectedCampaign.id, synthesizeResult.report_id);
      } else {
        // Fallback: just reload reports
        setTimeout(() => loadReports(selectedCampaign.id, true), 2000);
      }

    } catch (err) {
      console.error("[Report Gen] Error in simplified report generation:", err);
      setGenerationError(err.message || 'An unexpected error occurred during report generation.');
      setCurrentStage('Error');
      setProgressValue(0);
    } finally {
      setIsGeneratingFullReport(false);
    }
  };

  // New function to poll for the newly generated report
  const pollForNewReport = async (campaignId, expectedReportId, maxAttempts = 10, delayMs = 1000) => {
    console.log(`[Report Polling] Starting polling for report ${expectedReportId}...`);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`[Report Polling] Attempt ${attempt}/${maxAttempts} - Loading reports...`);
        
        // Reload reports list with force refresh to bypass cache
        await loadReports(campaignId, true);
        
        // Check if the new report appears in the list
        if (expectedReportId) {
          const foundReport = reports.find(report => report.id === expectedReportId);
          if (foundReport) {
            console.log(`[Report Polling] Found new report ${expectedReportId} on attempt ${attempt}`);
            return; // Success - report found
          }
        } else {
          // If no specific report ID, just wait a bit for the list to update
          if (attempt >= 3) {
            console.log(`[Report Polling] No specific report ID, but waited ${attempt} attempts`);
            return;
          }
        }
        
        // Wait before next attempt (exponential backoff)
        const waitTime = delayMs * Math.pow(1.2, attempt - 1);
        console.log(`[Report Polling] Report not found yet, waiting ${waitTime}ms before next attempt...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
      } catch (error) {
        console.error(`[Report Polling] Error during attempt ${attempt}:`, error);
        // Continue trying even if one attempt fails
      }
    }
    
    console.warn(`[Report Polling] Could not find report ${expectedReportId} after ${maxAttempts} attempts`);
    // Do one final reload with force refresh
    await loadReports(campaignId, true);
  };

  // --- NEW: Handler to fetch initial campaign data ---
  const handleGetCampaignData = async () => {
    console.log("[Data Sync] Starting handleGetCampaignData...");
    if (!supabase) {
      setGenerationError("Supabase client not available.");
      return;
    }
    if (!selectedAdAccount) {
      setGenerationError("Please select an ad account before syncing.");
      return;
    }
    setIsSyncingInitialData(true);
    setGenerationError('');
    setCurrentStage('Syncing Meta account data...'); // Generic message for initial sync
    setProgressValue(0);

    let userAuthToken = null;

    try {
      // Get user session token
      console.log("[Data Sync] Fetching user session...");
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData?.session?.access_token) {
        console.error("[Data Sync] User session fetch error:", sessionError);
        throw new Error(sessionError?.message || 'Could not retrieve user session. Please log in again.');
      }
      userAuthToken = sessionData.session.access_token;

      // Call the backend sync endpoint
      const syncEndpoint = '/api/proxy-sync-meta';  // Updated to use secure proxy
      console.log(`[Data Sync] >>> Calling backend sync endpoint: ${syncEndpoint}`);
      
      const response = await fetch(syncEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userAuthToken}`,
        },
        body: JSON.stringify({
          user_id: sessionData.session.user.id,
          ad_account_id: selectedAdAccount // Always use the dropdown value
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("[Data Sync] Sync endpoint error:", errorData);
        throw new Error(errorData.detail || `Failed to sync Meta data: ${response.statusText}`);
      }

      const result = await response.json();
      console.log("[Data Sync] Sync successful:", result);
      // alert("Campaign data synced successfully! Campaigns list will refresh."); // Optional: user feedback
      await loadCampaigns(selectedAdAccount); // Reload campaigns to update the list and hasCampaignData state

    } catch (err) {
      console.error("[Data Sync] Error in handleGetCampaignData:", err);
      setGenerationError(err.message || 'An unexpected error occurred while syncing data.');
    } finally {
      setIsSyncingInitialData(false);
      setCurrentStage('');
      setProgressValue(0); // Reset progress
    }
  };

  // --- Helper Functions ---
  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
      return 'Invalid Date';
    }
  }

  function getCampaignName(campaignId, campaignsList = campaigns) {
    if (!campaignsList || campaignsList.length === 0) return 'Unknown Campaign';
    const campaign = campaignsList.find(c => c.id === campaignId);
    return campaign ? campaign.name : 'Unknown Campaign';
  }
  
  const handleProfileSelection = async (campaignId, profileId) => {
    const originalCampaigns = [...campaigns];
    
    // Update the campaigns list
    const updatedCampaigns = campaigns.map(c => 
      c.id === campaignId ? { ...c, company_profile_id: profileId } : c
    );
    setCampaigns(updatedCampaigns);

    // Update the selected campaign state to reflect the new profile
    setSelectedCampaign(prevCampaign => ({
      ...prevCampaign,
      company_profile_id: profileId
    }));

    const promise = associateProfileToCampaign(campaignId, profileId);

    toast.promise(promise, {
      loading: 'Linking profile to campaign...',
      success: (data) => {
        if (data.success) {
          return 'Profile linked successfully!';
        } else {
          // Revert changes on failure
          setCampaigns(originalCampaigns);
          setSelectedCampaign(prevCampaign => ({
            ...prevCampaign,
            company_profile_id: prevCampaign.company_profile_id
          }));
          throw new Error(data.message || 'Failed to link profile.');
        }
      },
      error: (err) => {
        // Revert changes on error
        setCampaigns(originalCampaigns);
        setSelectedCampaign(prevCampaign => ({
          ...prevCampaign,
          company_profile_id: prevCampaign.company_profile_id
        }));
        return `Error: ${err.toString()}`;
      }
    });
  };

  // --- RENDER CAMPAIGN LIST ---
  const renderCampaignsList = () => {
    if (loadingCampaigns) {
      return <div className="text-center py-8"><p className="text-gray-500">Loading campaigns...</p></div>;
    }

    if (!selectedAdAccount) {
      return null; // Don't render if no ad account is selected
    }

    if (campaigns.length === 0) {
      return (
        <div className="text-center bg-gray-50 p-6 rounded-lg mt-4 border border-dashed">
          <h3 className="text-md font-semibold text-gray-700">No Campaigns Found</h3>
          <p className="text-gray-500 mt-1 text-sm">Please select a different ad account or sync your data.</p>
        </div>
      );
    }

    return (
      <div className="mt-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Select Campaign
          </label>
          <div className="relative mt-1">
            <select
              className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary/20 transition-all py-3 px-4 bg-white text-gray-700 appearance-none"
              value={selectedCampaign ? selectedCampaign.id : ''}
              onChange={(e) => {
                const campaign = campaigns.find(c => c.id === e.target.value);
                setSelectedCampaign(campaign || null);
              }}
              disabled={loadingCampaigns || isGeneratingFullReport || isSyncingInitialData || !selectedAdAccount}
            >
              <option value="" disabled>Select a campaign...</option>
              {campaigns.map(campaign => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
            </div>
          </div>
        </div>

        {selectedCampaign && (
          <div className="pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Associate Company Profile (Optional)
            </label>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-800">{selectedCampaign.name}</span>
              <div className="w-1/2 max-w-xs">
                <select
                  value={selectedCampaign.company_profile_id || ''}
                  onChange={(e) => handleProfileSelection(selectedCampaign.id, e.target.value)}
                  className="block w-full pl-3 pr-10 py-1.5 text-sm border-gray-300 focus:outline-none focus:ring-primary focus:border-primary rounded-md shadow-sm"
                  disabled={companyProfiles.length === 0}
                >
                  <option value="">{companyProfiles.length > 0 ? 'Choose a profile...' : 'No profiles found'}</option>
                  {companyProfiles.map(profile => (
                    <option key={profile.profile_id} value={profile.profile_id}>
                      {profile.company_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500">Linking a profile gives the AI better context for analysis.</p>
          </div>
        )}
      </div>
    );
  };

  // --- Render Logic ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Top wave decoration */}
      <div className="absolute top-0 left-0 right-0 h-64 overflow-hidden -z-10 opacity-70">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" className="w-full h-full">
          <path fill="#FFF5E9" fillOpacity="1" d="M0,224L48,213.3C96,203,192,181,288,160C384,139,480,117,576,122.7C672,128,768,160,864,186.7C960,213,1056,235,1152,213.3C1248,192,1344,128,1392,96L1440,64L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"></path>
        </svg>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 relative">
        {/* Header section */}
        <div className="max-w-3xl mx-auto mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-secondary mb-4 tracking-tight">
            Campaign Reports
            <span className="block text-primary mt-1 text-5xl md:text-6xl">Insights</span>
          </h1>
          <p className="mt-3 max-w-md mx-auto text-xl text-gray-600">
            Discover actionable insights to optimize your ad campaigns.
          </p>
        </div>
        
        {error && (
          <div className="max-w-3xl mx-auto mb-8 flex p-4 text-red-800 rounded-lg bg-red-50 border-l-4 border-red-500" role="alert">
            <svg className="flex-shrink-0 w-5 h-5 mr-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM10 15a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm1-4a1 1 0 0 1-2 0V6a1 1 0 0 1 2 0v5Z"/>
            </svg>
            <span className="font-medium">{error}</span>
          </div>
        )}
        
        {/* Card section with max width for better readability */}
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Generate Report Card */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden transform transition-all">
            {/* Card Header */}
            <div className="relative overflow-hidden">
              <div className="bg-gradient-to-r from-primary/90 to-primary px-8 py-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Generate New Report</h2>
                    <p className="mt-1 text-white/90">
                      AI-powered analysis of your campaign performance
                    </p>
                  </div>
                  <div className="hidden sm:block">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-white/20" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V8z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
              
              {/* Decorative pattern */}
              <div className="absolute top-0 right-0 -mt-6 -mr-6 h-24 w-24 rounded-full bg-white/10 blur-xl"></div>
              <div className="absolute bottom-0 left-0 -mb-6 -ml-6 h-16 w-16 rounded-full bg-white/10 blur-xl"></div>
            </div>
            
            {/* Card Body */}
            <div className="px-8 py-6">
              <div className="grid sm:grid-cols-4 gap-6">
                <div className="sm:col-span-3">
                  {/* Ad Account Dropdown */}
                  <div className="space-y-3 mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Select Ad Account
                    </label>
                    <div className="relative">
                      <select
                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary/20 transition-all py-3 px-4 bg-white text-gray-700 appearance-none"
                        value={selectedAdAccount}
                        onChange={e => setSelectedAdAccount(e.target.value)}
                        disabled={loadingAdAccounts || isGeneratingFullReport || isSyncingInitialData}
                      >
                        <option value="" disabled>Select an ad account</option>
                        {adAccounts.map(account => (
                          <option key={account.id} value={account.account_id}>
                            {account.name} ({account.account_id})
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-700">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  {/* Existing Campaign Dropdown (disabled if no ad account) */}
                  {loadingCampaigns ? (
                    <div className="flex items-center space-x-3 bg-gray-50 p-4 rounded-lg animate-pulse">
                      <div className="w-6 h-6 bg-gray-300 rounded-full animate-spin"></div>
                      <span className="text-gray-600">Loading campaigns...</span>
                    </div>
                  ) : campaigns.length > 0 ? (
                    renderCampaignsList()
                  ) : (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                      <div className="flex items-start">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 mt-0.5 mr-3" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <p className="text-sm text-gray-700">
                          Using demo data for campaign analysis. This gives you a sample of the insights you'll get from your own campaigns.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Conditional Button Area */}
                <div className="sm:col-span-1 flex items-center h-full">
                  {checkingCampaignData ? (
                    <button
                      type="button"
                      className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-400 cursor-not-allowed"
                      disabled
                    >
                      Loading campaign status...
                    </button>
                  ) : hasCampaignData === false ? (
                    <button
                      type="button"
                      onClick={handleGetCampaignData}
                      className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${isSyncingInitialData || !selectedAdAccount ? 'bg-indigo-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500`}
                      disabled={isSyncingInitialData || !selectedAdAccount}
                    >
                      {isSyncingInitialData ? 'Syncing Campaign Data...' : 'Get Campaign Data'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleGenerateFullReport}
                      className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${isGeneratingFullReport ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                      disabled={isGeneratingFullReport || !selectedCampaign || loadingCampaigns || !selectedAdAccount}
                    >
                      {isGeneratingFullReport ? `Processing: ${currentStage}` : 'Generate Full Report'}
                    </button>
                  )}
                </div>
              </div>
              
              {isGeneratingFullReport && (
                <div className="mt-12 mb-6 relative">
                  {/* Custom spinner with brand colors */}
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="relative animate-pulse-slow">
                      <div className="w-24 h-24 rounded-full border-t-4 border-b-4 border-primary animate-spin"></div>
                      <div className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-white shadow-inner"></div>
                      </div>
                      <div className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 animate-ping"></div>
                      </div>
                      <div className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 0116 0zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    
                    <div className="mt-4 text-center">
                      <p 
                        className="text-gray-700 text-lg font-semibold transition-opacity duration-500 ease-in-out"
                        style={{ opacity: messageOpacity }}
                      >
                        {loadingMessages[loadingMessageIndex]}
                      </p>
                      {currentStage && currentStage !== 'Initializing...' && currentStage !== 'Report Complete!' && currentStage !== 'Error' && (
                        <p className="text-sm text-primary mt-2">
                           {currentStage}
                        </p>
                      )}
                    </div>
                    
                    {/* Progress steps */}
                    <div className="w-full max-w-md mt-10">
                      <div className="relative">
                        <div className="overflow-hidden h-2 text-xs flex rounded-full bg-gray-200">
                          <div 
                            className="shadow-lg rounded-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-300 ease-out relative flex items-center justify-center"
                            style={{ width: `${progressValue}%` }}
                          >
                            <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse"></div>
                          </div>
                        </div>
                        
                        {/* Step indicators and labels container */}
                        <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                          {/* Step 1 */}
                          <div className="flex flex-col items-center w-1/3">
                            <div className={`rounded-full h-6 w-6 flex items-center justify-center ${
                              progressValue >= 0 && progressValue < 33 ? 'bg-primary text-white animate-pulse' : 
                              progressValue >= 33 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'
                            }`}>
                              <span className="text-xs font-medium">1</span>
                            </div>
                            <span className="mt-1 text-center">Collecting data</span>
                          </div>

                          {/* Step 2 */}
                          <div className="flex flex-col items-center w-1/3">
                            <div className={`rounded-full h-6 w-6 flex items-center justify-center ${
                              progressValue >= 33 && progressValue < 66 ? 'bg-primary text-white animate-pulse' :
                              progressValue >= 66 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'
                            }`}>
                              <span className="text-xs font-medium">2</span>
                            </div>
                            <span className="mt-1 text-center">Analyzing</span>
                          </div>

                          {/* Step 3 */}
                          <div className="flex flex-col items-center w-1/3">
                            <div className={`rounded-full h-6 w-6 flex items-center justify-center ${
                              progressValue >= 66 && progressValue <= 100 ? 'bg-primary text-white animate-pulse' :
                              progressValue > 99 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'
                            }`}>
                              <span className="text-xs font-medium">3</span>
                            </div>
                            <span className="mt-1 text-center">Generating</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Previous Reports Card */}
          {selectedCampaign && (
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-[#1E293B] to-[#334155] px-8 py-6 text-white">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-white">
                    {getCampaignName(selectedCampaign.id)} <span className="text-primary">Reports</span>
                  </h2>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => loadReports(selectedCampaign.id, true)}
                      disabled={loadingReports}
                      className="flex items-center px-3 py-1 bg-white/10 hover:bg-white/20 rounded-md text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Refresh reports list"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 mr-1 ${loadingReports ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh
                    </button>
                    <span className="bg-primary/20 text-white px-3 py-1 rounded-full text-xs font-medium">
                      Campaign Selected
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="p-8">
                {loadingReports ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="ml-3 text-gray-500">Loading reports...</span>
                  </div>
                ) : reports.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-12 px-4">
                    <div className="bg-primary/10 rounded-full p-4 mb-6">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Reports Found</h3>
                    <p className="text-gray-600 max-w-md">
                      Generate your first report for this campaign to get started with AI-powered insights and recommendations.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reports.map(report => (
                      <div key={report.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-sm transition-all duration-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="flex-shrink-0 h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm2 10a1 1 0 10-2 0v3a1 1 0 102 0v-3zm2-3a1 1 0 011 1v5a1 1 0 11-2 0v-5a1 1 0 011-1zm4-1a1 1 0 10-2 0v7a1 1 0 102 0V8z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <h3 className="text-sm font-semibold text-gray-900">
                                  Generated on {formatDate(report.report_date)}
                                </h3>
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                  Report #{report.id.substring(0, 8)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">
                                Campaign performance analysis and insights
                              </p>
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            <Link href={`/reports/${report.id}`} legacyBehavior>
                              <a className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                </svg>
                                View Report
                              </a>
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Footer decoration */}
      <div className="absolute bottom-0 left-0 right-0 h-32 overflow-hidden -z-10 opacity-70">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" className="w-full h-full">
          <path fill="#FFF5E9" fillOpacity="1" d="M0,224L48,213.3C96,203,192,181,288,160C384,139,480,117,576,122.7C672,128,768,160,864,186.7C960,213,1056,235,1152,213.3C1248,192,1344,128,1392,96L1440,64L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
        </svg>
      </div>
    </div>
);
}