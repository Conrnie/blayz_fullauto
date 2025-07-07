CREATE OR REPLACE FUNCTION public.detect_adset_anomalies_enhanced(
    p_start_date date,
    p_end_date date,
    p_campaign_id text DEFAULT NULL,
    p_rolling_window integer DEFAULT 7,
    p_std_dev_threshold numeric DEFAULT 2.0,
    p_segment_threshold_pct numeric DEFAULT 0.30,
    p_min_impressions integer DEFAULT 50
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $function$
DECLARE
    result jsonb;
    v_adjusted_start_date date;
    v_min_insight_date date;
BEGIN
    -- Input validation
    IF p_start_date > p_end_date THEN RAISE EXCEPTION 'Start date must be <= end date'; END IF;
    IF p_start_date > CURRENT_DATE OR p_end_date > CURRENT_DATE THEN RAISE EXCEPTION 'Cannot analyze future dates'; END IF;
    IF p_segment_threshold_pct <= 0 OR p_segment_threshold_pct >= 1 THEN RAISE EXCEPTION 'p_segment_threshold_pct must be between 0 and 1 (exclusive)'; END IF;
    IF p_min_impressions < 0 THEN RAISE EXCEPTION 'p_min_impressions cannot be negative'; END IF;

    -- Calculate min insight date and adjusted start date
    SELECT MIN(asi.date)
    INTO v_min_insight_date
    FROM public.ad_set_insights asi
    JOIN public.adsets a ON asi.ad_set_id = a.meta_adset_id
    WHERE (p_campaign_id IS NULL OR a.meta_campaign_id = p_campaign_id);

    v_adjusted_start_date := GREATEST(
        p_start_date - (p_rolling_window - 1) * interval '1 day',
        COALESCE(v_min_insight_date, p_start_date)
    );

    -- Debug logging
    RAISE NOTICE 'Processing date range: % to %', p_start_date, p_end_date;
    RAISE NOTICE 'Adjusted start date: %', v_adjusted_start_date;

    WITH relevant_adsets AS (
        SELECT DISTINCT
            a.id as adsets_table_id,
            a.meta_adset_id as adset_id_text,
            a.meta_campaign_id as campaign_id_text
        FROM public.adsets a
        JOIN public.campaigns c ON a.meta_campaign_id = c.meta_campaign_id
        WHERE a.status = 'ACTIVE'
          AND a.id IS NOT NULL
          AND a.meta_adset_id IS NOT NULL
          AND (p_campaign_id IS NULL OR a.meta_campaign_id = p_campaign_id)
          AND EXISTS (
              SELECT 1 FROM public.ad_set_insights asi
              WHERE asi.ad_set_id = a.meta_adset_id
              AND asi.date BETWEEN v_adjusted_start_date AND p_end_date
          )
    ),
    daily_data AS (
        SELECT
            ra.adsets_table_id,
            ra.adset_id_text as adset_id,
            ra.campaign_id_text as campaign_id,
            asi.date,
            asi.spend::numeric AS spend,
            NULLIF(asi.ctr, 0)::numeric AS ctr,
            NULLIF(asi.cpa, 0)::numeric AS cpa,
            NULLIF(asi.roas, 0)::numeric AS roas,
            asi.clicks::numeric as clicks,
            asi.impressions::numeric as impressions,
            asi.results::numeric as results
        FROM public.ad_set_insights asi
        JOIN relevant_adsets ra ON asi.ad_set_id = ra.adset_id_text
        WHERE asi.date BETWEEN v_adjusted_start_date AND p_end_date
    ),
    daily_rolling_stats AS (
        SELECT *,
            AVG(spend) OVER w AS avg_spend,
            STDDEV(spend) OVER w AS stddev_spend,
            AVG(ctr) OVER w AS avg_ctr,
            STDDEV(ctr) OVER w AS stddev_ctr,
            AVG(cpa) OVER w AS avg_cpa,
            STDDEV(cpa) OVER w AS stddev_cpa,
            AVG(roas) OVER w AS avg_roas,
            STDDEV(roas) OVER w AS stddev_roas,
            AVG(clicks) OVER w AS avg_clicks,
            STDDEV(clicks) OVER w AS stddev_clicks,
            AVG(results) OVER w AS avg_results,
            STDDEV(results) OVER w AS stddev_results
        FROM daily_data
        WINDOW w AS (
            PARTITION BY adset_id
            ORDER BY date
            ROWS BETWEEN (p_rolling_window - 1) PRECEDING AND CURRENT ROW
        )
    ),
    daily_potential_anomalies AS (
        SELECT
            date, adset_id, campaign_id,
            jsonb_build_object(
                'spend', spend,
                'ctr', ROUND(ctr::numeric, 4),
                'cpa', ROUND(cpa::numeric, 2),
                'roas', ROUND(roas::numeric, 2),
                'clicks', clicks,
                'results', results,
                'impressions', impressions
            ) as daily_metrics,
            CASE WHEN spend > avg_spend + p_std_dev_threshold * COALESCE(stddev_spend, 0) THEN true ELSE false END as is_spend_high,
            CASE WHEN ctr < avg_ctr - p_std_dev_threshold * COALESCE(stddev_ctr, 0) AND ctr IS NOT NULL AND avg_ctr > 0 THEN true ELSE false END as is_ctr_low,
            CASE WHEN cpa > avg_cpa + p_std_dev_threshold * COALESCE(stddev_cpa, 0) AND cpa IS NOT NULL AND avg_cpa > 0 THEN true ELSE false END as is_cpa_high,
            CASE WHEN roas < avg_roas - p_std_dev_threshold * COALESCE(stddev_roas, 0) AND roas IS NOT NULL AND avg_roas > 0 THEN true ELSE false END as is_roas_low,
            CASE WHEN results < avg_results - p_std_dev_threshold * COALESCE(stddev_results, 0) AND results IS NOT NULL AND avg_results > 0 THEN true ELSE false END as is_results_low,
            CASE WHEN clicks < avg_clicks - p_std_dev_threshold * COALESCE(stddev_clicks, 0) AND clicks IS NOT NULL AND avg_clicks > 0 THEN true ELSE false END as is_clicks_low,
            -- High metrics
            CASE WHEN ctr > avg_ctr + p_std_dev_threshold * COALESCE(stddev_ctr, 0) AND ctr IS NOT NULL AND avg_ctr > 0 THEN true ELSE false END as is_ctr_high,
            CASE WHEN cpa < avg_cpa - p_std_dev_threshold * COALESCE(stddev_cpa, 0) AND cpa IS NOT NULL AND avg_cpa > 0 THEN true ELSE false END as is_cpa_low,
            CASE WHEN roas > avg_roas + p_std_dev_threshold * COALESCE(stddev_roas, 0) AND roas IS NOT NULL AND avg_roas > 0 THEN true ELSE false END as is_roas_high,
            CASE WHEN results > avg_results + p_std_dev_threshold * COALESCE(stddev_results, 0) AND results IS NOT NULL AND avg_results > 0 THEN true ELSE false END as is_results_high,
            CASE WHEN clicks > avg_clicks + p_std_dev_threshold * COALESCE(stddev_clicks, 0) AND clicks IS NOT NULL AND avg_clicks > 0 THEN true ELSE false END as is_clicks_high
        FROM daily_rolling_stats
        WHERE date BETWEEN p_start_date AND p_end_date
    ),
    daily_anomalies AS (
        SELECT
            date, adset_id, campaign_id,
            daily_metrics,
            array_remove(ARRAY[
                CASE WHEN is_spend_high THEN 'High Spend' END,
                CASE WHEN is_ctr_low THEN 'Low CTR' END,
                CASE WHEN is_ctr_high THEN 'High CTR' END,
                CASE WHEN is_cpa_high THEN 'High CPA' END,
                CASE WHEN is_cpa_low THEN 'Low CPA' END,
                CASE WHEN is_roas_low THEN 'Low ROAS' END,
                CASE WHEN is_roas_high THEN 'High ROAS' END,
                CASE WHEN is_results_low THEN 'Low Results' END,
                CASE WHEN is_results_high THEN 'High Results' END,
                CASE WHEN is_clicks_low THEN 'Low Clicks' END,
                CASE WHEN is_clicks_high THEN 'High Clicks' END
            ]::text[], NULL) as daily_alerts
        FROM daily_potential_anomalies
        WHERE is_spend_high OR is_ctr_low OR is_cpa_high OR is_roas_low OR is_results_low OR is_clicks_low
           OR is_ctr_high OR is_cpa_low OR is_roas_high OR is_results_high OR is_clicks_high
    ),
    -- Segment Analysis
    segment_metrics AS (
        SELECT
            adset_id,
            publisher_platform,
            impression_device,
            platform_position,
            SUM(impressions) as impressions,
            SUM(clicks) as clicks,
            SUM(spend::numeric) as spend,
            SUM(results) as results,
            ROUND((SUM(clicks)::numeric * 100.0 / NULLIF(SUM(impressions), 0)), 4) as ctr,
            ROUND((SUM(spend)::numeric / NULLIF(SUM(results), 0)), 2) as cpa,
            ROUND((SUM(spend) / NULLIF(SUM(impressions) / 1000.0, 0)), 2) as cpm,
            ROUND((SUM(spend) / NULLIF(SUM(clicks), 0)), 2) as cpc
        FROM public.adset_insights_device
        WHERE adset_id IN (SELECT adsets_table_id FROM relevant_adsets)
        AND impressions >= p_min_impressions
        GROUP BY adset_id, publisher_platform, impression_device, platform_position
        HAVING SUM(impressions) >= p_min_impressions
    ),
    -- Total spend per adset - for calculating spend percentage
    total_spend AS (
        SELECT
            adset_id,
            SUM(spend) as total_spend
        FROM segment_metrics
        GROUP BY adset_id
    ),
    -- Platform Analysis
    platform_comparison AS (
        SELECT
            ra.adset_id_text,
            p_end_date as date,
            ra.campaign_id_text as campaign_id,
            sm.publisher_platform,
            jsonb_build_object(
                'spend', sm.spend,
                'impressions', sm.impressions,
                'ctr', sm.ctr,
                'cpa', sm.cpa,
                'cpc', sm.cpc,
                'clicks', sm.clicks,
                'results', sm.results,
                'spend_percentage', ROUND((sm.spend * 100.0 / NULLIF(ts.total_spend, 0)), 1)
            ) as metrics,
            CASE 
                WHEN sm.ctr < AVG(sm.ctr) OVER (PARTITION BY ra.adset_id_text) * (1 - p_segment_threshold_pct)
                     AND sm.spend > ts.total_spend * 0.2
                THEN format('%s gets %.1f%% of spend but has worse CTR (%.4f%%) than other platforms', 
                            sm.publisher_platform, 
                            ROUND((sm.spend * 100.0 / NULLIF(ts.total_spend, 0)), 1),
                            sm.ctr)
            END as low_ctr_alert,
            CASE 
                WHEN sm.cpa > AVG(sm.cpa) OVER (PARTITION BY ra.adset_id_text) * (1 + p_segment_threshold_pct)
                     AND sm.spend > ts.total_spend * 0.2
                     AND sm.cpa > 0
                THEN format('%s gets %.1f%% of spend but has higher CPA ($%.2f) than other platforms', 
                            sm.publisher_platform, 
                            ROUND((sm.spend * 100.0 / NULLIF(ts.total_spend, 0)), 1),
                            sm.cpa)
            END as high_cpa_alert,
            CASE 
                WHEN sm.cpc > AVG(sm.cpc) OVER (PARTITION BY ra.adset_id_text) * (1 + p_segment_threshold_pct)
                     AND sm.spend > ts.total_spend * 0.2
                THEN format('%s gets %.1f%% of spend but has higher CPC ($%.2f) than other platforms', 
                            sm.publisher_platform, 
                            ROUND((sm.spend * 100.0 / NULLIF(ts.total_spend, 0)), 1),
                            sm.cpc)
            END as high_cpc_alert
        FROM segment_metrics sm
        JOIN relevant_adsets ra ON sm.adset_id = ra.adsets_table_id
        JOIN total_spend ts ON sm.adset_id = ts.adset_id
        WHERE sm.publisher_platform IS NOT NULL
    ),
    platform_anomalies AS (
        SELECT
            date, adset_id_text, campaign_id,
            jsonb_build_object(
                'segment_type', 'platform',
                'segment_value', publisher_platform,
                'metrics', metrics,
                'alerts', array_remove(ARRAY[low_ctr_alert, high_cpa_alert, high_cpc_alert]::text[], NULL)
            ) as segment_anomaly_data
        FROM platform_comparison
        WHERE low_ctr_alert IS NOT NULL OR high_cpa_alert IS NOT NULL OR high_cpc_alert IS NOT NULL
           OR (low_ctr_alert IS NULL AND high_cpa_alert IS NULL AND high_cpc_alert IS NULL)
    ),
    grouped_platform_anomalies AS (
        SELECT
            date,
            adset_id_text,
            campaign_id,
            jsonb_agg(segment_anomaly_data ORDER BY segment_anomaly_data->>'segment_value') as platform_alerts
        FROM platform_anomalies
        GROUP BY date, adset_id_text, campaign_id
    ),
    -- Device Analysis
    device_comparison AS (
        SELECT
            ra.adset_id_text,
            p_end_date as date,
            ra.campaign_id_text as campaign_id,
            sm.impression_device,
            jsonb_build_object(
                'spend', sm.spend,
                'impressions', sm.impressions,
                'ctr', sm.ctr,
                'cpa', sm.cpa,
                'cpc', sm.cpc,
                'clicks', sm.clicks,
                'results', sm.results,
                'spend_percentage', ROUND((sm.spend * 100.0 / NULLIF(ts.total_spend, 0)), 1)
            ) as metrics,
            CASE 
                WHEN sm.ctr < AVG(sm.ctr) OVER (PARTITION BY ra.adset_id_text) * (1 - p_segment_threshold_pct)
                     AND sm.spend > ts.total_spend * 0.2
                THEN format('%s gets %.1f%% of spend but has worse CTR (%.4f%%) than other devices', 
                            sm.impression_device, 
                            ROUND((sm.spend * 100.0 / NULLIF(ts.total_spend, 0)), 1),
                            sm.ctr)
            END as low_ctr_alert,
            CASE 
                WHEN sm.cpa > AVG(sm.cpa) OVER (PARTITION BY ra.adset_id_text) * (1 + p_segment_threshold_pct)
                     AND sm.spend > ts.total_spend * 0.2
                     AND sm.cpa > 0
                THEN format('%s gets %.1f%% of spend but has higher CPA ($%.2f) than other devices', 
                            sm.impression_device, 
                            ROUND((sm.spend * 100.0 / NULLIF(ts.total_spend, 0)), 1),
                            sm.cpa)
            END as high_cpa_alert,
            CASE 
                WHEN sm.cpc > AVG(sm.cpc) OVER (PARTITION BY ra.adset_id_text) * (1 + p_segment_threshold_pct)
                     AND sm.spend > ts.total_spend * 0.2
                THEN format('%s gets %.1f%% of spend but has higher CPC ($%.2f) than other devices', 
                            sm.impression_device, 
                            ROUND((sm.spend * 100.0 / NULLIF(ts.total_spend, 0)), 1),
                            sm.cpc)
            END as high_cpc_alert
        FROM segment_metrics sm
        JOIN relevant_adsets ra ON sm.adset_id = ra.adsets_table_id
        JOIN total_spend ts ON sm.adset_id = ts.adset_id
        WHERE sm.impression_device IS NOT NULL
    ),
    device_anomalies AS (
        SELECT
            date, adset_id_text, campaign_id,
            jsonb_build_object(
                'segment_type', 'device',
                'segment_value', impression_device,
                'metrics', metrics,
                'alerts', array_remove(ARRAY[low_ctr_alert, high_cpa_alert, high_cpc_alert]::text[], NULL)
            ) as segment_anomaly_data
        FROM device_comparison
        WHERE low_ctr_alert IS NOT NULL OR high_cpa_alert IS NOT NULL OR high_cpc_alert IS NOT NULL
           OR (low_ctr_alert IS NULL AND high_cpa_alert IS NULL AND high_cpc_alert IS NULL)
    ),
    grouped_device_anomalies AS (
        SELECT
            date,
            adset_id_text,
            campaign_id,
            jsonb_agg(segment_anomaly_data ORDER BY segment_anomaly_data->>'segment_value') as device_alerts
        FROM device_anomalies
        GROUP BY date, adset_id_text, campaign_id
    ),
    -- Position Analysis
    position_comparison AS (
        SELECT
            ra.adset_id_text,
            p_end_date as date,
            ra.campaign_id_text as campaign_id,
            sm.platform_position,
            jsonb_build_object(
                'spend', sm.spend,
                'impressions', sm.impressions,
                'ctr', sm.ctr,
                'cpa', sm.cpa,
                'cpc', sm.cpc,
                'clicks', sm.clicks,
                'results', sm.results,
                'spend_percentage', ROUND((sm.spend * 100.0 / NULLIF(ts.total_spend, 0)), 1)
            ) as metrics,
            CASE 
                WHEN sm.ctr < AVG(sm.ctr) OVER (PARTITION BY ra.adset_id_text) * (1 - p_segment_threshold_pct)
                     AND sm.spend > ts.total_spend * 0.2
                THEN format('%s gets %.1f%% of spend but has worse CTR (%.4f%%) than other positions', 
                            sm.platform_position, 
                            ROUND((sm.spend * 100.0 / NULLIF(ts.total_spend, 0)), 1),
                            sm.ctr)
            END as low_ctr_alert,
            CASE 
                WHEN sm.cpa > AVG(sm.cpa) OVER (PARTITION BY ra.adset_id_text) * (1 + p_segment_threshold_pct)
                     AND sm.spend > ts.total_spend * 0.2
                     AND sm.cpa > 0
                THEN format('%s gets %.1f%% of spend but has higher CPA ($%.2f) than other positions', 
                            sm.platform_position, 
                            ROUND((sm.spend * 100.0 / NULLIF(ts.total_spend, 0)), 1),
                            sm.cpa)
            END as high_cpa_alert,
            CASE 
                WHEN sm.cpc > AVG(sm.cpc) OVER (PARTITION BY ra.adset_id_text) * (1 + p_segment_threshold_pct)
                     AND sm.spend > ts.total_spend * 0.2
                THEN format('%s gets %.1f%% of spend but has higher CPC ($%.2f) than other positions', 
                            sm.platform_position, 
                            ROUND((sm.spend * 100.0 / NULLIF(ts.total_spend, 0)), 1),
                            sm.cpc)
            END as high_cpc_alert
        FROM segment_metrics sm
        JOIN relevant_adsets ra ON sm.adset_id = ra.adsets_table_id
        JOIN total_spend ts ON sm.adset_id = ts.adset_id
        WHERE sm.platform_position IS NOT NULL
    ),
    position_anomalies AS (
        SELECT
            date, adset_id_text, campaign_id,
            jsonb_build_object(
                'segment_type', 'position',
                'segment_value', platform_position,
                'metrics', metrics,
                'alerts', array_remove(ARRAY[low_ctr_alert, high_cpa_alert, high_cpc_alert]::text[], NULL)
            ) as segment_anomaly_data
        FROM position_comparison
        WHERE low_ctr_alert IS NOT NULL OR high_cpa_alert IS NOT NULL OR high_cpc_alert IS NOT NULL
           OR (low_ctr_alert IS NULL AND high_cpa_alert IS NULL AND high_cpc_alert IS NULL)
    ),
    grouped_position_anomalies AS (
        SELECT
            date,
            adset_id_text,
            campaign_id,
            jsonb_agg(segment_anomaly_data ORDER BY segment_anomaly_data->>'segment_value') as position_alerts
        FROM position_anomalies
        GROUP BY date, adset_id_text, campaign_id
    ),
    
    -- Demographics Analysis
    demographics_metrics AS (
        SELECT
            adset_id,
            age,
            gender,
            SUM(impressions) as impressions,
            SUM(clicks) as clicks,
            SUM(spend::numeric) as spend,
            SUM(results) as results,
            ROUND((SUM(clicks)::numeric * 100.0 / NULLIF(SUM(impressions), 0)), 4) as ctr,
            ROUND((SUM(spend)::numeric / NULLIF(SUM(results), 0)), 2) as cpa,
            ROUND((SUM(spend) / NULLIF(SUM(clicks), 0)), 2) as cpc
        FROM public.adset_insights_demographics
        WHERE adset_id IN (SELECT adsets_table_id FROM relevant_adsets)
        AND impressions >= p_min_impressions
        GROUP BY adset_id, age, gender
        HAVING SUM(impressions) >= p_min_impressions
    ),
    
    -- Combined demographic segments (age + gender)
    combined_demographics AS (
        SELECT
            dm.adset_id,
            CASE 
                WHEN dm.gender IS NULL THEN dm.age
                WHEN dm.age IS NULL THEN dm.gender
                ELSE dm.gender || ', ' || dm.age
            END as demographic_segment,
            dm.impressions,
            dm.clicks,
            dm.spend,
            dm.results,
            dm.ctr,
            dm.cpa,
            dm.cpc
        FROM demographics_metrics dm
    ),
    
    -- Demographic comparison
    demographic_comparison AS (
        SELECT
            ra.adset_id_text,
            p_end_date as date,
            ra.campaign_id_text as campaign_id,
            cd.demographic_segment,
            jsonb_build_object(
                'spend', cd.spend,
                'impressions', cd.impressions,
                'ctr', cd.ctr,
                'cpa', cd.cpa,
                'cpc', cd.cpc,
                'clicks', cd.clicks,
                'results', cd.results,
                'spend_percentage', ROUND((cd.spend * 100.0 / NULLIF(ts.total_spend, 0)), 1)
            ) as metrics,
            CASE 
                WHEN cd.ctr < AVG(cd.ctr) OVER (PARTITION BY ra.adset_id_text) * (1 - p_segment_threshold_pct)
                     AND cd.spend > ts.total_spend * 0.1
                THEN format('%s gets %.1f%% of spend but has worse CTR (%.4f%%) than other demographics', 
                            cd.demographic_segment, 
                            ROUND((cd.spend * 100.0 / NULLIF(ts.total_spend, 0)), 1),
                            cd.ctr)
            END as low_ctr_alert,
            CASE 
                WHEN cd.cpa > AVG(cd.cpa) OVER (PARTITION BY ra.adset_id_text) * (1 + p_segment_threshold_pct)
                     AND cd.spend > ts.total_spend * 0.1
                     AND cd.cpa > 0
                THEN format('%s gets %.1f%% of spend but has higher CPA ($%.2f) than other demographics', 
                            cd.demographic_segment, 
                            ROUND((cd.spend * 100.0 / NULLIF(ts.total_spend, 0)), 1),
                            cd.cpa)
            END as high_cpa_alert,
            CASE 
                WHEN cd.cpc > AVG(cd.cpc) OVER (PARTITION BY ra.adset_id_text) * (1 + p_segment_threshold_pct)
                     AND cd.spend > ts.total_spend * 0.1
                THEN format('%s gets %.1f%% of spend but has higher CPC ($%.2f) than other demographics', 
                            cd.demographic_segment, 
                            ROUND((cd.spend * 100.0 / NULLIF(ts.total_spend, 0)), 1),
                            cd.cpc)
            END as high_cpc_alert
        FROM combined_demographics cd
        JOIN relevant_adsets ra ON cd.adset_id = ra.adsets_table_id
        JOIN total_spend ts ON cd.adset_id = ts.adset_id
    ),
    demographic_anomalies AS (
        SELECT
            date, adset_id_text, campaign_id,
            jsonb_build_object(
                'segment_type', 'demographic',
                'segment_value', demographic_segment,
                'metrics', metrics,
                'alerts', array_remove(ARRAY[low_ctr_alert, high_cpa_alert, high_cpc_alert]::text[], NULL)
            ) as segment_anomaly_data
        FROM demographic_comparison
        WHERE low_ctr_alert IS NOT NULL OR high_cpa_alert IS NOT NULL OR high_cpc_alert IS NOT NULL
           OR (low_ctr_alert IS NULL AND high_cpa_alert IS NULL AND high_cpc_alert IS NULL)
    ),
    grouped_demographic_anomalies AS (
        SELECT
            date,
            adset_id_text,
            campaign_id,
            jsonb_agg(segment_anomaly_data ORDER BY segment_anomaly_data->>'segment_value') as demographic_alerts
        FROM demographic_anomalies
        GROUP BY date, adset_id_text, campaign_id
    ),
    -- Hourly Analysis
    hourly_metrics AS (
        SELECT
            adset_id,
            hour_of_day,
            SUM(impressions) as impressions,
            SUM(clicks) as clicks,
            SUM(spend::numeric) as spend,
            SUM(results) as results,
            ROUND((SUM(clicks)::numeric * 100.0 / NULLIF(SUM(impressions), 0)), 4) as ctr,
            ROUND((SUM(spend)::numeric / NULLIF(SUM(results), 0)), 2) as cpa,
            ROUND((SUM(spend) / NULLIF(SUM(clicks), 0)), 2) as cpc
        FROM public.adset_insights_hourly
        WHERE adset_id IN (SELECT adsets_table_id FROM relevant_adsets)
        AND impressions >= p_min_impressions
        GROUP BY adset_id, hour_of_day
        HAVING SUM(impressions) >= p_min_impressions
    ),
    
    -- Hourly comparison
    hourly_comparison AS (
        SELECT
            ra.adset_id_text,
            p_end_date as date,
            ra.campaign_id_text as campaign_id,
            hm.hour_of_day,
            jsonb_build_object(
                'spend', hm.spend,
                'impressions', hm.impressions,
                'ctr', hm.ctr,
                'cpa', hm.cpa,
                'cpc', hm.cpc,
                'clicks', hm.clicks,
                'results', hm.results,
                'spend_percentage', ROUND((hm.spend * 100.0 / NULLIF(ts.total_spend, 0)), 1)
            ) as metrics,
            CASE 
                WHEN hm.ctr < AVG(hm.ctr) OVER (PARTITION BY ra.adset_id_text) * (1 - p_segment_threshold_pct)
                     AND hm.spend > ts.total_spend * 0.1
                THEN format('Hour %s gets %.1f%% of spend but has worse CTR (%.4f%%) than other hours', 
                            hm.hour_of_day, 
                            ROUND((hm.spend * 100.0 / NULLIF(ts.total_spend, 0)), 1),
                            hm.ctr)
            END as low_ctr_alert,
            CASE 
                WHEN hm.cpa > AVG(hm.cpa) OVER (PARTITION BY ra.adset_id_text) * (1 + p_segment_threshold_pct)
                     AND hm.spend > ts.total_spend * 0.1
                     AND hm.cpa > 0
                THEN format('Hour %s gets %.1f%% of spend but has higher CPA ($%.2f) than other hours', 
                            hm.hour_of_day, 
                            ROUND((hm.spend * 100.0 / NULLIF(ts.total_spend, 0)), 1),
                            hm.cpa)
            END as high_cpa_alert,
            CASE 
                WHEN hm.cpc > AVG(hm.cpc) OVER (PARTITION BY ra.adset_id_text) * (1 + p_segment_threshold_pct)
                     AND hm.spend > ts.total_spend * 0.1
                THEN format('Hour %s gets %.1f%% of spend but has higher CPC ($%.2f) than other hours', 
                            hm.hour_of_day, 
                            ROUND((hm.spend * 100.0 / NULLIF(ts.total_spend, 0)), 1),
                            hm.cpc)
            END as high_cpc_alert
        FROM hourly_metrics hm
        JOIN relevant_adsets ra ON hm.adset_id = ra.adsets_table_id
        JOIN total_spend ts ON hm.adset_id = ts.adset_id
    ),
    hourly_anomalies AS (
        SELECT
            date, adset_id_text, campaign_id,
            jsonb_build_object(
                'segment_type', 'hourly',
                'segment_value', hour_of_day::text,
                'metrics', metrics,
                'alerts', array_remove(ARRAY[low_ctr_alert, high_cpa_alert, high_cpc_alert]::text[], NULL)
            ) as segment_anomaly_data
        FROM hourly_comparison
        WHERE low_ctr_alert IS NOT NULL OR high_cpa_alert IS NOT NULL OR high_cpc_alert IS NOT NULL
           OR (low_ctr_alert IS NULL AND high_cpa_alert IS NULL AND high_cpc_alert IS NULL)
    ),
    grouped_hourly_anomalies AS (
        SELECT
            date,
            adset_id_text,
            campaign_id,
            jsonb_agg(segment_anomaly_data ORDER BY segment_anomaly_data->>'segment_value') as hourly_alerts
        FROM hourly_anomalies
        GROUP BY date, adset_id_text, campaign_id
    ),
    
    -- Region Analysis
    region_metrics AS (
        SELECT
            adset_id,
            region,
            SUM(impressions) as impressions,
            SUM(clicks) as clicks,
            SUM(spend::numeric) as spend,
            SUM(results) as results,
            ROUND((SUM(clicks)::numeric * 100.0 / NULLIF(SUM(impressions), 0)), 4) as ctr,
            ROUND((SUM(spend)::numeric / NULLIF(SUM(results), 0)), 2) as cpa,
            ROUND((SUM(spend) / NULLIF(SUM(clicks), 0)), 2) as cpc
        FROM public.adset_insights_region
        WHERE adset_id IN (SELECT adsets_table_id FROM relevant_adsets)
        AND impressions >= p_min_impressions
        GROUP BY adset_id, region
        HAVING SUM(impressions) >= p_min_impressions
    ),
    
    -- Region comparison
    region_comparison AS (
        SELECT
            ra.adset_id_text,
            p_end_date as date,
            ra.campaign_id_text as campaign_id,
            rm.region,
            jsonb_build_object(
                'spend', rm.spend,
                'impressions', rm.impressions,
                'ctr', rm.ctr,
                'cpa', rm.cpa,
                'cpc', rm.cpc,
                'clicks', rm.clicks,
                'results', rm.results,
                'spend_percentage', ROUND((rm.spend * 100.0 / NULLIF(ts.total_spend, 0)), 1)
            ) as metrics,
            CASE 
                WHEN rm.ctr < AVG(rm.ctr) OVER (PARTITION BY ra.adset_id_text) * (1 - p_segment_threshold_pct)
                     AND rm.spend > ts.total_spend * 0.1
                THEN format('%s gets %.1f%% of spend but has worse CTR (%.4f%%) than other regions', 
                            rm.region, 
                            ROUND((rm.spend * 100.0 / NULLIF(ts.total_spend, 0)), 1),
                            rm.ctr)
            END as low_ctr_alert,
            CASE 
                WHEN rm.cpa > AVG(rm.cpa) OVER (PARTITION BY ra.adset_id_text) * (1 + p_segment_threshold_pct)
                     AND rm.spend > ts.total_spend * 0.1
                     AND rm.cpa > 0
                THEN format('%s gets %.1f%% of spend but has higher CPA ($%.2f) than other regions', 
                            rm.region, 
                            ROUND((rm.spend * 100.0 / NULLIF(ts.total_spend, 0)), 1),
                            rm.cpa)
            END as high_cpa_alert,
            CASE 
                WHEN rm.cpc > AVG(rm.cpc) OVER (PARTITION BY ra.adset_id_text) * (1 + p_segment_threshold_pct)
                     AND rm.spend > ts.total_spend * 0.1
                THEN format('%s gets %.1f%% of spend but has higher CPC ($%.2f) than other regions', 
                            rm.region, 
                            ROUND((rm.spend * 100.0 / NULLIF(ts.total_spend, 0)), 1),
                            rm.cpc)
            END as high_cpc_alert
        FROM region_metrics rm
        JOIN relevant_adsets ra ON rm.adset_id = ra.adsets_table_id
        JOIN total_spend ts ON rm.adset_id = ts.adset_id
    ),
    region_anomalies AS (
        SELECT
            date, adset_id_text, campaign_id,
            jsonb_build_object(
                'segment_type', 'region',
                'segment_value', region,
                'metrics', metrics,
                'alerts', array_remove(ARRAY[low_ctr_alert, high_cpa_alert, high_cpc_alert]::text[], NULL)
            ) as segment_anomaly_data
        FROM region_comparison
        WHERE low_ctr_alert IS NOT NULL OR high_cpa_alert IS NOT NULL OR high_cpc_alert IS NOT NULL
           OR (low_ctr_alert IS NULL AND high_cpa_alert IS NULL AND high_cpc_alert IS NULL)
    ),
    grouped_region_anomalies AS (
        SELECT
            date,
            adset_id_text,
            campaign_id,
            jsonb_agg(segment_anomaly_data ORDER BY segment_anomaly_data->>'segment_value') as region_alerts
        FROM region_anomalies
        GROUP BY date, adset_id_text, campaign_id
    ),
    -- Calculate efficiency scores
    efficiency_scores AS (
        SELECT
            dd.adset_id,
            dd.date,
            dd.campaign_id,
            CASE 
                WHEN dd.ctr IS NULL OR avg_ctr IS NULL OR avg_ctr = 0 THEN 0
                WHEN dd.ctr >= avg_ctr * 1.5 THEN 100
                WHEN dd.ctr >= avg_ctr * 1.25 THEN 75
                WHEN dd.ctr >= avg_ctr THEN 50
                WHEN dd.ctr >= avg_ctr * 0.75 THEN 25
                ELSE 0
            END AS ctr_score,
            
            CASE 
                WHEN dd.cpa IS NULL OR avg_cpa IS NULL OR avg_cpa = 0 THEN 0
                WHEN dd.cpa <= avg_cpa * 0.5 THEN 100
                WHEN dd.cpa <= avg_cpa * 0.75 THEN 75
                WHEN dd.cpa <= avg_cpa THEN 50
                WHEN dd.cpa <= avg_cpa * 1.25 THEN 25
                ELSE 0
            END AS cpa_score,
            
            CASE 
                WHEN dd.cpc IS NULL OR avg_cpc IS NULL OR avg_cpc = 0 THEN 0
                WHEN dd.cpc <= avg_cpc * 0.5 THEN 100
                WHEN dd.cpc <= avg_cpc * 0.75 THEN 75
                WHEN dd.cpc <= avg_cpc THEN 50
                WHEN dd.cpc <= avg_cpc * 1.25 THEN 25
                ELSE 0
            END AS cpc_score
        FROM daily_rolling_stats dd
        WHERE date BETWEEN p_start_date AND p_end_date
    ),
    
    -- Combined efficiency scores
    combined_efficiency_scores AS (
        SELECT
            adset_id,
            date,
            campaign_id,
            ctr_score,
            cpa_score,
            cpc_score,
            (COALESCE(ctr_score, 0) + COALESCE(cpa_score, 0) + COALESCE(cpc_score, 0)) / 
            (CASE WHEN ctr_score IS NULL THEN 0 ELSE 1 END + 
             CASE WHEN cpa_score IS NULL THEN 0 ELSE 1 END + 
             CASE WHEN cpc_score IS NULL THEN 0 ELSE 1 END) AS overall_score
        FROM efficiency_scores
    ),
    
    -- Final Combination
    final_combined_data AS (
        SELECT
            da.date,
            da.adset_id,
            da.campaign_id,
            COALESCE(da.daily_metrics, '{}'::jsonb) as daily_metrics,
            COALESCE(da.daily_alerts, ARRAY[]::text[]) as daily_alerts,
            COALESCE(gpa.platform_alerts, '[]'::jsonb) as platform_alerts,
            COALESCE(gda.device_alerts, '[]'::jsonb) as device_alerts,
            COALESCE(gposa.position_alerts, '[]'::jsonb) as position_alerts,
            COALESCE(gdema.demographic_alerts, '[]'::jsonb) as demographic_alerts,
            COALESCE(gha.hourly_alerts, '[]'::jsonb) as hourly_alerts,
            COALESCE(gra.region_alerts, '[]'::jsonb) as region_alerts,
            jsonb_build_object(
                'overall_score', ROUND(ces.overall_score)::integer,
                'ctr_score', ROUND(ces.ctr_score)::integer,
                'cpc_score', ROUND(ces.cpc_score)::integer,
                'cpa_score', ROUND(ces.cpa_score)::integer
            ) as efficiency_scores
        FROM daily_anomalies da
        LEFT JOIN grouped_platform_anomalies gpa ON da.adset_id = gpa.adset_id_text AND da.campaign_id = gpa.campaign_id
        LEFT JOIN grouped_device_anomalies gda ON da.adset_id = gda.adset_id_text AND da.campaign_id = gda.campaign_id
        LEFT JOIN grouped_position_anomalies gposa ON da.adset_id = gposa.adset_id_text AND da.campaign_id = gposa.campaign_id
        LEFT JOIN grouped_demographic_anomalies gdema ON da.adset_id = gdema.adset_id_text AND da.campaign_id = gdema.campaign_id
        LEFT JOIN grouped_hourly_anomalies gha ON da.adset_id = gha.adset_id_text AND da.campaign_id = gha.campaign_id
        LEFT JOIN grouped_region_anomalies gra ON da.adset_id = gra.adset_id_text AND da.campaign_id = gra.campaign_id
        LEFT JOIN combined_efficiency_scores ces ON da.adset_id = ces.adset_id AND da.date = ces.date AND da.campaign_id = ces.campaign_id
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'date', date,
            'ad_set_id', adset_id,
            'campaign_id', campaign_id,
            'daily_metrics', daily_metrics,
            'daily_alerts', daily_alerts,
            'platform_alerts', platform_alerts,
            'device_alerts', device_alerts,
            'position_alerts', position_alerts,
            'demographic_alerts', demographic_alerts,
            'hourly_alerts', hourly_alerts,
            'region_alerts', region_alerts,
            'efficiency_scores', efficiency_scores
        ) ORDER BY date DESC, campaign_id ASC, adset_id ASC
    ) INTO result
    FROM final_combined_data;

    RETURN COALESCE(result, '[]'::jsonb);

EXCEPTION
    WHEN division_by_zero THEN
        RETURN jsonb_build_object('error', 'Division by zero occurred during analysis.');
    WHEN OTHERS THEN
        RETURN jsonb_build_object('error', SQLERRM, 'sqlstate', SQLSTATE);
END;
$function$

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.detect_adset_anomalies_enhanced(date, date, text, integer, numeric, numeric, integer) TO authenticated; 