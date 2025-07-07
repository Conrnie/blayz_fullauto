import React, { useState } from 'react';
import { fetchWithAuth } from '../lib/apiClient';

/**
 * DemoModePanel component for generating and managing demo data
 */
const DemoModePanel = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingTest, setIsGeneratingTest] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [errorDetails, setErrorDetails] = useState(null);
  const [advancedOptions, setAdvancedOptions] = useState(false);
  const [options, setOptions] = useState({
    campaignCount: 3,
    adSetCount: 2,
    adCount: 3,
    daysCount: 30
  });

  const handleOptionChange = (e) => {
    const { name, value } = e.target;
    setOptions(prev => ({
      ...prev,
      [name]: parseInt(value, 10)
    }));
  };

  const handleGenerateData = async () => {
    try {
      console.log('[DEMO_UI] Starting demo data generation');
      setIsGenerating(true);
      setResult(null);
      setError(null);
      setErrorDetails(null);
      
      console.log('[DEMO_UI] Using options:', options);
      
      // Safe check for browser environment
      const isClient = typeof window !== 'undefined';
      console.log('[DEMO_UI] Is client environment:', isClient);
      
      // Determine API URL
      let apiUrl = '/api/generate-demo-data';
      if (isClient) {
        const baseUrl = window.location.origin;
        console.log('[DEMO_UI] Browser detected. Using base URL:', baseUrl);
        apiUrl = `${baseUrl}/api/generate-demo-data`;
      } else {
        console.log('[DEMO_UI] Server-side rendering detected. Using relative URL.');
      }
      
      console.log('[DEMO_UI] Final API URL:', apiUrl);
      console.log('[DEMO_UI] Fetching with method:', 'POST');
      console.log('[DEMO_UI] Request body:', JSON.stringify(options));
      
      try {
        console.log('[DEMO_UI] Initiating fetch request with auth...');
        const data = await fetchWithAuth(apiUrl, {
          method: 'POST',
          body: JSON.stringify(options),
        });
        
        console.log('[DEMO_UI] Response data from fetchWithAuth:', data);
        
        if (data.success) {
          console.log('[DEMO_UI] Operation successful. Stats:', data.stats);
          setResult(data.stats);
        } else {
          console.error('[DEMO_UI] API returned error:', data.error);
          setError(data.error || 'Unknown error occurred');
          
          // If we have additional error details in the response
          if (data.errorDetails) {
            console.error('[DEMO_UI] Error details:', data.errorDetails);
            setErrorDetails(data.errorDetails);
          }
          
          if (data.errorType) {
            console.error('[DEMO_UI] Error type:', data.errorType);
          }
        }
      } catch (fetchError) {
        console.error('[DEMO_UI] Fetch operation failed:', fetchError);
        throw fetchError;
      }
    } catch (error) {
      console.error('[DEMO_UI] Demo generation error:', error);
      console.error('[DEMO_UI] Error stack:', error.stack);
      
      // Handle different types of errors
      if (error.name === 'TypeError' && error.message?.includes('Failed to parse URL')) {
        console.error('[DEMO_UI] URL parsing error detected.');
        console.error('[DEMO_UI] Current location:', window.location.href);
        console.error('[DEMO_UI] Current origin:', window.location.origin);
        
        setError('Failed to connect to the API. This could be due to a network issue or incorrect URL configuration.');
        setErrorDetails(`Technical details: ${error.message}`);
      } else {
        setError(error.message || 'Failed to generate demo data');
        
        // Store additional error details if available
        if (error.stack) {
          setErrorDetails(error.stack);
        }
      }
    } finally {
      console.log('[DEMO_UI] Generation process completed');
      setIsGenerating(false);
    }
  };

  // Generate test data with 1 campaign, 1 ad set, 3 ads, and only demographic breakdowns
  const handleGenerateTestData = async () => {
    try {
      console.log('[DEMO_UI] Starting test data generation');
      setIsGeneratingTest(true);
      setResult(null);
      setError(null);
      setErrorDetails(null);
      
      // Safe check for browser environment
      const isClient = typeof window !== 'undefined';
      console.log('[DEMO_UI] Is client environment:', isClient);
      
      // Determine API URL
      let apiUrl = '/api/generate-test-data';
      if (isClient) {
        const baseUrl = window.location.origin;
        console.log('[DEMO_UI] Browser detected. Using base URL:', baseUrl);
        apiUrl = `${baseUrl}/api/generate-test-data`;
      } else {
        console.log('[DEMO_UI] Server-side rendering detected. Using relative URL.');
      }
      
      console.log('[DEMO_UI] Final API URL for test data:', apiUrl);
      
      try {
        console.log('[DEMO_UI] Initiating test data fetch request with auth...');
        const data = await fetchWithAuth(apiUrl, {
          method: 'POST',
        });
        
        console.log('[DEMO_UI] Test data response from fetchWithAuth:', data);
        
        if (data.success) {
          console.log('[DEMO_UI] Test data generation successful. Summary:', data.summary);
          setResult(data.summary);
        } else {
          console.error('[DEMO_UI] API returned error:', data.error);
          setError(data.error || 'Unknown error occurred');
          
          // If we have additional error details in the response
          if (data.errorDetails) {
            console.error('[DEMO_UI] Error details:', data.errorDetails);
            setErrorDetails(data.errorDetails);
          }
          
          if (data.errorType) {
            console.error('[DEMO_UI] Error type:', data.errorType);
          }
        }
      } catch (fetchError) {
        console.error('[DEMO_UI] Fetch operation failed:', fetchError);
        throw fetchError;
      }
    } catch (error) {
      console.error('[DEMO_UI] Test data generation error:', error);
      console.error('[DEMO_UI] Error stack:', error.stack);
      
      // Handle different types of errors
      if (error.name === 'TypeError' && error.message?.includes('Failed to parse URL')) {
        console.error('[DEMO_UI] URL parsing error detected.');
        console.error('[DEMO_UI] Current location:', window.location.href);
        console.error('[DEMO_UI] Current origin:', window.location.origin);
        
        setError('Failed to connect to the API. This could be due to a network issue or incorrect URL configuration.');
        setErrorDetails(`Technical details: ${error.message}`);
      } else {
        setError(error.message || 'Failed to generate test data');
        
        // Store additional error details if available
        if (error.stack) {
          setErrorDetails(error.stack);
        }
      }
    } finally {
      console.log('[DEMO_UI] Test data generation process completed');
      setIsGeneratingTest(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-4 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-gray-900">Demo Mode</h2>
        <button
          onClick={() => setAdvancedOptions(!advancedOptions)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {advancedOptions ? 'Hide Options' : 'Show Advanced Options'}
        </button>
      </div>
      
      {advancedOptions && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label htmlFor="campaignCount" className="block text-sm font-medium text-gray-700 mb-1">
              Campaigns
            </label>
            <input
              type="number"
              id="campaignCount"
              name="campaignCount"
              min="1"
              max="10"
              value={options.campaignCount}
              onChange={handleOptionChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label htmlFor="adSetCount" className="block text-sm font-medium text-gray-700 mb-1">
              Ad Sets per Campaign
            </label>
            <input
              type="number"
              id="adSetCount"
              name="adSetCount"
              min="1"
              max="10"
              value={options.adSetCount}
              onChange={handleOptionChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label htmlFor="adCount" className="block text-sm font-medium text-gray-700 mb-1">
              Ads per Ad Set
            </label>
            <input
              type="number"
              id="adCount"
              name="adCount"
              min="1"
              max="10"
              value={options.adCount}
              onChange={handleOptionChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label htmlFor="daysCount" className="block text-sm font-medium text-gray-700 mb-1">
              Days of Data
            </label>
            <input
              type="number"
              id="daysCount"
              name="daysCount"
              min="7"
              max="90"
              value={options.daysCount}
              onChange={handleOptionChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
      )}
      
      <div className="flex flex-col">
        <div className="flex space-x-4">
          <button
            onClick={handleGenerateData}
            disabled={isGenerating || isGeneratingTest}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {isGenerating ? 'Generating...' : 'Generate Demo Data'}
          </button>
          
          <button
            onClick={handleGenerateTestData}
            disabled={isGenerating || isGeneratingTest}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed"
          >
            {isGeneratingTest ? 'Generating...' : 'Generate Test Data (1 Campaign)'}
          </button>
        </div>
        
        <div className="mt-4">
          {(isGenerating || isGeneratingTest) && (
            <div className="text-sm text-gray-600">
              Generating data... This may take a few moments. Check the browser console for progress updates.
            </div>
          )}
          
          {error && (
            <div className="mt-2">
              <div className="text-sm text-red-600 font-medium">
                Error: {error}
              </div>
              {errorDetails && (
                <details className="mt-1">
                  <summary className="text-sm text-red-600 cursor-pointer">
                    See error details
                  </summary>
                  <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
                    {errorDetails}
                  </pre>
                </details>
              )}
              <div className="text-xs text-gray-500 mt-1">
                Check the browser console (F12) for more detailed error information.
              </div>
            </div>
          )}
          
          {result && (
            <div className="text-sm text-green-600 mt-2">
              <p>Success! Generated:</p>
              <ul className="list-disc list-inside mt-1">
                <li>{result.campaigns} campaigns</li>
                <li>{result.adSets} ad sets</li>
                <li>{result.ads} ads</li>
                <li>{result.totalDataPoints || result.totalInsights} total data points</li>
                {result.daysOfData && <li>{result.daysOfData} days of historical data</li>}
                {result.adInsightDemographics && <li>{result.adInsightDemographics} demographic breakdowns for ads</li>}
                {result.adSetInsightDemographics && <li>{result.adSetInsightDemographics} demographic breakdowns for ad sets</li>}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DemoModePanel; 