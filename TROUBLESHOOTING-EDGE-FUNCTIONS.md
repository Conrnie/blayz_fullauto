# Edge Functions Troubleshooting Guide

## Common Issues and Solutions

### 1. Edge Functions Not Deployed

**Signs:**
- 404 errors when trying to access the Edge Function URLs
- Network requests timeout
- "No such function" errors in the Supabase logs

**Solutions:**
- Deploy the Edge Functions using the Supabase Dashboard
- Verify deployment status in the Supabase Dashboard

### 2. Environment Variables Missing

**Signs:**
- Edge Functions return 500 errors
- Logs show "Server configuration error"
- Missing environment values in the response

**Solutions:**
- Add the following variables to your Supabase project:
  - `META_APP_ID`
  - `META_APP_SECRET`
  - Verify they're correctly set in the Supabase Dashboard > Settings > API > Environment Variables

### 3. Database Tables Issues

**Signs:**
- Edge Functions return database query errors
- "relation does not exist" errors

**Solutions:**
- Run the SQL commands to create the required tables:
  ```sql
  -- Create meta_connections table
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

  -- Create ad_accounts table
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
  ```

### 4. OAuth Flow Issues

**Signs:**
- Redirected back from Meta but no code parameter
- Code parameter present but exchange fails

**Solutions:**
- Check Meta Developer Portal settings
- Verify the redirect URI is exactly the same in three places:
  1. Meta Developer Portal > Valid OAuth Redirect URIs
  2. The `redirectUri` in `handleConnectMeta()`
  3. The `redirectUri` in `handleMetaCallback()`

### 5. JWT/Auth Issues

**Signs:**
- 401 Unauthorized errors
- "Authentication error" messages
- "Invalid authorization header format" errors

**Solutions:**
- Make sure the Supabase session is valid
- Check if the user is properly authenticated
- Consider deploying the Edge Functions with `--no-verify-jwt` flag

## Checking Edge Functions Using the Dashboard

1. Log in to your Supabase Dashboard
2. Navigate to Edge Functions
3. Check if your functions are listed and Active
4. Check the Invocations tab to see if functions are being called
5. Check the Logs tab for any errors

## Testing Edge Functions Directly

You can test if your Edge Functions are properly configured using curl:

```bash
# For get-meta-ad-accounts
curl -X GET \
  https://your-project.supabase.co/functions/v1/get-meta-ad-accounts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# For exchange-meta-token
curl -X POST \
  https://your-project.supabase.co/functions/v1/exchange-meta-token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"code":"DUMMY_CODE","redirectUri":"https://your-app.com/accounts"}'
```

## Debugging Redirects and OAuth Flow

To debug the OAuth flow, temporarily modify your frontend code to show full debug information:

```javascript
// Add to useEffect in AccountsPage
useEffect(() => {
  if (!router.isReady) return;
  
  console.log('ROUTER QUERY:', router.query);
  
  // Display OAuth debug information in UI if code is present
  if (router.query.code) {
    const debugElement = document.createElement('div');
    debugElement.style.position = 'fixed';
    debugElement.style.top = '0';
    debugElement.style.left = '0';
    debugElement.style.width = '100%';
    debugElement.style.padding = '10px';
    debugElement.style.background = 'rgba(0,0,0,0.8)';
    debugElement.style.color = 'white';
    debugElement.style.zIndex = '9999';
    debugElement.innerHTML = `
      <pre>Code: ${router.query.code.substring(0, 10)}...</pre>
      <button id="copy-code">Copy Code</button>
    `;
    document.body.appendChild(debugElement);
    
    // Add click handler to copy code
    document.getElementById('copy-code').addEventListener('click', () => {
      navigator.clipboard.writeText(router.query.code);
      alert('Code copied to clipboard');
    });
  }
}, [router.isReady, router.query]);
```

## Data Flow Issues

If the Edge Functions are getting called but no data is being stored:

1. Check database permissions:
   - Make sure RLS policies allow write access to the tables
   - Verify the service role key has proper permissions

2. Check for type conversion issues:
   - Make sure user IDs are consistently handled as strings or UUIDs
   - Check for mismatches between UUID and string types in queries

3. Data processing issues:
   - Look for errors in the processing of Meta API responses
   - Check if timestamps are properly formatted

## Testing the Tables Directly

You can test the tables directly in the Supabase SQL Editor:

```sql
-- Check meta_connections
SELECT * FROM meta_connections;

-- Check ad_accounts
SELECT * FROM ad_accounts;

-- Check for a specific user
SELECT * FROM meta_connections WHERE user_id = 'USER_ID_HERE';
SELECT * FROM ad_accounts WHERE user_id = 'USER_ID_HERE';
``` 