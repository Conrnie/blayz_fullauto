// Follow this setup guide to integrate the Deno runtime with your Supabase project:
// https://supabase.com/docs/guides/functions/quickstart

import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

interface RequestData {
  // userId: string // No longer taking userId from request body
  shortLivedToken: string
}

interface ExchangeResponse {
  success: boolean
  data?: any
  error?: string
  errorDetails?: any
}

serve(async (req: Request) => {
  // Check for correct method
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed', allowed: 'POST' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': Deno.env.get("APP_ORIGIN") || "https://your-app-domain.com", // Restrict to your app's domain
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json'
  }

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers, status: 204 })
  }

  // Authenticate the request
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ success: false, error: 'Missing or invalid Authorization header' }),
      { status: 401, headers }
    );
  }
  const jwtToken = authHeader.split(' ')[1];

  const supabaseUrlForAuth = Deno.env.get('SUPABASE_URL');
  // const supabaseAnonKeyForAuth = Deno.env.get('SUPABASE_ANON_KEY'); // Prefer service role for server-side auth checks
  const supabaseServiceKeyForAuth = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); 

  if (!supabaseUrlForAuth || !supabaseServiceKeyForAuth) { // Changed to check supabaseServiceKeyForAuth
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for auth client initialization');
    return new Response(
      JSON.stringify({ success: false, error: 'Server auth configuration error' }),
      { status: 500, headers }
    );
  }

  const supabaseClientForAuth = createClient(supabaseUrlForAuth, supabaseServiceKeyForAuth); // Changed to use supabaseServiceKeyForAuth
  const { data: { user: authUser }, error: authError } = await supabaseClientForAuth.auth.getUser(jwtToken);

  if (authError || !authUser) {
    console.error('Authentication error:', authError?.message || 'User not found');
    return new Response(
      JSON.stringify({ success: false, error: 'Authentication failed', details: authError?.message }),
      { status: 401, headers }
    );
  }
  const authenticatedUserId = authUser.id; // This is the authoritative user ID

  try {
    // Get request body
    const requestData: RequestData = await req.json()
    const { shortLivedToken } = requestData // userId is now from authenticatedUserId

    // Validate required parameters
    if (!shortLivedToken) { // userId is no longer checked here as it comes from auth
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required parameters',
          required: ['shortLivedToken'] // Only shortLivedToken is from body now
        }),
        { status: 400, headers }
      )
    }

    // Get environment variables for Facebook App
    const fbAppId = Deno.env.get('FB_APP_ID')
    const fbAppSecret = Deno.env.get('FB_APP_SECRET')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    // Validate env variables
    if (!fbAppId || !fbAppSecret || !supabaseUrl || !supabaseServiceRoleKey) {
      console.error('Missing required environment variables')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Server configuration error',
          details: {
            has_app_id: !!fbAppId,
            has_app_secret: !!fbAppSecret,
            has_supabase_url: !!supabaseUrl,
            has_service_role: !!supabaseServiceRoleKey
          }
        }),
        { status: 500, headers }
      )
    }

    console.log('Calling Facebook Graph API to exchange token...')
    
    // Facebook Graph API endpoint for token exchange
    const fbExchangeUrl = 'https://graph.facebook.com/v19.0/oauth/access_token'
    
    // Create URL parameters
    const params = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: fbAppId,
      client_secret: fbAppSecret,
      fb_exchange_token: shortLivedToken
    })
    
    // Call Facebook API to exchange the token
    const response = await fetch(`${fbExchangeUrl}?${params.toString()}`, {
      method: 'GET'
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Error exchanging token with Facebook:', errorText)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Facebook API error', 
          errorDetails: errorText 
        }),
        { status: 502, headers }
      )
    }
    
    const data = await response.json()
    
    if (!data.access_token) {
      console.error('Facebook response missing access_token:', data)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid response from Facebook', 
          errorDetails: data 
        }),
        { status: 502, headers }
      )
    }
    
    console.log('Successfully received long-lived token from Facebook')
    console.log('Token expires in:', data.expires_in, 'seconds (approximately', Math.round(data.expires_in / 86400), 'days)')
    
    // Calculate expiration date
    const expiresAt = new Date()
    expiresAt.setSeconds(expiresAt.getSeconds() + data.expires_in)
    
    // Create Supabase client with service role key for admin access
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)
    
    // Look up existing record for this user
    const { data: existingTokens, error: findError } = await supabaseAdmin
      .from('meta_connections')
      .select('*')
      .eq('user_id', authenticatedUserId)
    
    if (findError) {
      console.error('Error finding existing token record:', findError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Database query error', 
          errorDetails: findError 
        }),
        { status: 500, headers }
      )
    }
    
    let updateResult
    
    if (existingTokens && existingTokens.length > 0) {
      // Update the existing record with the long-lived token
      const { data: updateData, error: updateError } = await supabaseAdmin
        .from('meta_connections')
        .update({
          access_token: data.access_token,    // Long-lived token
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
          // Ensure all relevant fields for meta_connections are updated, e.g., provider if it exists
          // provider: 'facebook' // Example: if you have a provider column
        })
        .eq('user_id', authenticatedUserId) // USE AUTHENTICATED USER ID
        .select()
      
      if (updateError) {
        console.error('Error updating token record with long-lived token:', updateError)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Database update error', 
            errorDetails: updateError 
          }),
          { status: 500, headers }
        )
      }
      
      updateResult = updateData
      console.log('Successfully updated record with long-lived token')
    } else {
      // Create a new record if none exists (unlikely but possible)
      const { data: insertData, error: insertError } = await supabaseAdmin
        .from('meta_connections')
        .insert({
          user_id: authenticatedUserId, // USE AUTHENTICATED USER ID
          access_token_shortlived: shortLivedToken, // This field might not exist in meta_connections or named differently
          access_token: data.access_token,
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
          // Ensure all relevant fields for meta_connections are set, e.g., provider
          // provider: 'facebook' // Example: if you have a provider column
        })
        .select()
      
      if (insertError) {
        console.error('Error inserting token record with long-lived token:', insertError)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Database insert error', 
            errorDetails: insertError 
          }),
          { status: 500, headers }
        )
      }
      
      updateResult = insertData
      console.log('Successfully inserted new record with long-lived token')
    }
    
    // Return success response
    const responseData: ExchangeResponse = {
      success: true,
      data: {
        token_preview: `${data.access_token.substring(0, 10)}...`,
        expires_in: data.expires_in,
        expires_in_days: Math.round(data.expires_in / 86400),
        expires_at: expiresAt.toISOString(),
        database_record: updateResult
      }
    }

    return new Response(JSON.stringify(responseData), { headers, status: 200 })
  } catch (error) {
    console.error('Unhandled error in token exchange function:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown error during token exchange',
        stack: error.stack
      }),
      { status: 500, headers }
    )
  }
}) 