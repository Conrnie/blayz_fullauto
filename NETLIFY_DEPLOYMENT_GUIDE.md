# Netlify Deployment Guide

## Prerequisites
- Your code is pushed to GitHub repository: `Conrnie/blayzripple`
- Branch: `Based-Blayz-V1`
- Netlify account connected to your GitHub

## Deployment Steps

### 1. Create New Site in Netlify
1. Go to [Netlify Dashboard](https://app.netlify.com/)
2. Click "Add new site" → "Import an existing project"
3. Choose "Deploy with GitHub"
4. Select your repository: `Conrnie/blayzripple`
5. Choose branch: `Based-Blayz-V1`

### 2. Configure Build Settings
The `netlify.toml` file is already configured with:
```toml
[build]
  base    = "frontend"
  command = "next build"
  publish = ".next"
```

### 3. Set Environment Variables
**CRITICAL**: You must set these environment variables in Netlify for the app to work properly:

1. Go to Site Settings → Environment Variables
2. Add the following variables:

#### Required Supabase Variables:
- `NEXT_PUBLIC_SUPABASE_URL` = `https://your-project-id.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `your-anon-key-here`

#### Optional API Variables:
- `NEXT_PUBLIC_API_URL` = `https://your-api-domain.com` (or leave default)
- `NEXT_PUBLIC_APP_URL` = `https://your-netlify-site.netlify.app`

### 4. Get Your Supabase Credentials
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to Settings → API
4. Copy:
   - Project URL (for `NEXT_PUBLIC_SUPABASE_URL`)
   - Anon/Public key (for `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

### 5. Deploy
1. Click "Deploy site"
2. Wait for build to complete
3. Your site will be available at: `https://your-site-name.netlify.app`

## Troubleshooting

### Build Fails with "Module not found"
- All import statements have been fixed with `.js` extensions
- This should not occur anymore

### Supabase Connection Issues
- Verify environment variables are set correctly in Netlify
- Check that Supabase project is active
- Ensure anon key has correct permissions

### API Endpoints Not Working
- Check that `NEXT_PUBLIC_API_URL` points to your backend
- Verify backend is deployed and accessible

## Current Status
✅ All import statements fixed with `.js` extensions  
✅ Supabase client updated to latest `@supabase/ssr`  
✅ Build configuration optimized for Netlify  
✅ Mock client handles missing environment variables gracefully  
✅ Local build successful  

## Next Steps After Deployment
1. Test all authentication flows
2. Verify API connections
3. Check that all pages load correctly
4. Test responsive design on mobile devices

## Support
If you encounter issues:
1. Check Netlify build logs for specific errors
2. Verify all environment variables are set
3. Ensure Supabase project is properly configured
4. Check browser console for client-side errors 