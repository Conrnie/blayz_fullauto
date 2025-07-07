import React, { useState, useEffect } from 'react';
import { metaApi } from '../../lib/api.js';
import supabase from '../../lib/supabase.js';
import { useRouter } from 'next/router';
import { getCampaigns, associateProfileToCampaign, getCompanyProfiles } from '../../lib/apiClient';
import toast from 'react-hot-toast';

const CampaignsList = ({ adAccountId, onCampaignSelect, selectedCampaignId, refreshTrigger = 0 }) => {
  const [campaigns, setCampaigns] = useState([]);
  const [companyProfiles, setCompanyProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const router = useRouter();
  
  // Function to handle syncing campaign data directly from this component
  const handleSyncCampaigns = async () => {
    if (syncing) return; // Prevent multiple requests
    
    setSyncing(true);
    setSyncSuccess(false);
    setError(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required. Please log in.');
      }

      // Call the sync-meta-data edge function directly
      console.log('[CAMPAIGNS_LIST] Calling sync-meta-data edge function...');
      
      // Edge function URL for sync-meta-data
      const syncUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sync-meta-data`;
      
      const response = await fetch(syncUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          user_id: session.user.id,
          ad_account_id: adAccountId // Pass the ad account ID
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to sync campaign data');
      }

      console.log('[CAMPAIGNS_LIST] Sync complete for all data types');
      setSyncSuccess(true);
      
      // Re-fetch campaigns after a successful sync
      fetchCampaigns();
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => {
        setSyncSuccess(false);
      }, 5000);
      
    } catch (err) {
      console.error('[CAMPAIGNS_LIST] Error syncing campaigns:', err.message);
      setError(`Failed to sync: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };
  
  const fetchCampaigns = async () => {
    if (!adAccountId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Always pass the ID directly, no need to check format
      console.log(`[CAMPAIGNS_LIST] Fetching campaigns for ad account: ${adAccountId}`);
      
      try {
        // Use 2 retries for better resilience
        const data = await metaApi.getCampaigns(adAccountId, 2);
        console.log(`[CAMPAIGNS_LIST] Retrieved ${data?.length || 0} campaigns from API`);
        
        if (data && data.length > 0) {
          console.log('[CAMPAIGNS_LIST] Sample campaign data:', data[0]);
          
          // Log campaign IDs for debugging
          console.log('[CAMPAIGNS_LIST] Campaign IDs:');
          data.forEach(campaign => {
            console.log(`- ID: ${campaign.id}, Meta Campaign ID: ${campaign.meta_campaign_id}, Name: ${campaign.name}`);
          });
        } else {
          console.log('[CAMPAIGNS_LIST] No campaigns found or empty response');
        }
        
        setCampaigns(Array.isArray(data) ? data : []);

        // Fetch company profiles for the dropdown
        const profilesResponse = await getCompanyProfiles();
        if (profilesResponse && profilesResponse.profiles) {
          // We only need completed profiles for association
          const completedProfiles = profilesResponse.profiles.filter(p => p.status === 'completed');
          setCompanyProfiles(completedProfiles);
        }

      } catch (apiError) {
        console.error('[CAMPAIGNS_LIST] API error fetching campaigns:', apiError);
        console.error('[CAMPAIGNS_LIST] API error message:', apiError.message);
        
        // Extract more details from the error if possible
        let errorMessage = `API error: ${apiError.message}`;
        
        // Look for JSON in the error message
        try {
          const errorMatch = apiError.message.match(/\{.*\}/);
          if (errorMatch) {
            const errorJson = JSON.parse(errorMatch[0]);
            errorMessage = `API error: ${errorJson.error} - ${errorJson.details || 'No details provided'}`;
          }
        } catch (parseError) {
          console.error('[CAMPAIGNS_LIST] Could not parse error details:', parseError);
        }
        
        setError(errorMessage);
        setCampaigns([]);
      }
    } catch (err) {
      console.error('[CAMPAIGNS_LIST] Error in campaign fetch process:', err);
      setError(`Failed to load campaigns: ${err.message}`);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchCampaigns();
  }, [adAccountId, refreshTrigger]);
  
  // Handle campaign selection
  const handleCampaignSelect = (campaignId) => {
    // Find the selected campaign
    const selectedCampaign = campaigns.find(campaign => campaign.id === campaignId);
    if (selectedCampaign) {
      console.log(`[CAMPAIGNS_LIST] Selected campaign with internal ID: ${selectedCampaign.id}`);
      onCampaignSelect(campaignId);
    } else {
      onCampaignSelect('');
    }
  };
  
  const handleProfileSelection = async (campaignId, profileId) => {
    const originalCampaigns = [...campaigns];
    
    // Optimistically update the UI
    const updatedCampaigns = campaigns.map(c => 
      c.id === campaignId ? { ...c, company_profile_id: profileId } : c
    );
    setCampaigns(updatedCampaigns);

    const promise = associateProfileToCampaign(campaignId, profileId);

    toast.promise(promise, {
      loading: 'Linking profile to campaign...',
      success: (data) => {
        if (data.success) {
          return 'Profile linked successfully!';
        } else {
          // This will trigger the error block
          throw new Error(data.message || 'Failed to link profile.');
        }
      },
      error: (err) => {
        // Revert UI on failure
        setCampaigns(originalCampaigns);
        return `Error: ${err.toString()}`;
      }
    });
  };

  const handleRowClick = (campaignId, campaignName) => {
    router.push({
      pathname: `/reports/`,
      query: {
        campaignId: campaignId,
        adAccountId: adAccountId,
        campaignName: campaignName
      },
    });
  };
  
  if (loading) {
    return <div className="p-4 text-center">Loading campaigns...</div>;
  }
  
  if (error) {
    return (
      <div className="p-4 border border-red-300 bg-red-50 rounded-md">
        <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Campaigns</h3>
        <p className="text-red-700 mb-4">{error}</p>
        
        <div className="bg-white p-3 rounded-md mb-4">
          <h4 className="font-medium mb-2">Troubleshooting Steps:</h4>
          <ul className="list-disc pl-5 text-sm">
            <li>Try refreshing the page</li>
            <li>Check if you have campaigns in this Ad Account</li>
            <li>Verify your Meta API connection is still valid</li>
            <li>Try re-syncing your campaign data</li>
          </ul>
        </div>
        
        <div className="flex justify-center">
          <button
            onClick={handleSyncCampaigns}
            disabled={syncing}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {syncing ? 'Syncing...' : 'Try Re-Syncing Campaign Data'}
          </button>
        </div>
      </div>
    );
  }
  
  if (!campaigns || campaigns.length === 0) {
    return (
      <div className="p-4 border border-gray-300 bg-gray-50 rounded-md">
        <h3 className="text-lg font-medium text-gray-800 mb-2">No Campaigns Found</h3>
        <p className="text-gray-700 mb-4">
          We couldn't find any campaigns for this ad account. This could be because:
        </p>
        
        <ul className="list-disc pl-5 text-sm mb-4">
          <li>You don't have any campaigns in this Meta Ad Account</li>
          <li>Your campaign data hasn't been synced yet</li>
          <li>There might be an issue with the Meta API connection</li>
        </ul>
        
        <div className="flex justify-center">
          <button
            onClick={handleSyncCampaigns}
            disabled={syncing}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {syncing ? 'Syncing...' : 'Sync Campaign Data'}
          </button>
        </div>
        
        {syncSuccess && (
          <div className="mt-3 p-2 bg-green-100 border border-green-300 text-green-700 rounded-md text-center">
            Sync completed successfully! Your campaigns should appear shortly.
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div className="p-4">
      {syncSuccess && (
        <div className="mb-4 p-2 bg-green-100 border border-green-300 text-green-700 rounded-md text-center">
          Sync completed successfully!
        </div>
      )}
      
      <div className="mb-4">
        <label htmlFor="campaign-select" className="block text-sm font-medium text-gray-700 mb-1">
          Select Campaign
        </label>
        <select
          id="campaign-select"
          value={selectedCampaignId || ''}
          onChange={(e) => handleCampaignSelect(e.target.value)}
          className="block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Campaigns</option>
          {campaigns.map((campaign) => (
            <option key={campaign.id} value={campaign.id}>
              {campaign.name} ({campaign.meta_campaign_id})
            </option>
          ))}
        </select>
      </div>
      
      <div className="mt-4 text-right">
        <button
          onClick={handleSyncCampaigns}
          disabled={syncing}
          className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50"
        >
          {syncing ? 'Syncing...' : 'Refresh Campaign Data'}
        </button>
      </div>
      
      <div className="mt-4">
        <div className="bg-white shadow-lg rounded-2xl overflow-hidden border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Campaign Name</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Objective</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Associated Company Profile</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-50 transition-colors duration-200 cursor-pointer" onClick={() => handleRowClick(campaign.id, campaign.name)}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">{campaign.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {campaign.status || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {campaign.objective || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={campaign.company_profile_id || ''}
                        onChange={(e) => handleProfileSelection(campaign.id, e.target.value)}
                        className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md shadow-sm"
                        disabled={companyProfiles.length === 0}
                      >
                        <option value="">{companyProfiles.length > 0 ? 'Select a profile...' : 'No profiles available'}</option>
                        {companyProfiles.map(profile => (
                          <option key={profile.profile_id} value={profile.profile_id}>
                            {profile.company_name}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignsList;
