# Meta Account Connection Implementation Guide

This guide provides instructions for deploying the Meta (Facebook) account connection feature to your Supabase project.

## Step 1: Deploy Edge Functions

You need to deploy two Edge Functions to your Supabase project:

1. `exchange-meta-token` - Exchanges OAuth code for token and fetches ad accounts
2. `get-meta-ad-accounts` - Retrieves ad accounts for the connected user

### Option 1: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
# Navigate to the supabase directory
cd supabase

# Deploy the exchange-meta-token function
supabase functions deploy exchange-meta-token --no-verify-jwt

# Deploy the get-meta-ad-accounts function
supabase functions deploy get-meta-ad-accounts --no-verify-jwt
```

### Option 2: Using Supabase Dashboard

If you don't have the CLI installed, you can deploy through the Supabase Dashboard:

1. Go to your Supabase project dashboard
2. Navigate to "Edge Functions" in the sidebar
3. Click "Create a new function"
4. For each function:
   - Enter the function name (exchange-meta-token or get-meta-ad-accounts)
   - Copy and paste the code from the respective index.ts file
   - Uncheck "Require JWT (JSON Web Token)" option
   - Click "Deploy"

## Step 2: Configure Meta App in Facebook Developer Portal

1. Ensure your Meta Business App is properly configured
2. Add the Supabase Edge Function URL to the Valid OAuth Redirect URIs:
   - Format: `https://<your-supabase-project>.supabase.co/functions/v1/exchange-meta-token`
   - Note: You also need to add your frontend callback URL as a valid redirect

## Step 3: Set Secret Environment Variables

Add the required environment variables to your Supabase project:

1. Go to your Supabase Dashboard
2. Navigate to "Settings" > "API" or "Edge Functions" > "Secrets"
3. Add the following variables:
   - `META_APP_ID` - Your Meta App ID from Facebook Developer Portal
   - `META_APP_SECRET` - Your Meta App Secret from Facebook Developer Portal

## Step 4: Testing and Debugging

### Verify Edge Function Deployment

1. Check if your Edge Functions are properly deployed:
   - Go to Supabase Dashboard > Edge Functions
   - Ensure both functions are listed and have status "Active"

### Test Edge Functions Directly

1. You can test the `get-meta-ad-accounts` function directly with Supabase CLI:
   ```bash
   supabase functions invoke get-meta-ad-accounts --header "Authorization: Bearer <your-jwt-token>"
   ```

### Check Edge Function Logs

1. View Edge Function logs for debugging:
   - Go to Supabase Dashboard > Edge Functions
   - Click on the function name
   - Click "Logs" tab to see execution logs

### Frontend Debugging

1. Open your browser's developer tools when testing the Meta connection
2. Check the Console for any errors
3. In the Network tab, look for requests to:
   - `https://<your-supabase-project>.supabase.co/functions/v1/exchange-meta-token`
   - `https://<your-supabase-project>.supabase.co/functions/v1/get-meta-ad-accounts`
4. If these requests are missing or failing, check your frontend code

## Common Issues and Solutions

### Issue: "No such function" error
- **Solution**: Ensure the function names match exactly and they are properly deployed

### Issue: Environment variables not found
- **Solution**: Check that META_APP_ID and META_APP_SECRET are correctly set in the Supabase secrets

### Issue: CORS errors
- **Solution**: Ensure the Edge Functions have proper CORS headers (already included in the provided code)

### Issue: Authentication errors
- **Solution**: Check that the JWT token is being properly passed in the Authorization header

### Issue: Meta API errors
- **Solution**: Verify that your Meta App is properly configured with correct permissions

## Database Tables

Ensure you have created the required database tables in your Supabase project:

### meta_connections Table

```sql
CREATE TABLE meta_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  meta_user_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  CONSTRAINT user_unique UNIQUE (user_id)
);

-- Add RLS policies
ALTER TABLE meta_connections ENABLE ROW LEVEL SECURITY;

-- Only allow users to access their own connections
CREATE POLICY "Users can only access their own connections"
  ON meta_connections
  FOR ALL
  USING (auth.uid()::text = user_id);
```

### ad_accounts Table

```sql
CREATE TABLE ad_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  currency TEXT NOT NULL,
  balance NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  CONSTRAINT account_unique UNIQUE (user_id, account_id)
);

-- Add index on user_id for faster queries
CREATE INDEX idx_ad_accounts_user_id ON ad_accounts(user_id);

-- Add RLS policies
ALTER TABLE ad_accounts ENABLE ROW LEVEL SECURITY;

-- Only allow users to access their own ad accounts
CREATE POLICY "Users can only access their own ad accounts"
  ON ad_accounts
  FOR ALL
  USING (auth.uid()::text = user_id);
``` 