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

  try {
    if (req.method === 'GET') {
      const { company_profile_id } = req.query;

      if (!company_profile_id) {
        return res.status(400).json({ error: 'company_profile_id is required' });
      }

      // Fetch avatar profiles for the company
      const { data: avatarProfiles, error } = await supabase
        .from('avatar_profiles')
        .select('*')
        .eq('company_profile_id', company_profile_id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching avatar profiles:', error);
        return res.status(500).json({ error: 'Failed to fetch avatar profiles' });
      }

      return res.status(200).json(avatarProfiles || []);
    }

    // Handle other HTTP methods if needed
    res.setHeader('Allow', ['GET', 'OPTIONS']);
    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}