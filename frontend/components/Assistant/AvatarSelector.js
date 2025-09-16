import React, { useState, useEffect } from 'react';

const AvatarSelector = ({ companyProfileId, onSelect, selectedAvatar }) => {
  const [avatars, setAvatars] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch avatars when company profile is selected
  useEffect(() => {
    const fetchAvatars = async () => {
      if (!companyProfileId) {
        setAvatars([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/avatar-profiles?company_profile_id=${companyProfileId}`);
        
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
          setError('Failed to load avatar profiles');
          setAvatars([]);
        }
      } catch (err) {
        console.error('Error fetching avatar profiles:', err);
        setError('Failed to load avatar profiles. Please try again.');
        setAvatars([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAvatars();
  }, [companyProfileId]);

  const handleAvatarSelect = (avatar) => {
    onSelect(avatar);
  };

  if (!companyProfileId) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-gray-400 mb-2">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <p className="text-gray-500 text-sm">Please select a company profile first to view available avatars</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full mx-auto mb-3"></div>
        <p className="text-slate-400 text-sm">Loading avatar profiles...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 mb-3">
          <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-red-600 text-sm mb-3">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-3 py-1.5 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Select Target Avatar
      </h3>
      <p className="text-gray-600 mb-6 text-sm">
        Choose the customer avatar you want to target with this automation. This helps create more personalized and effective campaigns.
      </p>
      
      {avatars.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="text-gray-400 mb-3">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h4 className="text-sm font-semibold text-gray-900 mb-2">No Avatar Profiles Found</h4>
          <p className="text-gray-600 text-sm mb-4">This company profile doesn't have any avatar profiles yet.</p>
          <a 
            href={`/company-profiles/${companyProfileId}`}
            className="inline-flex items-center px-4 py-2 bg-[#FE8401] text-white text-sm rounded-lg hover:bg-[#FE8401]/90 transition-colors font-medium"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create Avatar Profiles
          </a>
        </div>
      ) : (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {avatars.map((avatar) => (
            <div
              key={avatar.id}
              onClick={() => handleAvatarSelect(avatar)}
              className={`
                p-4 rounded-lg border cursor-pointer transition-all
                ${selectedAvatar?.id === avatar.id
                  ? 'border-[#FE8401] bg-orange-50'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }
              `}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">
                    {avatar.isUserCreated ? '👤' : '🤖'}
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-gray-900">
                      {avatar.name}
                    </h4>
                    <p className="text-xs text-gray-500">
                      {avatar.isUserCreated ? 'User Created' : 'AI Generated'}
                    </p>
                  </div>
                </div>
                {selectedAvatar?.id === avatar.id && (
                  <div className="text-[#FE8401]">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              
              {avatar.description && (
                <p className="text-gray-600 text-sm mb-3">{avatar.description}</p>
              )}
              
              <div className="grid grid-cols-2 gap-3 text-xs">
                {avatar.demographics && (
                  <div>
                    <div className="text-gray-500 mb-1">Demographics</div>
                    <div className="text-gray-900 font-medium">
                      {typeof avatar.demographics === 'string' 
                        ? avatar.demographics 
                        : Object.values(avatar.demographics || {}).join(', ') || 'Not specified'
                      }
                    </div>
                  </div>
                )}
                {avatar.psychographics && (
                  <div>
                    <div className="text-gray-500 mb-1">Psychographics</div>
                    <div className="text-gray-900 font-medium">
                      {typeof avatar.psychographics === 'string' 
                        ? avatar.psychographics 
                        : Object.values(avatar.psychographics || {}).join(', ') || 'Not specified'
                      }
                    </div>
                  </div>
                )}
                {avatar.pain_points && (
                  <div>
                    <div className="text-gray-500 mb-1">Pain Points</div>
                    <div className="text-gray-900 font-medium">
                      {Array.isArray(avatar.pain_points) 
                        ? avatar.pain_points.join(', ') 
                        : avatar.pain_points || 'Not specified'
                      }
                    </div>
                  </div>
                )}
                {avatar.goals && (
                  <div>
                    <div className="text-gray-500 mb-1">Goals</div>
                    <div className="text-gray-900 font-medium">
                      {Array.isArray(avatar.goals) 
                        ? avatar.goals.join(', ') 
                        : avatar.goals || 'Not specified'
                      }
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AvatarSelector;