import { useState } from 'react';
import { fetchWithAuth } from '../lib/apiClient.js';

export default function AnalysisPanel() {
  const [loading, setLoading] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [error, setError] = useState(null);
  const [responseData, setResponseData] = useState(null);

  const startAnalysis = async () => {
    setLoading(true);
    setError(null);
    setResponseData(null);
    try {
      console.log('Calling analyze-campaign API with auth...');
      const data = await fetchWithAuth('/api/analyze-campaign', {
        method: 'POST',
      });
      
      console.log('Parsed response data from fetchWithAuth:', data);
      setResponseData(data);

      // Validate the response data structure
      if (!data || typeof data !== 'object') {
        console.warn('Invalid response format:', data);
        throw new Error('Invalid response format');
      }

      // Ad analysis array handling
      let adAnalysis = [];
      if (data.ad_analysis) {
        if (Array.isArray(data.ad_analysis)) {
          adAnalysis = data.ad_analysis;
        } else {
          console.warn('ad_analysis is not an array:', data.ad_analysis);
          // If it's not an array but is an object with useful data, try to use it
          if (typeof data.ad_analysis === 'object') {
            adAnalysis = [data.ad_analysis];
          }
        }
      } else if (Array.isArray(data)) {
        // If the main data is already an array (from SQL function output)
        adAnalysis = data;
        // Update the entire response data format to match expected structure
        data = {
          ad_analysis: adAnalysis,
          demographic_analysis: []
        };
        setResponseData(data);
      }

      // Demographic analysis array handling
      let demographicAnalysis = [];
      if (data.demographic_analysis) {
        if (Array.isArray(data.demographic_analysis)) {
          demographicAnalysis = data.demographic_analysis;
        } else {
          console.warn('demographic_analysis is not an array:', data.demographic_analysis);
          if (typeof data.demographic_analysis === 'object') {
            demographicAnalysis = [data.demographic_analysis];
          }
        }
      }

      // Set the final structured results
      setAnalysisResults({
        ad_analysis: adAnalysis,
        demographic_analysis: demographicAnalysis
      });
    } catch (error) {
      console.error('Analysis error:', error);
      setError(error.message || 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const renderMetricValue = (value, zScore) => {
    let badgeColor = 'bg-gray-200 text-gray-800';
    if (zScore && Math.abs(Number(zScore)) >= 2) {
      badgeColor = Number(zScore) > 0 
        ? 'bg-green-100 text-green-800' 
        : 'bg-red-100 text-red-800';
    }
    
    return (
      <div>
        <span>{value}</span>
        {zScore !== undefined && (
          <span className={`ml-2 text-xs px-2 py-1 rounded-full ${badgeColor}`}>
            z: {typeof zScore === 'number' ? zScore.toFixed(2) : Number(zScore).toFixed(2)}
          </span>
        )}
      </div>
    );
  };

  const renderDataDebug = () => {
    return (
      <div className="mb-8 bg-gray-100 p-4 rounded">
        <h3 className="text-lg font-medium mb-2">Raw Response Data</h3>
        <pre className="text-xs whitespace-pre-wrap overflow-auto max-h-60">
          {JSON.stringify(responseData, null, 2)}
        </pre>
        
        {/* Add debug information about segments */}
        {responseData?.ad_analysis && responseData.ad_analysis.some(ad => 
          (ad.device_segments && ad.device_segments.length > 0) || 
          (ad.demographic_segments && ad.demographic_segments.length > 0) ||
          (ad.hourly_segments && ad.hourly_segments.length > 0) ||
          (ad.region_segments && ad.region_segments.length > 0) ||
          (ad.audience_segments && ad.audience_segments.length > 0)
        ) && (
          <div className="mt-4">
            <h4 className="text-md font-medium mb-2">Segment Data Found ✓</h4>
            <div>
              {responseData.ad_analysis.map((ad, i) => (
                <div key={i} className="mb-2">
                  <strong>Ad {ad.ad_id || i}:</strong> 
                  {ad.device_segments?.length || 0} device segments, 
                  {ad.demographic_segments?.length || 0} demographic segments,
                  {ad.hourly_segments?.length || 0} hourly segments,
                  {ad.region_segments?.length || 0} region segments,
                  {ad.audience_segments?.length || 0} audience segments
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };
  
  // Add a new function to render segment data
  const renderSegmentData = (ad) => {
    if ((!ad.device_segments || ad.device_segments.length === 0) && 
        (!ad.demographic_segments || ad.demographic_segments.length === 0) &&
        (!ad.hourly_segments || ad.hourly_segments.length === 0) &&
        (!ad.region_segments || ad.region_segments.length === 0) &&
        (!ad.audience_segments || ad.audience_segments.length === 0)) {
      return null;
    }
    
    return (
      <div className="mt-4 p-4 border border-blue-100 bg-blue-50 rounded">
        <h4 className="font-medium text-blue-800 mb-2">Segment Breakdown</h4>
        
        {/* Device Segments */}
        {ad.device_segments && ad.device_segments.length > 0 && (
          <div className="mb-3">
            <h5 className="text-sm font-medium text-blue-700">Device Segments ({ad.device_segments.length})</h5>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="bg-blue-100">
                    <th className="px-2 py-1 text-left">Device/Platform</th>
                    <th className="px-2 py-1 text-left">Metrics</th>
                    <th className="px-2 py-1 text-left">Z-Scores</th>
                    <th className="px-2 py-1 text-left">Spend %</th>
                  </tr>
                </thead>
                <tbody>
                  {ad.device_segments.slice(0, 3).map((segment, i) => {
                    const detail = segment.segment_detail || {};
                    const metrics = segment.metrics || {};
                    const zScores = segment.z_scores_vs_ad_avg || {};
                    
                    return (
                      <tr key={i} className="border-b border-blue-100">
                        <td className="px-2 py-1">
                          {detail.device || 'Unknown'} / {detail.platform || 'Unknown'}
                        </td>
                        <td className="px-2 py-1">
                          {metrics.ctr && `CTR: ${(metrics.ctr).toFixed(2)}%, `}
                          {metrics.cpc && `CPC: $${(metrics.cpc).toFixed(2)}, `}
                          {metrics.cpa && `CPA: $${(metrics.cpa).toFixed(2)}`}
                        </td>
                        <td className="px-2 py-1">
                          {zScores.ctr && `CTR: ${(zScores.ctr).toFixed(2)}, `}
                          {zScores.cpc && `CPC: ${(zScores.cpc).toFixed(2)}, `}
                          {zScores.cpa && `CPA: ${(zScores.cpa).toFixed(2)}`}
                        </td>
                        <td className="px-2 py-1">
                          {(segment.ad_spend_percentage || 0).toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                  {ad.device_segments.length > 3 && (
                    <tr>
                      <td colSpan="4" className="px-2 py-1 text-center text-blue-600">
                        +{ad.device_segments.length - 3} more segments...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Demographic Segments */}
        {ad.demographic_segments && ad.demographic_segments.length > 0 && (
          <div className="mb-3">
            <h5 className="text-sm font-medium text-blue-700">Demographic Segments ({ad.demographic_segments.length})</h5>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="bg-blue-100">
                    <th className="px-2 py-1 text-left">Demographics</th>
                    <th className="px-2 py-1 text-left">Metrics</th>
                    <th className="px-2 py-1 text-left">Z-Scores</th>
                    <th className="px-2 py-1 text-left">Spend %</th>
                  </tr>
                </thead>
                <tbody>
                  {ad.demographic_segments.slice(0, 3).map((segment, i) => {
                    const detail = segment.segment_detail || {};
                    const metrics = segment.metrics || {};
                    const zScores = segment.z_scores_vs_ad_avg || {};
                    
                    return (
                      <tr key={i} className="border-b border-blue-100">
                        <td className="px-2 py-1">
                          {detail.age || 'Unknown'} / {detail.gender || 'Unknown'}
                        </td>
                        <td className="px-2 py-1">
                          {metrics.ctr && `CTR: ${(metrics.ctr).toFixed(2)}%, `}
                          {metrics.cpc && `CPC: $${(metrics.cpc).toFixed(2)}, `}
                          {metrics.cpa && `CPA: $${(metrics.cpa).toFixed(2)}`}
                        </td>
                        <td className="px-2 py-1">
                          {zScores.ctr && `CTR: ${(zScores.ctr).toFixed(2)}, `}
                          {zScores.cpc && `CPC: ${(zScores.cpc).toFixed(2)}, `}
                          {zScores.cpa && `CPA: ${(zScores.cpa).toFixed(2)}`}
                        </td>
                        <td className="px-2 py-1">
                          {(segment.ad_spend_percentage || 0).toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                  {ad.demographic_segments.length > 3 && (
                    <tr>
                      <td colSpan="4" className="px-2 py-1 text-center text-blue-600">
                        +{ad.demographic_segments.length - 3} more segments...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Hourly Segments */}
        {ad.hourly_segments && ad.hourly_segments.length > 0 && (
          <div className="mb-3">
            <h5 className="text-sm font-medium text-blue-700">Hourly Segments ({ad.hourly_segments.length})</h5>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="bg-blue-100">
                    <th className="px-2 py-1 text-left">Hour of Day</th>
                    <th className="px-2 py-1 text-left">Metrics</th>
                    <th className="px-2 py-1 text-left">Z-Scores</th>
                    <th className="px-2 py-1 text-left">Spend %</th>
                  </tr>
                </thead>
                <tbody>
                  {ad.hourly_segments.slice(0, 3).map((segment, i) => {
                    const detail = segment.segment_detail || {};
                    const metrics = segment.metrics || {};
                    const zScores = segment.z_scores_vs_ad_avg || {};
                    
                    return (
                      <tr key={i} className="border-b border-blue-100">
                        <td className="px-2 py-1">
                          {detail.hour_of_day || 'Unknown'}
                        </td>
                        <td className="px-2 py-1">
                          {metrics.ctr && `CTR: ${(metrics.ctr).toFixed(2)}%, `}
                          {metrics.cpc && `CPC: $${(metrics.cpc).toFixed(2)}, `}
                          {metrics.cpa && `CPA: $${(metrics.cpa).toFixed(2)}`}
                        </td>
                        <td className="px-2 py-1">
                          {zScores.ctr && `CTR: ${(zScores.ctr).toFixed(2)}, `}
                          {zScores.cpc && `CPC: ${(zScores.cpc).toFixed(2)}, `}
                          {zScores.cpa && `CPA: ${(zScores.cpa).toFixed(2)}`}
                        </td>
                        <td className="px-2 py-1">
                          {(segment.ad_spend_percentage || 0).toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                  {ad.hourly_segments.length > 3 && (
                    <tr>
                      <td colSpan="4" className="px-2 py-1 text-center text-blue-600">
                        +{ad.hourly_segments.length - 3} more segments...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Region Segments */}
        {ad.region_segments && ad.region_segments.length > 0 && (
          <div className="mb-3">
            <h5 className="text-sm font-medium text-blue-700">Region Segments ({ad.region_segments.length})</h5>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="bg-blue-100">
                    <th className="px-2 py-1 text-left">Region</th>
                    <th className="px-2 py-1 text-left">Metrics</th>
                    <th className="px-2 py-1 text-left">Z-Scores</th>
                    <th className="px-2 py-1 text-left">Spend %</th>
                  </tr>
                </thead>
                <tbody>
                  {ad.region_segments.slice(0, 3).map((segment, i) => {
                    const detail = segment.segment_detail || {};
                    const metrics = segment.metrics || {};
                    const zScores = segment.z_scores_vs_ad_avg || {};
                    
                    return (
                      <tr key={i} className="border-b border-blue-100">
                        <td className="px-2 py-1">
                          {detail.region || 'Unknown'}
                        </td>
                        <td className="px-2 py-1">
                          {metrics.ctr && `CTR: ${(metrics.ctr).toFixed(2)}%, `}
                          {metrics.cpc && `CPC: $${(metrics.cpc).toFixed(2)}, `}
                          {metrics.cpa && `CPA: $${(metrics.cpa).toFixed(2)}`}
                        </td>
                        <td className="px-2 py-1">
                          {zScores.ctr && `CTR: ${(zScores.ctr).toFixed(2)}, `}
                          {zScores.cpc && `CPC: ${(zScores.cpc).toFixed(2)}, `}
                          {zScores.cpa && `CPA: ${(zScores.cpa).toFixed(2)}`}
                        </td>
                        <td className="px-2 py-1">
                          {(segment.ad_spend_percentage || 0).toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                  {ad.region_segments.length > 3 && (
                    <tr>
                      <td colSpan="4" className="px-2 py-1 text-center text-blue-600">
                        +{ad.region_segments.length - 3} more segments...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Audience Segments */}
        {ad.audience_segments && ad.audience_segments.length > 0 && (
          <div>
            <h5 className="text-sm font-medium text-blue-700">Audience Segments ({ad.audience_segments.length})</h5>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="bg-blue-100">
                    <th className="px-2 py-1 text-left">Audience</th>
                    <th className="px-2 py-1 text-left">Metrics</th>
                    <th className="px-2 py-1 text-left">Z-Scores</th>
                    <th className="px-2 py-1 text-left">Spend %</th>
                  </tr>
                </thead>
                <tbody>
                  {ad.audience_segments.slice(0, 3).map((segment, i) => {
                    const detail = segment.segment_detail || {};
                    const metrics = segment.metrics || {};
                    const zScores = segment.z_scores_vs_ad_avg || {};
                    
                    return (
                      <tr key={i} className="border-b border-blue-100">
                        <td className="px-2 py-1">
                          {detail.audience_segment || 'Unknown'}
                        </td>
                        <td className="px-2 py-1">
                          {metrics.ctr && `CTR: ${(metrics.ctr).toFixed(2)}%, `}
                          {metrics.cpc && `CPC: $${(metrics.cpc).toFixed(2)}, `}
                          {metrics.cpa && `CPA: $${(metrics.cpa).toFixed(2)}`}
                        </td>
                        <td className="px-2 py-1">
                          {zScores.ctr && `CTR: ${(zScores.ctr).toFixed(2)}, `}
                          {zScores.cpc && `CPC: ${(zScores.cpc).toFixed(2)}, `}
                          {zScores.cpa && `CPA: ${(zScores.cpa).toFixed(2)}`}
                        </td>
                        <td className="px-2 py-1">
                          {(segment.ad_spend_percentage || 0).toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                  {ad.audience_segments.length > 3 && (
                    <tr>
                      <td colSpan="4" className="px-2 py-1 text-center text-blue-600">
                        +{ad.audience_segments.length - 3} more segments...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4">
      <button
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 mb-4"
        onClick={startAnalysis}
        disabled={loading}
      >
        {loading ? 'Analyzing...' : 'Start Campaign Analysis'}
      </button>

      {loading && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2">Analyzing campaign data...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p><strong>Error:</strong> {error}</p>
        </div>
      )}

      {/* Display raw response data for debugging */}
      {responseData && renderDataDebug()}

      {analysisResults && (
        <div>
          <h3 className="text-lg font-medium mb-4">Ad Performance Analysis</h3>
          {analysisResults.ad_analysis && analysisResults.ad_analysis.length > 0 ? (
            <div className="overflow-x-auto mb-8">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ad ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CTR</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CPC</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CPA</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ROAS</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analysisResults.ad_analysis.map((ad, index) => {
                    // Extract metrics from the structure returned by SQL function
                    const metrics = ad.overall_metrics || ad;
                    const zScores = ad.overall_z_scores_vs_campaign_avg || {};
                    
                    return (
                      <tr key={ad.ad_id || `ad-${index}`} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">{ad.ad_id || 'Unknown'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {metrics.ctr !== undefined ? 
                            renderMetricValue((metrics.ctr || 0).toFixed(2) + '%', zScores.ctr) : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {metrics.cpc !== undefined ? 
                            renderMetricValue('$' + (metrics.cpc || 0).toFixed(2), zScores.cpc) : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {metrics.cpa !== undefined ? 
                            renderMetricValue('$' + (metrics.cpa || 0).toFixed(2), zScores.cpa) : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {metrics.roas !== undefined ? 
                            renderMetricValue((metrics.roas || 0).toFixed(2) + 'x', zScores.roas) : 'N/A'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              
              {/* Add segment visualization for the ads with segments */}
              {analysisResults.ad_analysis.some(ad => 
                (ad.device_segments && ad.device_segments.length > 0) || 
                (ad.demographic_segments && ad.demographic_segments.length > 0) ||
                (ad.hourly_segments && ad.hourly_segments.length > 0) ||
                (ad.region_segments && ad.region_segments.length > 0) ||
                (ad.audience_segments && ad.audience_segments.length > 0)
              ) && (
                <div className="mt-8">
                  <h3 className="text-lg font-medium mb-4">Segment Data</h3>
                  {analysisResults.ad_analysis.map((ad, index) => (
                    <div key={ad.ad_id || `ad-segments-${index}`} className="mb-6">
                      <h4 className="font-medium border-b pb-2">Ad {ad.ad_id || index + 1}</h4>
                      {renderSegmentData(ad)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-yellow-50 p-4 border border-yellow-100 rounded mb-8">
              <p>No ad performance data available. Make sure you have ads with enough impressions.</p>
            </div>
          )}

          <h3 className="text-lg font-medium mb-4">Demographic Analysis</h3>
          {analysisResults.demographic_analysis && analysisResults.demographic_analysis.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Segment</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CTR</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CPC</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CPA</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ROAS</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analysisResults.demographic_analysis.map((demo, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">{demo.segment_type || 'Unknown'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{demo.segment_value || 'Unknown'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {demo.ctr !== undefined ? renderMetricValue((demo.ctr || 0).toFixed(2) + '%', demo.ctr_zscore) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {demo.cpc !== undefined ? renderMetricValue('$' + (demo.cpc || 0).toFixed(2), demo.cpc_zscore) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {demo.cpa !== undefined ? renderMetricValue('$' + (demo.cpa || 0).toFixed(2), demo.cpa_zscore) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {demo.roas !== undefined ? renderMetricValue((demo.roas || 0).toFixed(2) + 'x', demo.roas_zscore) : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-yellow-50 p-4 border border-yellow-100 rounded mb-8">
              <p>No demographic data available. Make sure you have demographic breakdowns with enough impressions.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 