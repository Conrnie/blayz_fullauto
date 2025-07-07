import React, { useState } from 'react';

// Icons for different segment types
const SegmentIcons = {
  demographics: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
    </svg>
  ),
  devices: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M7 2a2 2 0 00-2 2v12a2 2 0 002 2h6a2 2 0 002-2V4a2 2 0 00-2-2H7zm3 14a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
    </svg>
  ),
  regions: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
    </svg>
  ),
  times: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
    </svg>
  )
};

// Label mapping for display
const SegmentLabels = {
  demographics: "Demographics",
  devices: "Devices",
  regions: "Regions",
  times: "Time Periods"
};

// Helper to parse segment analysis from unstructured text
const parseSegmentAnalysisFromText = (text) => {
  const segments = {
    demographics: '',
    devices: '',
    regions: '',
    times: '',
    audiences: ''
  };
  
  try {
    // Look for segment headers in the text
    const demographicsMatch = text.match(/demographics?:?\s*(.*?)(?=(devices|regions|times|audiences):|\n\n|$)/is);
    const devicesMatch = text.match(/devices?:?\s*(.*?)(?=(demographics|regions|times|audiences):|\n\n|$)/is);
    const regionsMatch = text.match(/regions?:?\s*(.*?)(?=(demographics|devices|times|audiences):|\n\n|$)/is);
    const timesMatch = text.match(/times?:?\s*(.*?)(?=(demographics|devices|regions|audiences):|\n\n|$)/is);
    const audiencesMatch = text.match(/audiences?:?\s*(.*?)(?=(demographics|devices|regions|times):|\n\n|$)/is);
    
    if (demographicsMatch) segments.demographics = demographicsMatch[1].trim();
    if (devicesMatch) segments.devices = devicesMatch[1].trim();
    if (regionsMatch) segments.regions = regionsMatch[1].trim();
    if (timesMatch) segments.times = timesMatch[1].trim();
    if (audiencesMatch) segments.audiences = audiencesMatch[1].trim();
    
    return segments;
  } catch (error) {
    console.error('Error parsing segment analysis:', error);
    return segments;
  }
};

const SegmentAnalysis = ({ segmentAnalysis, detailedSegmentAnalyses }) => {
  // Determine available tabs dynamically from the updated SegmentLabels
  const availableTabs = Object.keys(SegmentLabels);
  // Initialize state ONCE using the first available tab
  const [activeTab, setActiveTab] = useState(availableTabs[0] || 'demographics');
  
  // Handle various formats of segmentAnalysis
  let processedSegmentAnalysis = segmentAnalysis;
  
  // If it's a string, try to parse it
  if (typeof segmentAnalysis === 'string') {
    console.log('SegmentAnalysis received string instead of object, attempting to parse');
    processedSegmentAnalysis = parseSegmentAnalysisFromText(segmentAnalysis);
  }
  
  // Check for missing or invalid data
  if (!processedSegmentAnalysis || typeof processedSegmentAnalysis !== 'object') {
    console.warn('Invalid segment analysis data:', segmentAnalysis);
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8 border-l-4 border-primary">
        <h2 className="text-xl font-semibold text-secondary mb-4 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Segment Analysis
        </h2>
        <div className="bg-gradient-to-r from-primary/5 to-secondary/5 p-5 rounded-lg border border-primary/20 flex items-start">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary mr-3 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-600">No segment analysis data available.</p>
        </div>
      </div>
    );
  }
  
  // Check if the detailed segment analyses are available
  const hasDetailedAnalyses = detailedSegmentAnalyses && Object.keys(detailedSegmentAnalyses).length > 0;
  
  // Get additional data for the active tab if available
  const getDetailedTabData = () => {
    if (!hasDetailedAnalyses) return null;
    
    const segmentType = {
      'demographics': 'demographic_analysis',
      'devices': 'device_analysis',
      'regions': 'region_analysis',
      'times': 'hourly_analysis',
      'audiences': 'audience_analysis'
    }[activeTab];
    
    return detailedSegmentAnalyses[segmentType] || null;
  };
  
  const detailedData = getDetailedTabData();
  
  // Build tabContent based on processed data (excluding audiences as it won't be accessed)
  const tabContent = {
    demographics: processedSegmentAnalysis?.demographics || 'No demographic analysis available.',
    devices: processedSegmentAnalysis?.devices || 'No device analysis available.',
    regions: processedSegmentAnalysis?.regions || 'No region analysis available.',
    times: processedSegmentAnalysis?.times || 'No time analysis available.'
  };
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8 border-l-4 border-primary">
      <h2 className="text-xl font-semibold text-secondary mb-6 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
        </svg>
        Segment Analysis
      </h2>
      
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {availableTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                py-2 px-1 border-b-2 font-medium text-sm flex items-center whitespace-nowrap transition-colors
                ${activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-secondary hover:border-gray-300'}
              `}
            >
              <span className={`mr-2 ${activeTab === tab ? 'text-primary' : 'text-gray-400'}`}>
                {SegmentIcons[tab]}
              </span>
              {SegmentLabels[tab] || tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>
      
      <div className="prose max-w-none bg-gradient-to-r from-white to-gray-50 p-5 rounded-lg border border-gray-100 shadow-sm">
        <p className="text-secondary">{tabContent[activeTab]}</p>
        
        {/* Display detailed insights if available */}
        {detailedData && detailedData.significant_segments && detailedData.significant_segments.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4 text-secondary flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Significant Segments
            </h3>
            <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Segment</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Performance</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Key Metric</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Z-Score</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Spend %</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {detailedData.significant_segments.map((segment, index) => {
                    const isGood = segment.performance?.toLowerCase() === 'good';
                    const bgColor = isGood ? 'bg-green-50 hover:bg-green-100' : 'bg-red-50 hover:bg-red-100';
                    const badgeColor = isGood ? 'bg-green-500 text-white' : 'bg-red-500 text-white';
                    
                    return (
                      <tr key={index} className={`${bgColor} transition-colors`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary">{segment.segment}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${badgeColor}`}>
                            {isGood ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            )}
                            {segment.performance}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">{segment.primary_metric}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">{segment.z_score}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">{segment.spend_percentage}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Display performance factors if available */}
        {detailedData && detailedData.performance_factors && detailedData.performance_factors.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4 text-secondary flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Performance Factors
            </h3>
            <div className="space-y-4">
              {detailedData.performance_factors.map((factor, index) => {
                let badgeColor, iconBg, borderColor;
                if (factor.importance === 'high') {
                  badgeColor = 'bg-red-500 text-white';
                  iconBg = 'bg-red-100';
                  borderColor = 'border-red-200';
                } else if (factor.importance === 'medium') {
                  badgeColor = 'bg-yellow-500 text-white';
                  iconBg = 'bg-yellow-100';
                  borderColor = 'border-yellow-200';
                } else {
                  badgeColor = 'bg-blue-500 text-white';
                  iconBg = 'bg-blue-100';
                  borderColor = 'border-blue-200';
                }
                
                return (
                  <div key={index} className={`border ${borderColor} bg-white rounded-lg p-4 shadow-sm transform transition-all duration-300 hover:shadow-md hover:-translate-y-1`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <div className={`p-2 rounded-full mr-3 ${iconBg}`}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <h4 className="font-medium text-secondary">{factor.factor}</h4>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${badgeColor}`}>
                        {factor.importance?.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 ml-11">{factor.explanation}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Display recommendations or actionables if available */}
        {detailedData && 
          ((detailedData.actionables && detailedData.actionables.length > 0) || 
           (detailedData.recommendations && detailedData.recommendations.length > 0)) && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4 text-secondary flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Segment-Specific Actionables
            </h3>
            <div className="space-y-4">
              {(detailedData.actionables || detailedData.recommendations || []).map((rec, index) => {
                let badgeColor, bgGradient, borderColor;
                if (rec.expected_impact === 'high') {
                  badgeColor = 'bg-green-500 text-white';
                  bgGradient = 'bg-gradient-to-br from-white to-green-50';
                  borderColor = 'border-green-200';
                } else if (rec.expected_impact === 'medium') {
                  badgeColor = 'bg-yellow-500 text-white';
                  bgGradient = 'bg-gradient-to-br from-white to-yellow-50';
                  borderColor = 'border-yellow-200';
                } else {
                  badgeColor = 'bg-blue-500 text-white';
                  bgGradient = 'bg-gradient-to-br from-white to-blue-50';
                  borderColor = 'border-blue-200';
                }
                
                return (
                  <div key={index} className={`border ${borderColor} ${bgGradient} rounded-lg p-5 shadow-sm transform transition-all duration-300 hover:shadow-md hover:-translate-y-1`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <div className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center mr-3">
                          <span className="font-bold text-sm">{index+1}</span>
                        </div>
                        <h4 className="font-medium text-secondary">Actionable</h4>
                      </div>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${badgeColor}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Impact: {rec.expected_impact?.toUpperCase()}
                      </span>
                    </div>
                    <div className="bg-white rounded-md p-3 border border-gray-100 mb-3">
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <span className="text-xs font-semibold text-secondary uppercase">Action</span>
                      </div>
                      <p className="text-sm text-secondary font-medium mt-1 ml-6">{rec.action}</p>
                    </div>
                    {rec.reasoning && (
                      <div className="bg-white rounded-md p-3 border border-gray-100">
                        <div className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-xs font-semibold text-secondary uppercase">Reasoning</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1 ml-6">{rec.reasoning}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SegmentAnalysis; 