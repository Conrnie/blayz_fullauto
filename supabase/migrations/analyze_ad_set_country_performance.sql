CREATE OR REPLACE FUNCTION public.analyze_ad_set_country_performance(
    p_ad_set_id bigint,
    p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    v_max_date date;
    v_start_date date;
    v_analysis_results jsonb;
    v_total_impressions numeric;
BEGIN
    -- 1. Determine the date range for the last 14 days of data
    SELECT MAX(end_date)
    INTO v_max_date
    FROM public.ad_set_insights_country
    WHERE ad_set_id = p_ad_set_id AND user_id = p_user_id;

    IF v_max_date IS NULL THEN
        RETURN jsonb_build_object(
            'error', 'No data found for the specified ad set.',
            'ad_set_id', p_ad_set_id
        );
    END IF;

    v_start_date := v_max_date - INTERVAL '14 days';

    -- Check if there is data in the date range before proceeding
    SELECT COALESCE(SUM(impressions), 0)
    INTO v_total_impressions
    FROM public.ad_set_insights_country
    WHERE
        ad_set_id = p_ad_set_id
        AND user_id = p_user_id
        AND end_date BETWEEN v_start_date AND v_max_date;
    
    IF v_total_impressions = 0 THEN
        RETURN jsonb_build_object(
            'error', 'No data available for the selected 14-day period.',
            'ad_set_id', p_ad_set_id,
            'analysis_period', jsonb_build_object('start_date', v_start_date, 'end_date', v_max_date)
        );
    END IF;

    -- 2. Aggregate data and perform analysis
    WITH period_data AS (
        SELECT
            country,
            COALESCE(SUM(spend), 0) AS spend,
            COALESCE(SUM(impressions), 0) AS impressions,
            COALESCE(SUM(clicks), 0) AS clicks,
            COALESCE(SUM(results), 0) AS results,
            COALESCE(SUM(link_clicks), 0) AS link_clicks
        FROM public.ad_set_insights_country
        WHERE
            ad_set_id = p_ad_set_id
            AND user_id = p_user_id
            AND end_date BETWEEN v_start_date AND v_max_date
            AND country IS NOT NULL
        GROUP BY country
        HAVING COALESCE(SUM(impressions), 0) > 0
    ),
    totals AS (
        SELECT
            SUM(spend) AS total_spend,
            SUM(impressions) AS total_impressions,
            SUM(clicks) AS total_clicks,
            SUM(results) AS total_results,
            SUM(link_clicks) AS total_link_clicks
        FROM period_data
    ),
    country_metrics AS (
        SELECT
            pd.country,
            pd.spend,
            pd.impressions,
            pd.clicks,
            pd.results,
            pd.link_clicks,
            CASE WHEN pd.clicks > 0 THEN pd.spend / pd.clicks ELSE 0 END AS cpc,
            CASE WHEN pd.impressions > 0 THEN (pd.spend / pd.impressions) * 1000 ELSE 0 END AS cpm,
            CASE WHEN pd.impressions > 0 THEN pd.clicks::float / pd.impressions ELSE 0 END AS ctr,
            CASE WHEN pd.results > 0 THEN pd.spend / pd.results ELSE 0 END AS cpa,
            CASE WHEN pd.link_clicks > 0 THEN pd.spend / pd.link_clicks ELSE 0 END AS link_click_cpc,
            CASE WHEN pd.impressions > 0 THEN pd.link_clicks::float / pd.impressions ELSE 0 END AS link_click_ctr,
            CASE WHEN t.total_spend > 0 THEN (pd.spend / t.total_spend) * 100 ELSE 0 END AS spend_share,
            CASE WHEN t.total_impressions > 0 THEN (pd.impressions / t.total_impressions) * 100 ELSE 0 END AS impression_share
        FROM period_data pd, totals t
    ),
    overall_metrics AS (
        SELECT
            total_spend,
            total_impressions,
            total_clicks,
            total_results,
            total_link_clicks,
            CASE WHEN total_clicks > 0 THEN total_spend / total_clicks ELSE 0 END AS avg_cpc,
            CASE WHEN total_impressions > 0 THEN total_clicks::float / total_impressions ELSE 0 END AS avg_ctr,
            CASE WHEN total_results > 0 THEN total_spend / total_results ELSE 0 END AS avg_cpa
        FROM totals
    ),
    anomalies AS (
        SELECT
            cm.country,
            jsonb_build_object(
                'type', 'High CPA',
                'country', cm.country,
                'value', ROUND(cm.cpa, 2),
                'average', ROUND(om.avg_cpa, 2),
                'message', FORMAT(
                    '%s has a CPA of %s, which is %.2f%% higher than the ad set average of %s.',
                    cm.country,
                    ROUND(cm.cpa, 2),
                    (CASE WHEN om.avg_cpa > 0 THEN (cm.cpa / om.avg_cpa - 1) * 100 ELSE 0 END),
                    ROUND(om.avg_cpa, 2)
                )
            ) AS anomaly
        FROM country_metrics cm, overall_metrics om
        WHERE cm.cpa > om.avg_cpa * 1.5 AND cm.spend_share > 5 AND om.avg_cpa > 0

        UNION ALL

        SELECT
            cm.country,
            jsonb_build_object(
                'type', 'Low CTR',
                'country', cm.country,
                'value', ROUND(cm.ctr::numeric, 4),
                'average', ROUND(om.avg_ctr::numeric, 4),
                'message', FORMAT(
                    '%s has a CTR of %s, which is %.2f%% lower than the ad set average of %s.',
                    cm.country,
                    ROUND(cm.ctr::numeric, 4),
                    (CASE WHEN om.avg_ctr > 0 THEN (1 - cm.ctr / om.avg_ctr) * 100 ELSE 0 END),
                    ROUND(om.avg_ctr::numeric, 4)
                )
            ) AS anomaly
        FROM country_metrics cm, overall_metrics om
        WHERE cm.ctr < om.avg_ctr * 0.7 AND cm.impression_share > 5 AND om.avg_ctr > 0

        UNION ALL

        SELECT
            cm.country,
            jsonb_build_object(
                'type', 'High CPC',
                'country', cm.country,
                'value', ROUND(cm.cpc, 2),
                'average', ROUND(om.avg_cpc, 2),
                'message', FORMAT(
                    '%s has a CPC of %s, which is %.2f%% higher than the ad set average of %s.',
                    cm.country,
                    ROUND(cm.cpc, 2),
                    (CASE WHEN om.avg_cpc > 0 THEN (cm.cpc / om.avg_cpc - 1) * 100 ELSE 0 END),
                    ROUND(om.avg_cpc, 2)
                )
            ) AS anomaly
        FROM country_metrics cm, overall_metrics om
        WHERE cm.cpc > om.avg_cpc * 1.5 AND cm.spend_share > 5 AND om.avg_cpc > 0
    )
    SELECT
        jsonb_build_object(
            'ad_set_id', p_ad_set_id,
            'analysis_period', jsonb_build_object('start_date', v_start_date, 'end_date', v_max_date),
            'summary_metrics', (SELECT to_jsonb(om.*) FROM overall_metrics om LIMIT 1),
            'country_performance', (SELECT jsonb_agg(to_jsonb(cm.*)) FROM country_metrics cm),
            'anomalies', (SELECT CASE WHEN COUNT(a.anomaly) > 0 THEN jsonb_agg(a.anomaly) ELSE '[]'::jsonb END FROM anomalies a)
        )
    INTO v_analysis_results;

    RETURN v_analysis_results;
END;
$$; 