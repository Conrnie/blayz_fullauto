export const USER_PROMPT_INSTRUCTIONS = `Analyze the attached Facebook Ads campaign data JSON according to the expert analytical principles outlined in the system prompt. The JSON contains an array of ads, each with overall performance/Z-scores and detailed demographic_segments / device_segments including metrics, z_scores_vs_ad_avg, and ad_spend_percentage.

Generate a detailed, data-driven report with the following structure:

1.  **SUMMARY:**
    *   Briefly summarize the overall state of the analyzed ads based on overall_metrics (total spend, results, overall ROAS/CPA if meaningful) and overall_z_scores_vs_campaign_avg.
    *   Identify any ads that are clear outliers (positive or negative) compared to the campaign average.
    *   Note any ads with significant spend but very poor results, or vice-versa.

2.  **KEY INSIGHTS (Per Ad or Thematic):**
    *   Identify the top 3-5 most significant findings across all ads. For *each* insight:
        *   Specify the ad_id and the relevant segment details (from demographic_segments or device_segments).
        *   Reference the key metric(s) and the specific z_scores_vs_ad_avg that support the finding.
        *   **Crucially, state the segment's ad_spend_percentage and assess the data volume (impressions, spend, results). Explicitly mention if the finding is based on low volume.**
        *   Clearly state if this represents a significant opportunity (positive outlier) or a significant problem (negative outlier).

3.  **RECOMMENDATIONS:**
    *   Provide the top 5 *most impactful and data-backed* actionable recommendations based *directly* on the Key Insights.
    *   Prioritize recommendations addressing segments with high ad_spend_percentage and significant Z-score deviations (positive or negative).
    *   **IMPORTANT FORMATTING:** For *each* recommendation, structure it clearly using these labels followed by the content:
        *   Target: (Specify Ad ID and Segment details)
        *   Observation: (State the key metric, Z-score, spend %, and data volume assessment that justifies the action)
        *   Action: (The specific recommended step, e.g., Exclude, Increase Bid, Test Creative)
        *   Confidence: (High, Moderate, or Low, based on data strength/volume)
    *   Use a clear separator (like \`---\`) between each distinct recommendation block.

4.  **BUDGET ALLOCATION:**
    *   Based on the analysis (especially ROAS/CPA Z-scores and spend percentage), suggest specific budget shifts.
    *   Should budget move *between* ads (e.g., from overall poor performers to overall strong performers)? Justify using overall_metrics and overall_z_scores_vs_campaign_avg.
    *   Should budget shift *within* an ad (e.g., away from negative outlier segments towards positive ones)? Justify using segment z_scores_vs_ad_avg and ad_spend_percentage.
    *   Advise on the *magnitude* of shifts (e.g., small test shift vs. significant reallocation) based on confidence in the data.

5.  **TARGETING ADJUSTMENTS:**
    *   Recommend specific changes to audience targeting (demographics, device/platform/placement) based on the *_segments data.
    *   Suggest concrete actions:
        *   **Exclusions:** Identify specific segments (Demographic or Device/Platform/Placement) that are strong candidates for exclusion based on consistently poor performance (negative Z-scores, high spend share).
        *   **Refinement/Focus:** Identify segments showing strong positive performance (positive Z-scores). Suggest ways to focus budget here (e.g., dedicated focus, potentially adjusting bids if possible). Explicitly state if this is based on low volume and needs validation.
        *   **Testing:** Suggest specific tests for problematic segments (e.g., test new creatives for a high-CPC segment before excluding).

Campaign data:
__CAMPAIGN_DATA_JSON__
`;
