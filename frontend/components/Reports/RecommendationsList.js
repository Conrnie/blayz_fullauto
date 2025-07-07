import React from 'react';
import ReactMarkdown from 'react-markdown';

// Helper to determine badge color based on confidence
const getConfidenceBadgeColor = (confidence) => {
  const confLower = confidence?.toLowerCase() || '';
  if (confLower.includes('high')) return 'bg-green-500 text-white';
  if (confLower.includes('moderate') || confLower.includes('medium')) return 'bg-yellow-500 text-white';
  if (confLower.includes('low')) return 'bg-red-500 text-white';
  return 'bg-gray-500 text-white'; // Default
};

// Helper to determine icon based on confidence
const getConfidenceIcon = (confidence) => {
  const confLower = confidence?.toLowerCase() || '';
  if (confLower.includes('high')) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    );
  }
  if (confLower.includes('moderate') || confLower.includes('medium')) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    );
  }
  if (confLower.includes('low')) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    );
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
};

// Helper to parse simple recommendations from unstructured text
const parseRecommendationsFromText = (text) => {
  if (!text) return [];
  
  // Common patterns for recommendations or actionables sections
  const sectionMatches = text.match(/(recommendations|actionables):(.+?)(?:\n\n|\n*$)/is);
  
  if (!sectionMatches || !sectionMatches[2]) return [];
  
  const recSection = sectionMatches[2].trim();
  
  // Look for numbered list items like "1. Do something"
  const recItems = recSection.split(/\d+\.\s+/).filter(Boolean);
  
  return recItems.map(item => ({
    action: item.trim(),
    target: 'N/A',
    observation: 'Extracted from text',
    confidence: 'medium'
  }));
};

export default function RecommendationsList({ recommendations = [] }) {
  // Check if we received a string instead of an array
  if (typeof recommendations === 'string' && recommendations.trim()) {
    console.log('RecommendationsList received string instead of array, attempting to parse');
    recommendations = parseRecommendationsFromText(recommendations);
  }
  
  // Ensure recommendations is always an array, even if null/undefined or not structured
  const structuredRecs = (Array.isArray(recommendations) ? recommendations : [])
    .map(rec => typeof rec === 'object' ? rec : { action: rec });

  if (structuredRecs.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-primary">
        <h2 className="text-2xl font-bold text-secondary mb-4 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Actionables
        </h2>
        <p className="text-gray-500">No actionable recommendations available</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-primary">
      <h2 className="text-2xl font-bold text-secondary mb-6 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        Actionables
      </h2>
      <div className="space-y-5">
        {structuredRecs.map((rec, index) => (
          <div 
            key={index} 
            className="bg-gradient-to-br from-white to-gray-50 rounded-lg border border-gray-200 p-5 shadow-sm transform transition-all duration-300 hover:shadow-md hover:-translate-y-1"
          >
            <div className="flex items-start space-x-4">
              {/* Number Bubble */}
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-white text-sm font-bold">
                  {index + 1}
                </div>
              </div>
              {/* Recommendation Content */}
              <div className="flex-1 space-y-3">
                {rec.target && rec.target !== 'N/A' && (
                  <div className="bg-white rounded-md p-3 border border-gray-100">
                    <div className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                      <span className="text-xs font-semibold text-secondary uppercase">Target</span>
                    </div>
                    <p className="text-sm text-gray-700 mt-1 ml-6">{rec.target}</p>
                  </div>
                )}
                {rec.observation && rec.observation !== 'N/A' && (
                  <div className="bg-white rounded-md p-3 border border-gray-100">
                    <div className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <span className="text-xs font-semibold text-secondary uppercase">Observation</span>
                    </div>
                    <p className="text-sm text-gray-700 mt-1 ml-6">{rec.observation}</p>
                  </div>
                )}
                <div className="bg-white rounded-md p-3 border border-gray-100">
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="text-xs font-semibold text-secondary uppercase">Action</span>
                  </div>
                  {/* Use ReactMarkdown for the action text */}
                  <div className="prose prose-sm max-w-none text-gray-800 mt-1 ml-6">
                    <ReactMarkdown components={{
                      p: ({node, ...props}) => <p className="text-gray-800" {...props} />
                    }}>{rec.action || 'No action specified.'}</ReactMarkdown>
                  </div>
                </div>

                {/* Insert Justification Here */}
                {rec.justification && (
                  <div className="bg-gray-100 rounded-md p-3 border border-gray-200 mt-2">
                    <div className="flex items-center">
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                         <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                       </svg>
                       <span className="text-xs font-semibold text-gray-700 uppercase">Reasoning</span>
                    </div>
                     <p className="text-sm text-gray-800 mt-1 ml-6">{rec.justification}</p>
                  </div>
                )}

                {rec.confidence && rec.confidence !== 'N/A' && (
                  <div className="flex items-center mt-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span className="text-xs font-semibold text-secondary uppercase mr-2">Confidence</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getConfidenceBadgeColor(rec.confidence)}`}>
                      {getConfidenceIcon(rec.confidence)}
                      <span className="ml-1">{rec.confidence}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
