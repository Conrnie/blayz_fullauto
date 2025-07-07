# Authentication and Ad Account Connection Fixes

## Summary of Issues Fixed

### 1. PKCE Authentication Errors
**Problem**: Users experienced "invalid request: both auth code and code verifier should be non-empty" errors during Meta OAuth authentication.

**Root Cause**: 
- Aggressive clearing of OAuth state during authentication flow
- Improper handling of PKCE code verifiers
- Clearing active sessions unintentionally

**Solution**:
- Improved OAuth state management in `signInWithProvider()` function
- More selective clearing of OAuth state (only code verifiers, not full sessions)
- Better fallback handling when PKCE verification fails
- Enhanced error handling with session recovery attempts

### 2. Missing First-Time User Flow
**Problem**: After successful authentication, all users were redirected to `/reports` regardless of whether they had connected their ad accounts.

**Solution**:
- Added ad account connection check in auth callback
- Implemented first-time user detection and redirection to `/accounts`
- Added welcome messaging for new users
- Updated routing logic to handle onboarding flow

### 3. Database Schema Consistency
**Problem**: Code referenced both `user_facebook_tokens` and `meta_connections` tables inconsistently.

**Solution**:
- Standardized all references to use `meta_connections` table
- Updated utility functions to use correct table structure
- Added token expiration checking

## Files Modified

### Frontend Files
1. **`frontend/pages/auth/callback.js`**
   - Fixed PKCE error handling
   - Added ad account status checking
   - Improved fallback mechanisms
   - Added first-time user redirection logic

2. **`frontend/lib/supabase.js`**
   - Improved OAuth state management
   - Fixed table name references
   - Added `checkUserAdAccountStatus()` utility function
   - More selective localStorage clearing

3. **`frontend/pages/accounts/index.js`**
   - Added first-time user welcome messaging
   - Enhanced UI feedback for new users
   - Improved URL parameter handling

4. **`frontend/components/Layout/Layout.js`**
   - Added ad account status checking on app initialization
   - Improved authentication flow for new users

## New Features Added

### 1. First-Time User Detection
- Users without connected ad accounts are automatically redirected to `/accounts?first_time=true`
- Special welcome messaging for new users
- Contextual UI changes for onboarding experience

### 2. Enhanced Ad Account Status Checking
- New `checkUserAdAccountStatus()` function
- Token expiration detection
- Better error handling and fallback scenarios

### 3. Improved OAuth State Management
- Selective clearing of OAuth state
- Preservation of active sessions
- Better PKCE flow handling

## Deployment Instructions

### 1. Deploy the Changes
```bash
# Build and deploy the frontend
npm run build
npm run deploy
```

### 2. Verify Environment Variables
Ensure these environment variables are properly set in your Netlify deployment:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. Update Supabase Edge Functions
Make sure your Supabase edge functions are using the correct table names (`meta_connections`).

## Testing Instructions

### 1. Test New User Flow
1. Create a new user account or use an account without connected Meta ads
2. Complete authentication
3. Verify redirection to `/accounts?first_time=true`
4. Check welcome messaging appears
5. Test Meta account connection flow

### 2. Test Existing User Flow
1. Use an account with already connected Meta ads
2. Complete authentication
3. Verify redirection to `/reports`
4. Ensure no disruption to existing user experience

### 3. Test PKCE Error Resolution
1. Clear browser localStorage and sessionStorage
2. Attempt Meta OAuth authentication
3. Verify successful authentication without PKCE errors
4. Test fallback mechanisms if errors occur

### 4. Test Edge Cases
1. **Expired Token**: Test users with expired Meta tokens
2. **Network Issues**: Test authentication with poor connectivity
3. **Multiple Tabs**: Test OAuth flow with multiple browser tabs open
4. **Browser Refresh**: Test authentication during callback processing

## Monitoring and Troubleshooting

### Key Log Messages to Monitor
- "OAuth callback already processing, skipping..."
- "PKCE error detected, trying fallback session check..."
- "Found existing valid session, proceeding..."
- "No Meta connection found, redirecting to accounts page"

### Common Issues and Solutions

#### Issue: Still Getting PKCE Errors
**Solution**: 
1. Clear browser cache completely
2. Check for multiple OAuth flows happening simultaneously
3. Verify Supabase project settings and OAuth configurations

#### Issue: Users Not Redirecting to Accounts
**Solution**:
1. Check `meta_connections` table structure
2. Verify user IDs match between auth and database
3. Check browser console for JavaScript errors

#### Issue: First-Time Flow Not Working
**Solution**:
1. Verify URL parameters are being preserved
2. Check router configuration
3. Ensure proper component re-rendering

## Database Requirements

Ensure your `meta_connections` table has the following structure:
```sql
CREATE TABLE meta_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    long_lived_token TEXT NOT NULL,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    provider TEXT DEFAULT 'facebook',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Expected Behavior After Fixes

1. **New Users**: 
   - Authentication → Ad Account Check → Redirect to `/accounts` with welcome message
   
2. **Existing Users**: 
   - Authentication → Ad Account Check → Redirect to `/reports`
   
3. **PKCE Errors**: 
   - Attempt recovery → Fallback to session check → Continue or retry
   
4. **Token Management**: 
   - Selective clearing of OAuth state
   - Preservation of active sessions
   - Better error handling

## Support and Maintenance

- Monitor Supabase logs for authentication errors
- Watch for user reports of connection issues
- Regularly check Meta API changes that might affect OAuth flow
- Keep Supabase client library updated for latest OAuth improvements 