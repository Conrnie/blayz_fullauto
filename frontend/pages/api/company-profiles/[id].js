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

    const { id: profileId } = req.query;

    // Handle GET request - get specific company profile
    if (req.method === 'GET') {
      try {
        const { data: profile, error } = await supabase
          .from('company_profiles')
          .select('*')
          .eq('profile_id', profileId)
          .eq('blayz_user_id', userId)
          .single();

        if (error) {
          console.error('Database query error:', error);
          return res.status(404).json({ error: 'Profile not found' });
        }

        // Transform the data for the response
        const generalSummary = profile.general_summary || {};
        const errorMessage = typeof generalSummary === 'object' ? generalSummary.error : null;
        
        const profileData = {
          id: profile.profile_id,
          profile_id: profile.profile_id,
          company_name: profile.company_name,
          website_url: profile.website_url,
          created_at: profile.created_at,
          last_updated_at: profile.last_updated_at,
          status: profile.status || 'unknown',
          display_summary: profile.display_summary || {},
          full_profile: profile.llm_synthesized_profile || {},
          error_message: errorMessage
        };

        return res.status(200).json({
          success: true,
          profile: profileData,
          message: "Company profile retrieved successfully"
        });

      } catch (dbError) {
        console.error('Database error:', dbError);
        return res.status(500).json({ error: 'Failed to fetch company profile' });
      }
    }

    // Handle DELETE request - delete company profile
    if (req.method === 'DELETE') {
      try {
        // Verify the profile exists and belongs to the user
        const { data: profileCheck, error: checkError } = await supabase
          .from('company_profiles')
          .select('profile_id, company_name')
          .eq('profile_id', profileId)
          .eq('blayz_user_id', userId)
          .single();

        if (checkError || !profileCheck) {
          return res.status(404).json({ error: 'Profile not found or access denied' });
        }

        const profileName = profileCheck.company_name;

        // Delete the profile
        const { error: deleteError } = await supabase
          .from('company_profiles')
          .delete()
          .eq('profile_id', profileId)
          .eq('blayz_user_id', userId);

        if (deleteError) {
          console.error('Database delete error:', deleteError);
          return res.status(500).json({ error: 'Failed to delete profile' });
        }

        console.log(`Successfully deleted company profile ${profileId} (${profileName}) for user ${userId}`);
        
        return res.status(200).json({
          success: true,
          message: `Company profile '${profileName}' deleted successfully`
        });

      } catch (dbError) {
        console.error('Database error:', dbError);
        return res.status(500).json({ error: 'Failed to delete company profile' });
      }
    }

    // Method not allowed
    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 