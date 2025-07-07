import React, { useState, useEffect } from 'react';

const SuggestionsPanel = ({ adAccountId, isCompact = false }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Mock suggestions - in a real app this would come from an API
  const mockSuggestions = [
    {
      id: 1,
      title: 'Optimize Your CPC',
      description: 'Your cost per click is higher than average. Consider adjusting your bidding strategy to reduce costs.',
      type: 'warning',
      priority: 'high'
    },
    {
      id: 2,
      title: 'Improve Ad Targeting',
      description: 'Your ad reach could be improved by refining your audience targeting.',
      type: 'suggestion',
      priority: 'medium'
    },
    {
      id: 3,
      title: 'Budget Allocation',
      description: 'Consider shifting budget to better performing campaigns for optimal results.',
      type: 'suggestion',
      priority: 'medium'
    },
    {
      id: 4,
      title: 'Creative Refresh',
      description: 'Some of your ads have been running for over 30 days. Consider refreshing your creative.',
      type: 'suggestion',
      priority: 'low'
    }
  ];
  
  useEffect(() => {
    if (!adAccountId) return;
    
    const fetchSuggestions = async () => {
      try {
        setLoading(true);
        // In a real app, you would fetch suggestions from an API
        // For now, we'll simulate an API call with a timeout
        await new Promise(resolve => setTimeout(resolve, 500));
        setSuggestions(mockSuggestions);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSuggestions();
  }, [adAccountId]);
  
  if (!adAccountId) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <p className="text-gray-500">Select an ad account to view suggestions</p>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Show a compact version for the dashboard
  if (isCompact) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Top Suggestions</h3>
        <div className="space-y-3">
          {suggestions.slice(0, 2).map((suggestion) => (
            <div 
              key={suggestion.id}
              className={`p-3 rounded-lg ${
                suggestion.type === 'warning' ? 'bg-amber-50' : 'bg-blue-50'
              }`}
            >
              <h4 className={`text-sm font-semibold ${
                suggestion.type === 'warning' ? 'text-amber-700' : 'text-blue-700'
              }`}>
                {suggestion.title}
              </h4>
              <p className="text-sm mt-1 text-gray-600">{suggestion.description}</p>
            </div>
          ))}
          
          {suggestions.length > 2 && (
            <div className="text-center">
              <button className="text-primary text-sm font-medium hover:underline">
                View All Suggestions ({suggestions.length})
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  // Show full version
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Campaign Optimization Suggestions</h3>
      
      {suggestions.length === 0 ? (
        <p className="text-gray-500">No suggestions available at this time.</p>
      ) : (
        <div className="space-y-4">
          {suggestions.map((suggestion) => (
            <div 
              key={suggestion.id}
              className={`p-4 border-l-4 rounded-lg ${
                suggestion.type === 'warning' 
                  ? 'border-amber-500 bg-amber-50' 
                  : 'border-blue-500 bg-blue-50'
              }`}
            >
              <div className="flex items-start">
                <div className={`flex-shrink-0 mr-3 ${
                  suggestion.type === 'warning' ? 'text-amber-500' : 'text-blue-500'
                }`}>
                  {suggestion.type === 'warning' ? (
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
                    </svg>
                  )}
                </div>
                <div>
                  <h4 className={`text-sm font-semibold ${
                    suggestion.type === 'warning' ? 'text-amber-800' : 'text-blue-800'
                  }`}>
                    {suggestion.title}
                  </h4>
                  <p className="text-sm mt-1 text-gray-600">{suggestion.description}</p>
                  <div className="mt-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      suggestion.priority === 'high' ? 'bg-red-100 text-red-800' :
                      suggestion.priority === 'medium' ? 'bg-amber-100 text-amber-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {suggestion.priority.charAt(0).toUpperCase() + suggestion.priority.slice(1)} Priority
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SuggestionsPanel;
