import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import supabase from '../../lib/supabase.js'; // Import the client instance directly
import Button from '../../components/UI/Button';

const AccountsPage = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false); // For general loading states
  const [isConnected, setIsConnected] = useState(false); // True if Meta connection exists
  const [adAccounts, setAdAccounts] = useState([]); // Stores fetched ad accounts
  const [error, setError] = useState(null); // Stores error messages
  const [successMessage, setSuccessMessage] = useState(null); // Stores success messages
  
  // State specifically for the OAuth & processing flow
  const [isProcessing, setIsProcessing] = useState(false); // Tracks if token exchange/storage is active
  const [fbAuthCode, setFbAuthCode] = useState(null); // Stores code from Meta OAuth
  const [fbAccessToken, setFbAccessToken] = useState(null); // Stores token from Supabase OAuth
  
  const hasFetched = useRef(false);
  
  // --- Logging Helper --- (Optional, but useful for debugging)
  const log = (message) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[AccountsPage] ${message}`);
    }
  };

  // --- Initial Check & Auto-Processing ---
  useEffect(() => {
    const log = (message, data) => console.log(`[Accounts Page] ${new Date().toISOString()}: ${message}`, data || '');
    
    // Welcome message for first-time users, separate from connection logic
    if (router.query.first_time === 'true') {
        log('First-time user detected, showing welcome message.');
        setSuccessMessage('Welcome! Please connect your Meta account to get started.');
        // Clear the query param from the URL
        router.replace('/accounts', undefined, { shallow: true });
    }

    // This function will now orchestrate the entire connection process
    const handlePotentialConnection = async () => {
      // Only run auto-processing if the flag is present and we aren't already working.
      if (router.query.auto !== 'true' || isProcessing) {
        if (isProcessing) log('Skipping connection handle, already in progress.');
        return;
      }
      
      log('Auto-processing flag detected, starting connection attempt...');
      setIsProcessing(true); // Lock to prevent re-runs

      // --- Token Discovery ---
      let providerToken = null;
      const storedToken = localStorage.getItem('pending_meta_provider_token');
      
      if (storedToken) {
        log(`Found stored provider token from auth callback: ${storedToken.substring(0, 15)}...`);
        providerToken = storedToken;
        // Important: Clear the token immediately after reading it.
        localStorage.removeItem('pending_meta_provider_token');
      } else {
        log('No pending provider token found in localStorage, checking current session...');
        
        // Check if the current session has a provider token
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.provider_token) {
            log(`Found provider token in current session: ${session.provider_token.substring(0, 15)}...`);
            providerToken = session.provider_token;
          } else {
            log('No provider token found in current session either.');
          }
        } catch (err) {
          log(`Error checking session for provider token: ${err.message}`);
        }
      }
      
      // --- Processing ---
      if (providerToken) {
        try {
          log('Fetching Meta User ID using the discovered provider token...');
          const meResponse = await fetch(`https://graph.facebook.com/v19.0/me?fields=id&access_token=${providerToken}`);
          if (!meResponse.ok) {
            const errorText = await meResponse.text();
            throw new Error(`Failed to fetch Meta User ID. Status: ${meResponse.status}. Body: ${errorText}`);
          }
          const meData = await meResponse.json();
          if (!meData.id) throw new Error('Could not retrieve Meta User ID from token.');
          
          log(`Meta User ID retrieved: ${meData.id}. Proceeding to process connection.`);
          await processMetaConnection(null, { token: providerToken, metaUserId: meData.id });
        } catch (err) {
          log(`Error during token-to-user-ID exchange: ${err.message}`);
          setError(`Failed to prepare Meta connection: ${err.message}`);
          setIsProcessing(false); // Unlock on failure
        }
      } else {
        setError('Connection process started, but no Meta authorization token was found. Please try again.');
        setIsProcessing(false); // Unlock if no token
      }
      
      // --- Cleanup URL ---
      // Clean the "auto=true" from the URL without reloading the page
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.delete('auto');
      router.replace(currentUrl.pathname + currentUrl.search + currentUrl.hash, undefined, { shallow: true });
    };

    handlePotentialConnection();

    // The existing fetchAdAccounts() is called here on initial load, which is correct.
    // If there's no active session, we show the connect button.
    // If there is a session, we try to fetch accounts.
    if (!hasFetched.current) {
        fetchAdAccounts();
        hasFetched.current = true;
    }
    
    // This effect should primarily react to the router query changing.
  }, [router.query]);

  // --- Main Function to Handle Connection (Called by Auto-Processing) ---
  const processMetaConnection = async (authCode, directTokenData) => {
    log('=== META CONNECTION PROCESSING ===');
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (!authCode && !directTokenData) {
        throw new Error('No authorization code or token data provided');
      }

      const payload = {};
      
      if (authCode) {
        // Standard OAuth flow - exchange code for token
        log(`Processing OAuth code: ${authCode?.substring(0, 10)}...`);
        payload.code = authCode;
        payload.redirectUri = `${window.location.origin}/accounts?auto=true`;
      } else if (directTokenData) {
        // Direct token flow - use provided token (from Supabase OAuth)
        log('Processing direct token data (from Supabase OAuth)');
        payload.directToken = directTokenData.token;
        payload.metaUserId = directTokenData.metaUserId;
      }

      log('Payload for edge function:', { 
        hasCode: !!payload.code, 
        hasDirectToken: !!payload.directToken,
        hasMetaUserId: !!payload.metaUserId
      });

      // Get session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }

      const functionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/exchange-meta-token`;
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(payload)
      });

      log(`Edge function response status: ${response.status}`);
      const result = await response.json();
      log(`Edge function result:`, result);

      if (!response.ok || !result.success) {
        throw new Error(result.error || result.message || 'Failed to process Meta connection');
      }

      setSuccessMessage('Meta account connected successfully!');
      await fetchAdAccounts();
      
      // NEW: Send registration event to Meta CAPI if this was a signup attempt
      const isSignupAttempt = localStorage.getItem('meta_signup_attempt') === 'true';
      if (isSignupAttempt) {
        log('Signup attempt detected - sending CAPI registration event');
        
        // Clear the signup attempt flag
        localStorage.removeItem('meta_signup_attempt');
        
        fetch('/api/send-conversion-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventName: 'CompleteRegistration',
            email: session.user.email, // For hashed matching
            fbclid: localStorage.getItem('meta_fbclid') // Use stored fbclid for attribution
          })
        })
        .then(response => response.json())
        .then(result => {
          log('CAPI registration event result:', result);
          if (result.success) {
            log('✅ Registration event sent successfully to Meta');
          } else {
            log('❌ Failed to send registration event:', result);
          }
        })
        .catch(err => {
          log('❌ Failed to send CAPI registration event:', err);
        });
      }
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);

    } catch (err) {
      log(`Error in processMetaConnection: ${err.message}`);
      setError(`Failed to connect Meta account: ${err.message}`);
      await fetchAdAccounts(); // Try to fetch anyway
    } finally {
      setIsProcessing(false);
      setIsLoading(false);
      // Clean up URL
      router.replace('/accounts', undefined, { shallow: true });
    }
  };

  // --- Function to Initiate Supabase OAuth Flow ---
  const handleConnectMeta = async () => {
    setError(null);
    setIsLoading(true);

    try {
      log('Starting Supabase Meta OAuth flow...');
      
      // Add auto=true parameter to trigger auto-processing on return
      const redirectUrl = `${window.location.origin}/accounts?auto=true`;
      log(`Using redirectTo with auto flag: ${redirectUrl}`);
      
      // Use Supabase OAuth for Meta/Facebook
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: redirectUrl,
          scopes: 'ads_management,ads_read,business_management'
        }
      });

      if (error) {
        throw new Error(error.message);
      }
      
      log('Supabase OAuth initiated successfully');
      // The page will redirect, so no need to set isLoading to false

    } catch (err) {
      log(`Error starting Supabase Meta OAuth flow: ${err.message}`);
      setError('Failed to start Meta connection process. Please try again.');
      setIsLoading(false);
    }
  };

  // --- Fetch Ad Accounts from DB ---
  const fetchAdAccounts = async () => {
  setIsLoading(true);
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError('Authentication required');
      setIsConnected(false);
      return;
    }
    const { data, error } = await supabase
      .from('ad_accounts')
      .select('*')
      .eq('user_id', session.user.id);
    if (error) throw error;
    setAdAccounts(data || []);
    setIsConnected(data && data.length > 0);
  } catch (error) {
    console.error('Error fetching ad accounts:', error);
    setError('Failed to fetch ad accounts from Supabase.');
    setIsConnected(false);
  } finally {
    setIsLoading(false);
  }
};

  // --- Sync Campaign Data ---
  const handleSyncCampaigns = async () => {
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);
    log('Syncing campaign data from Meta...');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required. Please log in.');
      }

      // Call the three separate edge functions instead of sync-meta-data
      log('Calling sync functions...');
      
      // URLs for the three sync functions
      const campaignsUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sync-campaigns`;
      const adSetsUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sync-ad-sets`;
      const adsUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sync-ads`;
      
      // Common request options
      const requestOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({})
      };
      
      // Call sync-campaigns
      log('Syncing campaigns...');
      const campaignsResponse = await fetch(campaignsUrl, requestOptions);
      const campaignsResult = await campaignsResponse.json();
      
      if (!campaignsResponse.ok) {
        throw new Error(campaignsResult.error || 'Failed to sync campaigns');
      }
      
      // Call sync-ad-sets
      log('Syncing ad sets...');
      const adSetsResponse = await fetch(adSetsUrl, requestOptions);
      const adSetsResult = await adSetsResponse.json();
      
      if (!adSetsResponse.ok) {
        throw new Error(adSetsResult.error || 'Failed to sync ad sets');
      }
      
      // Call sync-ads
      log('Syncing ads...');
      const adsResponse = await fetch(adsUrl, requestOptions);
      const adsResult = await adsResponse.json();
      
      if (!adsResponse.ok) {
        throw new Error(adsResult.error || 'Failed to sync ads');
      }

      log('Campaign sync complete for all data types');
      setSuccessMessage('Campaign data successfully synced: campaigns, ad sets, and ads');
      
      // Refresh ad accounts after sync (optional)
      await fetchAdAccounts();
      
    } catch (err) {
      log(`Error syncing campaigns: ${err.message}`);
      setError(`Failed to sync campaign data: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // --- Render Functions ---
  
  // Render the table of ad accounts
  const renderAdAccounts = () => {
    // Show loading indicator specifically for the table if loading AND connected
     if (isLoading && isConnected && adAccounts.length === 0) {
       return (
         <div className="mt-8 text-center text-gray-500">Loading ad accounts...</div>
       );
     }
     
    if (!isConnected || adAccounts.length === 0) return null; // Don't render if not connected or no accounts

    return (
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Your Connected Ad Accounts</h2>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {/* Add relevant columns */}
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Name</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account ID</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Currency</th>
                 {/* Add Business Name if desired */}
                 {/* <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Business</th> */}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {adAccounts.map((account) => (
                <tr key={account.id || account.account_id}> {/* Use unique key */}
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{account.name}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{account.account_id}</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      account.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                      account.status === 'DISABLED' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {account.status || 'UNKNOWN'}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{account.currency}</td>
                  {/* Render Business Name if column added */}
                  {/* <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{account.business_name || '-'}</td> */}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };
  
  // Main page render
  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
      <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">Ad Accounts</h1>
          {isConnected && (
            <Button 
              onClick={fetchAdAccounts} 
              disabled={isLoading || isProcessing}
              className="transition-all duration-300 hover:shadow-md flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              Refresh Accounts
            </Button>
          )}
      </div>
        
        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg shadow-sm animate-fadeIn">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">{successMessage}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg shadow-sm animate-fadeIn">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Main Connection Box */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100 transition-all duration-300 hover:shadow-xl">
          {/* Show loading indicator if processing OAuth or fetching initial state */}
          {(isLoading || isProcessing) && !isConnected ? (
            <div className="flex justify-center items-center py-10">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 50 50" className="text-primary/30 fill-current">
                    <path d="M47.3,21.01c-0.58-1.6-1.3-3.16-2.24-4.66c-0.93-1.49-2.11-2.93-3.63-4.13c-1.51-1.19-3.49-2.09-5.59-2.26l-0.78-0.04c-0.27,0.01-0.57,0.01-0.85,0.04c-0.57,0.06-1.11,0.19-1.62,0.34c-1.03,0.32-1.93,0.8-2.72,1.32c-1.42,0.94-2.55,2.03-3.57,3.15c0.01,0.02,0.03,0.03,0.04,0.05l0.22,0.28c0.51,0.67,1.62,2.21,2.61,3.87c1.23-1.2,2.83-2.65,3.49-3.07c0.5-0.31,0.99-0.55,1.43-0.68c0.23-0.06,0.44-0.11,0.64-0.12c0.1-0.02,0.19-0.01,0.3-0.02l0.38,0.02c0.98,0.09,1.94,0.49,2.85,1.19c1.81,1.44,3.24,3.89,4.17,6.48c0.95,2.6,1.49,5.44,1.52,8.18c0,1.31-0.17,2.57-0.57,3.61c-0.39,1.05-1.38,1.45-2.5,1.45c-1.63,0-2.81-0.7-3.76-1.68c-1.04-1.09-2.02-2.31-2.96-3.61c-0.78-1.09-1.54-2.22-2.26-3.37c-1.27-2.06-2.97-4.67-4.15-6.85L25,16.35c-0.31-0.39-0.61-0.78-0.94-1.17c-1.11-1.26-2.34-2.5-3.93-3.56c-0.79-0.52-1.69-1-2.72-1.32	c-0.51-0.15-1.05-0.28-1.62-0.34c-0.18-0.02-0.36-0.03-0.54-0.03c-0.11,0-0.21-0.01-0.31-0.01l-0.78,0.04	c-2.1,0.17-4.08,1.07-5.59,2.26c-1.52,1.2-2.7,2.64-3.63,4.13C4,17.85,3.28,19.41,2.7,21.01c-1.13,3.2-1.74,6.51-1.75,9.93	c0.01,1.78,0.24,3.63,0.96,5.47c0.7,1.8,2.02,3.71,4.12,4.77c1.03,0.53,2.2,0.81,3.32,0.81c1.23,0.03,2.4-0.32,3.33-0.77	c1.87-0.93,3.16-2.16,4.33-3.4c2.31-2.51,4.02-5.23,5.6-8c0.44-0.76,0.86-1.54,1.27-2.33c-0.21-0.41-0.42-0.84-0.64-1.29	c-0.62-1.03-1.39-2.25-1.95-3.1c-0.83,1.5-1.69,2.96-2.58,4.41c-1.59,2.52-3.3,4.97-5.21,6.98c-0.95,0.98-2,1.84-2.92,2.25	c-0.47,0.2-0.83,0.27-1.14,0.25c-0.43,0-0.79-0.1-1.13-0.28c-0.67-0.35-1.3-1.1-1.69-2.15c-0.4-1.04-0.57-2.3-0.57-3.61	c0.03-2.74,0.57-5.58,1.52-8.18c0.93-2.59,2.36-5.04,4.17-6.48c0.91-0.7,1.87-1.1,2.85-1.19l0.38-0.02c0.11,0.01,0.2,0,0.3,0.02	c0.2,0.01,0.41,0.06,0.64,0.12c0.26,0.08,0.54,0.19,0.83,0.34c0.2,0.1,0.4,0.21,0.6,0.34c1,0.64,1.99,1.58,2.92,2.62	c0.72,0.81,1.41,1.71,2.1,2.63L25,25.24c0.75,1.55,1.53,3.09,2.39,4.58c1.58,2.77,3.29,5.49,5.6,8c0.68,0.73,1.41,1.45,2.27,2.1	c0.61,0.48,1.28,0.91,2.06,1.3c0.93,0.45,2.1,0.8,3.33,0.77c1.12,0,2.29-0.28,3.32-0.81c2.1-1.06,3.42-2.97,4.12-4.77	c0.72-1.84,0.95-3.69,0.96-5.47C49.04,27.52,48.43,24.21,47.3,21.01z"></path>
                  </svg>
                </div>
              </div>
              <p className="ml-4 text-gray-600 font-medium">{isProcessing ? 'Processing connection...' : 'Loading...'}</p>
            </div>
          ) : (
            <>
              {isConnected ? (
                // --- Connected State ---
                <div className="text-center">
                  <div className="mb-4 flex flex-col items-center">
                    <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 50 50" className="text-primary fill-current">
                        <path d="M47.3,21.01c-0.58-1.6-1.3-3.16-2.24-4.66c-0.93-1.49-2.11-2.93-3.63-4.13c-1.51-1.19-3.49-2.09-5.59-2.26l-0.78-0.04	c-0.27,0.01-0.57,0.01-0.85,0.04c-0.57,0.06-1.11,0.19-1.62,0.34c-1.03,0.32-1.93,0.8-2.72,1.32c-1.42,0.94-2.55,2.03-3.57,3.15	c0.01,0.02,0.03,0.03,0.04,0.05l0.22,0.28c0.51,0.67,1.62,2.21,2.61,3.87c1.23-1.2,2.83-2.65,3.49-3.07	c0.5-0.31,0.99-0.55,1.43-0.68c0.23-0.06,0.44-0.11,0.64-0.12c0.1-0.02,0.19-0.01,0.3-0.02l0.38,0.02c0.98,0.09,1.94,0.49,2.85,1.19	c1.81,1.44,3.24,3.89,4.17,6.48c0.95,2.6,1.49,5.44,1.52,8.18c0,1.31-0.17,2.57-0.57,3.61c-0.39,1.05-1.38,1.45-2.5,1.45	c-1.63,0-2.81-0.7-3.76-1.68c-1.04-1.09-2.02-2.31-2.96-3.61c-0.78-1.09-1.54-2.22-2.26-3.37c-1.27-2.06-2.97-4.67-4.15-6.85	L25,16.35c-0.31-0.39-0.61-0.78-0.94-1.17c-1.11-1.26-2.34-2.5-3.93-3.56c-0.79-0.52-1.69-1-2.72-1.32	c-0.51-0.15-1.05-0.28-1.62-0.34c-0.18-0.02-0.36-0.03-0.54-0.03c-0.11,0-0.21-0.01-0.31-0.01l-0.78,0.04	c-2.1,0.17-4.08,1.07-5.59,2.26c-1.52,1.2-2.7,2.64-3.63,4.13C4,17.85,3.28,19.41,2.7,21.01c-1.13,3.2-1.74,6.51-1.75,9.93	c0.01,1.78,0.24,3.63,0.96,5.47c0.7,1.8,2.02,3.71,4.12,4.77c1.03,0.53,2.2,0.81,3.32,0.81c1.23,0.03,2.4-0.32,3.33-0.77	c1.87-0.93,3.16-2.16,4.33-3.4c2.31-2.51,4.02-5.23,5.6-8c0.44-0.76,0.86-1.54,1.27-2.33c-0.21-0.41-0.42-0.84-0.64-1.29	c-0.62-1.03-1.39-2.25-1.95-3.1c-0.83,1.5-1.69,2.96-2.58,4.41c-1.59,2.52-3.3,4.97-5.21,6.98c-0.95,0.98-2,1.84-2.92,2.25	c-0.47,0.2-0.83,0.27-1.14,0.25c-0.43,0-0.79-0.1-1.13-0.28c-0.67-0.35-1.3-1.1-1.69-2.15c-0.4-1.04-0.57-2.3-0.57-3.61	c0.03-2.74,0.57-5.58,1.52-8.18c0.93-2.59,2.36-5.04,4.17-6.48c0.91-0.7,1.87-1.1,2.85-1.19l0.38-0.02c0.11,0.01,0.2,0,0.3,0.02	c0.2,0.01,0.41,0.06,0.64,0.12c0.26,0.08,0.54,0.19,0.83,0.34c0.2,0.1,0.4,0.21,0.6,0.34c1,0.64,1.99,1.58,2.92,2.62	c0.72,0.81,1.41,1.71,2.1,2.63L25,25.24c0.75,1.55,1.53,3.09,2.39,4.58c1.58,2.77,3.29,5.49,5.6,8c0.68,0.73,1.41,1.45,2.27,2.1	c0.61,0.48,1.28,0.91,2.06,1.3c0.93,0.45,2.1,0.8,3.33,0.77c1.12,0,2.29-0.28,3.32-0.81c2.1-1.06,3.42-2.97,4.12-4.77	c0.72-1.84,0.95-3.69,0.96-5.47C49.04,27.52,48.43,24.21,47.3,21.01z"></path>
                      </svg>
          </div>
                    <h3 className="text-xl font-bold mb-2">Connected to Meta</h3>
                    <p className="text-gray-600 mb-4">Your Meta Business account is connected and ready.</p>
                    
                    <Button 
                      onClick={handleConnectMeta} 
                      variant="outline" 
                      disabled={isLoading || isProcessing} 
                      className="px-5 py-2 shadow-sm transition-all duration-300 hover:shadow-md"
                    >
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                  </svg>
                        Reconnect Account
                      </div>
                    </Button>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-semibold mb-0">Your Ad Accounts</h3>
                    </div>
                    <table className="w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Account Name</th>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Account ID</th>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Currency</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {adAccounts.map((account, index) => (
                          <tr 
                            key={account.id || account.account_id} 
                            className={`hover:bg-gray-50 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                                  <span className="text-primary font-medium">{account.name.charAt(0)}</span>
                                </div>
                                <div className="ml-3">
                                  <div className="text-sm font-medium text-gray-900">{account.name}</div>
                                </div>
                              </div>
                              </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{account.account_id}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                account.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                                account.status === 'DISABLED' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {account.status || 'UNKNOWN'}
                                </span>
                              </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{account.currency}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                // --- Not Connected State ---
                <div className="text-center max-w-xl mx-auto py-8">
                  <div className="mb-8">
                    <svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 50 50" className="text-gray-300 fill-current mx-auto">
                      <path d="M47.3,21.01c-0.58-1.6-1.3-3.16-2.24-4.66c-0.93-1.49-2.11-2.93-3.63-4.13c-1.51-1.19-3.49-2.09-5.59-2.26l-0.78-0.04	c-0.27,0.01-0.57,0.01-0.85,0.04c-0.57,0.06-1.11,0.19-1.62,0.34c-1.03,0.32-1.93,0.8-2.72,1.32c-1.42,0.94-2.55,2.03-3.57,3.15	c0.01,0.02,0.03,0.03,0.04,0.05l0.22,0.28c0.51,0.67,1.62,2.21,2.61,3.87c1.23-1.2,2.83-2.65,3.49-3.07	c0.5-0.31,0.99-0.55,1.43-0.68c0.23-0.06,0.44-0.11,0.64-0.12c0.1-0.02,0.19-0.01,0.3-0.02l0.38,0.02c0.98,0.09,1.94,0.49,2.85,1.19	c1.81,1.44,3.24,3.89,4.17,6.48c0.95,2.6,1.49,5.44,1.52,8.18c0,1.31-0.17,2.57-0.57,3.61c-0.39,1.05-1.38,1.45-2.5,1.45	c-1.63,0-2.81-0.7-3.76-1.68c-1.04-1.09-2.02-2.31-2.96-3.61c-0.78-1.09-1.54-2.22-2.26-3.37c-1.27-2.06-2.97-4.67-4.15-6.85	L25,16.35c-0.31-0.39-0.61-0.78-0.94-1.17c-1.11-1.26-2.34-2.5-3.93-3.56c-0.79-0.52-1.69-1-2.72-1.32	c-0.51-0.15-1.05-0.28-1.62-0.34c-0.18-0.02-0.36-0.03-0.54-0.03c-0.11,0-0.21-0.01-0.31-0.01l-0.78,0.04	c-2.1,0.17-4.08,1.07-5.59,2.26c-1.52,1.2-2.7,2.64-3.63,4.13C4,17.85,3.28,19.41,2.7,21.01c-1.13,3.2-1.74,6.51-1.75,9.93	c0.01,1.78,0.24,3.63,0.96,5.47c0.7,1.8,2.02,3.71,4.12,4.77c1.03,0.53,2.2,0.81,3.32,0.81c1.23,0.03,2.4-0.32,3.33-0.77	c1.87-0.93,3.16-2.16,4.33-3.4c2.31-2.51,4.02-5.23,5.6-8c0.44-0.76,0.86-1.54,1.27-2.33c-0.21-0.41-0.42-0.84-0.64-1.29	c-0.62-1.03-1.39-2.25-1.95-3.1c-0.83,1.5-1.69,2.96-2.58,4.41c-1.59,2.52-3.3,4.97-5.21,6.98c-0.95,0.98-2,1.84-2.92,2.25	c-0.47,0.2-0.83,0.27-1.14,0.25c-0.43,0-0.79-0.1-1.13-0.28c-0.67-0.35-1.3-1.1-1.69-2.15c-0.4-1.04-0.57-2.3-0.57-3.61	c0.03-2.74,0.57-5.58,1.52-8.18c0.93-2.59,2.36-5.04,4.17-6.48c0.91-0.7,1.87-1.1,2.85-1.19l0.38-0.02c0.11,0.01,0.2,0,0.3,0.02	c0.2,0.01,0.41,0.06,0.64,0.12c0.26,0.08,0.54,0.19,0.83,0.34c0.2,0.1,0.4,0.21,0.6,0.34c1,0.64,1.99,1.58,2.92,2.62	c0.72,0.81,1.41,1.71,2.1,2.63L25,25.24c0.75,1.55,1.53,3.09,2.39,4.58c1.58,2.77,3.29,5.49,5.6,8c0.68,0.73,1.41,1.45,2.27,2.1	c0.61,0.48,1.28,0.91,2.06,1.3c0.93,0.45,2.1,0.8,3.33,0.77c1.12,0,2.29-0.28,3.32-0.81c2.1-1.06,3.42-2.97,4.12-4.77	c0.72-1.84,0.95-3.69,0.96-5.47C49.04,27.52,48.43,24.21,47.3,21.01z"></path>
                    </svg>
                  </div>
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-900">Connect Your Meta Ad Account</h2>
                    <p className="text-gray-600 max-w-md mx-auto">
                      {router.query.first_time === 'true' 
                        ? "Let's get started! Connect your Meta Business account to begin analyzing your ad campaigns with AI-powered insights."
                        : "Connect your Meta Business account to access your ad accounts and campaigns."
                      }
                    </p>
                    <div className="pt-4">
                      <Button 
                        onClick={handleConnectMeta} 
                        disabled={isLoading || isProcessing}
                        className="px-8 py-3 text-base shadow-md transition-all duration-300 hover:shadow-lg hover:translate-y-[-2px] rounded-full"
                      >
                        {(isLoading || isProcessing) ? (
                          <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Connecting...
              </div>
            ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xl">💫</span>
                Connect Meta Account
                          </div>
                        )}
              </Button>
                    </div>
                    <div className="pt-6 border-t border-gray-200 text-sm text-gray-500">
                      <div className="flex justify-center gap-2 items-center">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <p>We only request necessary permissions. Your credentials are never stored.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Show loading state for accounts */}
        {isLoading && isConnected && adAccounts.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl shadow-md border border-gray-100">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
              <p className="text-gray-500 font-medium">Loading ad accounts...</p>
              <p className="text-gray-400 text-sm mt-2">This may take a few moments</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountsPage;
