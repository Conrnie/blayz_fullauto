import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { getCompanyProfile } from '../../lib/apiClient';
import useAuth from '../../lib/useAuth';
import supabase from '../../lib/supabase';

export default function CompanyProfilePage() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (id) {
      loadProfile();
    }
  }, [id]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const response = await getCompanyProfile(id);
      if (response && response.profile) {
        setProfile(response.profile);
      } else {
        setError('Profile not found');
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
      setError('Failed to load company profile');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', text: 'Pending', icon: '⏳' },
      processing: { color: 'bg-blue-100 text-blue-800', text: 'Processing...', icon: '🔄' },
      completed: { color: 'bg-green-100 text-green-800', text: 'Ready', icon: '✅' },
      failed: { color: 'bg-red-100 text-red-800', text: 'Failed', icon: '❌' }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.color} flex items-center gap-2`}>
        <span>{config.icon}</span>
        {config.text}
      </span>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        {/* Top wave decoration */}
        <div className="absolute top-0 left-0 right-0 h-64 overflow-hidden -z-10 opacity-70">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" className="w-full h-full">
            <path fill="#FFF5E9" fillOpacity="1" d="M0,224L48,213.3C96,203,192,181,288,160C384,139,480,117,576,122.7C672,128,768,160,864,186.7C960,213,1056,235,1152,213.3C1248,192,1344,128,1392,96L1440,64L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"></path>
          </svg>
        </div>
        
        <div className="text-center relative">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-gray-200 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-gradient-to-r from-primary to-primary/80 rounded-full animate-pulse"></div>
            </div>
          </div>
          <p className="text-gray-600 text-lg font-medium">Loading company profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        {/* Top wave decoration */}
        <div className="absolute top-0 left-0 right-0 h-64 overflow-hidden -z-10 opacity-70">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" className="w-full h-full">
            <path fill="#FFF5E9" fillOpacity="1" d="M0,224L48,213.3C96,203,192,181,288,160C384,139,480,117,576,122.7C672,128,768,160,864,186.7C960,213,1056,235,1152,213.3C1248,192,1344,128,1392,96L1440,64L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"></path>
          </svg>
        </div>
        
        <div className="text-center relative">
          <div className="bg-white rounded-3xl shadow-xl p-12 max-w-md mx-auto border border-gray-200">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.832-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Profile Not Found</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => router.push('/company-profiles')}
              className="bg-gradient-to-r from-primary/90 to-primary text-white px-8 py-3 rounded-xl hover:from-primary hover:to-primary/80 transition-all duration-300 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Back to Profiles
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!profile || !profile.full_profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        {/* Top wave decoration */}
        <div className="absolute top-0 left-0 right-0 h-64 overflow-hidden -z-10 opacity-70">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" className="w-full h-full">
            <path fill="#FFF5E9" fillOpacity="1" d="M0,224L48,213.3C96,203,192,181,288,160C384,139,480,117,576,122.7C672,128,768,160,864,186.7C960,213,1056,235,1152,213.3C1248,192,1344,128,1392,96L1440,64L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"></path>
          </svg>
        </div>
        
        <div className="text-center relative">
          <div className="bg-white rounded-3xl shadow-xl p-12 max-w-md mx-auto border border-gray-200">
            <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Profile Still Processing</h2>
            <p className="text-gray-600 mb-6">This profile is still being analyzed. Please check back in a few minutes.</p>
            <button
              onClick={() => router.push('/company-profiles')}
              className="bg-gradient-to-r from-primary/90 to-primary text-white px-8 py-3 rounded-xl hover:from-primary hover:to-primary/80 transition-all duration-300 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Back to Profiles
            </button>
          </div>
        </div>
      </div>
    );
  }

  const fullProfile = profile.full_profile;

  const tabs = [
     { id: 'overview', name: 'Overview', icon: '📊' },
     { id: 'audience', name: 'Target Audience', icon: '🎯' },
     { id: 'avatars', name: 'Avatar Profiles', icon: '👥' },
     { id: 'marketing', name: 'Marketing Insights', icon: '📈' },
     { id: 'business', name: 'Business Details', icon: '🏢' }
   ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Top wave decoration */}
      <div className="absolute top-0 left-0 right-0 h-64 overflow-hidden -z-10 opacity-70">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" className="w-full h-full">
          <path fill="#FFF5E9" fillOpacity="1" d="M0,224L48,213.3C96,203,192,181,288,160C384,139,480,117,576,122.7C672,128,768,160,864,186.7C960,213,1056,235,1152,213.3C1248,192,1344,128,1392,96L1440,64L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"></path>
        </svg>
      </div>

      {/* Header */}
      <div className="bg-white shadow-xl border-b relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            {/* Back button */}
            <div className="mb-4">
              <button
                onClick={() => router.push('/company-profiles')}
                className="text-gray-500 hover:text-primary transition-colors text-sm font-medium flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Profiles
              </button>
            </div>
            
            {/* Company info and actions */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-secondary mb-2 tracking-tight">
                  {fullProfile.business_name || fullProfile.name || profile.company_name}
                </h1>
                <div className="flex items-center gap-4">
                  {getStatusBadge(profile.status)}
                  <span className="text-gray-500 text-sm">
                    Last updated {formatDate(profile.last_updated_at)}
                  </span>
                </div>
              </div>
              
              {profile.website_url && (
                <a 
                  href={profile.website_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-gradient-to-r from-primary/90 to-primary text-white px-6 py-3 rounded-xl hover:from-primary hover:to-primary/80 transition-all duration-300 font-medium flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Visit Website
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="border-b border-gray-200 mt-6">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center gap-2 transition-all duration-300 ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        {activeTab === 'overview' && <OverviewTab profile={fullProfile} />}
        {activeTab === 'audience' && <AudienceTab profile={fullProfile} />}
        {activeTab === 'avatars' && <AvatarProfilesTab profile={fullProfile} profileId={id} user={user} />}
        {activeTab === 'marketing' && <MarketingTab profile={fullProfile} />}
        {activeTab === 'business' && <BusinessTab profile={fullProfile} />}
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

// Overview Tab Component
function OverviewTab({ profile }) {
  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Company Overview</h2>
            <p className="text-gray-700 text-lg leading-relaxed mb-6">
              {profile.summary || 'Company summary not available'}
            </p>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h3 className="font-semibold text-orange-800 mb-2">📢 Marketing Summary</h3>
              <p className="text-orange-700">
                {profile.displayed_summary || profile.summary || 'Marketing summary not available'}
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <InfoCard title="🏢 Industry" value={profile.industry || 'Not specified'} />
            <InfoCard title="📍 Location" value={profile.location || 'Not specified'} />
            <InfoCard title="🎯 Primary Offering" value={profile.primary_offering || 'Not specified'} />
            <InfoCard title="🌍 Target Market" value={profile.target_market || 'Not specified'} />
          </div>
        </div>
      </div>

      {/* Key Differentiators */}
      {profile.key_differentiators && profile.key_differentiators.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">🌟 Key Differentiators</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {profile.key_differentiators.map((differentiator, index) => (
              <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-3">
                <span className="text-green-800 font-medium">{differentiator}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unique Value Proposition */}
      {profile.unique_value_proposition_uvp_inferred && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">💎 Unique Value Proposition</h3>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800 font-medium">{profile.unique_value_proposition_uvp_inferred}</p>
          </div>
        </div>
      )}

      {/* Branding */}
      {profile.branding && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">🎨 Brand Identity</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profile.branding.slogan_observed && (
              <InfoCard title="💬 Slogan" value={profile.branding.slogan_observed} />
            )}
            {profile.branding.brand_voice_inferred && (
              <InfoCard title="🗣️ Brand Voice" value={profile.branding.brand_voice_inferred} />
            )}
            {profile.branding.color_palette_observed && (
              <InfoCard title="🎨 Color Palette" value={profile.branding.color_palette_observed} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Audience Tab Component
function AudienceTab({ profile }) {
  const audience = profile.target_audience || {};
  
  return (
    <div className="space-y-6">
      {/* Primary Segments */}
      {audience.primary_segments_observed && audience.primary_segments_observed.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">👥 Primary Audience Segments</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {audience.primary_segments_observed.map((segment, index) => (
              <div key={index} className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <span className="text-purple-800 font-medium">{segment}</span>
              </div>
            ))}
          </div>
              </div>
            )}
            
      {/* Demographics & Psychographics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {audience.demographics_hints && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">📊 Demographics</h3>
            <p className="text-gray-700">{audience.demographics_hints}</p>
          </div>
        )}
        {audience.psychographics_hints && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">🧠 Psychographics</h3>
            <p className="text-gray-700">{audience.psychographics_hints}</p>
          </div>
        )}
      </div>

      {/* Pain Points */}
      {audience.observed_pain_points_solved && audience.observed_pain_points_solved.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">🔥 Pain Points Solved</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {audience.observed_pain_points_solved.map((painPoint, index) => (
              <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-3">
                <span className="text-red-800 font-medium">{painPoint}</span>
              </div>
            ))}
          </div>
              </div>
            )}
            
      {/* Key Needs */}
      {audience.key_needs_addressed_by_products && audience.key_needs_addressed_by_products.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">✅ Key Needs Addressed</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {audience.key_needs_addressed_by_products.map((need, index) => (
              <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <span className="text-blue-800 font-medium">{need}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Avatar Profiles Tab Component
function AvatarProfilesTab({ profile, profileId, user }) {
  const [avatars, setAvatars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAvatar, setEditingAvatar] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Function to fetch avatar profiles from Supabase
  const fetchAvatarProfiles = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/avatar-profiles?company_profile_id=${profileId || profile?.profile_id}`);
      
      if (response.ok) {
        const data = await response.json();
        // Process the data to extract persona data from appropriate JSONB field
        const processedAvatars = (data || []).map(avatar => {
          // Check if it's a user-created avatar or LLM-generated
          const isUserCreated = avatar.user_specific_customizations_and_notes?.created_by_user;
          const personaData = isUserCreated 
            ? avatar.user_specific_customizations_and_notes 
            : avatar.llm_synthesized_persona;
          
          return {
            ...avatar,
            id: avatar.profile_id, // Use profile_id as id for React keys
            name: avatar.avatar_name_or_title,
            description: avatar.initial_user_description,
            // Extract the persona data from the appropriate JSONB field
            ...(personaData || {}),
            isUserCreated
          };
        });
        setAvatars(processedAvatars);
      } else {
        console.error('Failed to fetch avatar profiles:', response.statusText);
        setAvatars([]);
      }
    } catch (error) {
      console.error('Error fetching avatar profiles:', error);
      setAvatars([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch avatar profiles on component mount
  useEffect(() => {
    if (profileId || profile?.profile_id) {
      fetchAvatarProfiles();
    }
  }, [profileId, profile?.profile_id]);

  const handleCreateAvatar = () => {
    setShowCreateModal(true);
  };

  const handleEditAvatar = (avatar) => {
    setEditingAvatar(avatar);
    setShowCreateModal(true);
  };

  const handleDeleteAvatar = (avatarId) => {
    if (confirm('Are you sure you want to delete this avatar profile?')) {
      setAvatars(prev => prev.filter(a => a.profile_id !== avatarId));
    }
  };

  const handleGenerateAvatars = async () => {
    try {
      // Count AI-generated avatars (those without isUserCreated flag)
      const aiGeneratedCount = avatars.filter(avatar => !avatar.isUserCreated).length;
      
      if (aiGeneratedCount >= 3) {
        alert('You have reached the maximum limit of 3 AI-generated avatars. Please delete some existing AI avatars to generate new ones.');
        return;
      }

      setIsGenerating(true);
      
      const webhookUrl = process.env.NEXT_PUBLIC_AVATAR_WEBHOOK_URL;
      if (!webhookUrl) {
        alert('Webhook URL not configured in environment variables');
        return;
      }

      const avatarData = {
        company_profile_id: profileId || profile?.profile_id,
        user_uuid: user?.id
      };

      console.log('Generating avatars for company profile:', avatarData);
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(avatarData)
      });

      if (response.ok) {
        alert('Avatar generation started! This process can take up to 5-6 minutes to complete. Please check back shortly.');
        console.log('Avatar generation response:', await response.text());
      } else {
        alert(`Avatar generation failed with status: ${response.status}`);
      }
    } catch (error) {
      console.error('Avatar generation error:', error);
      alert('Failed to start avatar generation. Check console for details.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3 text-gray-600">Loading avatar profiles...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Avatar Profiles</h2>
          <p className="text-gray-600 mt-1">Detailed customer personas for targeted marketing</p>
          <p className="text-sm text-gray-500 mt-1">
            AI Generated: {avatars.filter(avatar => !avatar.isUserCreated).length}/3 • 
            User Created: {avatars.filter(avatar => avatar.isUserCreated).length}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleCreateAvatar}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create Avatar
          </button>
          <button
            onClick={handleGenerateAvatars}
            disabled={isGenerating || avatars.filter(avatar => !avatar.isUserCreated).length >= 3}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              isGenerating || avatars.filter(avatar => !avatar.isUserCreated).length >= 3
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Generating...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                {avatars.filter(avatar => !avatar.isUserCreated).length >= 3 ? 'Limit Reached (3/3)' : 'Generate Avatars'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Avatar Grid */}
      {avatars.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Avatar Profiles Yet</h3>
          <p className="text-gray-600 mb-4">Create your first avatar profile to better understand your target audience</p>
          <button
            onClick={handleCreateAvatar}
            className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Create Your First Avatar
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {avatars.map((avatar) => (
            <AvatarCard
              key={avatar.profile_id}
              avatar={avatar}
              onEdit={() => handleEditAvatar(avatar)}
              onDelete={() => handleDeleteAvatar(avatar.profile_id)}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <CreateAvatarModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setEditingAvatar(null);
          }}
          avatar={editingAvatar}
          onSave={async (avatarData) => {
            if (editingAvatar) {
              // Edit existing avatar
              setAvatars(prev => prev.map(a => a.profile_id === editingAvatar.profile_id ? { ...avatarData, profile_id: editingAvatar.profile_id } : a));
            } else {
              // Create new user-generated avatar
              try {
                // Get the current session token from Supabase
                const { data: { session } } = await supabase.auth.getSession();
                const token = session?.access_token;
                
                if (!token) {
                  alert('Please log in to create an avatar.');
                  return;
                }
                
                const avatarPayload = {
                  company_profile_id: profileId || profile.profile_id,
                  avatar_name_or_title: avatarData.name,
                  initial_user_description: avatarData.description,
                  user_specific_customizations_and_notes: {
                    demographics: avatarData.demographics,
                    psychographics: avatarData.psychographics,
                    pain_points: avatarData.pain_points,
                    goals: avatarData.goals,
                    created_by_user: true,
                    created_at: new Date().toISOString()
                  }
                };

                const response = await fetch('/api/create-avatar-profile', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify(avatarPayload)
                });

                if (response.ok) {
                  console.log('User avatar created successfully');
                  // Refresh avatar list from database
                  await fetchAvatarProfiles();
                } else {
                  const errorData = await response.json();
                  console.error('Failed to create avatar:', errorData);
                  alert('Failed to create avatar. Please try again.');
                }
              } catch (error) {
                console.error('Error creating avatar:', error);
                alert('Error creating avatar. Please try again.');
              }
            }
            setShowCreateModal(false);
            setEditingAvatar(null);
          }}
        />
      )}
    </div>
  );
}

// Marketing Tab Component
function MarketingTab({ profile }) {
  const customerJourney = profile.customer_journey_inferred || {};
  const pricing = profile.pricing_strategy_observed || {};
  
  return (
    <div className="space-y-6">
      {/* Customer Journey */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-6">🛤️ Customer Journey Insights</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Awareness */}
          {customerJourney.awareness_channels_observed && customerJourney.awareness_channels_observed.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">📢 Awareness Channels</h4>
              <div className="space-y-2">
                {customerJourney.awareness_channels_observed.map((channel, index) => (
                  <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-lg p-2">
                    <span className="text-yellow-800">{channel}</span>
                  </div>
                ))}
              </div>
                </div>
              )}
              
          {/* Consideration */}
          {customerJourney.consideration_factors_highlighted && customerJourney.consideration_factors_highlighted.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">🤔 Consideration Factors</h4>
              <div className="space-y-2">
                {customerJourney.consideration_factors_highlighted.map((factor, index) => (
                  <div key={index} className="bg-orange-50 border border-orange-200 rounded-lg p-2">
                    <span className="text-orange-800">{factor}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {customerJourney.purchase_triggers_or_process_hint && (
            <InfoCard title="💳 Purchase Process" value={customerJourney.purchase_triggers_or_process_hint} />
          )}
          {customerJourney.retention_strategies_hint && (
            <InfoCard title="🔄 Retention Strategy" value={customerJourney.retention_strategies_hint} />
          )}
          {customerJourney.advocacy_drivers_hint && (
            <InfoCard title="📣 Advocacy Drivers" value={customerJourney.advocacy_drivers_hint} />
          )}
        </div>
      </div>

      {/* Pricing Strategy */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">💰 Pricing Strategy</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {pricing.pricing_model_hint && (
            <InfoCard title="📊 Pricing Model" value={pricing.pricing_model_hint} />
          )}
          {pricing.price_points_observed_or_range && (
            <InfoCard title="💵 Price Range" value={pricing.price_points_observed_or_range} />
          )}
          {pricing.competitive_positioning_on_price && (
            <InfoCard title="⚖️ Competitive Position" value={pricing.competitive_positioning_on_price} />
          )}
          {pricing.value_proposition_related_to_price && (
            <InfoCard title="💎 Value Proposition" value={pricing.value_proposition_related_to_price} />
          )}
        </div>
      </div>

      {/* Distribution Channels */}
      {profile.distribution_channels_observed && profile.distribution_channels_observed.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">🚚 Distribution Channels</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {profile.distribution_channels_observed.map((channel, index) => (
              <div key={index} className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                <span className="text-indigo-800 font-medium">{channel}</span>
              </div>
            ))}
          </div>
                </div>
              )}
    </div>
  );
}

// Business Tab Component
function BusinessTab({ profile }) {
  return (
    <div className="space-y-6">
      {/* Products & Services */}
      {profile.products_offers && profile.products_offers.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">🛍️ Products & Services</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {profile.products_offers.map((product, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">{product.name}</h4>
                <p className="text-gray-700 mb-3">{product.description}</p>
                {product.target_customer_hint && (
                  <div className="bg-gray-50 rounded-lg p-2">
                    <span className="text-sm text-gray-600">Target: {product.target_customer_hint}</span>
                </div>
              )}
              </div>
            ))}
            </div>
          </div>
        )}

      {/* Competitors */}
      {profile.competitor_overview_from_custom_knowledge_or_research && 
       profile.competitor_overview_from_custom_knowledge_or_research.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">🏆 Competitive Landscape</h3>
            <div className="space-y-4">
            {profile.competitor_overview_from_custom_knowledge_or_research.map((competitor, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">{competitor.competitor_name}</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {competitor.perceived_strengths && competitor.perceived_strengths.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-green-800 mb-2">💪 Strengths</h5>
                      <ul className="text-sm text-gray-700 space-y-1">
                        {competitor.perceived_strengths.map((strength, idx) => (
                          <li key={idx}>• {strength}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {competitor.perceived_weaknesses && competitor.perceived_weaknesses.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-red-800 mb-2">⚠️ Weaknesses</h5>
                      <ul className="text-sm text-gray-700 space-y-1">
                        {competitor.perceived_weaknesses.map((weakness, idx) => (
                          <li key={idx}>• {weakness}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {competitor.market_position_relative && (
                    <div>
                      <h5 className="text-sm font-medium text-blue-800 mb-2">📊 Market Position</h5>
                      <p className="text-sm text-gray-700">{competitor.market_position_relative}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Avatar Card Component
function AvatarCard({ avatar, onEdit, onDelete }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/40 rounded-full flex items-center justify-center">
            <span className="text-2xl">👤</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900">{avatar.name}</h3>
              {avatar.isUserCreated && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  👤 User Created
                </span>
              )}
              {!avatar.isUserCreated && avatar.llm_synthesized_persona && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  🤖 AI Generated
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600">{avatar.description}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-primary transition-colors"
            title="Edit avatar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
            title="Delete avatar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Demographics */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">📊 Demographics</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="bg-blue-50 rounded-lg p-2">
            <span className="text-blue-700 font-medium">Age:</span>
            <span className="text-blue-600 ml-1">{avatar.demographics?.age_range || 'N/A'}</span>
          </div>
          <div className="bg-green-50 rounded-lg p-2">
            <span className="text-green-700 font-medium">Income:</span>
            <span className="text-green-600 ml-1">{avatar.demographics?.annual_income_range || avatar.demographics?.income || 'N/A'}</span>
          </div>
          <div className="bg-purple-50 rounded-lg p-2">
            <span className="text-purple-700 font-medium">Gender:</span>
            <span className="text-purple-600 ml-1">{avatar.demographics?.gender || 'N/A'}</span>
          </div>
          <div className="bg-orange-50 rounded-lg p-2">
            <span className="text-orange-700 font-medium">Location:</span>
            <span className="text-orange-600 ml-1">{avatar.demographics?.geographic_focus?.[0] || avatar.demographics?.location || 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Psychographics */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">🧠 Psychographics</h4>
        <div className="space-y-2">
          <div>
            <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Values:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {(avatar.psychographics?.values_priorities || avatar.psychographics?.values || []).map((value, index) => (
                <span key={index} className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-full">
                  {value}
                </span>
              ))}
            </div>
          </div>
          <div>
            <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Interests:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {(avatar.psychographics?.interests || []).slice(0, 3).map((interest, index) => (
                <span key={index} className="bg-teal-100 text-teal-700 text-xs px-2 py-1 rounded-full">
                  {interest}
                </span>
              ))}
              {(avatar.psychographics?.interests || []).length > 3 && (
                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                  +{(avatar.psychographics?.interests || []).length - 3} more
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pain Points & Goals */}
      <div className="grid grid-cols-1 gap-3">
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-1">😰 Top Pain Points</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            {(avatar.pain_points_and_challenges?.secondary_pain_points || avatar.pain_points || []).slice(0, 2).map((point, index) => (
              <li key={index} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                {point}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-1">🎯 Key Goals</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            {(avatar.goals_and_aspirations?.career_advancement_goals || avatar.goals || []).slice(0, 2).map((goal, index) => (
              <li key={index} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                {goal}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// Create Avatar Modal Component
function CreateAvatarModal({ isOpen, onClose, avatar, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    demographics: {
      age_range: '',
      gender: '',
      income: '',
      location: ''
    },
    psychographics: {
      values: [],
      interests: [],
      lifestyle: ''
    },
    pain_points: [],
    goals: []
  });

  const [newValue, setNewValue] = useState('');
  const [newInterest, setNewInterest] = useState('');
  const [newPainPoint, setNewPainPoint] = useState('');
  const [newGoal, setNewGoal] = useState('');

  useEffect(() => {
    if (avatar) {
      setFormData({
        name: avatar.name || avatar.avatar_name_or_title || '',
        description: avatar.description || avatar.initial_user_description || '',
        demographics: {
          age_range: avatar.demographics?.age_range || avatar.age_range || '',
          gender: avatar.demographics?.gender || avatar.gender || '',
          income: avatar.demographics?.income || avatar.income || '',
          location: avatar.demographics?.location || avatar.location || ''
        },
        psychographics: {
          values: avatar.psychographics?.values || avatar.values || [],
          interests: avatar.psychographics?.interests || avatar.interests || [],
          lifestyle: avatar.psychographics?.lifestyle || avatar.lifestyle || ''
        },
        pain_points: avatar.pain_points || [],
        goals: avatar.goals || []
      });
    } else {
      setFormData({
        name: '',
        description: '',
        demographics: {
          age_range: '',
          gender: '',
          income: '',
          location: ''
        },
        psychographics: {
          values: [],
          interests: [],
          lifestyle: ''
        },
        pain_points: [],
        goals: []
      });
    }
  }, [avatar]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const addItem = (field, value, setter) => {
    if (value.trim()) {
      setFormData(prev => ({
        ...prev,
        [field]: [...prev[field], value.trim()]
      }));
      setter('');
    }
  };

  const addPsychographicItem = (field, value, setter) => {
    if (value.trim()) {
      setFormData(prev => ({
        ...prev,
        psychographics: {
          ...prev.psychographics,
          [field]: [...prev.psychographics[field], value.trim()]
        }
      }));
      setter('');
    }
  };

  const removeItem = (field, index) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const removePsychographicItem = (field, index) => {
    setFormData(prev => ({
      ...prev,
      psychographics: {
        ...prev.psychographics,
        [field]: prev.psychographics[field].filter((_, i) => i !== index)
      }
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {avatar ? 'Edit Avatar Profile' : 'Create New Avatar Profile'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Avatar Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="e.g., Tech-Savvy Professional"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Brief description of this avatar"
                  required
                />
              </div>
            </div>

            {/* Demographics */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 Demographics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Age Range</label>
                  <input
                    type="text"
                    value={formData.demographics.age_range}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      demographics: { ...prev.demographics, age_range: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="e.g., 25-35"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                  <select
                    value={formData.demographics.gender}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      demographics: { ...prev.demographics, gender: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Select gender</option>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Income Range</label>
                  <input
                    type="text"
                    value={formData.demographics.income}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      demographics: { ...prev.demographics, income: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="e.g., $60k-$120k"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                  <input
                    type="text"
                    value={formData.demographics.location}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      demographics: { ...prev.demographics, location: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="e.g., Urban areas"
                  />
                </div>
              </div>
            </div>

            {/* Psychographics */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">🧠 Psychographics</h3>
              
              {/* Values */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Values</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Add a value (e.g., Innovation)"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addPsychographicItem('values', newValue, setNewValue))}
                  />
                  <button
                    type="button"
                    onClick={() => addPsychographicItem('values', newValue, setNewValue)}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.psychographics.values.map((value, index) => (
                    <span key={index} className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                      {value}
                      <button
                        type="button"
                        onClick={() => removePsychographicItem('values', index)}
                        className="text-indigo-500 hover:text-indigo-700"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Interests */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Interests</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newInterest}
                    onChange={(e) => setNewInterest(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Add an interest (e.g., Technology)"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addPsychographicItem('interests', newInterest, setNewInterest))}
                  />
                  <button
                    type="button"
                    onClick={() => addPsychographicItem('interests', newInterest, setNewInterest)}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.psychographics.interests.map((interest, index) => (
                    <span key={index} className="bg-teal-100 text-teal-700 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                      {interest}
                      <button
                        type="button"
                        onClick={() => removePsychographicItem('interests', index)}
                        className="text-teal-500 hover:text-teal-700"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Lifestyle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Lifestyle</label>
                <input
                  type="text"
                  value={formData.psychographics.lifestyle}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    psychographics: { ...prev.psychographics, lifestyle: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="e.g., Fast-paced, digital-first"
                />
              </div>
            </div>

            {/* Pain Points */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">😰 Pain Points</h3>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newPainPoint}
                  onChange={(e) => setNewPainPoint(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Add a pain point (e.g., Time management)"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('pain_points', newPainPoint, setNewPainPoint))}
                />
                <button
                  type="button"
                  onClick={() => addItem('pain_points', newPainPoint, setNewPainPoint)}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Add
                </button>
              </div>
              <div className="space-y-2">
                {formData.pain_points.map((point, index) => (
                  <div key={index} className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg p-3">
                    <span className="text-red-700">{point}</span>
                    <button
                      type="button"
                      onClick={() => removeItem('pain_points', index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Goals */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">🎯 Goals</h3>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newGoal}
                  onChange={(e) => setNewGoal(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Add a goal (e.g., Career advancement)"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('goals', newGoal, setNewGoal))}
                />
                <button
                  type="button"
                  onClick={() => addItem('goals', newGoal, setNewGoal)}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Add
                </button>
              </div>
              <div className="space-y-2">
                {formData.goals.map((goal, index) => (
                  <div key={index} className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
                    <span className="text-green-700">{goal}</span>
                    <button
                      type="button"
                      onClick={() => removeItem('goals', index)}
                      className="text-green-500 hover:text-green-700"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                {avatar ? 'Update Avatar' : 'Create Avatar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Helper Component
function InfoCard({ title, value }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h4 className="text-sm font-medium text-gray-600 mb-1">{title}</h4>
      <p className="text-gray-900 font-medium">{value}</p>
    </div>
  );
}

// Required for dynamic routes in Next.js
export async function getServerSideProps(context) {
  const { id } = context.params;
  
  return {
    props: {
      id
    }
  };
}