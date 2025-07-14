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

    // Handle GET request - list company profiles
    if (req.method === 'GET') {
      console.log(`Fetching company profiles for user: ${userId}`);
      
      try {
        const { data: profiles, error } = await supabase
          .from('company_profiles')
          .select('*')
          .eq('blayz_user_id', userId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Database query error:', error);
          return res.status(500).json({ error: 'Database query failed' });
        }

        console.log(`Found ${profiles?.length || 0} profiles for user ${userId}`);
        
        // Transform the data for the response
        const transformedProfiles = profiles?.map(profile => {
          const generalSummary = profile.general_summary || {};
          const errorMessage = typeof generalSummary === 'object' ? generalSummary.error : null;
          
          // Create display_summary from llm_synthesized_profile if not present
          let displaySummary = profile.display_summary || {};
          if (!displaySummary && profile.llm_synthesized_profile) {
            const llmProfile = profile.llm_synthesized_profile;
            displaySummary = {
              summary: llmProfile.summary || '',
              displayed_summary: llmProfile.displayed_summary || '',
              company_name: llmProfile.business_name || llmProfile.name || '',
              industry: llmProfile.industry || '',
              primary_offering: llmProfile.primary_offering || ''
            };
          }
          
          return {
            profile_id: profile.profile_id,
            company_name: profile.company_name,
            website_url: profile.website_url,
            created_at: profile.created_at,
            last_updated_at: profile.last_updated_at,
            status: profile.status || 'unknown',
            display_summary: displaySummary,
            full_profile: profile.llm_synthesized_profile || {},
            error_message: errorMessage
          };
        }) || [];

        return res.status(200).json({
          success: true,
          profiles: transformedProfiles,
          message: `Successfully fetched ${transformedProfiles.length} company profiles`
        });

      } catch (dbError) {
        console.error('Database error:', dbError);
        return res.status(500).json({ error: 'Database operation failed' });
      }
    }

    // Handle POST request - create company profile
    if (req.method === 'POST') {
      const { company_name, website_url, user_context } = req.body;
      
      if (!company_name || !website_url) {
        return res.status(400).json({ error: 'Company name and website URL are required' });
      }

      // Validate and format the URL
      let formattedUrl = website_url.trim().toLowerCase();
      if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
        if (!formattedUrl.startsWith('www.')) {
          return res.status(422).json({ error: "Please include 'www.' in your domain (e.g., 'www.example.com')" });
        }
        formattedUrl = `https://${formattedUrl}`;
      }

      // Generate a unique profile ID
      const profileId = crypto.randomUUID();
      
      try {
        // Create initial database record
        const { data: profileData, error } = await supabase
          .from('company_profiles')
          .insert({
            profile_id: profileId,
            blayz_user_id: userId,
            company_name,
            website_url: formattedUrl,
            status: 'pending',
            created_at: new Date().toISOString(),
            last_updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) {
          console.error('Database insert error:', error);
          return res.status(500).json({ error: 'Failed to create profile record' });
        }

        console.log(`Created profile record with ID: ${profileId}`);
        
        // Update status to processing
        await supabase
          .from('company_profiles')
          .update({
            status: 'processing',
            last_updated_at: new Date().toISOString()
          })
          .eq('profile_id', profileId);

        // Trigger n8n webhook asynchronously
        const n8nWebhookUrl = process.env.WEBHOOK_N8N_URL;
        if (n8nWebhookUrl) {
          fetch(n8nWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              profile_id: profileId,
              company_name,
              website_url: formattedUrl,
              user_id: userId
            })
          }).catch(error => {
            console.error('Failed to trigger n8n webhook:', error);
          });
        } else {
          console.warn('WEBHOOK_N8N_URL not configured - skipping webhook trigger');
        }

        return res.status(200).json({
          success: true,
          message: "Company profile creation started. You'll be notified when it's ready!",
          profile_id: profileId,
          status: "processing"
        });

      } catch (dbError) {
        console.error('Database error:', dbError);
        return res.status(500).json({ error: 'Failed to create company profile' });
      }
    }

    // Method not allowed
    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 