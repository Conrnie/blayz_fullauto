import React, { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

export default function ExecutiveSummary({ summary, keyInsights = [] }) {
  // Log what we received for debugging
  useEffect(() => {
    console.log('ExecutiveSummary received:', { 
      summaryLength: summary?.length || 0,
      keyInsightsCount: keyInsights?.length || 0,
      summaryType: typeof summary,
      summaryPreview: summary?.substring(0, 50) || 'NONE'
    });
    
    // Deep log keyInsights to check structure
    if (keyInsights && keyInsights.length > 0) {
      console.log('First key insight structure:', JSON.stringify(keyInsights[0], null, 2));
    }
  }, [summary, keyInsights]);
  
  if (!summary && (!keyInsights || keyInsights.length === 0)) {
    console.warn('ExecutiveSummary: No data to display');
    return (
      <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-primary">
        <h2 className="text-2xl font-bold text-secondary mb-4 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Executive Summary
        </h2>
        <div className="text-gray-500 bg-gray-50 p-4 rounded-lg border border-gray-200">
          <p>No executive summary data available. This could be due to:</p>
          <ul className="list-disc ml-6 mt-2">
            <li>The AI model did not return a valid response</li>
            <li>There may be an issue with the AI integration</li>
            <li>The campaign data might not be sufficient for analysis</li>
          </ul>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-primary">
      <h2 className="text-2xl font-bold text-secondary mb-6 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        Executive Summary
      </h2>
      
      {/* Render the executive summary */}
      <div className="prose max-w-none mb-8 bg-gradient-to-r from-white to-gray-50 p-6 rounded-lg border border-gray-100 shadow-sm">
        {summary ? (
          <ReactMarkdown components={{
            // Apply styles to paragraphs
            p: ({node, ...props}) => <p className="text-secondary leading-relaxed" {...props} />
          }}>{summary}</ReactMarkdown>
        ) : (
          <p className="text-gray-500 italic">No executive summary available.</p>
        )}
      </div>
      
      {/* Render key insights if available */}
      {keyInsights && keyInsights.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-bold text-secondary mb-5 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Key Insights
          </h3>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {keyInsights.map((insight, index) => {
              // Determine color based on importance
              let bgColor = "bg-gradient-to-br from-white to-gray-50";
              let borderColor = "border-gray-200";
              let iconColor = "text-gray-400";
              let tagBg = "bg-gray-100";
              let tagText = "text-gray-600";
              
              if (insight.importance === "high") {
                bgColor = "bg-gradient-to-br from-white to-blue-50";
                borderColor = "border-blue-200";
                iconColor = "text-primary";
                tagBg = "bg-primary";
                tagText = "text-white";
              } else if (insight.importance === "medium") {
                bgColor = "bg-gradient-to-br from-white to-green-50";
                borderColor = "border-green-200";
                iconColor = "text-green-500";
                tagBg = "bg-green-500";
                tagText = "text-white";
              }
              
              return (
                <div 
                  key={index} 
                  className={`${bgColor} ${borderColor} border rounded-lg p-5 shadow-sm transform transition-all duration-300 hover:shadow-md hover:-translate-y-1`}
                >
                  <div className="flex items-start mb-3">
                    <div className={`mr-3 mt-1 ${iconColor}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h4 className="font-semibold text-secondary">{insight.title}</h4>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${tagBg} ${tagText} ml-2`}>
                          {insight.importance}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">{insight.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
