import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { getCompanyProfile } from '../../lib/apiClient';

export default function CompanyProfilePage() {
  const router = useRouter();
  const { id } = router.query;
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
    { id: 'audience', name: 'Target Audience', icon: '👥' },
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

// Helper Component
function InfoCard({ title, value }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h4 className="text-sm font-medium text-gray-600 mb-1">{title}</h4>
      <p className="text-gray-900 font-medium">{value}</p>
    </div>
  );
} 