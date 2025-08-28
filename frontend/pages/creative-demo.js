import { useState, useEffect } from 'react';
import { Button, TextField, Select, MenuItem, FormControl, InputLabel, Chip } from '@mui/material';

export default function CreativeDemo() {
  // Demo mode - no authentication required
  const [user, setUser] = useState({ email: 'demo@blayz.io', id: 'demo' });
  const isAuthenticated = true;
  const authLoading = false;

  const [brandInfo, setBrandInfo] = useState({
    brand_voice: "Professional and engaging",
    brand_values: "Quality and innovation", 
    product_benefits: "Superior performance",
    brand_colors: {
      primary: "#FE8401",
      secondary: "#FF9933"
    }
  });
  
  const [campaignInfo, setCampaignInfo] = useState({
    objective: "conversions",
    target_audience: "Business owners aged 25-45",
    ad_format: "single_image"
  });
  
  const [generatedContent, setGeneratedContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('copy');

  // Load demo brand info
  useEffect(() => {
    // Set demo brand info for Creative Agent demo
    setBrandInfo({
      brand_voice: "Innovative and trustworthy",
      brand_values: "Automation, efficiency, growth",
      product_benefits: "AI-powered Meta ads optimization that saves time and increases ROI",
      brand_colors: {
        primary: "#FE8401",
        secondary: "#FF9933"
      }
    });
  }, []);

  const generateAdCopy = async () => {
    setLoading(true);
    setGeneratedContent(null);
    setActiveTab('copy');
    
    try {
      // Call the real Creative Agent API
      const response = await fetch('http://localhost:8000/api/creative/generate-copy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brand_info: brandInfo,
          campaign_objective: campaignInfo.objective,
          target_audience: campaignInfo.target_audience,
          ad_format: campaignInfo.ad_format
        })
      });

      if (response.ok) {
        const result = await response.json();
        setGeneratedContent({
          type: 'ad_copy',
          ...result.data,
          generated_at: new Date().toISOString()
        });
      } else {
        throw new Error(`API call failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to generate ad copy:', error);
      // Fallback to simulated data if API fails
      const result = await simulateCreativeGeneration('copy', brandInfo, campaignInfo);
      setGeneratedContent(result);
    } finally {
      setLoading(false);
    }
  };

  const generateImageDescription = async () => {
    setLoading(true);
    setGeneratedContent(null);
    setActiveTab('image');
    
    try {
      // Call the real Creative Agent API
      const response = await fetch('http://localhost:8000/api/creative/generate-image-description', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brand_info: brandInfo,
          campaign_objective: campaignInfo.objective,
          ad_copy: `${brandInfo.product_benefits} for ${campaignInfo.target_audience}`
        })
      });

      if (response.ok) {
        const result = await response.json();
        setGeneratedContent({
          type: 'image_description',
          ...result.data,
          generated_at: new Date().toISOString()
        });
      } else {
        throw new Error(`API call failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to generate image description:', error);
      // Fallback to simulated data if API fails
      const result = await simulateCreativeGeneration('image', brandInfo, campaignInfo);
      setGeneratedContent(result);
    } finally {
      setLoading(false);
    }
  };

  const optimizeCreative = async () => {
    setLoading(true);
    setGeneratedContent(null);
    setActiveTab('optimize');
    
    try {
      // Call the real Creative Agent API
      const response = await fetch('http://localhost:8000/api/creative/optimize-creative', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_creative: {
            primary_text: `${brandInfo.product_benefits}. Perfect for ${campaignInfo.target_audience}.`,
            headline: "Transform Your Business",
            cta: "Learn More"
          },
          performance_data: {
            ctr: 0.8,  // Low CTR for demonstration
            engagement_rate: 2.1,
            conversion_rate: 1.2
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        setGeneratedContent({
          type: 'creative_optimization',
          ...result.data,
          generated_at: new Date().toISOString()
        });
      } else {
        throw new Error(`API call failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to optimize creative:', error);
      // Fallback to simulated data if API fails
      const result = await simulateCreativeGeneration('optimize', brandInfo, campaignInfo);
      setGeneratedContent(result);
    } finally {
      setLoading(false);
    }
  };

  // Simulate Creative Agent logic
  const simulateCreativeGeneration = async (type, brand, campaign) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (type === 'copy') {
      return {
        type: 'ad_copy',
        variations: [
          {
            primary_text: `Struggling with Meta ads? ${brand.product_benefits}. Join 1000+ businesses already saving 10+ hours weekly.`,
            headline: "AI Ads That Actually Work",
            cta_suggestion: "Start Free Trial",
            approach: "problem_solution"
          },
          {
            primary_text: `"Best Meta ads tool I've used!" - ${campaign.target_audience.split(' ')[0]} are choosing our AI automation. Don't get left behind.`,
            headline: "Join The Success Stories",
            cta_suggestion: "See Results",
            approach: "social_proof"
          },
          {
            primary_text: `${brand.product_benefits}. Boost your ROI by 300% with AI that never sleeps. Professional results, zero expertise needed.`,
            headline: "300% Better ROI Guaranteed",
            cta_suggestion: "Get Started",
            approach: "benefit_focused"
          }
        ],
        brand_voice_applied: brand.brand_voice,
        generated_at: new Date().toISOString()
      };
    }
    
    if (type === 'image') {
      return {
        type: 'image_description',
        image_description: `Professional split-screen composition showing a frustrated business owner on the left (dark, cluttered workspace) transitioning to a successful entrepreneur on the right (bright, organized setup with charts showing growth). Central focus on a sleek laptop displaying the Blayz dashboard interface with ${brand.brand_colors.primary} accent colors. Modern flat design with clean typography.`,
        style_notes: `Clean, modern aesthetic with ${brand.brand_voice.toLowerCase()} feel. Professional photography style with good lighting and depth of field.`,
        color_scheme: `Primary: ${brand.brand_colors.primary} for CTA buttons and key highlights. Secondary: ${brand.brand_colors.secondary} for accents and progress indicators. Background: Clean whites and light grays with subtle gradients.`,
        text_overlay_suggestions: [
          `"${campaign.objective === 'conversions' ? 'Convert' : 'Engage'} Better" in bold white text, top-left`,
          "AI-Powered Results in smaller text, bottom-right corner with brand color background"
        ],
        target_audience: campaign.target_audience,
        generated_at: new Date().toISOString()
      };
    }
    
    if (type === 'optimize') {
      return {
        type: 'creative_optimization',
        performance_assessment: "Current creative shows good engagement but low conversion rate. The hook captures attention but the value proposition needs strengthening.",
        optimization_priorities: [
          "Strengthen value proposition in primary text",
          "Make CTA more action-oriented and urgent",
          "Test emotional triggers in headline"
        ],
        improved_copy_suggestions: {
          primary_text: `Stop wasting money on Meta ads that don't work. ${brand.product_benefits} - guaranteed to 3x your ROI or money back.`,
          headline: "3x Your ROI Or Pay Nothing",
          cta: "Claim Free Trial Now"
        },
        reasoning: "Added urgency, specific benefit (3x ROI), risk reversal (money back guarantee), and more direct value proposition. CTA includes time sensitivity with 'Now'.",
        performance_prediction: {
          estimated_ctr_improvement: "+45%",
          estimated_conversion_improvement: "+67%",
          confidence_level: "High"
        },
        generated_at: new Date().toISOString()
      };
    }
  };

  const AdCopyResults = ({ data }) => (
    <div className="space-y-6">
      <div className="bg-slate-700 rounded-lg p-4">
        <h4 className="font-semibold text-white mb-2">✍️ Generated Ad Copy Variations</h4>
        <p className="text-sm text-slate-400 mb-4">Brand Voice Applied: {data.brand_voice_applied}</p>
        
        <div className="space-y-4">
          {data.variations.map((variation, index) => (
            <div key={index} className="bg-slate-600 rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <h5 className="font-medium text-white">Variation {index + 1}</h5>
                <Chip 
                  label={variation.approach.replace('_', ' ')} 
                  size="small"
                  className="bg-[#FE8401] text-white"
                />
              </div>
              
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-slate-400">Primary Text:</span>
                  <p className="text-white mt-1 leading-relaxed">{variation.primary_text}</p>
                </div>
                <div>
                  <span className="text-slate-400">Headline:</span>
                  <p className="text-white font-semibold">{variation.headline}</p>
                </div>
                <div>
                  <span className="text-slate-400">CTA:</span>
                  <span className="ml-2 bg-[#FE8401] text-white px-3 py-1 rounded text-xs font-medium">
                    {variation.cta_suggestion}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const ImageDescriptionResults = ({ data }) => (
    <div className="space-y-6">
      <div className="bg-slate-700 rounded-lg p-4">
        <h4 className="font-semibold text-white mb-4">🎨 AI-Generated Image Description</h4>
        
        <div className="space-y-4">
          <div>
            <h5 className="font-medium text-[#FE8401] mb-2">Image Concept</h5>
            <p className="text-white text-sm leading-relaxed">{data.image_description}</p>
          </div>
          
          <div>
            <h5 className="font-medium text-[#FE8401] mb-2">Style & Mood</h5>
            <p className="text-white text-sm leading-relaxed">{data.style_notes}</p>
          </div>
          
          <div>
            <h5 className="font-medium text-[#FE8401] mb-2">Brand Color Usage</h5>
            <p className="text-white text-sm leading-relaxed">{data.color_scheme}</p>
          </div>
          
          <div>
            <h5 className="font-medium text-[#FE8401] mb-2">Text Overlay Suggestions</h5>
            <ul className="space-y-1">
              {data.text_overlay_suggestions.map((suggestion, index) => (
                <li key={index} className="text-white text-sm">• {suggestion}</li>
              ))}
            </ul>
          </div>
          
          <div className="bg-slate-600 rounded-lg p-3">
            <p className="text-slate-300 text-sm">
              <span className="font-medium">Target Audience:</span> {data.target_audience}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const OptimizationResults = ({ data }) => (
    <div className="space-y-6">
      <div className="bg-slate-700 rounded-lg p-4">
        <h4 className="font-semibold text-white mb-4">📊 Creative Optimization Analysis</h4>
        
        <div className="space-y-4">
          <div>
            <h5 className="font-medium text-red-400 mb-2">Performance Assessment</h5>
            <p className="text-white text-sm leading-relaxed">{data.performance_assessment}</p>
          </div>
          
          <div>
            <h5 className="font-medium text-yellow-400 mb-2">Optimization Priorities</h5>
            <ul className="space-y-1">
              {data.optimization_priorities.map((priority, index) => (
                <li key={index} className="text-white text-sm">• {priority}</li>
              ))}
            </ul>
          </div>
          
          <div className="bg-slate-600 rounded-lg p-4">
            <h5 className="font-medium text-green-400 mb-3">Improved Copy</h5>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-slate-400">Primary Text:</span>
                <p className="text-white mt-1 leading-relaxed">{data.improved_copy_suggestions.primary_text}</p>
              </div>
              <div>
                <span className="text-slate-400">Headline:</span>
                <p className="text-white font-semibold">{data.improved_copy_suggestions.headline}</p>
              </div>
              <div>
                <span className="text-slate-400">CTA:</span>
                <span className="ml-2 bg-green-500 text-white px-3 py-1 rounded text-xs font-medium">
                  {data.improved_copy_suggestions.cta}
                </span>
              </div>
            </div>
          </div>
          
          <div>
            <h5 className="font-medium text-blue-400 mb-2">Why This Will Work</h5>
            <p className="text-white text-sm leading-relaxed">{data.reasoning}</p>
          </div>
          
          {data.performance_prediction && (
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
              <h5 className="font-medium text-green-400 mb-2">Predicted Performance Improvement</h5>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>CTR: <span className="text-green-400 font-semibold">{data.performance_prediction.estimated_ctr_improvement}</span></div>
                <div>Conversions: <span className="text-green-400 font-semibold">{data.performance_prediction.estimated_conversion_improvement}</span></div>
              </div>
              <p className="text-green-300 text-xs mt-2">Confidence: {data.performance_prediction.confidence_level}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Demo is always ready

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-[#FE8401] to-[#FF9933] bg-clip-text text-transparent mb-4">
            🎨 Creative Agent Demo
          </h1>
          <p className="text-slate-300 text-lg">
            AI-powered creative generation using your brand colors and voice
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Configuration Panel */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-6">⚙️ Brand Configuration</h2>
            
            {/* Brand Info */}
            <div className="space-y-4 mb-6">
              <TextField
                label="Brand Voice"
                value={brandInfo.brand_voice}
                onChange={(e) => setBrandInfo({...brandInfo, brand_voice: e.target.value})}
                fullWidth
                variant="outlined"
                className="bg-slate-700"
                InputLabelProps={{ style: { color: '#94a3b8' } }}
                InputProps={{ style: { color: 'white' } }}
              />
              
              <TextField
                label="Brand Values"
                value={brandInfo.brand_values}
                onChange={(e) => setBrandInfo({...brandInfo, brand_values: e.target.value})}
                fullWidth
                variant="outlined"
                InputLabelProps={{ style: { color: '#94a3b8' } }}
                InputProps={{ style: { color: 'white' } }}
              />
              
              <TextField
                label="Product Benefits"
                value={brandInfo.product_benefits}
                onChange={(e) => setBrandInfo({...brandInfo, product_benefits: e.target.value})}
                fullWidth
                multiline
                rows={2}
                variant="outlined"
                InputLabelProps={{ style: { color: '#94a3b8' } }}
                InputProps={{ style: { color: 'white' } }}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <TextField
                  label="Primary Brand Color"
                  value={brandInfo.brand_colors.primary}
                  onChange={(e) => setBrandInfo({
                    ...brandInfo, 
                    brand_colors: {...brandInfo.brand_colors, primary: e.target.value}
                  })}
                  fullWidth
                  variant="outlined"
                  InputLabelProps={{ style: { color: '#94a3b8' } }}
                  InputProps={{ style: { color: 'white' } }}
                />
                
                <TextField
                  label="Secondary Brand Color"
                  value={brandInfo.brand_colors.secondary}
                  onChange={(e) => setBrandInfo({
                    ...brandInfo, 
                    brand_colors: {...brandInfo.brand_colors, secondary: e.target.value}
                  })}
                  fullWidth
                  variant="outlined"
                  InputLabelProps={{ style: { color: '#94a3b8' } }}
                  InputProps={{ style: { color: 'white' } }}
                />
              </div>
            </div>

            {/* Campaign Info */}
            <div className="space-y-4 mb-6">
              <FormControl fullWidth>
                <InputLabel style={{ color: '#94a3b8' }}>Campaign Objective</InputLabel>
                <Select
                  value={campaignInfo.objective}
                  onChange={(e) => setCampaignInfo({...campaignInfo, objective: e.target.value})}
                  style={{ color: 'white' }}
                >
                  <MenuItem value="conversions">Conversions</MenuItem>
                  <MenuItem value="traffic">Traffic</MenuItem>
                  <MenuItem value="engagement">Engagement</MenuItem>
                  <MenuItem value="brand_awareness">Brand Awareness</MenuItem>
                </Select>
              </FormControl>
              
              <TextField
                label="Target Audience"
                value={campaignInfo.target_audience}
                onChange={(e) => setCampaignInfo({...campaignInfo, target_audience: e.target.value})}
                fullWidth
                variant="outlined"
                InputLabelProps={{ style: { color: '#94a3b8' } }}
                InputProps={{ style: { color: 'white' } }}
              />
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                variant="contained"
                onClick={generateAdCopy}
                disabled={loading}
                className="w-full bg-[#FE8401] hover:bg-[#e5750a]"
                startIcon={loading ? null : <span>✍️</span>}
              >
                {loading && activeTab === 'copy' ? 'Generating Ad Copy...' : 'Generate Ad Copy'}
              </Button>
              
              <Button
                variant="contained"
                onClick={generateImageDescription}
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700"
                startIcon={loading ? null : <span>🎨</span>}
              >
                {loading && activeTab === 'image' ? 'Creating Image Description...' : 'Generate Image Description'}
              </Button>
              
              <Button
                variant="outlined"
                onClick={optimizeCreative}
                disabled={loading}
                className="w-full border-slate-600 text-white hover:border-[#FE8401]"
                startIcon={loading ? null : <span>📊</span>}
              >
                {loading && activeTab === 'optimize' ? 'Optimizing Creative...' : 'Optimize Existing Creative'}
              </Button>
            </div>

            {loading && (
              <div className="mt-6 text-center">
                <div className="animate-spin w-8 h-8 border-2 border-[#FE8401] border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-slate-400">Gemini AI is working...</p>
              </div>
            )}
          </div>

          {/* Results Panel */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-6">🎯 Generated Content</h2>
            
            {generatedContent ? (
              generatedContent.error ? (
                <div className="text-red-400 p-4 bg-red-900/20 rounded-lg">
                  ❌ {generatedContent.error}
                </div>
              ) : (
                <div>
                  {generatedContent.type === 'ad_copy' && <AdCopyResults data={generatedContent} />}
                  {generatedContent.type === 'image_description' && <ImageDescriptionResults data={generatedContent} />}
                  {generatedContent.type === 'creative_optimization' && <OptimizationResults data={generatedContent} />}
                </div>
              )
            ) : (
              <div className="text-center text-slate-400 py-12">
                <div className="text-6xl mb-4">🎨</div>
                <p>Click a button above to generate creative content</p>
                <p className="text-sm mt-2">AI will use your brand voice, colors, and campaign objective</p>
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="mt-8 bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="font-semibold text-white mb-3">🧠 How Creative Agent Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl mb-2">✍️</div>
              <div className="font-medium text-white">Ad Copy Generation</div>
              <div className="text-slate-400">Creates multiple variations testing different psychological triggers using your brand voice</div>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-2">🎨</div>
              <div className="font-medium text-white">Image Descriptions</div>
              <div className="text-slate-400">Generates detailed visual concepts incorporating your brand colors and campaign goals</div>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-2">📊</div>
              <div className="font-medium text-white">Performance Optimization</div>
              <div className="text-slate-400">Analyzes and improves existing creatives based on performance data and best practices</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}