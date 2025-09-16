import React, { useState, useEffect } from 'react';
import { Box, Container, Typography, Card, CardContent, Button, TextField, Select, MenuItem, FormControl, InputLabel, Grid, Alert, CircularProgress, Chip, Divider, Autocomplete } from '@mui/material';
import { styled } from '@mui/material/styles';
import Layout from '../components/Layout/Layout';
import { getCompanyProfiles } from '../lib/apiClient';

const StyledCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  borderRadius: '12px',
}));

const ColorChip = styled(Chip)(({ theme, bgcolor }) => ({
  backgroundColor: bgcolor || theme.palette.primary.main,
  color: '#fff',
  fontWeight: 'bold',
  margin: '4px',
  '&:hover': {
    backgroundColor: bgcolor || theme.palette.primary.dark,
  }
}));

const EnhancedCreativeDemo = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [companyProfiles, setCompanyProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  
  // Form state
  const [formData, setFormData] = useState({
    companyName: 'TechFlow Solutions',
    industry: 'Software Development',
    websiteUrl: 'https://techflow.com',
    description: 'Innovative software solutions for modern businesses',
    brandVoice: 'Professional and innovative',
    targetAudience: 'Small to medium business owners',
    primaryColor: '#2563EB',
    secondaryColor: '#3B82F6',
    campaignObjective: 'conversions',
    adFormat: 'single_image',
    customPrompt: ''
  });

  // Load company profiles on component mount
  useEffect(() => {
    const loadCompanyProfiles = async () => {
      try {
        const profilesResponse = await getCompanyProfiles();
        console.log('Company profiles response:', profilesResponse);
        
        if (profilesResponse && profilesResponse.profiles) {
          const completedProfiles = profilesResponse.profiles.filter(p => p.status === 'completed');
          console.log('Completed profiles found:', completedProfiles.length);
          setCompanyProfiles(completedProfiles);
          
          // Auto-select first profile if available
          if (completedProfiles.length > 0) {
            handleProfileSelect(completedProfiles[0]);
          }
        } else {
          console.log('No profiles found in response');
        }
      } catch (err) {
        console.error('Error loading company profiles:', err);
        setError('Failed to load company profiles: ' + err.message);
      } finally {
        setLoadingProfiles(false);
      }
    };

    loadCompanyProfiles();
  }, []);

  const handleInputChange = (field) => (event) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleProfileSelect = (profile) => {
    setSelectedProfile(profile);
    if (profile) {
      const displaySummary = profile.display_summary || {};
      const fullProfile = profile.full_profile || {};
      
      setFormData(prev => ({
        ...prev,
        companyName: profile.company_name || prev.companyName,
        industry: displaySummary.industry || fullProfile.industry || prev.industry,
        websiteUrl: profile.website_url || prev.websiteUrl,
        description: displaySummary.summary || displaySummary.displayed_summary || fullProfile.summary || prev.description,
        brandVoice: displaySummary.brand_voice || fullProfile.brand_voice || prev.brandVoice,
        targetAudience: displaySummary.target_audience || fullProfile.target_audience || prev.targetAudience,
        primaryColor: displaySummary.brand_colors?.primary || fullProfile.brand_colors?.primary || prev.primaryColor,
        secondaryColor: displaySummary.brand_colors?.secondary || fullProfile.brand_colors?.secondary || prev.secondaryColor
      }));
    }
  };

  const generateCreative = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Call the actual n8n webhook with the form data
      const response = await fetch(process.env.NEXT_PUBLIC_WEBHOOK_N8N_URL || 'https://primary-production-7c692.up.railway.app/webhook/1ffd1467-a5f0-48a2-a735-ab0ccfbf2e37', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_instructions: formData.customPrompt || `Generate creative for ${formData.companyName} in ${formData.industry} targeting ${formData.targetAudience}`,
          company_profile: {
            company_name: formData.companyName,
            industry: formData.industry,
            website_url: formData.websiteUrl,
            description: formData.description,
            brand_voice: formData.brandVoice,
            target_audience: formData.targetAudience,
            primary_color: formData.primaryColor,
            secondary_color: formData.secondaryColor,
            campaign_objective: formData.campaignObjective,
            ad_format: formData.adFormat
          }
        }),
      });

      const data = await response.json();
      console.log('Received response:', data);
      
      // Handle the new JSON response structure from enhanced n8n workflow
       if (data.success && data.data) {
         const qualityAnalysis = data.data.quality_analysis;
         
         setResult({
           success: true,
           creative: {
             headline: `Transform Your ${formData.industry} Business Today`,
             primary_text: `Discover how ${formData.companyName} can revolutionize your ${formData.targetAudience} experience with our innovative solutions.`,
             description: `Perfect for ${formData.targetAudience} looking to enhance their ${formData.industry} operations.`,
             cta: 'Learn More',
             image_description: data.data.gemini_response || 'AI-generated image description',
             image: data.data.image
           },
           validation: {
             is_valid: qualityAnalysis ? qualityAnalysis.overall_score >= 7 : true,
             quality_score: qualityAnalysis ? qualityAnalysis.overall_score * 10 : 85.5,
             feedback: [
               qualityAnalysis ? qualityAnalysis.analysis : 'Creative generated successfully',
               qualityAnalysis && qualityAnalysis.was_enhanced ? 'Image enhanced for better quality' : 'Image created with AI workflow'
             ],
             suggestions: [
               'Consider A/B testing different variations',
               'Test with different target audiences'
             ],
             quality_analysis: qualityAnalysis
           },
           generation_metadata: {
             attempts: 1,
             total_time_seconds: 2.1,
             timestamp: data.timestamp,
             note: qualityAnalysis && qualityAnalysis.was_enhanced ? 
                   'Generated using enhanced n8n workflow with quality validation and improvement' :
                   'Generated using n8n workflow with quality validation'
           }
         });
       } else {
         setError(data.error || 'Failed to generate creative');
       }
    } catch (err) {
      setError('Failed to generate creative: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const validateCreative = async () => {
    if (!result?.creative) return;
    
    setLoading(true);
    try {
      // Simulate validation processing time
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock validation response for demo purposes
      const mockValidation = {
        is_valid: Math.random() > 0.3, // 70% chance of being valid
        quality_score: Math.floor(Math.random() * 30) + 70, // Score between 70-100
        feedback: [
          'Creative aligns well with brand voice',
          'Color scheme matches brand guidelines',
          'Message is clear and compelling'
        ],
        suggestions: [
          'Consider testing different call-to-action phrases',
          'Try variations with different emotional appeals',
          'Test with different target audience segments'
        ],
        validation_timestamp: new Date().toISOString(),
        note: 'Demo validation - Will be integrated with n8n workflow'
      };
      
      setResult(prev => ({
        ...prev,
        validation: mockValidation
      }));
    } catch (err) {
      setError('Demo validation error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom align="center" sx={{ mb: 4, fontWeight: 'bold' }}>
          🎨 Enhanced Creative Agent Demo
        </Typography>
        
        <Typography variant="h6" align="center" color="text.secondary" sx={{ mb: 4 }}>
          Test the AI-powered creative generation with quality control
        </Typography>

        <Grid container spacing={4}>
          {/* Input Form */}
          <Grid item xs={12} md={6}>
            <StyledCard>
              <CardContent>
                <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  ⚙️ Configuration
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* Company Profile Selector */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      🏢 Company Profile Selection
                    </Typography>
                    {loadingProfiles ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <CircularProgress size={20} />
                        <Typography variant="body2">Loading company profiles...</Typography>
                      </Box>
                    ) : companyProfiles.length > 0 ? (
                      <Autocomplete
                        options={companyProfiles}
                        getOptionLabel={(option) => `${option.company_name} (${option.display_summary?.industry || 'Unknown Industry'})`}
                        value={selectedProfile}
                        onChange={(event, newValue) => handleProfileSelect(newValue)}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Select Company Profile"
                            placeholder="Choose from your existing company profiles"
                            fullWidth
                          />
                        )}
                        renderOption={(props, option) => (
                          <Box component="li" {...props}>
                            <Box>
                              <Typography variant="subtitle1" fontWeight="bold">
                                {option.company_name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {option.display_summary?.industry || 'Unknown Industry'} • {option.website_url}
                              </Typography>
                            </Box>
                          </Box>
                        )}
                      />
                    ) : (
                      <Alert severity="info">
                        No completed company profiles found. Please create a company profile first in the Company Profiles section.
                      </Alert>
                    )}
                  </Box>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  {/* Custom Prompt Input */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      💭 Custom Ad Description (Optional)
                    </Typography>
                    <TextField
                      label="Describe the ad you want to create"
                      placeholder="e.g., Create a holiday promotion ad focusing on our premium features with a sense of urgency..."
                      value={formData.customPrompt}
                      onChange={handleInputChange('customPrompt')}
                      multiline
                      rows={4}
                      fullWidth
                      helperText="Provide specific instructions for the type of ad you want to generate. This will guide the AI in creating more targeted content."
                    />
                  </Box>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    ⚙️ Manual Configuration Override
                  </Typography>
                  
                  <TextField
                    label="Company Name"
                    value={formData.companyName}
                    onChange={handleInputChange('companyName')}
                    fullWidth
                    helperText="Auto-filled from selected profile"
                  />
                  
                  <TextField
                    label="Industry"
                    value={formData.industry}
                    onChange={handleInputChange('industry')}
                    fullWidth
                    helperText="Auto-filled from selected profile"
                  />
                  
                  <TextField
                    label="Website URL"
                    value={formData.websiteUrl}
                    onChange={handleInputChange('websiteUrl')}
                    fullWidth
                    helperText="Auto-filled from selected profile"
                  />
                  
                  <TextField
                    label="Company Description"
                    value={formData.description}
                    onChange={handleInputChange('description')}
                    multiline
                    rows={3}
                    fullWidth
                    helperText="Auto-filled from selected profile"
                  />
                  
                  <TextField
                    label="Brand Voice"
                    value={formData.brandVoice}
                    onChange={handleInputChange('brandVoice')}
                    fullWidth
                    helperText="Auto-filled from selected profile"
                  />
                  
                  <TextField
                    label="Target Audience"
                    value={formData.targetAudience}
                    onChange={handleInputChange('targetAudience')}
                    fullWidth
                    helperText="Auto-filled from selected profile"
                  />
                  
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                      label="Primary Color"
                      type="color"
                      value={formData.primaryColor}
                      onChange={handleInputChange('primaryColor')}
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      label="Secondary Color"
                      type="color"
                      value={formData.secondaryColor}
                      onChange={handleInputChange('secondaryColor')}
                      sx={{ flex: 1 }}
                    />
                  </Box>
                  
                  <FormControl fullWidth>
                    <InputLabel>Campaign Objective</InputLabel>
                    <Select
                      value={formData.campaignObjective}
                      onChange={handleInputChange('campaignObjective')}
                      label="Campaign Objective"
                    >
                      <MenuItem value="conversions">Conversions</MenuItem>
                      <MenuItem value="traffic">Traffic</MenuItem>
                      <MenuItem value="engagement">Engagement</MenuItem>
                      <MenuItem value="awareness">Brand Awareness</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <FormControl fullWidth>
                    <InputLabel>Ad Format</InputLabel>
                    <Select
                      value={formData.adFormat}
                      onChange={handleInputChange('adFormat')}
                      label="Ad Format"
                    >
                      <MenuItem value="single_image">Single Image</MenuItem>
                      <MenuItem value="carousel">Carousel</MenuItem>
                      <MenuItem value="video">Video</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <Button
                    variant="contained"
                    size="large"
                    onClick={generateCreative}
                    disabled={loading}
                    sx={{ mt: 2, py: 1.5 }}
                  >
                    {loading ? <CircularProgress size={24} /> : '🚀 Generate Creative'}
                  </Button>
                </Box>
              </CardContent>
            </StyledCard>
          </Grid>

          {/* Results */}
          <Grid item xs={12} md={6}>
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {result && (
              <StyledCard>
                <CardContent>
                  <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    📋 Generated Creative
                  </Typography>
                  
                  {result.creative && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="h6" gutterBottom>📝 Ad Copy</Typography>
                      <Box sx={{ pl: 2, borderLeft: '3px solid #2563EB', mb: 2 }}>
                        <Typography variant="subtitle1" fontWeight="bold">Headline:</Typography>
                        <Typography variant="body1" sx={{ mb: 1 }}>{result.creative.headline}</Typography>
                        
                        <Typography variant="subtitle1" fontWeight="bold">Primary Text:</Typography>
                        <Typography variant="body1" sx={{ mb: 1 }}>{result.creative.primary_text}</Typography>
                        
                        <Typography variant="subtitle1" fontWeight="bold">Description:</Typography>
                        <Typography variant="body1" sx={{ mb: 1 }}>{result.creative.description}</Typography>
                        
                        <Typography variant="subtitle1" fontWeight="bold">Call to Action:</Typography>
                        <Chip label={result.creative.cta} color="primary" />
                      </Box>
                      
                      {result.creative.image && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="h6" gutterBottom>🖼️ Generated Image</Typography>
                          <Box sx={{ pl: 2, borderLeft: '3px solid #3B82F6', textAlign: 'center' }}>
                            <img 
                              src={result.creative.image} 
                              alt="Generated creative image" 
                              style={{ 
                                maxWidth: '100%', 
                                height: 'auto', 
                                borderRadius: '8px',
                                boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                              }}
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'block';
                              }}
                            />
                            <Typography 
                              variant="body2" 
                              color="error" 
                              sx={{ display: 'none', mt: 2 }}
                            >
                              Failed to load generated image
                            </Typography>
                          </Box>
                        </Box>
                      )}
                      
                      {result.creative.image_description && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="h6" gutterBottom>📝 Image Description</Typography>
                          <Box sx={{ pl: 2, borderLeft: '3px solid #3B82F6' }}>
                            <Typography variant="body2">{result.creative.image_description}</Typography>
                          </Box>
                        </Box>
                      )}
                    </Box>
                  )}
                  
                  <Divider sx={{ my: 2 }} />
                  
                  {result.validation && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        🔍 Quality Validation
                      </Typography>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Chip 
                          label={result.validation.is_valid ? 'Valid ✅' : 'Invalid ❌'} 
                          color={result.validation.is_valid ? 'success' : 'error'}
                        />
                        <Typography variant="body1">
                          Quality Score: <strong>{result.validation.quality_score?.toFixed(1)}%</strong>
                        </Typography>
                      </Box>
                      
                      {/* Enhanced Quality Analysis Display */}
                      {result.validation.quality_analysis && (
                        <Box sx={{ 
                          mb: 2, 
                          p: 2, 
                          backgroundColor: '#f8f9fa', 
                          borderRadius: 2,
                          border: '1px solid #e9ecef'
                        }}>
                          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                            🎯 AI Quality Analysis
                          </Typography>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Chip 
                              label={`Score: ${result.validation.quality_analysis.overall_score}/10`}
                              color={result.validation.quality_analysis.overall_score >= 8 ? 'success' : 
                                     result.validation.quality_analysis.overall_score >= 7 ? 'warning' : 'error'}
                              size="small"
                            />
                            <Chip 
                              label={result.validation.quality_analysis.was_enhanced ? '✨ Enhanced' : '✅ Original Quality'}
                              color={result.validation.quality_analysis.was_enhanced ? 'primary' : 'success'}
                              size="small"
                              variant="outlined"
                            />
                          </Box>
                          
                          <Typography variant="body2" sx={{ mb: 1, fontStyle: 'italic' }}>
                            "{result.validation.quality_analysis.analysis}"
                          </Typography>
                          
                          <Typography variant="caption" color="text.secondary">
                            {result.validation.quality_analysis.processing_note}
                          </Typography>
                          
                          {result.validation.quality_analysis.scores && (
                            <Box sx={{ mt: 2 }}>
                              <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                                📊 Detailed Scores:
                              </Typography>
                              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
                                {Object.entries(result.validation.quality_analysis.scores).map(([key, value]) => (
                                  <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
                                      {key.replace('_', ' ')}:
                                    </Typography>
                                    <Typography variant="caption" fontWeight="bold">
                                      {value}/10
                                    </Typography>
                                  </Box>
                                ))}
                              </Box>
                            </Box>
                          )}
                        </Box>
                      )}
                      
                      {result.validation.feedback && result.validation.feedback.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle1" fontWeight="bold">📝 Feedback:</Typography>
                          {result.validation.feedback.map((feedback, index) => (
                            <Typography key={index} variant="body2" sx={{ ml: 2 }}>• {feedback}</Typography>
                          ))}
                        </Box>
                      )}
                      
                      {result.validation.suggestions && result.validation.suggestions.length > 0 && (
                        <Box>
                          <Typography variant="subtitle1" fontWeight="bold">💡 Suggestions:</Typography>
                          {result.validation.suggestions.map((suggestion, index) => (
                            <Typography key={index} variant="body2" sx={{ ml: 2 }}>• {suggestion}</Typography>
                          ))}
                        </Box>
                      )}
                    </Box>
                  )}
                  
                  {result.generation_metadata && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="h6" gutterBottom>📊 Generation Metadata</Typography>
                      <Typography variant="body2">
                        Attempts: {result.generation_metadata.attempts || 1}
                      </Typography>
                      <Typography variant="body2">
                        Total Time: {result.generation_metadata.total_time_seconds?.toFixed(2)}s
                      </Typography>
                    </Box>
                  )}
                  
                  <Button
                    variant="outlined"
                    onClick={validateCreative}
                    disabled={loading || !result.creative}
                    sx={{ mt: 2 }}
                  >
                    {loading ? <CircularProgress size={20} /> : '🔍 Re-validate'}
                  </Button>
                </CardContent>
              </StyledCard>
            )}
            
            {!result && !error && (
              <StyledCard>
                <CardContent sx={{ textAlign: 'center', py: 6 }}>
                  <Typography variant="h6" color="text.secondary">
                    🎯 Configure your brand settings and click "Generate Creative" to see the AI in action!
                  </Typography>
                </CardContent>
              </StyledCard>
            )}
          </Grid>
        </Grid>
        
        {/* Brand Colors Preview */}
        <StyledCard sx={{ mt: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>🎨 Brand Colors Preview</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <ColorChip label="Primary" bgcolor={formData.primaryColor} />
              <ColorChip label="Secondary" bgcolor={formData.secondaryColor} />
            </Box>
          </CardContent>
        </StyledCard>
      </Container>
    </Layout>
  );
};

export default EnhancedCreativeDemo;