// Process the analysis data
const processAnalysisData = (data) => {
  console.log('[ANALYZE_SEGMENT_API] Starting to process analysis data...');
  
  // Handle arrays of ads
  if (Array.isArray(data)) {
    console.log(`[ANALYZE_SEGMENT_API] Processing array data with ${data.length} items`);
    
    // Log the first item's structure to debug
    if (data.length > 0) {
      console.log('[ANALYZE_SEGMENT_API] First item field names:', Object.keys(data[0]));
      console.log('[ANALYZE_SEGMENT_API] First item conversion fields:', {
        results: data[0].results,
        conversions: data[0].conversions
      });
    }
    
    // Process each ad
    data.forEach(ad => {
      // Process segment data for each segment type
      ['demographic_segments', 'device_segments', 'hourly_segments', 'region_segments', 'audience_segments'].forEach(segmentType => {
        if (ad[segmentType] && Array.isArray(ad[segmentType])) {
          // Process each segment
          ad[segmentType].forEach(segment => {
            // Add calculations
            segment.ctr = segment.impressions > 0 ? (segment.clicks / segment.impressions) * 100 : 0;
            segment.cpc = segment.clicks > 0 ? segment.spend / segment.clicks : 0;
            
            // Handle different field names for conversions
            const conversionValue = Number(segment.results || segment.conversions || 0);
            segment.results = conversionValue; // Normalize to 'results'
            
            // Calculate CPA using 'results'
            segment.cpa = segment.results > 0 ? segment.spend / segment.results : 0;
            
            // Calculate conversion rate
            segment.conversion_rate = segment.clicks > 0 ? (segment.results / segment.clicks) * 100 : 0;
          });
        }
      });
    });
  }
  // Handle structured data with ad_analysis
  else if (data?.ad_analysis && Array.isArray(data.ad_analysis)) {
    console.log(`[ANALYZE_SEGMENT_API] Processing structured data with ${data.ad_analysis.length} items`);
    
    // Process each ad
    data.ad_analysis.forEach(ad => {
      // Process segment data for each segment type
      ['demographic_segments', 'device_segments', 'hourly_segments', 'region_segments', 'audience_segments'].forEach(segmentType => {
        if (ad[segmentType] && Array.isArray(ad[segmentType])) {
          // Process each segment
          ad[segmentType].forEach(segment => {
            // Add calculations
            segment.ctr = segment.impressions > 0 ? (segment.clicks / segment.impressions) * 100 : 0;
            segment.cpc = segment.clicks > 0 ? segment.spend / segment.clicks : 0;
            
            // Handle different field names for conversions
            const conversionValue = Number(segment.results || segment.conversions || 0);
            segment.results = conversionValue; // Normalize to 'results'
            
            // Calculate CPA using 'results'
            segment.cpa = segment.results > 0 ? segment.spend / segment.results : 0;
            
            // Calculate conversion rate
            segment.conversion_rate = segment.clicks > 0 ? (segment.results / segment.clicks) * 100 : 0;
          });
        }
      });
    });
  }
  
  return data;
}; 