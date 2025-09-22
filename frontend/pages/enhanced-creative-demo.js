import React, { useState } from 'react';
import { Box, Container, Typography, Card, CardContent, Button, Alert, CircularProgress, Paper } from '@mui/material';
import { styled } from '@mui/material/styles';
import Layout from '../components/Layout/Layout';

const StyledCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  borderRadius: '12px',
}));

const ResponseBox = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  marginTop: theme.spacing(2),
  backgroundColor: '#f5f5f5',
  maxHeight: '400px',
  overflow: 'auto',
  fontFamily: 'monospace',
  fontSize: '12px',
  whiteSpace: 'pre-wrap'
}));

const EnhancedCreativeDemo = () => {
  const [loading, setLoading] = useState(false);
  const [rawResponse, setRawResponse] = useState(null);
  const [transformedImages, setTransformedImages] = useState([]);
  const [error, setError] = useState(null);

  const callWebhook = async () => {
    setLoading(true);
    setError(null);
    setRawResponse(null);
    
    try {
      console.log('🚀 Calling n8n webhook directly...');
      
      const response = await fetch('http://145.14.157.237:5678/webhook-test/creative-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_instructions: 'Generate creative ads for TechFlow Solutions',
          company_profile: {
            company_name: 'TechFlow Solutions',
            industry: 'Software Development',
            website_url: 'https://techflow.com',
            description: 'Innovative software solutions for modern businesses',
            brand_voice: 'Professional and innovative',
            target_audience: 'Small to medium business owners',
            primary_color: '#2563EB',
            secondary_color: '#3B82F6',
            campaign_objective: 'conversions',
            ad_format: 'single_image'
          }
        })
      });

      console.log('📦 Response received, status:', response.status);
      console.log('📦 Response headers:', Object.fromEntries(response.headers.entries()));
      
      // Check if response is binary (image) or JSON
      const contentType = response.headers.get('content-type') || '';
      console.log('📦 Content-Type:', contentType);
      
      if (contentType.includes('image/') || contentType.includes('application/octet-stream')) {
        // Handle binary image response
        console.log('🖼️ Detected binary image response');
        const arrayBuffer = await response.arrayBuffer();
        
        // Convert ArrayBuffer to base64 efficiently
        const uint8Array = new Uint8Array(arrayBuffer);
        let binaryString = '';
        for (let i = 0; i < uint8Array.length; i++) {
          binaryString += String.fromCharCode(uint8Array[i]);
        }
        const base64 = btoa(binaryString);
        const imageUrl = `data:${contentType};base64,${base64}`;
        
        console.log('📊 Base64 conversion complete:');
        console.log('   - Original size:', arrayBuffer.byteLength, 'bytes');
        console.log('   - Base64 length:', base64.length, 'characters');
        console.log('   - Base64 preview:', base64.substring(0, 100) + '...');
        
        // Create display data with truncated base64 for readability
        const binaryData = {
          type: 'binary_image',
          contentType: contentType,
          size: arrayBuffer.byteLength,
          base64: base64.substring(0, 100) + `... [${base64.length - 100} more characters]`,
          base64_length: base64.length,
          imageUrl: imageUrl
        };
        
        setRawResponse(JSON.stringify(binaryData, null, 2));
        
        // Automatically set the transformed image
        setTransformedImages([{
          id: 0,
          filename: 'generated_image.png',
          format: contentType.split('/')[1] || 'png',
          url: imageUrl
        }]);
        
      } else {
        // Handle JSON response
        console.log('📄 Detected JSON response');
        const data = await response.json();
        console.log('📦 Raw JSON data:', data);
        
        // Check if this is an array response (multiple items from n8n)
        if (Array.isArray(data)) {
          console.log('🔍 Detected array response with', data.length, 'items');
          
          // Extract all images from the array
          const allImages = data.flatMap((item, index) => {
            console.log(`🔍 Processing item ${index}:`, item);
            const itemData = item.data || item;
            
            // Handle n8n nested structure where data is inside 'json' object
            const actualData = itemData.json || itemData;
            console.log(`🔍 Actual data for item ${index}:`, actualData);
            
            // Look for images in various formats
            // Handle Supabase schema with image_base64 field
            if (actualData.image_base64) {
              console.log(`📸 Found image_base64 in item ${index}:`, typeof actualData.image_base64);
              return [{
                id: index,
                filename: `creative_${actualData.id || index + 1}.png`,
                format: 'png',
                url: actualData.image_base64.startsWith('data:') ? actualData.image_base64 : `data:image/png;base64,${actualData.image_base64}`,
                source: actualData === itemData.json ? 'item.json.image_base64' : 'item.image_base64',
                metadata: {
                  headline: actualData.headline,
                  sub_headline: actualData.sub_headline,
                  cta: actualData.cta,
                  recommended_scenery: actualData.recommended_scenery,
                  is_favorite: actualData.is_favorite,
                  created_at: actualData.created_at,
                  type: actualData.type
                }
              }];
            }
            // Fallback for other image field names
            if (actualData.image) {
              console.log(`📸 Found image in item ${index}:`, typeof actualData.image);
              return [{
                id: index,
                filename: `generated_image_${index + 1}.png`,
                format: 'png',
                url: actualData.image.startsWith('data:') ? actualData.image : `data:image/png;base64,${actualData.image}`,
                source: actualData === itemData.json ? 'item.json.image' : 'item.data.image'
              }];
            }
            if (actualData.images && Array.isArray(actualData.images)) {
              console.log(`📸 Found ${actualData.images.length} images in item ${index}`);
              return actualData.images.map((img, imgIndex) => ({
                id: `${index}_${imgIndex}`,
                filename: `generated_image_${index + 1}_${imgIndex + 1}.png`,
                format: 'png',
                url: img.startsWith('data:') ? img : `data:image/png;base64,${img}`,
                source: actualData === itemData.json ? 'item.json.images' : 'item.data.images'
              }));
            }
            if (actualData.files && Array.isArray(actualData.files)) {
              console.log(`📁 Found ${actualData.files.length} files in item ${index}`);
              return actualData.files.map((file, fileIndex) => ({
                id: `${index}_${fileIndex}`,
                filename: file.filename || `generated_image_${index + 1}_${fileIndex + 1}.png`,
                format: file.format || 'png',
                url: file.data ? (file.data.startsWith('data:') ? file.data : `data:image/${file.format || 'png'};base64,${file.data}`) : null,
                source: actualData === itemData.json ? 'item.json.files' : 'item.data.files'
              })).filter(img => img.url);
            }
            return [];
          });
          
          console.log('🖼️ Total images extracted:', allImages.length);
          console.log('🖼️ Images details:', allImages.map(img => ({ id: img.id, filename: img.filename, source: img.source })));
          
          // Automatically set the transformed images
          setTransformedImages(allImages);
          
          // Create a summary for the raw response
          const summary = {
            type: 'json_array_response',
            total_items: data.length,
            total_images_found: allImages.length,
            images_by_item: data.map((item, index) => {
              const itemData = item.data || item;
              return {
                item_index: index,
                has_image: !!itemData.image,
                has_images_array: !!(itemData.images && Array.isArray(itemData.images)),
                has_files_array: !!(itemData.files && Array.isArray(itemData.files)),
                images_count: (itemData.images && Array.isArray(itemData.images) ? itemData.images.length : 0) + 
                             (itemData.files && Array.isArray(itemData.files) ? itemData.files.length : 0) + 
                             (itemData.image ? 1 : 0)
              };
            }),
            raw_data_preview: JSON.stringify(data, null, 2).substring(0, 1000) + '...'
          };
          
          setRawResponse(JSON.stringify(summary, null, 2));
          
        } else {
          // Single JSON object response
          console.log('📄 Single JSON object response');
          setRawResponse(JSON.stringify(data, null, 2));
          
          // Check if this is a wrapped response with "images" array
          if (data.images && Array.isArray(data.images)) {
            console.log('🔍 Found wrapped images array with', data.images.length, 'items');
            
            // Process the wrapped images array the same way as direct array
            const allImages = data.images.flatMap((item, index) => {
              console.log(`🔍 Processing wrapped item ${index}:`, item);
              const itemData = item.data || item;
              
              // Handle n8n nested structure where data is inside 'json' object
              const actualData = itemData.json || itemData;
              console.log(`🔍 Actual wrapped data for item ${index}:`, actualData);
              
              // Handle Supabase schema with image_base64 field
              if (actualData.image_base64) {
                console.log(`📸 Found image_base64 in wrapped item ${index}:`, typeof actualData.image_base64);
                return [{
                  id: index,
                  filename: `creative_${actualData.id || index + 1}.png`,
                  format: 'png',
                  url: actualData.image_base64.startsWith('data:') ? actualData.image_base64 : `data:image/png;base64,${actualData.image_base64}`,
                  source: actualData === itemData.json ? 'wrapped.images.json.image_base64' : 'wrapped.images.image_base64',
                  metadata: {
                    headline: actualData.headline,
                    sub_headline: actualData.sub_headline,
                    cta: actualData.cta,
                    recommended_scenery: actualData.recommended_scenery,
                    is_favorite: actualData.is_favorite,
                    created_at: actualData.created_at,
                    type: actualData.type
                  }
                }];
              }
              return [];
            });
            
            console.log('🖼️ Total images extracted from wrapped response:', allImages.length);
            setTransformedImages(allImages);
            
          } else if (data.image) {
            // Check if this single object has images
            console.log('📸 Found single image in JSON response');
            setTransformedImages([{
              id: 0,
              filename: 'generated_image.png',
              format: 'png',
              url: data.image.startsWith('data:') ? data.image : `data:image/png;base64,${data.image}`,
              source: 'json.image'
            }]);
          }
        }
      }
      
    } catch (err) {
      console.error('❌ Error calling webhook:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const transformBinaryData = () => {
    if (!rawResponse) {
      setError('No raw response available. Call webhook first.');
      return;
    }

    try {
      const data = JSON.parse(rawResponse);
      console.log('🔄 Transforming binary data...');
      
      if (data.type === 'binary_image') {
        // Handle direct binary image response
        console.log('🖼️ Processing direct binary image response');
        const image = {
          id: 0,
          filename: 'generated_image.' + (data.format || 'png'),
          format: data.contentType?.split('/')[1] || 'png',
          url: data.imageUrl,
          size: data.size
        };
        
        setTransformedImages([image]);
        console.log('🖼️ Transformed 1 binary image');
        
      } else {
        // Look for binary files in JSON response structure
        const binaryFiles = data.binaryFiles || [];
        console.log('📁 Found binary files in JSON:', binaryFiles.length);
        
        const images = binaryFiles.map((file, index) => {
          if (file.data && file.type === 'image') {
            const imageUrl = `data:image/${file.format || 'png'};base64,${file.data}`;
            return {
              id: index,
              filename: file.filename,
              format: file.format,
              url: imageUrl
            };
          }
          return null;
        }).filter(Boolean);
        
        console.log('🖼️ Transformed images from JSON:', images.length);
        setTransformedImages(images);
      }
      
    } catch (err) {
      console.error('❌ Error transforming binary data:', err);
      setError('Error transforming binary data: ' + err.message);
    }
  };

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          🔧 Enhanced Creative Demo - Debug Mode
        </Typography>
        
        <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 4 }}>
          Simplified debugging interface to test webhook response and binary data transformation
        </Typography>

        <StyledCard>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Step 1: Call Webhook
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              This will call the n8n webhook and show you the raw response structure
            </Typography>
            
            <Button
              variant="contained"
              onClick={callWebhook}
              disabled={loading}
              size="large"
              sx={{ mb: 2 }}
            >
              {loading ? <CircularProgress size={24} /> : '📡 Call Webhook'}
            </Button>

            {rawResponse && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  📄 Raw Response
                </Typography>
                <Paper sx={{ p: 2, backgroundColor: '#f5f5f5', maxHeight: '300px', overflow: 'auto' }}>
                  <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px', margin: 0 }}>
                    {typeof rawResponse === 'string' ? rawResponse : JSON.stringify(rawResponse, null, 2)}
                  </pre>
                </Paper>
                {(() => {
                  try {
                    const parsed = typeof rawResponse === 'string' ? JSON.parse(rawResponse) : rawResponse;
                    if (parsed.base64_length) {
                      return (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                          ℹ️ Base64 data has been truncated for display. Full length: {parsed.base64_length} characters
                        </Typography>
                      );
                    }
                  } catch (e) {
                    // Not JSON, ignore
                  }
                  return null;
                })()}
              </Box>
            )}
          </CardContent>
        </StyledCard>

        <StyledCard>
           <CardContent>
             <Typography variant="h6" gutterBottom>
               Step 2: Transform Binary Data (Optional)
             </Typography>
             <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
               {transformedImages.length > 0 
                 ? 'Binary data was automatically processed! You can re-process if needed.'
                 : 'This will extract and display images from the binary data in the response'
               }
             </Typography>
             
             <Button
               variant={transformedImages.length > 0 ? "outlined" : "contained"}
               onClick={transformBinaryData}
               disabled={!rawResponse}
               size="large"
               sx={{ mb: 2 }}
             >
               {transformedImages.length > 0 ? '🔄 Re-process Data' : '🔄 Transform Binary Data to Images'}
             </Button>

            {transformedImages.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  🖼️ Generated Images ({transformedImages.length})
                </Typography>
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                  gap: 3,
                  mt: 2 
                }}>
                  {transformedImages.map((image) => (
                    <Box 
                      key={image.id} 
                      sx={{ 
                        border: 1, 
                        borderColor: 'grey.300', 
                        borderRadius: 2, 
                        p: 2,
                        backgroundColor: 'grey.50',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: 3
                        }
                      }}
                    >
                      <img 
                        src={image.url} 
                        alt={image.filename}
                        style={{ 
                          width: '100%', 
                          height: '200px', 
                          objectFit: 'contain',
                          borderRadius: '4px',
                          backgroundColor: 'white'
                        }}
                      />
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                          {image.filename}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Format: {image.format?.toUpperCase() || 'PNG'}
                        </Typography>
                        {image.source && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            Source: {image.source}
                          </Typography>
                        )}
                        {image.size && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            Size: {(image.size / 1024).toFixed(1)} KB
                          </Typography>
                        )}
                        {image.metadata && (
                          <Box sx={{ mt: 1, pt: 1, borderTop: 1, borderColor: 'grey.200' }}>
                            {image.metadata.headline && (
                              <Typography variant="caption" color="primary" display="block" sx={{ fontWeight: 'bold' }}>
                                📝 {image.metadata.headline}
                              </Typography>
                            )}
                            {image.metadata.sub_headline && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                📄 {image.metadata.sub_headline}
                              </Typography>
                            )}
                            {image.metadata.cta && (
                              <Typography variant="caption" color="success.main" display="block">
                                🎯 {image.metadata.cta}
                              </Typography>
                            )}
                            {image.metadata.recommended_scenery && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                🎨 {image.metadata.recommended_scenery}
                              </Typography>
                            )}
                            {image.metadata.is_favorite && (
                              <Typography variant="caption" color="warning.main" display="block">
                                ⭐ Favorite
                              </Typography>
                            )}
                            {image.metadata.type && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                🏷️ {image.metadata.type}
                              </Typography>
                            )}
                          </Box>
                        )}
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </CardContent>
        </StyledCard>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        <StyledCard>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              🔍 Debug Information
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Check the browser console (F12) for detailed debugging logs<br/>
              • Look for logs starting with 🔍 to see the response structure<br/>
              • The raw response will show you exactly what n8n is sending<br/>
              • The transform step will show how many images are actually processed
            </Typography>
          </CardContent>
        </StyledCard>
      </Container>
    </Layout>
  );
};

export default EnhancedCreativeDemo;