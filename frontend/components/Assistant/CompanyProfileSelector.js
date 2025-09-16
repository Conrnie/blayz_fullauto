import React, { useState, useEffect } from 'react';
import { getCompanyProfiles } from '../../lib/apiClient';

const CompanyProfileSelector = ({ onSelect, selectedProfile }) => {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedProfile, setExpandedProfile] = useState(null);

  // Fetch real company profiles from the user's account
  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await getCompanyProfiles();
        
        if (response && response.profiles) {
          // Filter for completed profiles and transform data
          const completedProfiles = response.profiles
            .filter(profile => profile.status === 'completed')
            .map(profile => ({
              id: profile.profile_id,
              profile_id: profile.profile_id,
              name: profile.company_name,
              industry: profile.display_summary?.industry,
              brandVoice: profile.display_summary?.brand_voice || 'Professional',
              targetAudience: profile.display_summary?.target_audience || 'General audience',
              logo: '🏢', // Default logo, could be enhanced later
              description: profile.display_summary?.displayed_summary || profile.display_summary?.summary || 'AI-generated company profile',
              adStyles: ['Professional', 'Brand-focused'], // Default styles, could be enhanced
              brandColors: profile.display_summary?.brand_colors || null,
              website_url: profile.website_url,
              created_at: profile.created_at,
              full_profile: profile.full_profile
            }));
          
          setProfiles(completedProfiles);
        } else {
          setProfiles([]);
        }
      } catch (err) {
        console.error('Error fetching company profiles:', err);
        setError('Failed to load company profiles. Please try again.');
        setProfiles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProfiles();
  }, []);

  const handleProfileSelect = (profile) => {
    onSelect(profile);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-slate-400">Loading your company profiles...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">
          <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Profiles</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Select Company Profile
      </h2>
      <p className="text-gray-600 mb-8">
        Choose the company profile that matches your campaign. This helps me create on-brand creatives and messaging.
      </p>
      
      {profiles.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-2m-2 0H7m5 0v-5a2 2 0 00-2-2H8a2 2 0 00-2 2v5m5 0V9a2 2 0 012-2h2a2 2 0 012 2v12" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Company Profiles Found</h3>
          <p className="text-gray-600 mb-6">You need to create a company profile first to proceed with automation setup.</p>
          <a 
            href="/company-profiles" 
            className="inline-flex items-center px-6 py-3 bg-[#FE8401] text-white rounded-lg hover:bg-[#FE8401]/90 transition-colors font-medium"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create Company Profile
          </a>
        </div>
      ) : (
        <div className="space-y-3">
        {profiles.map((profile) => (
          <div
            key={profile.id}
            className={`
              rounded-lg border transition-all
              ${selectedProfile?.id === profile.id
                ? 'border-[#FE8401] bg-orange-50'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
              }
            `}
          >
            <div 
              onClick={() => handleProfileSelect(profile)}
              className="p-4 cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">{profile.logo}</div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      {profile.name}
                    </h3>
                    <p className="text-[#FE8401] text-sm font-medium">
                      {profile.industry}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {selectedProfile?.id === profile.id && (
                    <div className="text-[#FE8401]">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedProfile(expandedProfile === profile.id ? null : profile.id);
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg 
                      className={`w-5 h-5 transition-transform ${expandedProfile === profile.id ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            
            {expandedProfile === profile.id && (
              <div className="px-4 pb-4 border-t border-gray-100">
                <div className="pt-3">
                  <p className="text-gray-600 text-sm mb-3">{profile.description}</p>
                  
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <div className="text-gray-500 text-xs mb-1">Brand Voice</div>
                      <div className="text-gray-900 text-sm font-medium">{profile.brandVoice}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs mb-1">Target Audience</div>
                      <div className="text-gray-900 text-sm font-medium">{profile.targetAudience}</div>
                    </div>
                  </div>
                  
                  {profile.brandColors && (
                    <div className="mb-3">
                      <div className="text-gray-500 text-xs mb-2">Brand Colors</div>
                      <div className="flex flex-wrap gap-2">
                        {profile.brandColors.primary && (
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-3 h-3 rounded border border-gray-300" 
                              style={{ backgroundColor: profile.brandColors.primary }}
                            ></div>
                            <span className="text-xs text-gray-600">Primary</span>
                          </div>
                        )}
                        {profile.brandColors.secondary && (
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-3 h-3 rounded border border-gray-300" 
                              style={{ backgroundColor: profile.brandColors.secondary }}
                            ></div>
                            <span className="text-xs text-gray-600">Secondary</span>
                          </div>
                        )}
                        {profile.brandColors.accent && (
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-3 h-3 rounded border border-gray-300" 
                              style={{ backgroundColor: profile.brandColors.accent }}
                            ></div>
                            <span className="text-xs text-gray-600">Accent</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <div className="text-gray-500 text-xs mb-2">Ad Styles</div>
                    <div className="flex flex-wrap gap-1">
                      {profile.adStyles.map((style, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium"
                        >
                          {style}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
        </div>
      )}
      
      {profiles.length > 0 && (
        <div className="mt-6">
          <a 
            href="/company-profiles" 
            className="text-[#FE8401] hover:text-[#FE8401]/80 text-sm font-medium inline-flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create New Company Profile
          </a>
        </div>
      )}
      
      {!selectedProfile && profiles.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-blue-700 text-sm">
            💡 Your company profile determines the brand voice, style, and targeting approach for automated creatives.
          </p>
        </div>
      )}
    </div>
  );
};

export default CompanyProfileSelector;