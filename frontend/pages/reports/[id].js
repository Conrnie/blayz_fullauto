import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import supabase from '../../lib/supabase.js';
import ExecutiveSummary from '../../components/Reports/ExecutiveSummary';
import PerformanceOverview from '../../components/Reports/PerformanceOverview';
import SegmentInsights from '../../components/Reports/SegmentInsights'; // Keep for full table view
import RecommendationsList from '../../components/Reports/RecommendationsList';
import SegmentAnalysis from '../../components/Reports/SegmentAnalysis'; // Import the new component
import {
  Box,
  CircularProgress,
  Container,
  Typography,
  Paper,
  Grid,
  Button,
  Divider,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import { Download as DownloadIcon, Insights as InsightsIcon, BarChart as BarChartIcon, AttachMoney as AttachMoneyIcon, Visibility as VisibilityIcon, AdsClick as AdsClickIcon, PersonAdd as PersonAddIcon, Percent as PercentIcon, Mouse as MouseIcon, PriceCheck as PriceCheckIcon } from '@mui/icons-material';

// Mock report data for development
const mockReportData = {
  id: 'mock-report-id',
  campaign_id: 'mock-campaign-id',
  created_at: new Date().toISOString(),
  report_date: new Date().toISOString().split('T')[0],
  report_data: [],
  ai_insights: {
    executive_summary: "This campaign is showing mixed performance across segments, with some demographics significantly outperforming others. Overall ROAS is below target at 1.2, with CPA averaging $42.50.",
    key_insights: [
      {
        title: "Mobile Outperforming Desktop",
        description: "Mobile devices are outperforming desktop significantly with 25% lower CPA and higher engagement rates.",
        importance: "high"
      },
      {
        title: "Female 25-34 Top Performers",
        description: "Female 25-34 demographic shows the strongest performance with ROAS of 2.1, significantly above campaign average.",
        importance: "high"
      },
      {
        title: "Underperforming Creative",
        description: "Ad creative #2 is significantly underperforming with 40% higher CPA than other ads in the campaign.",
        importance: "medium"
      },
      {
        title: "Weekend Performance Boost",
        description: "Weekend performance is notably stronger than weekdays, especially during evening hours with 30% higher CTR.",
        importance: "medium"
      }
    ],
    segment_analysis: {
      demographics: "Demographics show significant variance in performance, with younger segments (18-34) outperforming older segments across all metrics.",
      devices: "Device analysis shows iOS devices converting at a 22% higher rate than Android, with tablets showing the lowest engagement.",
      regions: "Regional data indicates strong performance in urban areas compared to rural areas, with highest ROAS in metropolitan regions.",
      times: "Evening hours (6-10pm) consistently outperform morning and afternoon times, with weekends showing 15% better performance.",
      audiences: "Lookalike audiences are delivering 35% better ROAS than interest-based targeting across all campaign objectives."
    },
    recommendations: [
      {
        target: "Device targeting",
        observation: "Mobile devices have 25% lower CPA than desktop",
        action: "Shift 25% of budget from desktop to mobile placements to capitalize on better performance.",
        expected_impact: "high",
        confidence: "high"
      },
      {
        target: "Demographic targeting",
        observation: "Female 25-34 demographic has 2.1 ROAS vs. campaign average of 1.2",
        action: "Increase bid adjustments for the 25-34 female demographic by 15-20%.",
        expected_impact: "medium",
        confidence: "high"
      },
      {
        target: "Ad creative #2",
        observation: "40% higher CPA than other creatives",
        action: "Pause or significantly revise ad creative #2 to align with better performing ads.",
        expected_impact: "medium",
        confidence: "medium"
      },
      {
        target: "Campaign scheduling",
        observation: "Weekend evening hours show 30% better performance",
        action: "Implement dayparting to increase bids by 10-15% during weekend evening hours.",
        expected_impact: "medium",
        confidence: "medium"
      }
    ],
    generated_at: new Date().toISOString()
  }
};

export default function ReportDetail(props) {
  const router = useRouter();
  const { report, campaignName, error } = props;
  const [showFullTable, setShowFullTable] = useState(false); // State for toggling
  const [aggregatedInsights, setAggregatedInsights] = useState(null); // State for aggregated data
  const [loadingInsights, setLoadingInsights] = useState(false); // Loading state for insights

  // Parse report_data if it's a string
  let reportData = report?.report_data || {};
  if (typeof reportData === 'string') {
    try {
      reportData = JSON.parse(reportData);
      console.log('Successfully parsed report_data from string to object');
    } catch (error) {
      console.error('Failed to parse report_data:', error);
      reportData = {};
    }
  }
  
  // --- Helper function to extract highlights ---
  const extractHighlights = (reportData, zThreshold = 1.0, spendThreshold = 2, limit = 5) => {
    const allSegments = [];
    
    // Handle different data structures
    let adDataArray = [];
    
    // If reportData is an array, use it directly
    if (Array.isArray(reportData)) {
      adDataArray = reportData;
    }
    // If it has ad_analysis property that's an array, use that
    else if (reportData?.ad_analysis && Array.isArray(reportData.ad_analysis)) {
      adDataArray = reportData.ad_analysis;
    }
    // If neither, log warning and return empty results
    else {
      console.warn("Report data is not in expected format:", reportData);
      
      // For development purposes, return mock data
      if (process.env.NODE_ENV !== 'production') {
        console.log("Creating mock highlight data for development");
        return {
          topPerformers: [
            {
              ad_id: 'mock-ad-1',
              segment_detail: { age: '25-34', gender: 'female' },
              metric_name: 'ctr',
              z_score: 2.3,
              ad_spend_percentage: 22,
            },
            {
              ad_id: 'mock-ad-2',
              segment_detail: { device: 'Mobile' },
              metric_name: 'conversion_rate',
              z_score: 1.8,
              ad_spend_percentage: 35,
            }
          ],
          worstPerformers: [
            {
              ad_id: 'mock-ad-3',
              segment_detail: { age: '65+' },
              metric_name: 'cpa',
              z_score: -2.1,
              ad_spend_percentage: 10,
            },
            {
              ad_id: 'mock-ad-4',
              segment_detail: { time: 'Morning' },
              metric_name: 'roas',
              z_score: -1.7,
              ad_spend_percentage: 15,
            }
          ]
        };
      }
      
      return { topPerformers: [], worstPerformers: [] };
    }

    // Process ad data to extract segments if we have adDataArray
    if (adDataArray.length > 0) {
      // Flatten all segments across ads
      adDataArray.forEach(adData => {
        if (adData.segments && Array.isArray(adData.segments)) {
          adData.segments.forEach(segment => {
            if (segment.metric_name && segment.z_score !== undefined) {
              // Only include segments that meet minimum thresholds
              const absZScore = Math.abs(segment.z_score);
              if (absZScore >= zThreshold && segment.ad_spend_percentage >= spendThreshold) {
                allSegments.push({
                  ad_id: adData.ad_id || 'unknown',
                  segment_detail: segment.segment_detail || {},
                  metric_name: segment.metric_name,
                  z_score: segment.z_score,
                  ad_spend_percentage: segment.ad_spend_percentage || 0,
                });
              }
            }
          });
        }
      });
      
      // Sort segments by absolute z-score (descending)
      allSegments.sort((a, b) => Math.abs(b.z_score) - Math.abs(a.z_score));
      
      // Split into top performers (positive z-score) and worst performers (negative z-score)
      const topPerformers = allSegments
        .filter(segment => segment.z_score > 0)
        .slice(0, limit);
        
      const worstPerformers = allSegments
        .filter(segment => segment.z_score < 0)
        .slice(0, limit);

      return { topPerformers, worstPerformers };
    }
    
    // If no data was found or processed, return empty arrays
    return { topPerformers: [], worstPerformers: [] };
  };
  // --- End Helper ---

  // Format date for display
  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  // Download report as PDF
  function downloadPDF() {
    alert('PDF download would be implemented here');
    // In a real implementation, you would use a library like jsPDF or html2pdf
  }

  // Handle error state passed from getServerSideProps
  if (error || !report) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error || 'Report not found'}
        </div>
        <Link href="/reports" legacyBehavior>
          <a className="text-blue-600 hover:underline">&larr; Back to Reports</a>
        </Link>
      </div>
    );
  }
  
  // Extract AI insights with proper structure
  let aiInsights = report?.ai_insights || {};

  // Check if aiInsights is a string and needs to be parsed
  console.log('Raw AI Insights Type:', typeof aiInsights);
  console.log('Raw AI Insights Preview:', 
    typeof aiInsights === 'string' 
      ? aiInsights.substring(0, 100) + '...' 
      : 'Not a string');

  // Parse it if it's a string
  if (typeof aiInsights === 'string') {
    try {
      aiInsights = JSON.parse(aiInsights);
      console.log('Successfully parsed AI insights from string to object');
    } catch (error) {
      console.error('Failed to parse AI insights:', error);
      aiInsights = {};
    }
  }

  console.log('Report AI Insights Type (after parsing):', typeof aiInsights);
  console.log('Report AI Insights Keys:', Object.keys(aiInsights));
  console.log('Report Source:', report?.id, 'Is Mock:', report?.id === 'mock-report-id');

  // If this is real data, analyze if the executive summary exists
  if (aiInsights && typeof aiInsights === 'object' && Object.keys(aiInsights).length > 0) {
    console.log('AI Insights Model:', aiInsights.model);
    console.log('AI Insights Source:', aiInsights.source);
    console.log('Has Executive Summary:', Boolean(aiInsights.executive_summary));
    console.log('Executive Summary Preview:', aiInsights.executive_summary?.substring(0, 100) || 'None');
  }
  
  // Get the structured data based on our new format
  const executiveSummary = aiInsights.executive_summary || "";
  const keyInsights = Array.isArray(aiInsights.key_insights) ? aiInsights.key_insights : [];
  const segmentAnalysis = aiInsights.segment_analysis || {};
  
  // Get actionables with backward compatibility for reports with 'recommendations'
  const recommendations = Array.isArray(aiInsights.actionables) 
    ? aiInsights.actionables 
    : Array.isArray(aiInsights.recommendations) 
      ? aiInsights.recommendations 
      : [];

  // Extract campaign analysis sections from newer reports
  const campaignAnalysis = aiInsights.campaign_analysis || "";
  const adSetAnalysis = aiInsights.ad_set_analysis || "";
  const adAnalysis = aiInsights.ad_analysis || "";

  // Extract highlights - run this calculation once
  const { topPerformers, worstPerformers } = report ? extractHighlights(reportData) : { topPerformers: [], worstPerformers: [] };

  // Fetch aggregated insights from CAMPAIGNS_INSIGHTS up to the report's end date
  useEffect(() => {
    // Get the end date from the report data, ensure reportData is an object
    const reportEndDate = typeof reportData === 'object' ? reportData.requested_end_date : null;

    // Only fetch if we have report, campaign_id, a valid end date, and haven't fetched yet or report changed
    if (report && report.campaign_id && reportEndDate && !aggregatedInsights) {
      const fetchAggregatedCampaignInsights = async () => {
        setLoadingInsights(true);
        console.log(`Fetching aggregated insights from campaigns_insights for campaign_id: ${report.campaign_id} up to date: ${reportEndDate}`);
        try {
          // Fetch insights for the campaign UP TO the report's requested end date
          const { data, error: insightsError } = await supabase
            .from('campaigns_insights')
            .select('spend, impressions, clicks, leads, link_clicks')
            .eq('campaign_id', report.campaign_id)
            .lte('date', reportEndDate); // <-- ADDED DATE FILTER HERE

          if (insightsError) {
            throw insightsError;
          }

          // Aggregate the data (aggregation logic remains the same)
          if (data && data.length > 0) {
            const totals = data.reduce(
              (acc, row) => {
                // Explicitly convert to numbers before adding
                acc.totalSpend += Number(row.spend || 0);
                acc.totalImpressions += Number(row.impressions || 0);
                acc.totalClicks += Number(row.clicks || 0);
                acc.totalLeads += Number(row.leads || 0); // Leads seem okay, but parsing is safe
                return acc;
              },
              { totalSpend: 0, totalImpressions: 0, totalClicks: 0, totalLeads: 0 }
            );
            // Store the campaignId with the totals for refetch logic
            totals.campaignId = report.campaign_id;
            totals.reportEndDate = reportEndDate;
            console.log('Aggregated Campaign Insights (Up to Report Date):', totals);
            setAggregatedInsights(totals);
          } else {
             console.log(`No campaigns_insights found for campaign ${report.campaign_id} up to ${reportEndDate}.`);
             setAggregatedInsights({ campaignId: report.campaign_id, reportEndDate: reportEndDate, totalSpend: 0, totalImpressions: 0, totalClicks: 0, totalLeads: 0 });
          }
        } catch (error) {
          console.error('Error fetching or aggregating campaign insights (up to report date):', error);
           setAggregatedInsights(null);
        } finally {
          setLoadingInsights(false);
        }
      };

      fetchAggregatedCampaignInsights();
    }
    // Refetch if report changes (specifically campaign_id or requested_end_date within reportData)
    else if (report && report.campaign_id && reportEndDate && aggregatedInsights && (aggregatedInsights.campaignId !== report.campaign_id || aggregatedInsights.reportEndDate !== reportEndDate)) {
        setAggregatedInsights(null); // Reset to trigger refetch
        console.log("Report changed (campaign or end date), resetting aggregated insights for refetch.");
    }
    // Handle case where reportEndDate is missing
    else if (report && !reportEndDate && !loadingInsights && !aggregatedInsights) {
        console.warn("Cannot fetch aggregated insights: report_data.requested_end_date is missing.");
        // Optionally set a state here to indicate missing date?
        setAggregatedInsights(null); // Ensure no stale data is shown
    }

  }, [report, reportData, aggregatedInsights]); // Depend on report, parsed reportData, and aggregatedInsights

  // Helper function to format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);
  };

  // Helper function to format numbers
  const formatNumber = (value) => {
    return new Intl.NumberFormat('en-US').format(value || 0);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 mb-12">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/reports" legacyBehavior>
            <a className="text-blue-600 hover:underline">&larr; Back to Reports</a>
          </Link>
          <h1 className="text-2xl font-bold mt-2">
            {campaignName ? `${campaignName} - Analysis Report` : 'Campaign Analysis Report'}
          </h1>
          <p className="text-gray-500">
            Generated on {formatDate(report.created_at)}
          </p>
        </div>
        {/* <button 
          onClick={downloadPDF}
          className="mt-4 sm:mt-0 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Download PDF
        </button> <-- Removed Download PDF button */}
      </div>
      
      <div className="space-y-8">
        {/* Executive Summary */}
        <ExecutiveSummary 
          summary={executiveSummary} 
          keyInsights={keyInsights}
        />

        {/* Performance Overview Grid Container - REMOVE THIS ENTIRE SECTION */}
        {/*
        <Grid container spacing={3}>
             <Grid item xs={12} md={12}>
                <Card elevation={2}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                            <BarChartIcon sx={{ mr: 1 }} /> Performance Overview
                        </Typography>
                        <Divider sx={{ my: 1 }} />
                        {loadingInsights ? (
                           ...
                        ) : aggregatedInsights ? (
                            <Box sx={{ mt: 2 }}>
                                <Grid container spacing={2}>
                                   ...
                                </Grid>
                            </Box>
                        ) : (
                           ...
                        )}
                    </CardContent>
                </Card>
            </Grid>
        </Grid>
        */}
        
        {/* Recommendations */}
        <RecommendationsList recommendations={recommendations} />
        
        {/* Segment Analysis */}
        {segmentAnalysis && (
          <SegmentAnalysis 
            segmentAnalysis={segmentAnalysis} 
            detailedSegmentAnalyses={aiInsights?.detailed_segment_analyses}
          />
        )}
        
        {/* Toggle Button for Full Table - REMOVE THIS */}
        {/*
        <div className="text-center my-6">
          <button
            onClick={() => setShowFullTable(!showFullTable)}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {showFullTable ? 'Hide Detailed Segment Data' : 'Show Detailed Segment Data'}
          </button>
        </div>
        */}

        {/* Conditionally Render Full Table - REMOVE THIS */}
        {/*
        {showFullTable && (
          <SegmentInsights 
            analysisData={reportData} 
          />
        )}
        */}
      </div>
    </div>
  );
}

// Implement getServerSideProps for server-side rendering
export async function getServerSideProps(context) {
  const { id } = context.params;
  
  // Skip database lookup for mock data
  if (id === 'mock-report-id') {
    console.log('[SERVER] Using mock report data');
    return {
      props: {
        report: mockReportData,
        campaignName: 'Mock Campaign'
      }
    };
  }
  
  try {
    // Initialize the service client to bypass RLS
    const createAdminClient = () => {
      const supabaseUrl = 'https://zrsevaevonthrspehpaj.supabase.co';
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      return createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });
    };
    
    // Always use the admin client to simplify development
    const supabase = createAdminClient();
    console.log(`[SERVER] Fetching report ${id} using admin client`);
    
    // Fetch the report
    const { data: reports, error } = await supabase
      .from('campaign_reports')
      .select('*')
      .eq('id', id);
    
    if (error) {
      console.error('[SERVER] Error fetching report:', error);
      throw error;
    }
    
    // Check if we got any reports and take the first one
    if (!reports || reports.length === 0) {
      console.log('[SERVER] Report not found:', id);
      return {
        props: {
          error: 'Report not found'
        }
      };
    }
    
    // Use the first report in the results
    const report = reports[0];
    
    // Log report data structure to understand what we're getting
    console.log('[SERVER] Report retrieved successfully. AI insights type:', typeof report.ai_insights);
    
    if (report.ai_insights) {
      // Log details about ai_insights format
      console.log('[SERVER] AI insights structure:', 
        typeof report.ai_insights === 'string' 
          ? 'String (needs parsing)' 
          : 'Object (already parsed)');
      
      if (typeof report.ai_insights === 'string') {
        try {
          // Try to parse and see what we get
          const parsed = JSON.parse(report.ai_insights);
          console.log('[SERVER] Parsed AI insights keys:', Object.keys(parsed));
        } catch (e) {
          console.error('[SERVER] Failed to parse AI insights string:', e.message);
        }
      } else {
        console.log('[SERVER] AI insights keys:', Object.keys(report.ai_insights || {}));
      }
      
      console.log('[SERVER] AI insights source:', report.ai_insights?.source || 'unknown');
      
      // Check if executive_summary exists
      if (report.ai_insights.executive_summary) {
        console.log('[SERVER] Executive summary excerpt:', 
          report.ai_insights.executive_summary.substring(0, 100) + '...');
      }
    }
    
    // Get campaign name
    let campaignName = '';
    if (report.campaign_id && report.campaign_id !== 'mock-campaign-id') {
      // Try to fetch campaign name
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('name')
        .eq('id', report.campaign_id);
      
      campaignName = campaigns && campaigns.length > 0 ? campaigns[0].name : '';
    } else {
      campaignName = 'Mock Campaign Data';
    }
    
    return {
      props: {
        report,
        campaignName
      }
    };
  } catch (error) {
    console.error('[SERVER] Error in getServerSideProps:', error);
    return {
      props: {
        error: error.message || 'Failed to fetch report data'
      }
    };
  }
}
