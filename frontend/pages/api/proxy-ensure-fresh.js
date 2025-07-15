// New proxy for ensure-data-is-fresh
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

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
    const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET;

    console.log('[Proxy] Environment check:', {
      supabaseUrl: supabaseUrl ? 'Set' : 'Missing',
      sharedSecret: sharedSecret ? 'Set' : 'Missing',
      serviceRoleKey: serviceRoleKey ? 'Set' : 'Missing',
      supabaseJwtSecret: supabaseJwtSecret ? 'Set' : 'Missing',
    });

    if (!supabaseUrl) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL not configured');
    }

    if (!sharedSecret && !serviceRoleKey) {
      throw new Error('Neither YOUR_SHARED_SECRET nor SUPABASE_SERVICE_KEY configured');
    }

    if (!supabaseJwtSecret) {
      throw new Error('SUPABASE_JWT_SECRET not configured');
    }

    // Validate user authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[Proxy] Missing or invalid authorization header');
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const token = authHeader.split(' ')[1];
    
    // Validate JWT using jsonwebtoken
    let decodedToken;
    try {
      decodedToken = jwt.verify(token, supabaseJwtSecret);
    } catch (error) {
      console.log('[Proxy] JWT validation error:', error.message);
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    const userId = decodedToken.sub;
    if (!userId) {
      console.log('[Proxy] No user ID in token');
      return res.status(401).json({ error: 'Invalid user session' });
    }
    
    console.log('[Proxy] User authenticated:', userId);

    const edgeUrl = `${supabaseUrl}/functions/v1/ensure-data-is-fresh`;
    const authToken = sharedSecret || serviceRoleKey;

    console.log('[Proxy] Calling edge function:', edgeUrl);
    console.log('[Proxy] Request body:', req.body);

    // Pass user info to the Edge Function
    const requestBody = {
      ...req.body,
      user_id: userId // Ensure user_id is passed
    };

    const response = await fetch(edgeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(requestBody),
    });

    console.log('[Proxy] Edge function response status:', response.status);
    
    let result;
    try {
      result = await response.json();
      console.log('[Proxy] Edge function response:', result);
    } catch (jsonError) {
      console.error('[Proxy] Failed to parse JSON response:', jsonError.message);
      if (response.ok) {
        return res.status(200).json({ success: true, message: 'Operation completed successfully' });
      } else {
        return res.status(response.status).json({ error: 'Invalid response format from Edge Function' });
      }
    }

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