import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Line } from 'react-chartjs-2';
import { insightsApi } from '../../lib/api.js';

// Dynamically import Chart.js components
const LineChart = dynamic(
  () => import('react-chartjs-2').then(mod => mod.Line),
  { ssr: false }
);

// Create a wrapper component for chart registration
const ChartWrapper = ({ children }) => {
  useEffect(() => {
    // Register Chart.js components only on client-side
    import('chart.js').then(({ Chart, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend }) => {
      Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);
    });
  }, []);

  return <>{children}</>;
};

const MetricsChart = ({ adAccountId, dateRange, campaignId }) => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState('spend');
  
  useEffect(() => {
    if (!adAccountId) return;
    
    const fetchChartData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Add campaignId to params if it exists
        const params = {
          ...dateRange,
          ...(campaignId && { campaign_id: campaignId })
        };
        
        console.log('[METRICS_CHART] Fetching metrics breakdown with params:', { adAccountId, params });
        
        // We now always use the ID directly, no need to check format
        console.log(`[METRICS_CHART] Using account ID: ${adAccountId}`);
        
        // Fetch the data
        try {
          const data = await insightsApi.getMetricsBreakdown(adAccountId, 'day', params);
          console.log('[METRICS_CHART] Metrics breakdown response, length:', data?.length || 0);
          
          if (!data || data.length === 0) {
            console.log('[METRICS_CHART] No chart data received');
            setChartData(null);
            setLoading(false);
            return;
          }
          
          // Success - process the data
          console.log('[METRICS_CHART] First data item structure:', data[0] ? Object.keys(data[0]) : 'No data items');
          
          // Group data by date
          const dataByDate = {};
          
          data.forEach(insight => {
            if (!insight.date) {
              console.warn('Insight missing date:', insight);
              return;
            }
            
            const date = insight.date;
            
            if (!dataByDate[date]) {
              dataByDate[date] = {
                spend: 0,
                impressions: 0,
                clicks: 0,
                results: 0
              };
            }
            
            // Add explicit type conversion and logging for numeric values
            const spendValue = parseFloat(insight.spend || 0);
            const impressionsValue = parseInt(insight.impressions || 0);
            const clicksValue = parseInt(insight.clicks || 0);
            const resultsValue = parseInt(insight.results || 0);
            
            if (isNaN(spendValue) || isNaN(impressionsValue) || isNaN(clicksValue) || isNaN(resultsValue)) {
              console.warn('Invalid numeric value in insight:', {
                date,
                spend: insight.spend,
                impressions: insight.impressions,
                clicks: insight.clicks,
                results: insight.results
              });
            }
            
            dataByDate[date].spend += spendValue;
            dataByDate[date].impressions += impressionsValue;
            dataByDate[date].clicks += clicksValue;
            dataByDate[date].results += resultsValue;
          });
          
          // Convert to chart format
          const dates = Object.keys(dataByDate).sort();
          
          if (dates.length === 0) {
            console.log('No dates found in insights data');
            setChartData(null);
            setLoading(false);
            return;
          }
          
          console.log(`Processed ${dates.length} dates for chart`);
          
          const chartData = {
            labels: dates.map(date => {
              try {
                const d = new Date(date);
                return `${d.getMonth() + 1}/${d.getDate()}`;
              } catch (e) {
                console.warn('Error formatting date:', date, e);
                return date;
              }
            }),
            datasets: [
              {
                label: 'Spend ($)',
                data: dates.map(date => dataByDate[date].spend),
                borderColor: 'rgb(53, 162, 235)',
                backgroundColor: 'rgba(53, 162, 235, 0.5)',
                hidden: selectedMetric !== 'spend'
              },
              {
                label: 'Impressions',
                data: dates.map(date => dataByDate[date].impressions),
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.5)',
                hidden: selectedMetric !== 'impressions'
              },
              {
                label: 'Clicks',
                data: dates.map(date => dataByDate[date].clicks),
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.5)',
                hidden: selectedMetric !== 'clicks'
              },
              {
                label: 'Results',
                data: dates.map(date => dataByDate[date].results),
                borderColor: 'rgb(255, 159, 64)',
                backgroundColor: 'rgba(255, 159, 64, 0.5)',
                hidden: selectedMetric !== 'results'
              }
            ]
          };
          
          setChartData(chartData);
        } catch (apiError) {
          console.error('API error fetching metrics breakdown:', apiError);
          setError('Failed to load chart data: ' + apiError.message);
        }
      } catch (err) {
        console.error('Error in chart data processing:', err);
        setError('Failed to process chart data: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchChartData();
  }, [adAccountId, dateRange, campaignId, selectedMetric]);
  
  const handleMetricChange = (e) => {
    setSelectedMetric(e.target.value);
  };
  
  if (!adAccountId) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <p className="text-gray-500">Select an ad account to view performance chart</p>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="text-red-500 mb-2">{error}</div>
        <p className="text-sm text-gray-500">
          Try clicking the "Fetch Campaign Data" button at the top of the dashboard to refresh your data.
        </p>
      </div>
    );
  }
  
  if (!chartData || chartData.labels.length === 0) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <p className="text-gray-500 mb-2">No performance data available for the selected time period.</p>
        <div className="text-sm text-gray-500 mt-2">
          Try the following:
          <ul className="list-disc pl-5 mt-1">
            <li>Click the "Fetch Campaign Data" button to sync your latest data</li>
            <li>Select a different date range</li>
            <li>Check if your campaign has performance data in Facebook Ads Manager</li>
          </ul>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">Performance Over Time</h3>
        <select 
          value={selectedMetric}
          onChange={handleMetricChange}
          className="input-field mb-0"
        >
          <option value="spend">Spend</option>
          <option value="impressions">Impressions</option>
          <option value="clicks">Clicks</option>
          <option value="results">Results</option>
        </select>
      </div>
      
      <div className="h-64">
        <ChartWrapper>
          <Line
            data={{
              ...chartData,
              datasets: chartData.datasets.map(dataset => ({
                ...dataset,
                hidden: dataset.label.toLowerCase().indexOf(selectedMetric) === -1
              }))
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: {
                  beginAtZero: true
                }
              },
              plugins: {
                legend: {
                  position: 'top',
                  display: false
                },
                title: {
                  display: false
                }
              }
            }}
          />
        </ChartWrapper>
      </div>
    </div>
  );
};

export default MetricsChart;
