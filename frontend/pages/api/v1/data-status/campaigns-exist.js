import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function validateToken(token) {
  try {
    const decoded = jwt.verify(token, supabaseJwtSecret);
    return decoded;
  } catch (error) {
    console.error('JWT validation error:', error);
    throw new Error('Invalid token');
  }
}

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

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract user info from JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.split(' ')[1];
    const user = validateToken(token);
    const userId = user.sub || user.id;

    if (!userId) {
      return res.status(401).json({ error: 'Invalid user session' });
    }

    console.log(`Checking campaign data for user: ${userId}`);

    try {
      // Check if campaigns exist for this user
      const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      if (error) {
        console.error('Database query error:', error);
        return res.status(500).json({ error: 'Database query failed' });
      }

      const hasCampaigns = campaigns && campaigns.length > 0;
      
      console.log(`User ${userId} has campaigns: ${hasCampaigns}`);

      return res.status(200).json({
        success: true,
        campaigns_exist: hasCampaigns,
        has_campaigns: hasCampaigns,
        campaign_count: campaigns?.length || 0,
        message: hasCampaigns ? 'Campaigns found' : 'No campaigns found'
      });

    } catch (dbError) {
      console.error('Database error:', dbError);
      return res.status(500).json({ error: 'Database operation failed' });
    }

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 