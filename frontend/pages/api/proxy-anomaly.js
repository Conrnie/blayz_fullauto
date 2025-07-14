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

    if (!supabaseUrl) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL not configured');
    }

    if (!sharedSecret && !serviceRoleKey) {
      throw new Error('Neither YOUR_SHARED_SECRET nor SUPABASE_SERVICE_KEY configured');
    }

    const edgeUrl = `${supabaseUrl}/functions/v1/get-anomaly-analysis`;
    const authToken = sharedSecret || serviceRoleKey;

    console.log('[Proxy-Anomaly] Calling edge function:', edgeUrl);

    const response = await fetch(edgeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shared-Secret': authToken,
      },
      body: JSON.stringify(req.body),
    });

    console.log('[Proxy-Anomaly] Edge function response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Proxy-Anomaly] Edge function error:', errorText);
      try {
        const errorData = JSON.parse(errorText);
        return res.status(response.status).json(errorData);
      } catch (parseError) {
        return res.status(response.status).json({ error: 'Edge function error', details: errorText });
      }
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error('[Proxy-Anomaly] Error:', error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
} 