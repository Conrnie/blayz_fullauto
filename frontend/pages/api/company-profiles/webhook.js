import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      profile_id, 
      status, 
      llm_synthesized_profile, 
      display_summary, 
      general_summary,
      error_message 
    } = req.body;

    if (!profile_id) {
      return res.status(400).json({ error: 'profile_id is required' });
    }

    if (!status) {
      return res.status(400).json({ error: 'status is required' });
    }

    console.log(`[Webhook] Received profile update for ${profile_id}: status=${status}`);

    // Update the profile in Supabase
    const updateData = {
      status,
      last_updated_at: new Date().toISOString()
    };

    // Add optional fields if provided
    if (llm_synthesized_profile) {
      updateData.llm_synthesized_profile = llm_synthesized_profile;
    }
    
    if (display_summary) {
      updateData.display_summary = display_summary;
    }
    
    if (general_summary) {
      updateData.general_summary = general_summary;
    }
    
    if (error_message) {
      updateData.general_summary = { error: error_message };
    }

    const { data, error } = await supabase
      .from('company_profiles')
      .update(updateData)
      .eq('profile_id', profile_id)
      .select()
      .single();

    if (error) {
      console.error('[Webhook] Database update error:', error);
      return res.status(500).json({ error: 'Failed to update profile' });
    }

    console.log(`[Webhook] Successfully updated profile ${profile_id} to status: ${status}`);

    return res.status(200).json({ 
      success: true, 
      message: 'Profile updated successfully',
      updated_profile: data
    });

  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 