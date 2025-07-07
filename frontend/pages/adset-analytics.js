import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '../lib/apiClient.js';

export default function AdsetAnalytics() {
  // State variables
  const [isClient, setIsClient] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [selectedTimeframe, setSelectedTimeframe] = useState('14d');
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  
  // Ad set state variables
  const [adsetTrendsLoading, setAdsetTrendsLoading] = useState(false);
  const [adsetTrendsError, setAdsetTrendsError] = useState(null);
  const [adsetTrendsResults, setAdsetTrendsResults] = useState(null);
  
  const [adsetAnomalyLoading, setAdsetAnomalyLoading] = useState(false);
  const [adsetAnomalyError, setAdsetAnomalyError] = useState(null);
  const [adsetAnomalyData, setAdsetAnomalyData] = useState(null);
  
  const [adsetPerformanceLoading, setAdsetPerformanceLoading] = useState(false);
  const [adsetPerformanceError, setAdsetPerformanceError] = useState(null);
  const [adsetPerformanceData, setAdsetPerformanceData] = useState(null);

  // Set isClient to true on mount
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch available campaigns on component mount
  useEffect(() => {
    if (isClient) {
      fetchCampaigns();
    }
  }, [isClient]);

  // Function to fetch available campaigns
  const fetchCampaigns = async () => {
    try {
      setLoadingCampaigns(true);
      
      // Hardcoded campaign IDs that we know exist in the test data
      // These match the UUIDs in the ad_set_insights table
      const hardcodedCampaigns = [
        {
          meta_campaign_id: '20886753-90f2-4dea-80ee-2dc509ee0f1a',
          name: 'Campaign 1 (Sep 3-14)'
        },
        {
          meta_campaign_id: '4657146c-1267-48c4-8dfa-e99912aea266',
          name: 'Campaign 2 (Aug 5-Sep 11)'
        }
      ];
      
      setCampaigns(hardcodedCampaigns);
      console.log('Using hardcoded campaigns:', hardcodedCampaigns);
      
    } catch (err) {
      console.error('Error in fetchCampaigns:', err);
    } finally {
      setLoadingCampaigns(false);
    }
  };

  // Function to fetch ad set anomaly detection results
  const fetchAdsetAnomalies = async () => {
    console.log('Starting fetchAdsetAnomalies');
    if (!selectedCampaign) {
      console.log('No campaign selected, skipping ad set anomaly detection.');
      setAdsetAnomalyError("Please select a campaign first.");
      return;
    }
    
    setAdsetAnomalyLoading(true);
    setAdsetAnomalyError(null);
    setAdsetAnomalyData(null); // Clear previous data
    
    try {
      const timeframeDays = parseInt(selectedTimeframe.replace('d', '')) || 14;
      console.log(`Fetching ad set anomalies for campaign ${selectedCampaign} with timeframe ${timeframeDays} days`);

      const data = await fetchWithAuth(
        `/api/adset-anomaly-detection?campaign_id=${selectedCampaign}&timeframe=${timeframeDays}`
      );
      
      console.log('Raw ad set anomaly detection results:', JSON.stringify(data, null, 2));
      
      setAdsetAnomalyData(data.rawAnomalies || []);
      if (!data.rawAnomalies || data.rawAnomalies.length === 0) {
         console.log('API reported no ad set anomalies were detected.');
      }

    } catch (error) {
      console.error('Error in fetchAdsetAnomalies:', error);
      setAdsetAnomalyError(error.message);
    } finally {
      setAdsetAnomalyLoading(false);
    }
  };

  // Function to fetch ad set trends
  const fetchAdsetTrends = async () => {
    console.log('Starting fetchAdsetTrends');
    if (!selectedCampaign) return;
    setAdsetTrendsLoading(true);
    setAdsetTrendsError(null);
    setAdsetTrendsResults(null);

    try {
      const timeframeDays = parseInt(selectedTimeframe.replace('d', '')) || 30;
      const queryParams = `?campaign_id=${selectedCampaign}&num_days=${timeframeDays}`;
      console.log('Fetching ad set trends with params:', queryParams);
      
      const data = await fetchWithAuth(`/api/adset-trends${queryParams}`);
      
      console.log('Ad set trends data received:', data);

      if (!data || (Array.isArray(data) && data.length === 0)) throw new Error('No ad set trend data available');

      setAdsetTrendsResults(data);
    } catch (err) {
      console.error('Error in fetchAdsetTrends:', err);
      setAdsetTrendsError(err.message);
    } finally {
      setAdsetTrendsLoading(false);
    }
  };

  // Function to fetch ad set performance data
  const fetchAdsetPerformance = async () => {
    console.log('Starting fetchAdsetPerformance');
    if (!selectedCampaign) return;
    setAdsetPerformanceLoading(true);
    setAdsetPerformanceError(null);
    setAdsetPerformanceData(null);

    try {
      console.log('Fetching ad set performance data for campaign:', selectedCampaign);
      
      const data = await fetchWithAuth(`/api/adset-performance?campaign_id=${selectedCampaign}`);
      
      console.log('Ad set performance data received:', data);

      setAdsetPerformanceData(data);
    } catch (err) {
      console.error('Error in fetchAdsetPerformance:', err);
      setAdsetPerformanceError(err.message);
    } finally {
      setAdsetPerformanceLoading(false);
    }
  };

  // Renders ad set trends results
  const renderAdsetTrendsResults = () => {
    if (adsetTrendsLoading) return <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-md text-purple-800">Analyzing ad set trends...</div>;
    if (adsetTrendsError) return (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <h3 className="text-red-800 font-medium">Ad Set Trends Analysis Error</h3>
          <p className="text-red-600 mt-1">{adsetTrendsError}</p>
        </div>
    );
    if (!adsetTrendsResults || !Array.isArray(adsetTrendsResults) || adsetTrendsResults.length === 0) {
      return <p className="text-gray-500 italic mt-4">No ad set trend data available or not yet analyzed.</p>;
    }

    return (
      <div className="mt-6 p-4 bg-white rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Ad Set Performance Trends</h3>
        {adsetTrendsResults.map((adsetTrend) => (
          <div key={adsetTrend.ad_set_id} className="mb-6 p-4 border rounded-lg">
            <h4 className="font-medium mb-3">Ad Set ID: {adsetTrend.ad_set_id}</h4>
            {Object.entries(adsetTrend.trends || {}).map(([metric, trend]) => (
              <div key={metric} className="mb-3">
                <p className="font-medium capitalize">{metric} Trend</p>
                <div className="flex items-center space-x-2">
                  <span className={`text-sm font-medium ${
                    trend.direction === 'improving' || trend.direction === 'decreasing' ? 'text-green-600' :
                    trend.direction === 'worsening' || trend.direction === 'increasing' ? 'text-red-600' :
                    'text-gray-600'
                  }`}>
                    {trend.direction ? trend.direction.charAt(0).toUpperCase() + trend.direction.slice(1) : 'Stable'}
                  </span>
                  {typeof trend.change_pct === 'number' && (
                    <span className="text-sm">
                      ({trend.change_pct > 0 ? '+' : ''}{trend.change_pct.toFixed(1)}%)
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };
  
  // Renders ad set anomaly detection results
  const renderAdsetAnomalyResults = () => {
    return (
      <div className="mt-8 p-6 bg-white rounded-lg shadow-md">
        <h3 className="text-xl font-semibold mb-4">Ad Set Anomaly Detection Output</h3>
        {adsetAnomalyLoading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          </div>
        ) : adsetAnomalyError ? (
          <div className="text-red-500 bg-red-50 p-4 rounded border border-red-200">
            <p className="font-semibold">Error Detecting Ad Set Anomalies:</p>
            <p className="whitespace-pre-wrap">{adsetAnomalyError}</p>
          </div>
        ) : adsetAnomalyData !== null ? (
          <div>
            {Array.isArray(adsetAnomalyData) && adsetAnomalyData.length > 0 ? (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {adsetAnomalyData.map((anomaly, index) => (
                    <div key={index} className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <h4 className="font-medium text-gray-800 mb-2">
                        Ad Set: {anomaly.ad_set_id} <span className="text-xs text-gray-500">(Date: {anomaly.date})</span>
                      </h4>
                      
                      {/* Daily Metrics */}
                      <div className="mb-3">
                        <h5 className="text-sm font-medium text-blue-700">Daily Metrics</h5>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>Impressions: <span className="font-medium">{anomaly.daily_metrics.impressions}</span></div>
                          <div>Clicks: <span className="font-medium">{anomaly.daily_metrics.clicks}</span></div>
                          <div>CTR: <span className="font-medium">{anomaly.daily_metrics.ctr}%</span></div>
                          <div>CPC: <span className="font-medium">${anomaly.daily_metrics.cpc}</span></div>
                          <div>Spend: <span className="font-medium">${anomaly.daily_metrics.spend}</span></div>
                          <div>Results: <span className="font-medium">{anomaly.daily_metrics.results}</span></div>
                        </div>
                      </div>
                      
                      {/* Daily Alerts */}
                      {anomaly.daily_alerts && anomaly.daily_alerts.length > 0 && (
                        <div className="mb-3">
                          <h5 className="text-sm font-medium text-red-700">Daily Alerts</h5>
                          <ul className="list-disc list-inside text-xs text-red-600">
                            {anomaly.daily_alerts.map((alert, i) => (
                              <li key={i}>{alert}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {/* Platform Alerts */}
                      {anomaly.platform_alerts && anomaly.platform_alerts.length > 0 && (
                        <div className="mb-3">
                          <h5 className="text-sm font-medium text-amber-700">Platform Alerts</h5>
                          {anomaly.platform_alerts.map((platform, i) => (
                            <div key={i} className="text-xs mb-1">
                              <div className="font-medium">{platform.segment_value}</div>
                              {platform.alerts && platform.alerts.length > 0 ? (
                                <ul className="list-disc list-inside text-xs text-amber-600 ml-2">
                                  {platform.alerts.map((alert, j) => (
                                    <li key={j}>{alert}</li>
                                  ))}
                                </ul>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Device Alerts */}
                      {anomaly.device_alerts && anomaly.device_alerts.length > 0 && (
                        <div className="mb-3">
                          <h5 className="text-sm font-medium text-blue-700">Device Alerts</h5>
                          {anomaly.device_alerts.map((device, i) => (
                            <div key={i} className="text-xs mb-1">
                              <div className="font-medium">{device.segment_value}</div>
                              {device.alerts && device.alerts.length > 0 ? (
                                <ul className="list-disc list-inside text-xs text-blue-600 ml-2">
                                  {device.alerts.map((alert, j) => (
                                    <li key={j}>{alert}</li>
                                  ))}
                                </ul>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Position Alerts */}
                      {anomaly.position_alerts && anomaly.position_alerts.length > 0 && (
                        <div className="mb-3">
                          <h5 className="text-sm font-medium text-indigo-700">Position Alerts</h5>
                          {anomaly.position_alerts.map((position, i) => (
                            <div key={i} className="text-xs mb-1">
                              <div className="font-medium">{position.segment_value}</div>
                              {position.alerts && position.alerts.length > 0 ? (
                                <ul className="list-disc list-inside text-xs text-indigo-600 ml-2">
                                  {position.alerts.map((alert, j) => (
                                    <li key={j}>{alert}</li>
                                  ))}
                                </ul>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Demographic Alerts */}
                      {anomaly.demographic_alerts && anomaly.demographic_alerts.length > 0 && (
                        <div className="mb-3">
                          <h5 className="text-sm font-medium text-purple-700">Demographic Alerts</h5>
                          {anomaly.demographic_alerts.map((demographic, i) => (
                            <div key={i} className="text-xs mb-1">
                              <div className="font-medium">{demographic.segment_value}</div>
                              {demographic.alerts && demographic.alerts.length > 0 ? (
                                <ul className="list-disc list-inside text-xs text-purple-600 ml-2">
                                  {demographic.alerts.map((alert, j) => (
                                    <li key={j}>{alert}</li>
                                  ))}
                                </ul>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Hourly Alerts */}
                      {anomaly.hourly_alerts && anomaly.hourly_alerts.length > 0 && (
                        <div className="mb-3">
                          <h5 className="text-sm font-medium text-teal-700">Hourly Alerts</h5>
                          {anomaly.hourly_alerts.map((hourly, i) => (
                            <div key={i} className="text-xs mb-1">
                              <div className="font-medium">Hour {hourly.segment_value}</div>
                              {hourly.alerts && hourly.alerts.length > 0 ? (
                                <ul className="list-disc list-inside text-xs text-teal-600 ml-2">
                                  {hourly.alerts.map((alert, j) => (
                                    <li key={j}>{alert}</li>
                                  ))}
                                </ul>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Region Alerts */}
                      {anomaly.region_alerts && anomaly.region_alerts.length > 0 && (
                        <div className="mb-3">
                          <h5 className="text-sm font-medium text-emerald-700">Region Alerts</h5>
                          {anomaly.region_alerts.map((region, i) => (
                            <div key={i} className="text-xs mb-1">
                              <div className="font-medium">{region.segment_value}</div>
                              {region.alerts && region.alerts.length > 0 ? (
                                <ul className="list-disc list-inside text-xs text-emerald-600 ml-2">
                                  {region.alerts.map((alert, j) => (
                                    <li key={j}>{alert}</li>
                                  ))}
                                </ul>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Efficiency Scores */}
                      {anomaly.efficiency_scores && (
                        <div>
                          <h5 className="text-sm font-medium text-green-700">Efficiency Scores</h5>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>CTR Score: <span className="font-medium">{anomaly.efficiency_scores.ctr_score}/100</span></div>
                            <div>CPC Score: <span className="font-medium">{anomaly.efficiency_scores.cpc_score}/100</span></div>
                            <div>CPA Score: <span className="font-medium">{anomaly.efficiency_scores.cpa_score}/100</span></div>
                            <div>Overall: <span className="font-medium">{anomaly.efficiency_scores.overall_score}/100</span></div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-gray-700 hover:text-gray-900">Show raw JSON output</summary>
                  <div className="mt-2 overflow-auto max-h-60 p-4 bg-gray-800 text-gray-200 border border-gray-600 rounded text-xs font-mono">
                    <pre>{JSON.stringify(adsetAnomalyData, null, 2)}</pre>
                  </div>
                </details>
              </div>
            ) : (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-yellow-700">No anomalies were detected for the selected ad sets. This could mean:</p>
                <ul className="list-disc list-inside text-sm ml-4 text-yellow-600 mt-2">
                  <li>The ad sets are performing within expected parameters</li>
                  <li>There isn't enough historical data for reliable anomaly detection</li>
                  <li>The selected campaign may not have any active ad sets</li>
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="text-gray-500 italic">Click 'Detect Ad Set Anomalies' to view output. Ensure a campaign is selected.</div>
        )}
      </div>
    );
  };
  
  // Renders ad set performance results
  const renderAdsetPerformanceResults = () => {
    return (
      <div className="mt-8 p-6 bg-white rounded-lg shadow-md">
        <h3 className="text-xl font-semibold mb-4">Ad Set Performance Full Context</h3>
        {adsetPerformanceLoading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          </div>
        ) : adsetPerformanceError ? (
          <div className="text-red-500 bg-red-50 p-4 rounded border border-red-200">
            <p className="font-semibold">Error Analyzing Ad Set Performance:</p>
            <p className="whitespace-pre-wrap">{adsetPerformanceError}</p>
          </div>
        ) : adsetPerformanceData ? (
          <div>
            {/* Debug view of raw data */}
            <div className="mb-4 p-4 bg-gray-50 rounded border border-gray-200">
              <h4 className="font-semibold text-sm mb-2">Raw performance data:</h4>
              <pre className="text-xs overflow-auto max-h-40">{JSON.stringify(adsetPerformanceData, null, 2)}</pre>
            </div>

            {adsetPerformanceData.ad_sets && adsetPerformanceData.ad_sets.length > 0 ? (
              <div className="overflow-y-auto max-h-[60vh]">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ad Set ID</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performance</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CTR</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CPC</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Spend</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {adsetPerformanceData.ad_sets.map((adset) => (
                      <tr key={adset.ad_set_id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{adset.ad_set_id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{adset.name || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${adset.overall_performance === 'excellent' ? 'bg-green-100 text-green-800' :
                              adset.overall_performance === 'good' ? 'bg-blue-100 text-blue-800' :
                              adset.overall_performance === 'average' ? 'bg-yellow-100 text-yellow-800' :
                              adset.overall_performance === 'poor' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'}`}>
                            {adset.overall_performance ? adset.overall_performance.charAt(0).toUpperCase() + adset.overall_performance.slice(1) : 'Unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{adset.ctr !== undefined ? adset.ctr + '%' : 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${adset.cpc !== undefined ? adset.cpc.toFixed(2) : 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${adset.spend !== undefined ? adset.spend.toFixed(2) : 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 italic">No ad set performance data available for this campaign.</p>
            )}
          </div>
        ) : (
          <div className="text-gray-500 italic">Click 'Analyze Ad Set Performance' to view detailed performance analysis. Ensure a campaign is selected.</div>
        )}
      </div>
    );
  };

  // Main component return
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Ad Set Analytics Test Page</h1>
      <p className="mb-6 text-gray-600">This page tests the ad set level SQL functions and their API endpoints.</p>
      
      {/* Campaign Selection and Controls */}
      {isClient ? (
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-xl font-semibold mb-4">Test Configuration</h2>
          
          <div className="flex flex-wrap items-end gap-4 mb-6">
            {/* Campaign Dropdown */}
            <div className="w-full md:w-1/3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Campaign</label>
              <select
                className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={selectedCampaign || ''}
                onChange={(e) => {
                  const newCampaignId = e.target.value || null;
                  console.log(`[Campaign Select] onChange triggered. New value: ${newCampaignId}`);
                  setSelectedCampaign(newCampaignId);
                }}
                disabled={loadingCampaigns}
              >
                <option value="">-- Select a Campaign --</option>
                {campaigns.map((campaign) => (
                  <option key={campaign.meta_campaign_id} value={campaign.meta_campaign_id}>
                    {campaign.name}
                  </option>
                ))}
              </select>
              {loadingCampaigns && <span className="text-sm text-gray-500 mt-1">Loading campaigns...</span>}
            </div>
            
            {/* Timeframe Dropdown */}
            <div className="w-full md:w-1/3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Timeframe</label>
              <select
                className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(e.target.value)}
              >
                <option value="7d">7 Days</option>
                <option value="14d">14 Days</option>
                <option value="30d">30 Days</option>
                <option value="60d">60 Days</option>
                <option value="90d">90 Days</option>
              </select>
            </div>
            
            {/* Refresh Campaigns Button */}
            <div>
              <button
                className="bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
                onClick={fetchCampaigns}
                disabled={loadingCampaigns}
              >
                {loadingCampaigns ? 'Refreshing...' : 'Refresh Campaigns'}
              </button>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4">
            <button
              className="bg-rose-600 text-white py-2 px-4 rounded-md hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
              onClick={fetchAdsetAnomalies}
              disabled={!selectedCampaign || adsetAnomalyLoading}
            >
              {adsetAnomalyLoading ? 'Detecting Anomalies...' : 'Detect Ad Set Anomalies'}
            </button>
            
            <button
              className="bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              onClick={fetchAdsetTrends}
              disabled={!selectedCampaign || adsetTrendsLoading}
            >
              {adsetTrendsLoading ? 'Analyzing Trends...' : 'Analyze Ad Set Trends'}
            </button>
            
            <button
              className="bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onClick={fetchAdsetPerformance}
              disabled={!selectedCampaign || adsetPerformanceLoading}
            >
              {adsetPerformanceLoading ? 'Analyzing Performance...' : 'Analyze Ad Set Performance'}
            </button>
          </div>
        </div>
      ) : (
        // Skeleton Loading State for controls
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-xl font-semibold mb-4">Test Configuration</h2>
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-gray-200 rounded w-1/3"></div>
            <div className="h-10 bg-gray-200 rounded w-1/3"></div>
            <div className="h-10 bg-gray-200 rounded w-full"></div>
          </div>
        </div>
      )}
      
      {/* Results sections */}
      <div className="space-y-8">
        {/* Display results only when data is available or loading/error states exist */}
        {(adsetTrendsResults || adsetTrendsLoading || adsetTrendsError) && renderAdsetTrendsResults()}
        {(adsetAnomalyData !== null || adsetAnomalyLoading || adsetAnomalyError) && renderAdsetAnomalyResults()}
        {(adsetPerformanceData !== null || adsetPerformanceLoading || adsetPerformanceError) && renderAdsetPerformanceResults()}
        
        {/* Show help message if no data is loaded yet */}
        {!adsetTrendsResults && !adsetTrendsLoading && !adsetTrendsError && 
         adsetAnomalyData === null && !adsetAnomalyLoading && !adsetAnomalyError && 
         adsetPerformanceData === null && !adsetPerformanceLoading && !adsetPerformanceError && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-blue-700">
            <h3 className="font-semibold mb-2">How to use this test page:</h3>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Select a campaign from the dropdown above</li>
              <li>Choose a timeframe for analysis</li>
              <li>Click any of the analysis buttons to test the corresponding SQL function</li>
              <li>Results will appear in this section</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
} 