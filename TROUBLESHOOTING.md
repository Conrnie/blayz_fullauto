# Meta Connection Troubleshooting Guide

## What's Happening Under the Hood

When you click "Connect Meta Account", the following flow should happen:

1. The `signInWithProvider('facebook', {...})` function is called, which redirects to Meta for authentication
2. After authenticating, Meta redirects back to your app with a `code` parameter in the URL
3. Our `useEffect` hook in the AccountsPage component detects this code
4. The code is sent to our `exchange-meta-token` Edge Function to exchange for a long-lived token
5. The Edge Function saves the token in the `meta_connections` table and fetches ad accounts
6. Ad accounts are saved in the `ad_accounts` table
7. The UI updates to show the connected state and ad accounts

## Checking the Flow Step by Step

### 1. Redirect to Meta

When you click "Connect Meta Account", check the browser's Network tab to see if there's a redirect to Facebook/Meta's domain.

- If not redirecting, check the console for errors in the `handleConnectMeta` function.
- Verify that `signInWithProvider` is working with other providers or test it separately.

### 2. Redirect Back from Meta

After authenticating with Meta, check if you're redirected back to your application.

- If not redirecting back, verify the redirect URI in your Meta App settings.
- Check that the URL in your app matches exactly what's configured in Meta's developer portal.

### 3. Code Parameter Detection

Once redirected back to your app, check the URL for a `code` parameter:

```
https://your-app.com/accounts?code=ABCDEFG...
```

- If the code is missing, Meta might be reporting an error. Check URL for error parameters.
- Use browser console to manually log `router.query.code` to verify it's being detected.

### 4. Code Exchange Request

With the code detected, check the Network tab for a POST request to your Edge Function:

```
https://<your-supabase-project>.supabase.co/functions/v1/exchange-meta-token
```

- If this request is missing, check the `handleMetaCallback` function for errors.
- If the request fails, check the response for error details.

### 5. Edge Function Processing

If the request to the Edge Function succeeds, check the Supabase logs for:

- Successful token exchange
- Successful saving to `meta_connections` table
- Successful fetching and processing of ad accounts

### 6. Data Storage

Verify that data is being stored correctly:

- In Supabase Dashboard, navigate to the Table Editor
- Check both `meta_connections` and `ad_accounts` tables for your user's data

### 7. UI Update

After successful connection, the UI should:

- Show a success message
- Display the "Connected" state
- List the ad accounts

If the UI doesn't update correctly, check the `isConnected` and `adAccounts` state variables.

## Debug Logging

Add these debug logs to the AccountsPage component to track the flow:

```javascript
// Add at the beginning of the useEffect hook
useEffect(() => {
  if (!router.isReady) return;
  
  console.log('Router is ready');
  console.log('URL query parameters:', router.query);
  
  const checkConnection = async () => {
    // ...existing code...
  };
  
  checkConnection();
}, [router.isReady, router.query]);

// Add in handleMetaCallback function
const handleMetaCallback = async (code) => {
  try {
    console.log('Handling Meta callback with code:', code.substring(0, 10) + '...');
    // ...existing code...
    
    console.log('Making token exchange request to:', `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/exchange-meta-token`);
    const response = await fetch(...);
    
    console.log('Token exchange response status:', response.status);
    const result = await response.json();
    console.log('Token exchange result:', result);
    
    // ...existing code...
  } catch (err) {
    // ...existing code...
  }
};
```

## Manual Testing

You can test if your Edge Functions are working correctly by manually calling them:

1. Get a valid Auth token from your browser:
   - Open Developer Tools > Application tab > Local Storage
   - Find your Supabase URL
   - Copy the `access_token` value

2. Use cURL to test the get-meta-ad-accounts function:
   ```bash
   curl -X GET \
     https://<your-supabase-project>.supabase.co/functions/v1/get-meta-ad-accounts \
     -H "Authorization: Bearer <your-access-token>"
   ```

3. If this returns a valid response, your Edge Function is working.

## Quick Fixes

1. **Temporary bypass for testing**:
   - Temporarily modify the frontend to simulate a successful connection
   - This helps isolate if the issue is in the UI or the backend

2. **Check CORS configuration**:
   - Ensure your Edge Functions have proper CORS headers
   - Test with a browser extension that disables CORS to see if that's the issue

3. **Verify environment variables**:
   - Double check all environment variables in both frontend and Supabase
   - Make sure NEXT_PUBLIC_SUPABASE_URL is correctly pointing to your project

4. **Restart Edge Functions**:
   - Sometimes redeploying the Edge Functions can resolve issues
   - Delete and recreate them if necessary

5. **Check Meta App configuration**:
   - Verify all required permissions are enabled in your Meta App
   - Ensure the app is in the correct mode (development/live) 