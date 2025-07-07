import React, { useEffect } from 'react';

// Fallback version that doesn't require recharts
export default function PerformanceOverview({ analysisData, adInsights = [], adSetInsights = [] }) {
  // Debug log to see what data we're working with
  useEffect(() => {
    console.log('PerformanceOverview props:', { 
      analysisDataType: typeof analysisData, 
      isArray: Array.isArray(analysisData),
      adInsightsCount: adInsights.length,
      adSetInsightsCount: adSetInsights.length
    });
    
    // Log the field names from first records for debugging
    if (adInsights.length > 0) {
      console.log('First ad insight fields:', Object.keys(adInsights[0]));
      console.log('First ad insight conversion fields:', {
        results: adInsights[0].results,
        conversions: adInsights[0].conversions
      });
    }
    
    if (adSetInsights.length > 0) {
      console.log('First ad set insight fields:', Object.keys(adSetInsights[0]));
      console.log('First ad set insight conversion fields:', {
        results: adSetInsights[0].results,
        conversions: adSetInsights[0].conversions
      });
    }
  }, [analysisData, adInsights, adSetInsights]);

  // If we have ad insights data, use that as the preferred source for campaign overview
  const hasAdInsightsData = Array.isArray(adInsights) && adInsights.length > 0;
  const hasAdSetInsightsData = Array.isArray(adSetInsights) && adSetInsights.length > 0;
  
  // First, try to extract metrics from the more detailed ad insights
  if (hasAdInsightsData) {
    console.log('Using ad insights data for performance overview');
    
    // Extract metrics from ad insights
    let totalSpend = 0;
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalResults = 0;
    
    adInsights.forEach(insight => {
      totalSpend += Number(insight.spend || 0);
      totalImpressions += Number(insight.impressions || 0);
      totalClicks += Number(insight.clicks || 0);
      
      // Check for both possible field names for conversions/results
      const conversionValue = Number(insight.results || insight.conversions || 0);
      totalResults += conversionValue;
    });
    
    // Calculate aggregate metrics
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
    const cpa = totalResults > 0 ? totalSpend / totalResults : 0;
    const conversionRate = totalClicks > 0 ? (totalResults / totalClicks) * 100 : 0;
    
    // Log calculated metrics for debugging
    console.log('Calculated performance metrics:', {
      totalSpend,
      totalImpressions,
      totalClicks,
      totalResults,
      ctr,
      cpc,
      cpa,
      conversionRate
    });
    
    return renderPerformanceMetrics(totalSpend, totalImpressions, totalClicks, totalResults, ctr, cpc, cpa, conversionRate);
  }
  
  // If no ad insights, fall back to the analysis data (existing logic)
  // Handle different data structures
  if (!analysisData) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-primary">
        <h2 className="text-xl font-semibold mb-4 text-secondary flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          Performance Overview
        </h2>
        <p className="text-gray-500">No performance data available for this campaign.</p>
      </div>
    );
  }

  // Detect and handle the data structure
  let adDataArray = [];
  // If it's an array, use it directly
  if (Array.isArray(analysisData)) {
    adDataArray = analysisData;
  } 
  // If it has ad_analysis property that's an array, use that
  else if (analysisData.ad_analysis && Array.isArray(analysisData.ad_analysis)) {
    adDataArray = analysisData.ad_analysis;
  } 
  // If it's an object without ad_analysis or with empty ad_analysis
  else {
    console.warn('PerformanceOverview: Unexpected data structure for analysisData:', typeof analysisData);
    return (
      <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-primary">
        <h2 className="text-xl font-semibold mb-4 text-secondary flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          Performance Overview
        </h2>
        <p className="text-gray-500">Unable to process performance data.</p>
      </div>
    );
  }

  // Check if we have ads after processing
  if (adDataArray.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-primary">
        <h2 className="text-xl font-semibold mb-4 text-secondary flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          Performance Overview
        </h2>
        <p className="text-gray-500">No ads found in the analysis data.</p>
      </div>
    );
  }

  // Extract metrics from the analysis data
  const metrics = {};
  let totalSpend = 0;
  let totalImpressions = 0;
  let totalClicks = 0;
  let totalResults = 0;

  // Process ad data
  adDataArray.forEach(ad => {
    const adMetrics = ad.overall_metrics || {};
    totalSpend += Number(adMetrics.spend || 0);
    totalImpressions += Number(adMetrics.impressions || 0);
    totalClicks += Number(adMetrics.clicks || 0);
    totalResults += Number(adMetrics.results || 0);
  });

  // Calculate aggregate metrics
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const cpa = totalResults > 0 ? totalSpend / totalResults : 0;
  const conversionRate = totalClicks > 0 ? (totalResults / totalClicks) * 100 : 0;

  return renderPerformanceMetrics(totalSpend, totalImpressions, totalClicks, totalResults, ctr, cpc, cpa, conversionRate);
}

// Helper function to render the metrics UI
function renderPerformanceMetrics(totalSpend, totalImpressions, totalClicks, totalResults, ctr, cpc, cpa, conversionRate) {
  // Format currency
  const formatCurrency = (value) => {
    return `$${value.toFixed(2)}`;
  };

  // Format percentage
  const formatPercent = (value) => {
    return `${value.toFixed(2)}%`;
  };

  // Format number with commas
  const formatNumber = (value) => {
    return value.toLocaleString();
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-primary">
      <h2 className="text-xl font-semibold mb-6 text-secondary flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Performance Overview
      </h2>
      
      <div className="mb-8">
        <h3 className="text-lg font-medium mb-4 text-secondary flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Campaign Metrics
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-lg p-5 shadow-sm border border-gray-100 transform transition-transform hover:scale-105 hover:shadow-md">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">Total Spend</div>
              <div className="text-primary p-2 bg-primary bg-opacity-10 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-2xl font-bold text-secondary mt-2">{formatCurrency(totalSpend)}</div>
          </div>
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-lg p-5 shadow-sm border border-gray-100 transform transition-transform hover:scale-105 hover:shadow-md">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">Impressions</div>
              <div className="text-primary p-2 bg-primary bg-opacity-10 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
            </div>
            <div className="text-2xl font-bold text-secondary mt-2">{formatNumber(totalImpressions)}</div>
          </div>
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-lg p-5 shadow-sm border border-gray-100 transform transition-transform hover:scale-105 hover:shadow-md">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">Clicks</div>
              <div className="text-primary p-2 bg-primary bg-opacity-10 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
              </div>
            </div>
            <div className="text-2xl font-bold text-secondary mt-2">{formatNumber(totalClicks)}</div>
          </div>
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-lg p-5 shadow-sm border border-gray-100 transform transition-transform hover:scale-105 hover:shadow-md">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">Conversions</div>
              <div className="text-primary p-2 bg-primary bg-opacity-10 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
            </div>
            <div className="text-2xl font-bold text-secondary mt-2">{formatNumber(totalResults)}</div>
          </div>
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-medium mb-4 text-secondary flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Performance Metrics
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-lg p-5 shadow-sm border border-gray-100 transform transition-transform hover:scale-105 hover:shadow-md">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">CTR</div>
              <div className="text-primary p-2 bg-primary bg-opacity-10 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <div className="text-2xl font-bold text-secondary mt-2">{formatPercent(ctr)}</div>
          </div>
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-lg p-5 shadow-sm border border-gray-100 transform transition-transform hover:scale-105 hover:shadow-md">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">CPC</div>
              <div className="text-primary p-2 bg-primary bg-opacity-10 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
              </div>
            </div>
            <div className="text-2xl font-bold text-secondary mt-2">{formatCurrency(cpc)}</div>
          </div>
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-lg p-5 shadow-sm border border-gray-100 transform transition-transform hover:scale-105 hover:shadow-md">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">CPA</div>
              <div className="text-primary p-2 bg-primary bg-opacity-10 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-2xl font-bold text-secondary mt-2">{formatCurrency(cpa)}</div>
          </div>
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-lg p-5 shadow-sm border border-gray-100 transform transition-transform hover:scale-105 hover:shadow-md">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">Conversion Rate</div>
              <div className="text-primary p-2 bg-primary bg-opacity-10 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>
            <div className="text-2xl font-bold text-secondary mt-2">{formatPercent(conversionRate)}</div>
          </div>
        </div>
      </div>
      
      <div className="mt-8 p-5 bg-gradient-to-r from-primary/5 to-secondary/5 border border-primary/20 rounded-lg flex items-start">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary mr-3 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <h3 className="text-sm font-medium text-secondary mb-2">Performance Insights</h3>
          <p className="text-sm text-gray-600">
            This overview shows the key performance indicators for your campaign. Analyze these metrics to understand campaign effectiveness and identify opportunities for optimization. Higher CTR and conversion rates typically indicate well-targeted ads with relevant messaging.
          </p>
        </div>
      </div>
    </div>
  );
} 