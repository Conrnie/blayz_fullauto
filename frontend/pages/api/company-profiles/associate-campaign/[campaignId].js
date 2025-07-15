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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow PATCH requests
  if (req.method !== 'PATCH') {
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

    const { campaignId } = req.query;
    const { profile_id } = req.body;

    if (!campaignId) {
      return res.status(400).json({ error: 'Campaign ID is required' });
    }

    if (!profile_id) {
      return res.status(400).json({ error: 'Profile ID is required' });
    }

    console.log(`Associating profile ${profile_id} with campaign ${campaignId} for user ${userId}`);

    // First, verify the campaign belongs to the user
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id')
      .eq('id', campaignId)
      .eq('user_id', userId)
      .single();

    if (campaignError || !campaign) {
      console.error('Campaign not found or access denied:', campaignError);
      return res.status(404).json({ error: 'Campaign not found or access denied' });
    }

    // Verify the profile belongs to the user
    const { data: profile, error: profileError } = await supabase
      .from('company_profiles')
      .select('profile_id')
      .eq('profile_id', profile_id)
      .eq('blayz_user_id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Profile not found or access denied:', profileError);
      return res.status(404).json({ error: 'Profile not found or access denied' });
    }

    // Update the campaign with the profile association
    const { data: updatedCampaign, error: updateError } = await supabase
      .from('campaigns')
      .update({ 
        company_profile_id: profile_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', campaignId)
      .eq('user_id', userId)
      .select();

    if (updateError) {
      console.error('Error updating campaign:', updateError);
      return res.status(500).json({ error: 'Failed to associate profile with campaign' });
    }

    console.log(`Successfully associated profile ${profile_id} with campaign ${campaignId}`);

    return res.status(200).json({
      success: true,
      message: 'Profile successfully associated with campaign',
      data: updatedCampaign[0]
    });

  } catch (error) {
    console.error('Error in associate-campaign endpoint:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
} 