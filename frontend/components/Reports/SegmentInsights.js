import React, { useState } from 'react';

export default function SegmentInsights({ analysisData, segmentInsights }) {
  const [selectedSegmentType, setSelectedSegmentType] = useState('demographic');
  
  // Handle different data structures
  if (!analysisData) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Segment Insights</h2>
        <p className="text-gray-500">No segment data available for this campaign.</p>
      </div>
    );
  }

  // Detect and handle the data structure
  let adDataArray = [];
  // If it's an array, use it directly
  if (Array.isArray(analysisData)) {
    adDataArray = analysisData;
  } 
  // If it has ad_analysis property that's an array, use that
  else if (analysisData.ad_analysis && Array.isArray(analysisData.ad_analysis)) {
    adDataArray = analysisData.ad_analysis;
  } 
  // If it's an object without ad_analysis or with empty ad_analysis
  else {
    console.warn('SegmentInsights: Unexpected data structure for analysisData:', typeof analysisData);
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Segment Insights</h2>
        <p className="text-gray-500">Unable to process segment data.</p>
      </div>
    );
  }

  // Check if we have ads after processing
  if (adDataArray.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Segment Insights</h2>
        <p className="text-gray-500">No ads found in the analysis data.</p>
      </div>
    );
  }
  
  // Get available segment types
  const segmentTypes = [];
  adDataArray.forEach(ad => {
    if (ad.demographic_segments?.length > 0 && !segmentTypes.includes('demographic')) {
      segmentTypes.push('demographic');
    }
    if (ad.device_segments?.length > 0 && !segmentTypes.includes('device')) {
      segmentTypes.push('device');
    }
    if (ad.hourly_segments?.length > 0 && !segmentTypes.includes('hourly')) {
      segmentTypes.push('hourly');
    }
    if (ad.region_segments?.length > 0 && !segmentTypes.includes('region')) {
      segmentTypes.push('region');
    }
    if (ad.audience_segments?.length > 0 && !segmentTypes.includes('audience')) {
      segmentTypes.push('audience');
    }
  });
  
  // If no specific segment types found, set defaults
  if (segmentTypes.length === 0) {
    segmentTypes.push('demographic', 'device');
  }
  
  // Get segments of selected type
  const getSegmentsOfType = (ad, type) => {
    switch (type) {
      case 'demographic':
        return ad.demographic_segments || [];
      case 'device':
        return ad.device_segments || [];
      case 'hourly':
        return ad.hourly_segments || [];
      case 'region':
        return ad.region_segments || [];
      case 'audience':
        return ad.audience_segments || [];
      default:
        return [];
    }
  };
  
  // Get segment name based on type
  const getSegmentName = (segment, type) => {
    const detail = segment.segment_detail || {};
    
    switch (type) {
      case 'demographic':
        return `${detail.age || 'Unknown'} / ${detail.gender || 'Unknown'}`;
      case 'device':
        return `${detail.device || 'Unknown'} / ${detail.platform || 'Unknown'}`;
      case 'hourly':
        return `Hour ${detail.hour || '0'}`;
      case 'region':
        return `${detail.region || 'Unknown Region'}`;
      case 'audience':
        return `${detail.audience || 'Unknown Audience'}`;
      default:
        return 'Unknown';
    }
  };
  
  // Format metrics
  const formatMetric = (value, type) => {
    if (value === undefined || value === null) return 'N/A';
    
    if (type === 'ctr' || type === 'conversion_rate') {
      return `${value.toFixed(2)}%`;
    } else if (type === 'cpc' || type === 'cpa') {
      return `$${value.toFixed(2)}`;
    } else if (type === 'roas') {
      return `${value.toFixed(2)}x`;
    } else {
      return value.toLocaleString();
    }
  };
  
  // Format z-score with color coding
  const formatZscore = (zscore) => {
    if (zscore === undefined || zscore === null) return null;
    
    const value = parseFloat(zscore);
    let color = 'text-gray-600';
    
    if (value > 1.5) color = 'text-green-600';
    else if (value < -1.5) color = 'text-red-600';
    
    return (
      <span className={color}>
        {value.toFixed(2)}
      </span>
    );
  };
  
  // Get all segments of selected type from all ads
  const allSegments = [];
  adDataArray.forEach(ad => {
    const segments = getSegmentsOfType(ad, selectedSegmentType);
    segments.forEach(segment => {
      allSegments.push({
        adId: ad.ad_id,
        segment,
        name: getSegmentName(segment, selectedSegmentType),
        spendPct: segment.ad_spend_percentage || 0,
        metrics: segment.metrics || {},
        zscores: segment.z_scores_vs_ad_avg || {}
      });
    });
  });
  
  // Sort by spend percentage
  allSegments.sort((a, b) => b.spendPct - a.spendPct);
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">Segment Insights</h2>
      
      <div className="mb-6">
        <p className="text-gray-600 mb-4">{segmentInsights}</p>
        
        <div className="flex flex-wrap gap-2 mb-4">
          {segmentTypes.map(type => (
            <button
              key={type}
              className={`px-3 py-1 rounded-full text-sm ${
                selectedSegmentType === type 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              onClick={() => setSelectedSegmentType(type)}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Segment
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Spend %
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                CTR
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                CTR Z-Score
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                CPC
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                CPC Z-Score
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                CPA
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                CPA Z-Score
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {allSegments.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-4 py-4 text-center text-gray-500">
                  No {selectedSegmentType} segments found
                </td>
              </tr>
            ) : (
              allSegments.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-gray-500">Ad: {item.adId}</div>
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {item.spendPct.toFixed(1)}%
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {formatMetric(item.metrics.ctr, 'ctr')}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {formatZscore(item.zscores.ctr)}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {formatMetric(item.metrics.cpc, 'cpc')}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {formatZscore(item.zscores.cpc)}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {formatMetric(item.metrics.cpa, 'cpa')}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {formatZscore(item.zscores.cpa)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-md">
        <h3 className="text-sm font-medium text-blue-800 mb-1">Segment Analysis Guide</h3>
        <p className="text-xs text-blue-700">
          The table shows segments sorted by spend percentage. Z-scores indicate how much a segment deviates from the average:
          <span className="text-green-600"> positive values (green)</span> are better for CTR and ROAS, 
          <span className="text-red-600"> negative values (red)</span> are better for CPC and CPA.
        </p>
      </div>
    </div>
  );
}
