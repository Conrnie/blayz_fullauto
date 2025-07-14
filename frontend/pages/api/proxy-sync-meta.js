// New proxy for sync-meta-data
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'https://www.blayz.io');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const sharedSecret = process.env.YOUR_SHARED_SECRET;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_KEY;

    console.log('[Proxy] Environment check:', {
      supabaseUrl: supabaseUrl ? 'Set' : 'Missing',
      sharedSecret: sharedSecret ? 'Set' : 'Missing',
      serviceRoleKey: serviceRoleKey ? 'Set' : 'Missing'
    });

    if (!supabaseUrl) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL not configured');
    }

    if (!sharedSecret && !serviceRoleKey) {
      throw new Error('Neither YOUR_SHARED_SECRET nor SUPABASE_SERVICE_KEY configured');
    }

    // Validate user authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[Proxy] Missing or invalid authorization header');
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const token = authHeader.split(' ')[1];
    
    // Create Supabase client to validate user
    const supabase = createClient(supabaseUrl, serviceRoleKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    
    // Validate user token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.log('[Proxy] Invalid token or user not found:', userError?.message);
      return res.status(401).json({ error: 'Authentication failed' });
    }
    
    console.log('[Proxy] User authenticated:', user.id);

    const edgeUrl = `${supabaseUrl}/functions/v1/sync-meta-data`;
    const authToken = sharedSecret || serviceRoleKey;

    console.log('[Proxy] Calling edge function:', edgeUrl);
    console.log('[Proxy] Request body:', req.body);

    // Pass user info to the Edge Function
    const requestBody = {
      ...req.body,
      user_id: user.id // Ensure user_id is passed
    };

    const response = await fetch(edgeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shared-Secret': authToken,
      },
      body: JSON.stringify(requestBody),
    });

    console.log('[Proxy] Edge function response status:', response.status);
    
    const result = await response.json();
    console.log('[Proxy] Edge function response:', result);

    if (!response.ok) {
      console.error('[Proxy] Edge function error:', result);
      return res.status(response.status).json(result);
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error('[Proxy] Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
} 