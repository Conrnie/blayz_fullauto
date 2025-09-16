import React, { useState, useEffect } from 'react';
import { insightsApi, metaApi } from '../../lib/api';
import Button from '../../components/UI/Button';
import supabase from '../../lib/supabase';

// Helper function for formatting numbers
const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

const formatNumber = (value) => {
  return new Intl.NumberFormat('en-US').format(value);
};

const formatPercent = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value / 100);
};

// Simple component for metric display
const MetricCard = ({ title, value }) => (
  <div className="bg-white p-4 rounded-lg shadow-sm">
    <h4 className="text-gray-500 text-sm font-medium mb-1">{title}</h4>
    <p className="text-2xl font-bold text-gray-800">{value}</p>
  </div>
);

const Dashboard = () => {
  // State variables
  const [adAccounts, setAdAccounts] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const [dateRange, setDateRange] = useState({
    since: '365d',
    until: 'today'
  });
  const [loading, setLoading] = useState(false);
  const [syncingCampaigns, setSyncingCampaigns] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [error, setError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [metrics, setMetrics] = useState({
    spend: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    ctr: 0,
    cpc: 0,
    roas: 0,
    reach: 0,
    frequency: 0,
    cpa: 0
  });
  
  // Fetch ad accounts on component mount
  useEffect(() => {
    const fetchAdAccounts = async () => {
      try {
        setLoadingAccounts(true);
        setError(null);
        console.log('[DASHBOARD] Fetching ad accounts...');
        const accounts = await metaApi.getAdAccounts();
        console.log(`[DASHBOARD] Retrieved ${accounts?.length || 0} ad accounts`);
        
        // Log each account for debugging
        if (accounts && accounts.length > 0) {
          console.log('[DASHBOARD] Ad accounts retrieved:');
          accounts.forEach(acc => {
            console.log(`- ID: ${acc.id}, Meta Account ID: ${acc.account_id}, Name: ${acc.name}`);
          });
        }
        
        setAdAccounts(accounts || []);
        
        // If we have accounts and no selection, select the first one
        if (accounts?.length > 0) {
          // Check for saved preference
          const savedAccountId = localStorage.getItem('blayz_selected_account');
          if (savedAccountId && accounts.some(acc => acc.id === parseInt(savedAccountId) || acc.id === savedAccountId)) {
            console.log(`[DASHBOARD] Using saved account selection: ${savedAccountId}`);
            setSelectedAccountId(savedAccountId);
          } else if (!selectedAccountId) {
            console.log(`[DASHBOARD] Auto-selecting first account: ${accounts[0].id}`);
            setSelectedAccountId(accounts[0].id);
          }
        } else {
          console.log('[DASHBOARD] No ad accounts found');
        }
      } catch (err) {
        console.error('[DASHBOARD] Error fetching ad accounts:', err);
        setError(`Failed to load ad accounts: ${err.message}`);
        setAdAccounts([]);
      } finally {
        setLoadingAccounts(false);
      }
    };
    
    fetchAdAccounts();
  }, [refreshTrigger]); // Also refresh when refreshTrigger changes
  
  // Save preferences to localStorage when they change
  useEffect(() => {
    if (selectedAccountId) {
      localStorage.setItem('blayz_selected_account', selectedAccountId);
    }
  }, [selectedAccountId]);
  
  // Fetch campaigns when account changes
  useEffect(() => {
    const fetchCampaigns = async () => {
      if (!selectedAccountId) return;
      
      try {
        setLoading(true);
        console.log(`[DASHBOARD] Fetching campaigns for account ID: ${selectedAccountId}`);
        
        const data = await metaApi.getCampaigns(selectedAccountId);
        console.log(`[DASHBOARD] Retrieved ${data?.length || 0} campaigns`);
        
        setCampaigns(data || []);
      } catch (err) {
        console.error('[DASHBOARD] Error fetching campaigns:', err);
        setCampaigns([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCampaigns();
  }, [selectedAccountId, refreshTrigger]);
  
  // Fetch summary metrics when account or date range changes
  useEffect(() => {
    if (!selectedAccountId) return;
    
    const fetchSummaryMetrics = async () => {
      try {
        setLoading(true);
        const params = {
          time_range: dateRange,
          ...(selectedCampaignId && { campaign_id: selectedCampaignId })
        };
        
        console.log('[DASHBOARD] Fetching summary metrics for account ID:', selectedAccountId);
        
        try {
          const data = await insightsApi.getSummaryMetrics(selectedAccountId, params);
          console.log('[DASHBOARD] Retrieved summary metrics:', data);
          
          setMetrics(data || {
            spend: 0,
            impressions: 0,
            clicks: 0,
            conversions: 0,
            ctr: 0,
            cpc: 0,
            roas: 0,
            reach: 0,
            frequency: 0,
            cpa: 0
          });
        } catch (apiError) {
          console.error('[DASHBOARD] Error in API call to getSummaryMetrics:', apiError);
        }
      } catch (err) {
        console.error('[DASHBOARD] Overall error in fetchSummaryMetrics:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSummaryMetrics();
  }, [selectedAccountId, selectedCampaignId, dateRange]);
  
  // Function to handle syncing campaign data
  const handleSyncCampaigns = async () => {
    if (syncingCampaigns) return; // Prevent multiple requests

    setSyncingCampaigns(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required. Please log in.');
      }

      // Call the sync-meta-data Edge Function
      const functionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sync-meta-data`;
      console.log('[DASHBOARD] Calling sync-meta-data function...');
      
      const response = await fetch(
        functionUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({})
        }
      );

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to sync campaign data');
      }

      console.log(`[DASHBOARD] Campaign sync complete: ${result.message}`);
      setSuccessMessage(`Campaign data successfully synced: ${result.message || 'All campaigns synced'}`);
      
      // Increment the refresh trigger to cause reloading of data
      setRefreshTrigger(prev => prev + 1);
      
      // Auto-dismiss success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      
    } catch (err) {
      console.error('[DASHBOARD] Error syncing campaigns:', err.message);
      setError(`Failed to sync campaign data: ${err.message}`);
    } finally {
      setSyncingCampaigns(false);
    }
  };
  
  const handleAccountSelect = (e) => {
    const accountId = e.target.value;
    if (accountId) {
      console.log(`[DASHBOARD] Selected ad account with internal ID: ${accountId}`);
      setSelectedAccountId(accountId);
      setSelectedCampaignId(null); // Reset selected campaign when account changes
    } else {
      setSelectedAccountId(null);
    }
  };
  
  const handleCampaignSelect = (e) => {
    const campaignId = e.target.value;
    if (campaignId) {
      console.log(`[DASHBOARD] Selected campaign with internal ID: ${campaignId}`);
      setSelectedCampaignId(campaignId);
    } else {
      setSelectedCampaignId(null);
    }
  };
  
  const handleDateRangeChange = (e) => {
    setDateRange({
      ...dateRange,
      since: e.target.value
    });
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold text-gray-900 mb-4 md:mb-0">Campaign Dashboard</h1>
        
        <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2">
          <Button 
            onClick={handleSyncCampaigns}
            disabled={syncingCampaigns}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {syncingCampaigns ? 'Syncing...' : 'Fetch Campaign Data'}
          </Button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}
      
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md mb-6">
          {successMessage}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <label htmlFor="account-select" className="block text-sm font-medium text-gray-700 mb-1">
            Select Ad Account
          </label>
          <select
            id="account-select"
            value={selectedAccountId || ''}
            onChange={handleAccountSelect}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            disabled={loadingAccounts}
          >
            <option value="">Select Ad Account</option>
            {adAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.account_id})
              </option>
            ))}
          </select>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <label htmlFor="campaign-select" className="block text-sm font-medium text-gray-700 mb-1">
            Select Campaign
          </label>
          <select
            id="campaign-select"
            value={selectedCampaignId || ''}
            onChange={handleCampaignSelect}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            disabled={loading || !selectedAccountId}
          >
            <option value="">All Campaigns</option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <label htmlFor="date-range" className="block text-sm font-medium text-gray-700 mb-1">
            Date Range
          </label>
          <select
            id="date-range"
            value={dateRange.since}
            onChange={handleDateRangeChange}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="14d">Last 14 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="365d">Last 12 months</option>
          </select>
        </div>
      </div>
      
      {selectedAccountId ? (
        <div>
          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <MetricCard title="Total Spend" value={formatCurrency(metrics.spend)} />
            <MetricCard title="Impressions" value={formatNumber(metrics.impressions)} />
            <MetricCard title="Reach" value={formatNumber(metrics.reach)} />
            <MetricCard title="CTR" value={formatPercent(metrics.ctr)} />
            <MetricCard title="Clicks" value={formatNumber(metrics.clicks)} />
            <MetricCard title="Cost per Click" value={formatCurrency(metrics.cpc)} />
            <MetricCard title="Cost per Acquisition" value={formatCurrency(metrics.cpa)} />
            <MetricCard title="ROAS" value={metrics.roas ? metrics.roas.toFixed(2) + 'x' : '0.00x'} />
          </div>
          
          {/* Campaign List */}
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Campaigns</h3>
            {campaigns.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Objective
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {campaigns.map((campaign) => (
                      <tr 
                        key={campaign.id} 
                        className={selectedCampaignId === campaign.id ? "bg-blue-50" : ""}
                        onClick={() => setSelectedCampaignId(campaign.id === selectedCampaignId ? null : campaign.id)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{campaign.name}</div>
                          <div className="text-sm text-gray-500">{campaign.meta_campaign_id}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            campaign.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 
                            campaign.status === 'PAUSED' ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {campaign.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {campaign.objective}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {campaign.created_time ? new Date(campaign.created_time).toLocaleDateString() : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                No campaigns found. Try syncing your data or selecting a different ad account.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white p-8 rounded-lg shadow-sm text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select an Ad Account</h3>
          <p className="text-gray-500 mb-4">
            Please select an ad account to view your campaign performance data.
          </p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;