CREATE OR REPLACE FUNCTION public.detect_ad_anomalies_fixed(
    p_campaign_id text,
    p_lookback_days integer,
    p_end_date date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $function$
DECLARE
    v_start_date date;
BEGIN
    -- This is a wrapper function that calls the comprehensive enhanced function
    -- with a calculated start date based on the lookback period.
    v_start_date := p_end_date - (p_lookback_days - 1) * interval '1 day';

    RETURN public.detect_ad_anomalies_enhanced(
        v_start_date,
        p_end_date,
        p_campaign_id,
        7,   -- p_rolling_window
        2.0, -- p_std_dev_threshold
        50   -- p_min_impressions
    );
END;
$function$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.detect_ad_anomalies_fixed(text, integer, date) TO authenticated; 