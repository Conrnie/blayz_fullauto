# Ad Set Analytics Enhancement

This upgrade adds comprehensive segment analysis to ad set analytics, providing deeper insights into performance across platforms, devices, positions, demographics, hours, and regions.

## Implementation Instructions

Follow these steps to implement the enhanced ad set analytics functionality:

### 1. Add SQL Functions to Supabase

1. Open your Supabase SQL Editor
2. Copy and run the following files in order:
   - `detect_adset_anomalies_enhanced.sql` - The main comprehensive function
   - `detect_adset_anomalies_fixed.sql` - The wrapper function for single-day analysis

Alternatively, you can use the migration file:
```sql
-- Run in Supabase SQL Editor
\i detect_adset_anomalies_enhanced.sql
\i detect_adset_anomalies_fixed.sql
```

### 2. Required Database Tables

These functions rely on the following tables being available in your Supabase database:

- `adsets` - Contains ad set metadata
- `adset_insights` - Daily metrics for ad sets
- `adset_insights_device` - Device-level metrics
- `adset_insights_demographics` - Demographic metrics
- `adset_insights_hourly` - Hourly metrics
- `adset_insights_region` - Regional metrics

### 3. Function Parameters

The enhanced function takes these parameters:

- `p_start_date` - Start date for analysis
- `p_end_date` - End date for analysis
- `p_campaign_id` - (Optional) Filter to specific campaign 
- `p_rolling_window` - Number of days for rolling window (default 7)
- `p_std_dev_threshold` - Threshold for standard deviation anomalies (default 2.0)
- `p_segment_threshold_pct` - Threshold for segment comparison (default 0.30)
- `p_min_impressions` - Minimum impressions for a segment to be analyzed (default 50)

The simplified wrapper (`detect_adset_anomalies_fixed`) takes a single date parameter instead of start/end dates.

### 4. Return Value

The function returns a JSON array with anomaly data for each ad set, including:

- `date` - Analysis date
- `ad_set_id` - Ad set identifier
- `campaign_id` - Campaign identifier
- `daily_metrics` - Core performance metrics
- `daily_alerts` - Time-based anomaly alerts
- `platform_alerts` - Platform-specific alerts (Facebook, Instagram, etc.)
- `device_alerts` - Device-specific alerts (mobile, desktop, etc.)
- `position_alerts` - Position-specific alerts (feed, stories, etc.)
- `demographic_alerts` - Age/gender-specific alerts
- `hourly_alerts` - Time-of-day specific alerts
- `region_alerts` - Geographic location alerts
- `efficiency_scores` - Performance scores (0-100)

### 5. Frontend Integration

The frontend has been updated to display all these new segments in the Ad Set Analytics dashboard. No additional changes are needed on the frontend after deploying the SQL functions. 