import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import ExecutiveSummary from '../Reports/ExecutiveSummary';
import PerformanceOverview from '../Reports/PerformanceOverview';
import RecommendationsList from '../Reports/RecommendationsList';
import SegmentAnalysis from '../Reports/SegmentAnalysis';

// Helper to determine badge color based on confidence
const getConfidenceBadgeColor = (confidence) => {
  const confLower = confidence?.toLowerCase() || '';
  if (confLower.includes('high')) return 'bg-green-500 text-white';
  if (confLower.includes('moderate') || confLower.includes('medium')) return 'bg-yellow-500 text-white';
  if (confLower.includes('low')) return 'bg-red-500 text-white';
  return 'bg-gray-500 text-white';
};

const ReportView = ({ reportData, onBackToChat, campaignContext }) => {
  const [activeTab, setActiveTab] = useState('summary');
  const [isLoading, setIsLoading] = useState(false);

  // Handle different database structures:
  // - campaign_reports: has ai_insights and report_data fields
  // - assistant_reports: has report_content field
  const aiInsights = reportData?.ai_insights || reportData?.report_content?.ai_insights;
  const campaignData = reportData?.report_data || reportData?.report_content?.report_data || reportData;
  const campaignName = campaignContext?.campaign_name || 'Campaign Analysis';

  // Parse report data for fallback display if needed
  let parsedReportData = null;
  try {
    if (typeof reportData === 'string') {
      parsedReportData = JSON.parse(reportData);
    } else if (reportData?.report_content && typeof reportData.report_content === 'string') {
      parsedReportData = JSON.parse(reportData.report_content);
    }
  } catch (error) {
    console.error('Error parsing report data:', error);
  }

  useEffect(() => {
    console.log('ReportView received reportData:', reportData);
    console.log('ReportView received campaignContext:', campaignContext);
    console.log('ReportView aiInsights:', aiInsights);
    console.log('ReportView parsedReportData:', parsedReportData);
  }, [reportData, campaignContext, aiInsights, parsedReportData]);



  if (!reportData) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p>No report data available</p>
      </div>
    );
  }

  // Additional parsing for string-based report data
  if (typeof reportData === 'string' && !parsedReportData) {
    try {
      parsedReportData = JSON.parse(reportData);
    } catch (e) {
      parsedReportData = { raw_text: reportData };
    }
  }

  const tabs = [
    { id: 'summary', name: 'Executive Summary', icon: '📋' },
    { id: 'performance', name: 'Performance', icon: '📊' },
    { id: 'segments', name: 'Segments', icon: '🎯' },
    { id: 'recommendations', name: 'Recommendations', icon: '💡' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'summary':
        // If no AI insights, try to extract from parsed data or show fallback
        const executiveSummary = aiInsights?.executive_summary || 
                                 parsedReportData?.executive_summary || 
                                 campaignData?.executive_summary || 
                                 reportData?.executive_summary || '';
        const keyInsights = aiInsights?.key_insights || parsedReportData?.key_insights || 
                           (Array.isArray(aiInsights?.performance_overview) ? aiInsights.performance_overview : []);
        
        if (!executiveSummary && (!keyInsights || keyInsights.length === 0)) {
          return (
            <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-primary">
              <h2 className="text-2xl font-bold text-secondary mb-4 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Executive Summary
              </h2>
              <div className="text-gray-500 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p>No executive summary available for this report.</p>
                <div className="mt-4">
                  <h4 className="font-medium text-gray-700 mb-2">Raw Report Data:</h4>
                  <pre className="text-sm text-gray-600 whitespace-pre-wrap overflow-auto max-h-64">
                    {typeof reportData === 'string' ? reportData : JSON.stringify(reportData, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          );
        }
        
        return (
          <ExecutiveSummary 
            summary={executiveSummary}
            keyInsights={keyInsights}
          />
        );
      case 'performance':
        return (
          <PerformanceOverview 
            reportData={campaignData}
            aiInsights={aiInsights}
          />
        );
      case 'segments':
        // Extract segment analysis from various possible locations
        const segmentData = aiInsights?.segment_analysis || 
                               aiInsights?.segments || 
                               parsedReportData?.segment_analysis || 
                               parsedReportData?.segments ||
                               campaignData?.segment_analysis ||
                               reportData?.segment_analysis;
        
        return (
          <SegmentAnalysis 
            segmentAnalysis={segmentData}
            reportData={campaignData}
            detailedSegmentAnalyses={aiInsights?.detailed_segment_analyses || parsedReportData?.detailed_segment_analyses}
          />
        );
      case 'recommendations':
        const recommendations = aiInsights?.recommendations || 
                               aiInsights?.actionables || 
                               parsedReportData?.recommendations || 
                               parsedReportData?.actionables ||
                               campaignData?.recommendations ||
                               campaignData?.actionables ||
                               reportData?.recommendations ||
                               reportData?.actionables || [];
        
        if (!recommendations || recommendations.length === 0) {
          return (
            <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-primary">
              <h2 className="text-2xl font-bold text-secondary mb-4 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Actionables
              </h2>
              <p className="text-gray-500">No actionable recommendations available for this report.</p>
            </div>
          );
        }
        
        return (
          <RecommendationsList 
            recommendations={recommendations}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBackToChat}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">Back to Chat</span>
          </button>
          <div className="h-4 w-px bg-gray-300"></div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Campaign Report</h3>
            {campaignName && (
              <p className="text-sm text-gray-600">{campaignName}</p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Latest Report
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 bg-white">
        <nav className="flex space-x-8 px-4" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default ReportView;