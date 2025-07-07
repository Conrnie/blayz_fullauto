CREATE OR REPLACE FUNCTION public.detect_ad_anomalies_enhanced(
    p_start_date date,
    p_end_date date,
    p_campaign_id text DEFAULT NULL,
    p_rolling_window integer DEFAULT 7,
    p_std_dev_threshold numeric DEFAULT 2.0,
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
    IF p_min_impressions < 0 THEN RAISE EXCEPTION 'p_min_impressions cannot be negative'; END IF;

    -- Calculate min insight date and adjusted start date for ads
    SELECT MIN(ai.date)
    INTO v_min_insight_date
    FROM public.ad_insights ai
    JOIN public.ads a ON ai.ad_id = a.meta_ad_id
    WHERE (p_campaign_id IS NULL OR a.meta_campaign_id = p_campaign_id);

    v_adjusted_start_date := GREATEST(
        p_start_date - (p_rolling_window - 1) * interval '1 day',
        COALESCE(v_min_insight_date, p_start_date)
    );

    -- Debug logging
    RAISE NOTICE 'Processing AD-LEVEL date range: % to %', p_start_date, p_end_date;
    RAISE NOTICE 'Adjusted AD-LEVEL start date: %', v_adjusted_start_date;

    WITH relevant_ads AS (
        SELECT DISTINCT
            a.id as ads_table_id,
            a.meta_ad_id as ad_id_text,
            a.meta_campaign_id as campaign_id_text
        FROM public.ads a
        JOIN public.campaigns c ON a.meta_campaign_id = c.meta_campaign_id
        WHERE a.status = 'ACTIVE'
          AND a.id IS NOT NULL
          AND a.meta_ad_id IS NOT NULL
          AND (p_campaign_id IS NULL OR a.meta_campaign_id = p_campaign_id)
          AND EXISTS (
              SELECT 1 FROM public.ad_insights ai
              WHERE ai.ad_id = a.meta_ad_id
              AND ai.date BETWEEN v_adjusted_start_date AND p_end_date
          )
    ),
    daily_data AS (
        SELECT
            ra.ads_table_id,
            ra.ad_id_text as ad_id,
            ra.campaign_id_text as campaign_id,
            ai.date,
            ai.spend::numeric AS spend,
            NULLIF(ai.ctr, 0)::numeric AS ctr,
            NULLIF(ai.cpa, 0)::numeric AS cpa,
            NULLIF(ai.roas, 0)::numeric AS roas,
            ai.clicks::numeric as clicks,
            ai.impressions::numeric as impressions,
            ai.results::numeric as results
        FROM public.ad_insights ai
        JOIN relevant_ads ra ON ai.ad_id = ra.ad_id_text
        WHERE ai.date BETWEEN v_adjusted_start_date AND p_end_date
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
            PARTITION BY ad_id
            ORDER BY date
            ROWS BETWEEN (p_rolling_window - 1) PRECEDING AND CURRENT ROW
        )
    ),
    daily_potential_anomalies AS (
        SELECT
            date, ad_id, campaign_id,
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
            date, ad_id, campaign_id,
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
    )
    -- Final JSON Aggregation
    SELECT jsonb_agg(
        jsonb_build_object(
            'date', date,
            'ad_id', ad_id,
            'campaign_id', campaign_id,
            'daily_metrics', daily_metrics,
            'alerts', daily_alerts
        )
    )
    INTO result
    FROM daily_anomalies;

    RETURN result;

END;
$function$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.detect_ad_anomalies_enhanced(date, date, text, integer, numeric, integer) TO authenticated; 