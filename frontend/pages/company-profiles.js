import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { createCompanyProfile, getCompanyProfiles, deleteCompanyProfile } from '../lib/apiClient';
import supabase from '../lib/supabase';

export default function CompanyProfilesPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [deleteMode, setDeleteMode] = useState(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadProfiles();

    // Set up real-time subscription for profile updates
    const subscription = supabase
      .channel('company_profiles_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'company_profiles' 
        }, 
        (payload) => {
          console.log('🔄 Real-time profile update received:', payload);
          handleProfileUpdate(payload);
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
        setConnectionStatus(status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time subscription active for company profiles');
          setRealtimeConnected(true);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Real-time subscription error');
          setRealtimeConnected(false);
        } else if (status === 'CLOSED') {
          console.warn('🔌 Real-time subscription closed');
          setRealtimeConnected(false);
        }
      });

    // Fallback: Set up polling for profiles that are still processing (only if real-time fails)
    let pollInterval;
    const startPolling = () => {
      pollInterval = setInterval(async () => {
        try {
          const response = await getCompanyProfiles();
          if (response && response.profiles) {
            const hasProcessingProfiles = response.profiles.some(p => 
              p.status === 'processing' || p.status === 'pending'
            );
            
            if (hasProcessingProfiles) {
              console.log('🔄 Polling: Found processing profiles, checking for updates...');
              // Transform and update profiles
              const transformedProfiles = response.profiles.map(profile => ({
                id: profile.profile_id,
                profile_id: profile.profile_id,
                name: profile.company_name,
                website: profile.website_url,
                description: profile.display_summary?.summary || profile.display_summary?.displayed_summary || "AI analysis in progress...",
                industry: profile.display_summary?.industry || "Analyzing...",
                created_at: profile.created_at,
                last_updated_at: profile.last_updated_at,
                status: profile.status || 'unknown',
                error_message: profile.error_message,
                insights: {
                  employees: "Analyzing...",
                  revenue: "Analyzing...",
                  location: "Analyzing..."
                }
              }));
              
              setProfiles(prev => {
                // Check if any profile status has actually changed
                const hasChanges = transformedProfiles.some(newProfile => {
                  const existingProfile = prev.find(p => p.id === newProfile.id);
                  return existingProfile && existingProfile.status !== newProfile.status;
                });
                
                if (hasChanges) {
                  console.log('📊 Polling: Profile status changes detected, updating...');
                  // Show toast for newly completed profiles
                  transformedProfiles.forEach(newProfile => {
                    const existingProfile = prev.find(p => p.id === newProfile.id);
                    if (existingProfile && existingProfile.status !== newProfile.status) {
                      if (newProfile.status === 'completed') {
                        showToast(`✅ Profile for ${newProfile.name} is ready!`, 'success');
                      } else if (newProfile.status === 'failed') {
                        showToast(`❌ Profile generation failed for ${newProfile.name}`, 'error');
                      }
                    }
                  });
                  return transformedProfiles;
                }
                return prev;
              });
            } else {
              // No processing profiles, can stop polling
              console.log('🛑 No processing profiles found, stopping polling');
              clearInterval(pollInterval);
            }
          }
        } catch (error) {
          console.error('Polling error:', error);
        }
      }, 10000); // Poll every 10 seconds
    };

    // Start polling after a delay if real-time doesn't connect
    const fallbackTimer = setTimeout(() => {
      if (!realtimeConnected) {
        console.log('🔄 Real-time not connected after 5 seconds, starting fallback polling...');
        startPolling();
      }
    }, 5000);

    return () => {
      console.log('🔌 Unsubscribing from real-time updates');
      subscription.unsubscribe();
      clearTimeout(fallbackTimer);
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, []); // Remove realtimeConnected from dependencies to avoid infinite loop



  const loadProfiles = async () => {
    setLoading(true);
    try {
      const response = await getCompanyProfiles();
      
      if (response && response.profiles) {
        // Transform backend response to match frontend format
        const transformedProfiles = response.profiles.map(profile => ({
          id: profile.profile_id,
          profile_id: profile.profile_id,
          name: profile.company_name,
          website: profile.website_url,
          description: profile.display_summary?.displayed_summary || profile.display_summary?.summary || 
                      (profile.full_profile?.displayed_summary) || "AI analysis in progress...",
          industry: profile.display_summary?.industry || profile.full_profile?.industry || "Analyzing...",
          created_at: profile.created_at,
          last_updated_at: profile.last_updated_at,
          status: profile.status || 'unknown',
          error_message: profile.error_message,
          location: profile.display_summary?.location || profile.full_profile?.location || "Analyzing..."
        }));
        setProfiles(transformedProfiles);
        setError(null); // Clear any previous errors
      } else {
        setProfiles([]);
      }
    } catch (err) {
      console.error('Failed to load profiles:', err);
      // Only show the error message in toast, don't break the page
      showToast('Failed to load company profiles. Please refresh the page.', 'error');
      // Don't set error state so the page stays functional
      // Keep existing profiles if any
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = (payload) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    setProfiles(currentProfiles => {
      switch (eventType) {
        case 'INSERT':
          // Transform the database record to match our frontend format
          const newProfile = transformDatabaseRecord(newRecord);
          // Check if profile already exists (to prevent duplicates from manual creation)
          const exists = currentProfiles.some(p => p.id === newProfile.id);
          if (exists) {
            return currentProfiles;
          }
          return [newProfile, ...currentProfiles];
        case 'UPDATE':
          return currentProfiles.map(profile => 
            profile.id === newRecord.profile_id ? transformDatabaseRecord(newRecord) : profile
          );
        case 'DELETE':
          return currentProfiles.filter(profile => profile.id !== oldRecord.profile_id);
        default:
          return currentProfiles;
      }
    });
    
    // Show toast notification for status changes
    if (eventType === 'UPDATE') {
      const status = newRecord.status; // Use the dedicated status column
      if (status === 'completed') {
        showToast(`✅ Profile for ${newRecord.company_name} is ready!`, 'success');
      } else if (status === 'failed') {
        showToast(`❌ Profile generation failed for ${newRecord.company_name}`, 'error');
      }
    }
  };

  const transformDatabaseRecord = (record) => {
    const status = record.status || 'unknown'; // Use the dedicated status column
    const displaySummary = record.display_summary || {};
    
    return {
      id: record.profile_id,
      profile_id: record.profile_id,
      name: record.company_name,
      website: record.website_url,
      description: displaySummary.summary || displaySummary.displayed_summary || "AI analysis in progress...",
      industry: displaySummary.industry || "Analyzing...",
      created_at: record.created_at,
      last_updated_at: record.last_updated_at,
      status: status,
      error_message: record.general_summary?.error,
      insights: {
        employees: "Analyzing...",
        revenue: "Analyzing...",
        location: "Analyzing..."
      }
    };
  };

  const showToast = (message, type = 'info') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleCreateProfile = async (websiteUrl, companyName) => {
    setIsCreating(true);
    try {
      const response = await createCompanyProfile(companyName, websiteUrl);
      
      if (response && response.success) {
        console.log('Profile creation started:', response);
        setShowCreateModal(false);
        showToast(`✨ Profile creation started for ${companyName}! You'll be notified when it's ready.`, 'info');
        
        // Immediately add the new profile to the list so users can see it's processing
        const newProfile = {
          id: response.profile_id,
          profile_id: response.profile_id,
          name: companyName,
          website: websiteUrl,
          description: "AI analysis in progress...",
          industry: "Analyzing...",
          created_at: new Date().toISOString(),
          last_updated_at: new Date().toISOString(),
          status: "processing",
          error_message: null,
          insights: {
            employees: "Analyzing...",
            revenue: "Analyzing...",
            location: "Analyzing..."
          }
        };
        
        // Add to the beginning of the list
        setProfiles(prevProfiles => [newProfile, ...prevProfiles]);
        
        // The real-time subscription will handle updating it when complete
      } else {
        throw new Error(response?.message || 'Failed to create profile');
      }
    } catch (err) {
      console.error('Error creating profile:', err);
      
      // Handle specific error types
      let errorMessage = 'Failed to create profile';
      
      if (err.message === 'Unprocessable Content') {
        errorMessage = 'Please include "www." in your domain (e.g., "www.example.com")';
      } else if (err.message.includes('include')) {
        errorMessage = err.message; // Use the backend's helpful message
      } else {
        errorMessage = `Failed to create profile: ${err.message}`;
      }
      
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteProfile = async (profile) => {
    setIsDeleting(true);
    try {
      const response = await deleteCompanyProfile(profile.id);
      
      if (response && response.success) {
        // Remove from the local state immediately
        setProfiles(prevProfiles => prevProfiles.filter(p => p.id !== profile.id));
        const successMessage = profile.status === 'processing' || profile.status === 'pending' 
          ? `✅ Profile "${profile.name}" canceled successfully`
          : `✅ Profile "${profile.name}" deleted successfully`;
        showToast(successMessage, 'success');
        setShowDeleteConfirm(null);
        // Clear delete mode for this profile
        setDeleteMode(prev => {
          const newSet = new Set(prev);
          newSet.delete(profile.id);
          return newSet;
        });
      } else {
        throw new Error(response?.message || 'Failed to delete profile');
      }
    } catch (err) {
      console.error('Error deleting profile:', err);
      showToast(`❌ Failed to delete profile: ${err.message}`, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleDeleteMode = (profileId) => {
    setDeleteMode(prev => {
      const newSet = new Set(prev);
      if (newSet.has(profileId)) {
        newSet.delete(profileId);
      } else {
        newSet.add(profileId);
      }
      return newSet;
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', text: 'Pending', icon: 'clock' },
      processing: { color: 'bg-blue-100 text-blue-800', text: 'Processing...', icon: 'spinner' },
      completed: { color: 'bg-green-100 text-green-800', text: 'Ready', icon: 'check' },
      failed: { color: 'bg-red-100 text-red-800', text: 'Failed', icon: 'x' }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color} flex items-center gap-1`}>
        {config.icon === 'spinner' && (
          <div className="animate-spin h-3 w-3 border border-current rounded-full border-t-transparent"></div>
        )}
        {config.icon === 'check' && (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )}
        {config.icon === 'x' && (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        )}
        {config.icon === 'clock' && (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        {config.text}
      </span>
    );
  };

  const viewProfile = (profile) => {
    if (profile.status === 'completed') {
      router.push(`/company-profiles/${profile.id}`);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return (
          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'processing':
      case 'pending':
        return (
          <svg className="w-4 h-4 text-yellow-500 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        );
      case 'failed':
        return (
          <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const activeProfiles = profiles.filter(p => p.status === 'completed').length;
  const processingProfiles = profiles.filter(p => p.status === 'processing' || p.status === 'pending').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Top wave decoration */}
      <div className="absolute top-0 left-0 right-0 h-64 overflow-hidden -z-10 opacity-70">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" className="w-full h-full">
          <path fill="#FFF5E9" fillOpacity="1" d="M0,224L48,213.3C96,203,192,181,288,160C384,139,480,117,576,122.7C672,128,768,160,864,186.7C960,213,1056,235,1152,213.3C1248,192,1344,128,1392,96L1440,64L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"></path>
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        {/* Toast Notification */}
        {toastMessage && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
            toastMessage.type === 'success' ? 'bg-green-500 text-white' :
            toastMessage.type === 'error' ? 'bg-red-500 text-white' :
            'bg-blue-500 text-white'
          }`}>
            {toastMessage.message}
          </div>
        )}

        {/* Header Section */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-extrabold text-secondary mb-4 tracking-tight">
              Company <span className="text-primary">Profiles</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Unlock AI-powered business insights by analyzing company websites. Create detailed profiles to enhance your campaign targeting and strategy.
            </p>
          </div>

          {/* Real-time Connection Status */}
          <div className="flex justify-center mb-4">
            <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2 ${
              connectionStatus === 'SUBSCRIBED' ? 'bg-green-100 text-green-800' :
              connectionStatus === 'CHANNEL_ERROR' ? 'bg-red-100 text-red-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === 'SUBSCRIBED' ? 'bg-green-500 animate-pulse' :
                connectionStatus === 'CHANNEL_ERROR' ? 'bg-red-500' :
                'bg-yellow-500 animate-pulse'
              }`}></div>
              {connectionStatus === 'SUBSCRIBED' ? 'Live Updates Active' :
               connectionStatus === 'CHANNEL_ERROR' ? 'Connection Failed' :
               'Connecting...'}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center">
                <div className="bg-gradient-to-br from-primary to-primary/80 rounded-xl p-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Profiles</p>
                  <p className="text-2xl font-bold text-gray-900">{profiles.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center">
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Active Profiles</p>
                  <p className="text-2xl font-bold text-gray-900">{activeProfiles}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center">
                <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Processing</p>
                  <p className="text-2xl font-bold text-gray-900">{processingProfiles}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Create Profile CTA */}
          <div className="text-center">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-primary/90 to-primary text-white font-semibold rounded-2xl shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 hover:from-primary hover:to-primary/80 focus:outline-none focus:ring-4 focus:ring-primary/50"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create New Profile
            </button>
          </div>
        </div>

        {/* Profiles Grid */}
        <div className="mb-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-gray-200 border-t-primary rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 bg-gradient-to-r from-primary to-primary/80 rounded-full animate-pulse"></div>
                </div>
              </div>
              <p className="mt-6 text-lg text-gray-600 font-medium">Loading your company profiles...</p>
              <p className="text-sm text-gray-500">This may take a few moments</p>
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <div className="bg-red-50 border border-red-200 rounded-2xl p-8 max-w-md mx-auto">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.832-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-red-800 mb-2">Unable to Load Profiles</h3>
                <p className="text-red-600 mb-6">{error}</p>
                <button
                  onClick={loadProfiles}
                  className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : profiles.length === 0 ? (
            <div className="text-center py-20">
              <div className="bg-white rounded-3xl p-12 max-w-lg mx-auto border border-gray-200 shadow-xl">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-300 to-gray-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">No Company Profiles Yet</h3>
                <p className="text-gray-600 mb-8 text-lg leading-relaxed">
                  Get started by creating your first company profile. Our AI will analyze any website and extract valuable business insights to enhance your campaign targeting.
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-primary/90 to-primary text-white font-semibold rounded-2xl shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create Your First Profile
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {profiles.map((profile, index) => (
                <div
                  key={profile.id}
                  className="group bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden hover:shadow-2xl hover:border-gray-200 transition-all duration-500 transform hover:-translate-y-2"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Card Header */}
                  <div className="p-6 pb-4">
                    {/* Status Badge - Stacked on top */}
                    <div className="flex justify-start mb-4">
                      {getStatusBadge(profile.status)}
                    </div>
                    
                    {/* Company Info - Below status */}
                    <div className="mb-4">
                      <div className="flex items-center mb-2">
                        <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary transition-colors duration-300">
                          {profile.name}
                        </h3>
                        <div className="ml-2">
                          {getStatusIcon(profile.status)}
                        </div>
                      </div>
                      <a 
                        href={profile.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-gray-500 hover:text-primary transition-colors duration-200 flex items-center"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        {(profile.website || '').replace('https://', '').replace('http://', '') || 'No website provided'}
                      </a>
                    </div>

                    <p className="text-gray-600 leading-relaxed mb-6 line-clamp-3">
                      {profile.description}
                    </p>

                    {/* Industry Info */}
                    <div className="mb-6">
                      <div className="bg-gray-50 rounded-xl p-4">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-2">Industry</span>
                        <span className="text-sm font-semibold text-gray-900 leading-relaxed block">
                          {profile.industry}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500 mb-6">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {profile.location || 'Location unknown'}
                      </div>
                      <span>Created {formatDate(profile.created_at)}</span>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-t border-gray-100">
                    <div className="flex items-center space-x-3">
                      {profile.status === 'completed' ? (
                        <button 
                          onClick={() => {
                            if (deleteMode.has(profile.id)) {
                              setShowDeleteConfirm(profile);
                            } else {
                              viewProfile(profile);
                            }
                          }}
                          className={`flex-1 text-center py-2 px-4 font-semibold rounded-xl transition-all duration-300 border text-sm ${
                            deleteMode.has(profile.id) 
                              ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100 hover:text-red-700' 
                              : 'bg-white text-primary border-primary hover:bg-primary hover:text-white'
                          }`}
                        >
                          {deleteMode.has(profile.id) ? 'Delete Profile' : 'View Profile'}
                        </button>
                      ) : profile.status === 'failed' ? (
                        <button 
                          onClick={() => {
                            if (deleteMode.has(profile.id)) {
                              setShowDeleteConfirm(profile);
                            }
                          }}
                          className={`flex-1 text-center py-2 px-4 font-semibold rounded-xl transition-all duration-300 border text-sm ${
                            deleteMode.has(profile.id) 
                              ? 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200 hover:text-red-800' 
                              : 'bg-red-50 text-red-600 border-red-200 cursor-default'
                          }`}
                        >
                          {deleteMode.has(profile.id) ? 'Delete Profile' : 'Generation Failed'}
                        </button>
                      ) : (
                        <button 
                          onClick={() => {
                            if (deleteMode.has(profile.id)) {
                              setShowDeleteConfirm(profile);
                            }
                          }}
                          className={`flex-1 text-center py-2 px-4 font-semibold rounded-xl transition-all duration-300 border text-sm flex items-center justify-center gap-2 ${
                            deleteMode.has(profile.id) 
                              ? 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200 hover:text-red-800' 
                              : 'bg-yellow-50 text-yellow-600 border-yellow-200 cursor-default'
                          }`}
                        >
                          {deleteMode.has(profile.id) ? (
                            'Cancel Profile'
                          ) : (
                            <>
                              <div className="animate-spin h-3 w-3 border border-current rounded-full border-t-transparent"></div>
                              {profile.status === 'pending' ? 'Pending...' : 'Processing...'}
                            </>
                          )}
                        </button>
                      )}
                      <button 
                        onClick={() => toggleDeleteMode(profile.id)}
                        className={`p-2 rounded-xl transition-all duration-300 ${
                          deleteMode.has(profile.id) 
                            ? 'text-red-600 hover:text-red-700 hover:bg-red-50' 
                            : 'text-gray-500 hover:text-gray-700 hover:bg-white'
                        }`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <DeleteConfirmationModal
            isOpen={!!showDeleteConfirm}
            profile={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(null)}
            onConfirm={() => handleDeleteProfile(showDeleteConfirm)}
            isDeleting={isDeleting}
          />
        )}

        {/* Create Profile Modal */}
        {showCreateModal && (
          <CreateProfileModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onSubmit={handleCreateProfile}
            isCreating={isCreating}
          />
        )}
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

// Enhanced Create Profile Modal Component
function CreateProfileModal({ isOpen, onClose, onSubmit, isCreating }) {
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // Basic URL validation
    if (!websiteUrl.trim()) {
      setError('Please enter a website URL');
      return;
    }

    // Company name validation
    if (!companyName.trim()) {
      setError('Please enter a company name');
      return;
    }

    // Simple URL validation
    try {
      new URL(websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`);
    } catch {
      setError('Please enter a valid website URL');
      return;
    }

    onSubmit(websiteUrl, companyName);
  };

  const handleClose = () => {
    // Allow closing anytime, but warn if creating
    setWebsiteUrl('');
    setCompanyName('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden transform transition-all duration-300">
        <div className="relative overflow-hidden">
          <div className="bg-gradient-to-r from-secondary to-secondary/80 px-8 py-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white">Create Company Profile</h3>
                <p className="bg-primary text-white mt-1 font-medium px-3 py-1 rounded-full text-sm">AI-powered business insights from any website</p>
              </div>
              <button
                onClick={handleClose}
                className="text-white/70 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-xl"
                title={isCreating ? "Close (profile will continue processing)" : "Close"}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Decorative pattern */}
          <div className="absolute top-0 right-0 -mt-6 -mr-6 h-24 w-24 rounded-full bg-white/10 blur-xl"></div>
          <div className="absolute bottom-0 left-0 -mb-6 -ml-6 h-16 w-16 rounded-full bg-white/10 blur-xl"></div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8">
          {isCreating ? (
            <div className="text-center py-12">
              <div className="relative mb-8">
                <div className="w-20 h-20 border-4 border-gray-200 border-t-secondary rounded-full animate-spin mx-auto"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-10 h-10 bg-gradient-to-r from-secondary to-secondary/80 rounded-full animate-pulse"></div>
                </div>
              </div>
              <h4 className="text-2xl font-bold text-gray-900 mb-3">Creating Profile</h4>
              <p className="text-gray-600 text-lg leading-relaxed">
                Our AI is analyzing the website and extracting valuable business insights. This process may take a few moments...
              </p>
              <div className="mt-6 flex items-center justify-center space-x-2 text-sm text-gray-500">
                <div className="w-2 h-2 bg-secondary rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              
              <div className="mt-8 text-center">
                <p className="text-sm text-gray-500 mb-4">
                  You can close this window. The profile will continue processing in the background and appear in your list when ready.
                </p>
                <button
                  onClick={handleClose}
                  className="py-2 px-6 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-300"
                >
                  Close Window
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-6 mb-8">
                <div>
                  <label htmlFor="companyName" className="block text-lg font-semibold text-gray-900 mb-3">
                    Company Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="companyName"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g., TechCorp Solutions"
                      className="block w-full rounded-2xl border-2 border-gray-200 shadow-sm focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all py-4 px-6 text-lg placeholder-gray-400"
                      disabled={isCreating}
                    />
                    <div className="absolute inset-y-0 right-0 pr-6 flex items-center pointer-events-none">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="website" className="block text-lg font-semibold text-gray-900 mb-3">
                    Company Website URL
                  </label>
                  {/* Show warning only if user has entered a URL without www. */}
                  {websiteUrl && !websiteUrl.startsWith('http') && !websiteUrl.includes('www.') && websiteUrl.includes('.') && (
                    <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <div className="flex items-start">
                        <svg className="w-4 h-4 text-amber-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <p className="text-amber-800 font-medium text-sm">Please include "www." in your domain</p>
                          <p className="text-amber-700 text-sm mt-1">
                            Try: <span className="font-mono bg-amber-100 px-1 rounded">www.{websiteUrl}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="relative">
                    <input
                      type="text"
                      id="website"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder="https://example.com"
                      className="block w-full rounded-2xl border-2 border-gray-200 shadow-sm focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all py-4 px-6 text-lg placeholder-gray-400"
                      disabled={isCreating}
                    />
                    <div className="absolute inset-y-0 right-0 pr-6 flex items-center pointer-events-none">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                      </svg>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <p className="text-red-700 font-medium">{error}</p>
                    </div>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-blue-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="text-blue-800 font-medium text-sm">How it works</p>
                      <p className="text-blue-700 text-sm leading-relaxed mt-1">
                        Our AI will analyze the website and create a comprehensive business profile with insights about industry, size, location, revenue estimates, and more to enhance your campaign targeting.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-4 px-6 border-2 border-gray-300 text-gray-700 font-semibold rounded-2xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-300"
                  disabled={isCreating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !websiteUrl.trim() || !companyName.trim()}
                  className="flex-1 py-4 px-6 bg-gradient-to-r from-secondary to-secondary/80 text-white font-semibold rounded-2xl hover:from-secondary/90 hover:to-secondary focus:outline-none focus:ring-4 focus:ring-primary/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5 disabled:transform-none"
                >
                  Create Profile
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
} 

// Delete Confirmation Modal Component
function DeleteConfirmationModal({ isOpen, profile, onClose, onConfirm, isDeleting }) {
  if (!isOpen || !profile) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        <div className="p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {profile.status === 'processing' || profile.status === 'pending' ? 'Cancel Profile' : 'Delete Profile'}
            </h3>
            <p className="text-gray-600 mb-6">
              {profile.status === 'processing' || profile.status === 'pending' ? (
                <>
                  Are you sure you want to cancel the profile generation for <span className="font-semibold">"{profile.name}"</span>? This will stop the current analysis process.
                </>
              ) : (
                <>
                  Are you sure you want to delete the profile for <span className="font-semibold">"{profile.name}"</span>? This action cannot be undone.
                </>
              )}
            </p>
            
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-red-800 font-medium text-sm">Warning</p>
                  <p className="text-red-700 text-sm mt-1">
                    {profile.status === 'processing' || profile.status === 'pending' ? (
                      'This will stop the current analysis and remove the profile from your dashboard.'
                    ) : (
                      'All associated data, insights, and analysis will be permanently deleted.'
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-6 border-2 border-gray-300 text-gray-700 font-semibold rounded-2xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-300"
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 py-3 px-6 bg-red-600 text-white font-semibold rounded-2xl hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5 disabled:transform-none flex items-center justify-center"
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  {profile.status === 'processing' || profile.status === 'pending' ? 'Canceling...' : 'Deleting...'}
                </>
              ) : (
                profile.status === 'processing' || profile.status === 'pending' ? 'Cancel Profile' : 'Delete Profile'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 