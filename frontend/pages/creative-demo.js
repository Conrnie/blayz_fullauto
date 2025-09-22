import React, { useState, useEffect } from 'react';
import useAuth from '../lib/useAuth';
import { getCompanyProfiles } from '../lib/apiClient';
import { Button, TextField, FormControl, InputLabel, Select, MenuItem, CircularProgress } from '@mui/material';

export default function CreativeDemo() {
  const { user } = useAuth();
  const [userInstructions, setUserInstructions] = useState('');
  const [selectedProfile, setSelectedProfile] = useState('');
  const [companyProfiles, setCompanyProfiles] = useState([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [generatedImages, setGeneratedImages] = useState(null);

  useEffect(() => {
    if (user) {
      fetchCompanyProfiles();
    }
  }, [user]);

  const fetchCompanyProfiles = async () => {
    setProfilesLoading(true);
    try {
      const response = await getCompanyProfiles();
      // Handle different response structures
      const data = Array.isArray(response) ? response : (response?.data || response?.profiles || []);
      setCompanyProfiles(data);
    } catch (error) {
      console.error('Error fetching company profiles:', error);
      setCompanyProfiles([]); // Ensure it's always an array
    } finally {
      setProfilesLoading(false);
    }
  };

  const handleGenerateImages = async () => {
    if (!userInstructions.trim() || !selectedProfile) {
      alert('Please enter instructions and select a company profile');
      return;
    }

    setImageLoading(true);
    try {
      // Get the selected company profile data
      const selectedProfileData = companyProfiles.find(profile => profile.profile_id === selectedProfile);
      
      const response = await fetch(process.env.NEXT_PUBLIC_WEBHOOK_N8N_URL || 'https://primary-production-7c692.up.railway.app/webhook/1ffd1467-a5f0-48a2-a735-ab0ccfbf2e37', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_instructions: userInstructions,
          company_profile: selectedProfileData,
          user_id: user.id
        }),
      });

      const data = await response.json();
      console.log('Received response:', data);
      
      // Handle the new JSON response structure from enhanced n8n workflow
      if (data.success && data.data && data.data.image) {
        setGeneratedImages({
          success: true,
          image: data.data.image,
          gemini_response: data.data.gemini_response,
          timestamp: data.timestamp,
          quality_analysis: data.data.quality_analysis || null
        });
        
        // Enhanced success message with quality info
        const qualityInfo = data.data.quality_analysis;
        if (qualityInfo) {
          const enhancementStatus = qualityInfo.was_enhanced ? ' (Enhanced for better quality)' : ' (Passed quality validation)';
          alert(`Creative generation completed successfully! Quality Score: ${qualityInfo.overall_score}/10${enhancementStatus}`);
        } else {
          alert('Creative generation completed successfully!');
        }
      } else {
        setGeneratedImages({
          success: false,
          error: data.error || 'No image data received from workflow'
        });
        alert('Failed to generate creative: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error triggering creative generation:', error);
      setGeneratedImages({ error: 'Failed to trigger creative generation' });
    } finally {
      setImageLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">🎨 AI Creative Generator</h1>
          <p className="text-lg text-gray-600">Transform your ideas into stunning visuals with AI</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Panel */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-6">📝 Creative Brief</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Creative Instructions
                </label>
                <TextField
                  multiline
                  rows={6}
                  fullWidth
                  variant="outlined"
                  placeholder="Describe what you want to create..."
                  value={userInstructions}
                  onChange={(e) => setUserInstructions(e.target.value)}
                />
              </div>

              <div>
                <FormControl fullWidth>
                  <InputLabel>Company Profile</InputLabel>
                  <Select
                    value={selectedProfile}
                    onChange={(e) => setSelectedProfile(e.target.value)}
                    label="Company Profile"
                  >
                    {Array.isArray(companyProfiles) && companyProfiles.map((profile) => (
                      <MenuItem key={profile.profile_id} value={profile.profile_id}>
                        {profile.company_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {profilesLoading && (
                  <div className="mt-2 text-sm text-gray-500">
                    Loading profiles...
                  </div>
                )}
              </div>

              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={handleGenerateImages}
                disabled={imageLoading || !userInstructions.trim() || !selectedProfile}
                startIcon={imageLoading ? <CircularProgress size={20} /> : <span>🎨</span>}
                sx={{ py: 2 }}
              >
                {imageLoading ? 'Generating Images...' : 'Generate Images with AI'}
              </Button>
            </div>
          </div>

          {/* Results Panel */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-6">🎨 AI Generated Results</h2>
            {generatedImages ? (
              <div className="space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-green-600 text-lg">✅</span>
                    <span className="font-medium text-green-800">Complete AI Workflow Executed</span>
                  </div>
                  <p className="text-sm text-green-700">User Instructions → Claude JSON → Gemini Generation → Gemini Validation</p>
                </div>
                {generatedImages.error ? (
                  <div className="p-4 border rounded-lg bg-red-50 border-red-200">
                    <p className="text-red-800">{generatedImages.error}</p>
                  </div>
                ) : generatedImages.image ? (
                  <div className="space-y-4">
                    <div className="border rounded-lg overflow-hidden">
                      <img 
                        src={generatedImages.image} 
                        alt="AI Generated Creative" 
                        className="w-full h-auto"
                        onError={(e) => {
                          console.error('Image load error:', e);
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                    
                    {/* Quality Analysis Display */}
                    {generatedImages.quality_analysis && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          🔍 Quality Analysis
                        </h4>
                        <div className="flex items-center gap-3 mb-3">
                          <span className={`px-2 py-1 rounded text-xs font-bold text-white ${
                            generatedImages.quality_analysis.overall_score >= 8 ? 'bg-green-500' : 
                            generatedImages.quality_analysis.overall_score >= 7 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}>
                            Score: {generatedImages.quality_analysis.overall_score}/10
                          </span>
                          <span className={`text-xs font-bold ${
                            generatedImages.quality_analysis.was_enhanced ? 'text-blue-600' : 'text-green-600'
                          }`}>
                            {generatedImages.quality_analysis.was_enhanced ? '✨ Enhanced' : '✅ Original Quality'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">
                          {generatedImages.quality_analysis.analysis}
                        </p>
                        <p className="text-xs text-gray-500">
                          {generatedImages.quality_analysis.processing_note}
                        </p>
                      </div>
                    )}
                    
                    {generatedImages.timestamp && (
                      <p className="text-sm text-gray-500 text-center">
                        Generated at: {new Date(generatedImages.timestamp).toLocaleString()}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-gray-500">
                    <p>Images would be displayed here</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-12">
                <div className="text-6xl mb-4">🎨</div>
                <p>Click the button above to generate images with AI</p>
                <p className="text-sm mt-2">Complete workflow: User Instructions → Claude → Gemini → Validation</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}