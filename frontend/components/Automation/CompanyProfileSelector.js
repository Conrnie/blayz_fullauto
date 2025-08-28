import React, { useState, useEffect } from 'react';

const CompanyProfileSelector = ({ onSelect, selectedProfile }) => {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Mock company profiles - replace with actual data
  useEffect(() => {
    const mockProfiles = [
      {
        id: '1',
        name: 'TechSaaS Solutions',
        industry: 'Software/SaaS',
        brandVoice: 'Professional & Tech-forward',
        targetAudience: 'B2B Decision Makers',
        logo: '💻',
        description: 'Cloud-based software solutions for enterprises',
        adStyles: ['Clean', 'Professional', 'Data-driven']
      },
      {
        id: '2',
        name: 'FitLife Coaching',
        industry: 'Health & Fitness',
        brandVoice: 'Motivational & Energetic',
        targetAudience: 'Health-conscious individuals',
        logo: '💪',
        description: 'Personal fitness coaching and nutrition guidance',
        adStyles: ['Bold', 'Inspirational', 'Before/After']
      },
      {
        id: '3',
        name: 'Digital Marketing Pro',
        industry: 'Marketing Agency',
        brandVoice: 'Expert & Results-focused',
        targetAudience: 'Business owners & marketers',
        logo: '📈',
        description: 'Full-service digital marketing for growing businesses',
        adStyles: ['Results-focused', 'Case studies', 'Social proof']
      }
    ];
    
    setTimeout(() => {
      setProfiles(mockProfiles);
      setLoading(false);
    }, 800);
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

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Select Company Profile
      </h2>
      <p className="text-gray-600 mb-8">
        Choose the company profile that matches your campaign. This helps me create on-brand creatives and messaging.
      </p>
      
      <div className="space-y-4">
        {profiles.map((profile) => (
          <div
            key={profile.id}
            onClick={() => handleProfileSelect(profile)}
            className={`
              p-6 rounded-lg border cursor-pointer transition-all
              ${selectedProfile?.id === profile.id
                ? 'border-[#FE8401] bg-orange-50'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
              }
            `}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div className="text-3xl">{profile.logo}</div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {profile.name}
                  </h3>
                  <p className="text-[#FE8401] text-sm font-medium">
                    {profile.industry}
                  </p>
                </div>
              </div>
              
              {selectedProfile?.id === profile.id && (
                <div className="text-purple-400">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
            
            <p className="text-slate-300 text-sm mb-4">{profile.description}</p>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-slate-400 text-xs mb-1">Brand Voice</div>
                <div className="text-white text-sm">{profile.brandVoice}</div>
              </div>
              <div>
                <div className="text-slate-400 text-xs mb-1">Target Audience</div>
                <div className="text-white text-sm">{profile.targetAudience}</div>
              </div>
            </div>
            
            <div>
              <div className="text-slate-400 text-xs mb-2">Ad Styles</div>
              <div className="flex flex-wrap gap-2">
                {profile.adStyles.map((style, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-slate-600 text-slate-300 rounded text-xs"
                  >
                    {style}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6">
        <button className="text-purple-400 hover:text-purple-300 text-sm font-medium">
          + Create New Company Profile
        </button>
      </div>
      
      {!selectedProfile && (
        <div className="mt-6 p-4 bg-slate-700/50 rounded-lg border border-slate-600">
          <p className="text-slate-300 text-sm">
            💡 Your company profile determines the brand voice, style, and targeting approach for automated creatives.
          </p>
        </div>
      )}
    </div>
  );
};

export default CompanyProfileSelector;