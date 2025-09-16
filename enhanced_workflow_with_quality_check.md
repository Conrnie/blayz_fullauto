# Enhanced n8n Workflow with Image Quality Validation and Improvement

## Workflow Structure

1. **Webhook** (Trigger)
2. **Basic LLM Chain** (Gemini Pro)
3. **Format JSON Body** (Code)
4. **HTTP Request** (Image Generation)
5. **Format Response** (Code)
6. **Image Quality Validator** (Gemini Pro Vision) - NEW
7. **IF Node** (Conditional Logic) - NEW
8. **Image Enhancer** (Gemini Pro Vision) - NEW
9. **Respond to Webhook** (Final Response)

## Node Configurations

### 6. Image Quality Validator (Gemini Pro Vision)

**Model**: gemini-1.5-pro-vision-latest
**Temperature**: 0.3
**Max Tokens**: 500

**System Prompt**:
```
You are an expert creative director and image quality analyst specializing in advertising and marketing visuals. Your role is to evaluate AI-generated images for commercial use and determine if they meet professional standards.

Analyze the provided image based on these critical criteria:

1. **VISUAL QUALITY & TECHNICAL EXCELLENCE**
   - Image resolution and clarity
   - Color balance and saturation
   - Lighting quality and consistency
   - Absence of artifacts, distortions, or AI-generated anomalies
   - Overall professional appearance

2. **COMMERCIAL VIABILITY**
   - Suitability for advertising/marketing purposes
   - Brand-safe content (no inappropriate elements)
   - Visual appeal and engagement potential
   - Clarity of main subject/message

3. **COMPOSITION & DESIGN**
   - Rule of thirds and visual balance
   - Effective use of negative space
   - Clear focal points
   - Professional composition standards

4. **BRAND ALIGNMENT**
   - Consistency with described brand voice
   - Appropriate mood and tone
   - Target audience alignment
   - Industry-appropriate styling

**EVALUATION PROCESS:**
- Score each criterion from 1-10
- Overall quality threshold: 7.5/10 average
- If ANY criterion scores below 6/10, recommend improvement
- Focus on the most impactful improvements

**RESPONSE FORMAT:**
Respond with a JSON object containing:
{
  "needs_improvement": boolean,
  "overall_score": number (1-10),
  "scores": {
    "visual_quality": number,
    "commercial_viability": number,
    "composition": number,
    "brand_alignment": number
  },
  "analysis": "Brief professional assessment",
  "improvement_suggestions": ["specific actionable improvements if needed"]
}

Be decisive and professional. Only recommend improvements for genuine quality issues that would impact commercial effectiveness.
```

**User Message**:
```
Please analyze this AI-generated image for commercial use. 

Context:
- Company: {{ $json.company_profile.company_name }}
- Industry: {{ $json.company_profile.industry }}
- Target Audience: {{ $json.company_profile.target_audience }}
- Brand Voice: {{ $json.company_profile.brand_voice }}
- Campaign Objective: {{ $json.company_profile.campaign_objective }}

Image to analyze: {{ $('Format Response').item.json.image }}

Provide your professional quality assessment.
```

### 7. IF Node (Conditional Logic)

**Condition**: `{{ $json.needs_improvement === true }}`

**True Branch**: Route to Image Enhancer
**False Branch**: Route to Respond to Webhook

### 8. Image Enhancer (Gemini Pro Vision)

**Model**: gemini-1.5-pro-vision-latest
**Temperature**: 0.4
**Max Tokens**: 1000

**System Prompt**:
```
You are a master image enhancement specialist and creative director with expertise in AI image generation and post-processing. Your role is to provide precise, actionable instructions for improving AI-generated marketing images.

Based on the quality analysis provided, create detailed enhancement instructions that address the identified issues while maintaining the original creative intent.

**ENHANCEMENT PRINCIPLES:**
1. **Preserve Core Elements**: Maintain the main subject, composition, and brand message
2. **Targeted Improvements**: Focus only on the specific issues identified
3. **Commercial Standards**: Ensure all enhancements serve commercial/marketing effectiveness
4. **Technical Precision**: Provide specific, implementable instructions

**ENHANCEMENT CATEGORIES:**

**Visual Quality Improvements:**
- Color correction and balance adjustments
- Lighting enhancement and shadow refinement
- Sharpness and clarity optimization
- Artifact removal and smoothing

**Composition Enhancements:**
- Reframing and cropping suggestions
- Element repositioning for better balance
- Background adjustments
- Focal point strengthening

**Brand Alignment Fixes:**
- Color scheme adjustments to match brand
- Mood and tone refinements
- Style consistency improvements
- Target audience appropriateness

**Commercial Optimization:**
- Call-to-action visibility enhancement
- Product/service highlighting
- Emotional impact amplification
- Conversion-focused adjustments

**RESPONSE FORMAT:**
Provide a comprehensive enhancement prompt that can be used for AI image generation:

"Enhance this image with the following specific improvements: [detailed instructions]. Maintain the original [list key elements to preserve]. Focus on [priority enhancement areas]. The final image should be [desired outcome description]. Style: [enhanced style parameters]. Technical requirements: [quality specifications]."

Make your enhancement instructions clear, specific, and implementable while ensuring the result will meet professional commercial standards.
```

**User Message**:
```
Original Image: {{ $('Format Response').item.json.image }}

Quality Analysis Results:
- Overall Score: {{ $('Image Quality Validator').item.json.overall_score }}/10
- Needs Improvement: {{ $('Image Quality Validator').item.json.needs_improvement }}
- Analysis: {{ $('Image Quality Validator').item.json.analysis }}
- Improvement Suggestions: {{ $('Image Quality Validator').item.json.improvement_suggestions }}

Company Context:
- Company: {{ $json.company_profile.company_name }}
- Industry: {{ $json.company_profile.industry }}
- Brand Voice: {{ $json.company_profile.brand_voice }}
- Colors: Primary {{ $json.company_profile.primary_color }}, Secondary {{ $json.company_profile.secondary_color }}

Original Prompt Used: {{ $('Basic LLM Chain').item.json.choices[0].message.content }}

Create a comprehensive enhancement prompt that addresses the identified issues while maintaining the original creative vision.
```

### 9. Enhanced HTTP Request (Image Generation - Conditional)

**URL**: https://api.openai.com/v1/images/generations
**Method**: POST
**Headers**: 
- Authorization: Bearer {{ $vars.OPENAI_API_KEY }}
- Content-Type: application/json

**Body**:
```json
{
  "model": "dall-e-3",
  "prompt": "{{ $('Image Enhancer').item.json.choices[0].message.content }}",
  "n": 1,
  "size": "1024x1024",
  "quality": "hd",
  "style": "natural"
}
```

**Note**: This node only executes when the IF condition is true (image needs improvement)

### 10. Final Response Formatter (Code)

**JavaScript Code**:
```javascript
// Determine which image to use based on the workflow path
let finalImage;
let processingNote;
let qualityScore;

// Check if image was enhanced
if ($input.all().some(item => item.json && item.json.data && item.json.data[0] && item.json.data[0].url)) {
  // Enhanced image path
  const enhancedImageData = $input.all().find(item => item.json && item.json.data && item.json.data[0]);
  finalImage = enhancedImageData.json.data[0].url;
  processingNote = "Image was enhanced based on quality analysis";
  qualityScore = $('Image Quality Validator').item.json.overall_score;
} else {
  // Original image path (passed quality check)
  finalImage = $('Format Response').item.json.image;
  processingNote = "Image passed quality validation";
  qualityScore = $('Image Quality Validator').item.json.overall_score;
}

// Get the original Gemini response
const geminiResponse = $('Format Response').item.json.gemini_response;

// Get quality analysis details
const qualityAnalysis = $('Image Quality Validator').item.json;

return {
  success: true,
  data: {
    image: finalImage,
    gemini_response: geminiResponse,
    quality_analysis: {
      overall_score: qualityScore,
      scores: qualityAnalysis.scores,
      analysis: qualityAnalysis.analysis,
      was_enhanced: finalImage !== $('Format Response').item.json.image,
      processing_note: processingNote
    }
  },
  error: null,
  timestamp: new Date().toISOString(),
  workflow_version: "2.0_with_quality_validation"
};
```

## Workflow Flow Logic

1. **Standard Path** (Image passes quality check):
   Webhook → LLM Chain → Format JSON → HTTP Request → Format Response → Quality Validator → IF (false) → Respond to Webhook

2. **Enhancement Path** (Image needs improvement):
   Webhook → LLM Chain → Format JSON → HTTP Request → Format Response → Quality Validator → IF (true) → Image Enhancer → Enhanced HTTP Request → Final Response Formatter → Respond to Webhook

## Key Features

- **Intelligent Quality Assessment**: Professional-grade image evaluation
- **Conditional Enhancement**: Only processes images that need improvement
- **Preservation of Quality**: Maintains original creative intent while improving technical aspects
- **Detailed Analytics**: Provides quality scores and analysis in the response
- **Efficient Processing**: Skips enhancement for images that already meet standards
- **Professional Standards**: Uses industry-standard evaluation criteria

## Expected Response Format

```json
{
  "success": true,
  "data": {
    "image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",
    "gemini_response": "Original creative description",
    "quality_analysis": {
      "overall_score": 8.2,
      "scores": {
        "visual_quality": 8.5,
        "commercial_viability": 8.0,
        "composition": 8.0,
        "brand_alignment": 8.3
      },
      "analysis": "High-quality image with strong commercial appeal",
      "was_enhanced": false,
      "processing_note": "Image passed quality validation"
    }
  },
  "error": null,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "workflow_version": "2.0_with_quality_validation"
}
```

This enhanced workflow ensures that every generated image meets professional commercial standards while maintaining efficiency by only processing images that actually need improvement.