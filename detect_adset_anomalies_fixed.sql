CREATE OR REPLACE FUNCTION public.detect_adset_anomalies_fixed(
    p_date date,
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
BEGIN
    -- This is a wrapper function that calls the comprehensive enhanced function
    -- with the single date used for both start and end dates
    RETURN public.detect_adset_anomalies_enhanced(
        p_date,               -- start date
        p_date,               -- end date (same as start for single-day analysis)
        p_campaign_id,
        p_rolling_window,
        p_std_dev_threshold,
        p_segment_threshold_pct,
        p_min_impressions
    );
END;
$function$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.detect_adset_anomalies_fixed(date, text, integer, numeric, numeric, integer) TO authenticated; 