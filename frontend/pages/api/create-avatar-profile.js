import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Validate token function
async function validateToken(token) {
  if (!token) return null;
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    return user;
  } catch (error) {
    console.error('Token validation error:', error);
    return null;
  }
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate authentication
    const token = req.headers.authorization?.replace('Bearer ', '');
    const user = await validateToken(token);
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { 
      company_profile_id, 
      avatar_name_or_title, 
      initial_user_description, 
      user_specific_customizations_and_notes 
    } = req.body;

    // Validate required fields
    if (!company_profile_id || !avatar_name_or_title) {
      return res.status(400).json({ 
        error: 'Missing required fields: company_profile_id and avatar_name_or_title' 
      });
    }

    // Insert the avatar profile into Supabase
    const { data, error } = await supabase
      .from('avatar_profiles')
      .insert({
        blayz_user_id: user.id,
        company_profile_id,
        avatar_name_or_title,
        initial_user_description: initial_user_description || null,
        user_specific_customizations_and_notes: user_specific_customizations_and_notes || null,
        // Skip llm_synthesized_persona and meta_ad_targeting_suggestions as requested
        llm_synthesized_persona: null,
        meta_ad_targeting_suggestions: null
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: 'Failed to create avatar profile' });
    }

    return res.status(201).json({ 
      message: 'Avatar profile created successfully', 
      data 
    });

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}