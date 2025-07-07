# Meta OAuth Direct Integration Setup

## Environment Variables Required

Add these environment variables to your **Netlify** deployment:

### Frontend Environment Variables (Netlify)
```
NEXT_PUBLIC_META_APP_ID=your_meta_app_id_here
# OR alternatively (for backward compatibility):
NEXT_PUBLIC_FB_APP_ID=your_meta_app_id_here
```

### Backend Environment Variables (Supabase Edge Functions)
```
META_APP_ID=your_meta_app_id_here
META_APP_SECRET=your_meta_app_secret_here
```

## Meta App Configuration

In your **Meta Developer Console** (developers.facebook.com):

1. Go to your app settings
2. Navigate to "Facebook Login" > "Settings"
3. Add these Valid OAuth Redirect URIs:
   ```
   https://www.blayz.io/accounts?auto=true
   https://your-netlify-domain.netlify.app/accounts?auto=true
   ```

## How the Flow Works

1. User clicks "Connect Meta Account" 
2. Redirects to: `https://www.facebook.com/v19.0/dialog/oauth?client_id=...&redirect_uri=...&scope=ads_management,ads_read,business_management`
3. User authorizes on Meta
4. Meta redirects back to: `/accounts?auto=true&code=AUTHORIZATION_CODE`
5. Frontend detects the code and calls `exchange-meta-token` edge function
6. Edge function exchanges code for long-lived token and fetches ad accounts
7. User sees their connected ad accounts

## Testing

1. Deploy the changes
2. Clear browser cache completely
3. Login to your app
4. Go to `/accounts` 
5. Click "Connect Meta Account"
6. Check browser console for detailed logs

## Troubleshooting

- If redirect doesn't work: Check Meta app redirect URI configuration
- If code exchange fails: Check Meta app ID/secret in Supabase environment
- If no ad accounts: User may not have ad accounts or permissions 