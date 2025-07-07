// Follow this setup guide to integrate the Deno runtime with your Supabase project:
// https://supabase.com/docs/guides/functions/quickstart

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers for browser requests
// Note: It might be better to use the shared cors.ts here if Blayz origin is desired.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Or Deno.env.get("APP_ORIGIN") || "https://blayz.io"
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' // Should be OPTIONS, GET for this function if it only fetches data
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204
    })
  }

  try {
    // Get Auth token from the Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Create a Supabase client with the user's auth token
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
    const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader }
      }
    })

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Failed to authenticate user', details: userError?.message }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Convert UUID to string if needed, but user.id is already a string.
    const userIdString = user.id

    // First check if user has a Meta connection
    const { data: connection, error: connectionError } = await supabase
      .from('meta_connections')
      .select('long_lived_token, token_expires_at')
      .eq('user_id', user.id) // This table uses UUID directly (user.id is string but Supabase handles it)
      .maybeSingle()

    if (connectionError) {
      return new Response(JSON.stringify({ error: 'Failed to retrieve Meta connection', details: connectionError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!connection) {
      return new Response(JSON.stringify({ connected: false, message: 'No Meta account connected', accounts: [] }), {
        status: 200, // Or 404 if preferred for 'not found'
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check if token is expired
    if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
      return new Response(JSON.stringify({ connected: false, message: 'Meta token expired, please reconnect your account', accounts: [] }), {
        status: 200, // Or a specific error code for expired token if frontend handles it
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Retrieve ad accounts from the database
    const { data: adAccounts, error: adAccountsError } = await supabase
      .from('ad_accounts')
      .select('*')
      .eq('user_id', userIdString) // Assuming ad_accounts.user_id is text/varchar that matches auth.users.id
      .order('name')

    if (adAccountsError) {
      return new Response(JSON.stringify({ error: 'Failed to retrieve ad accounts', details: adAccountsError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Format accounts for the frontend
    const accounts = (adAccounts || []).map(account => ({
      id: account.id,
      name: account.name,
      account_id: account.account_id.startsWith('act_') ? account.account_id : `act_${account.account_id}`, // Auto-add "act_" prefix if missing
      status: account.status,
      currency: account.currency,
      balance: account.balance,
      amount_spent: account.amount_spent,
      spend_cap: account.spend_cap,
      connected_at: account.connected_at,
      source: account.source || 'META' // Default source to META if not specified
    }))

    // Return the accounts
    return new Response(JSON.stringify({ connected: true, message: 'Successfully retrieved ad accounts', accounts }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Unexpected error in get-meta-ad-accounts:', error)
    return new Response(JSON.stringify({ error: 'An unexpected error occurred', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}) 