-- Script to create a new ad account
-- User ID: 8044b492-ffbf-46ed-87d3-ddf13e841e96

INSERT INTO public.ad_accounts (
    account_id,
    name,
    user_id,
    status,
    currency,
    balance,
    amount_spent,
    spend_cap,
    source,
    business_id,
    business_name
) VALUES (
    'act_123456789',  -- Replace with actual Meta ad account ID
    'Sample Ad Account',
    '8044b492-ffbf-46ed-87d3-ddf13e841e96',
    'ACTIVE',
    'USD',
    0.00,
    0.00,
    NULL,  -- No spend cap initially
    'META',
    'biz_123456789',  -- Replace with actual business ID
    'Sample Business Name'
);

-- Verify the insertion
SELECT * FROM public.ad_accounts 
WHERE user_id = '8044b492-ffbf-46ed-87d3-ddf13e841e96';