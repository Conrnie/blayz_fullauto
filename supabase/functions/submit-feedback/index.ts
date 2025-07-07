/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
// Resend API endpoint
const RESEND_API_URL = 'https://api.resend.com/emails';
// Helper function to get user ID from Authorization header
// async function getUserId(supabaseClient: SupabaseClient, authHeader: string | null): Promise<string | null> {
//   if (!authHeader) {
//     return null;
//   }
//   const token = authHeader.replace('Bearer ', '');
//   const { data: { user }, error } = await supabaseClient.auth.getUser(token);
//   if (error) {
//     console.warn("Failed to get user from token:", error.message);
//     return null; // Invalid token or other auth error
//   }
//   return user?.id ?? null;
// }
// --- Edge Function ---
Deno.serve(async (req: Request)=>{
  // --- SHARED SECRET CHECK ---
  const sharedSecretFromEnv = Deno.env.get("YOUR_SHARED_SECRET");
  const incomingAuthHeader = req.headers.get("Authorization");

  // DEBUGGING LOGS:
  console.log("DEBUG: Shared secret from env:", sharedSecretFromEnv);
  console.log("DEBUG: Incoming Authorization header:", incomingAuthHeader);
  console.log("DEBUG: Expected Authorization header:", `Bearer ${sharedSecretFromEnv}`);

  if (!incomingAuthHeader || incomingAuthHeader !== `Bearer ${sharedSecretFromEnv}`) {
    if (!sharedSecretFromEnv) {
      console.error("YOUR_SHARED_SECRET is not set in environment variables.");
      return new Response(JSON.stringify({ error: "Internal server configuration error." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // More specific logging for failure
    console.warn("Authorization failed. Details:");
    console.warn(` - Expected: Bearer ${sharedSecretFromEnv}`);
    console.warn(` - Received: ${incomingAuthHeader}`);
    return new Response(JSON.stringify({ error: "Unauthorized. Invalid or missing shared secret." }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  // --- END SHARED SECRET CHECK ---

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  let supabaseAdminClient: SupabaseClient;
  try {
    // Initialize Supabase client with service_role key from environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
    }
    supabaseAdminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        // Required for admin client server-side operations
        autoRefreshToken: false,
        persistSession: false
      }
    });
    // --- 1. Parse Request & Get User ---
    const { type, description, email, userId } = await req.json();
    // const authHeader = req.headers.get('Authorization'); // Already handled by shared secret check and logged
    // const userId = await getUserId(supabaseAdminClient, authHeader); // REMOVED - userId now from body
    // --- 2. Validate Input ---
    if (!type || !description) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: type and description.'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    if (type !== 'bug' && type !== 'feature') {
      return new Response(JSON.stringify({
        error: 'Invalid feedback type. Must be "bug" or "feature".'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Optional: More robust email validation if needed
    if (email && typeof email !== 'string') {
      return new Response(JSON.stringify({
        error: 'Invalid email format.'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const contactEmail = email?.trim() || null; // Use null if email is empty or just whitespace
    // --- 3. Insert Feedback into Supabase ---
    console.log(`Inserting feedback: user=${userId || 'anonymous'}, type=${type}, email=${contactEmail}`);
    const { data: feedbackData, error: insertError } = await supabaseAdminClient.from('feedback').insert({
      user_id: userId, // userId from request body
      type: type,
      description: description,
      email: contactEmail,
      status: 'new'
    }).select() // Select the inserted row to return it in the response
    .single(); // Expect exactly one row
    if (insertError) {
      console.error('Supabase insert error:', insertError);
      return new Response(JSON.stringify({
        error: 'Database error: Failed to save feedback.',
        details: insertError.message
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    console.log('Feedback successfully saved:', feedbackData);
    // --- 4. Send Confirmation Email via Resend ---
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (contactEmail && resendApiKey) {
      // ***** UPDATED SENDER EMAIL *****
      // Use an email address from your verified Resend subdomain
      const senderEmail = 'Feedback System <info@transactional.blayz.online>';
      // ***** ADDED REPLY-TO ADDRESS *****
      // This directs replies to your main Zoho inbox
      const replyToEmail = 'info@blayz.online';
      try {
        const emailPayload = {
          from: senderEmail,
          to: [
            contactEmail
          ],
          reply_to: replyToEmail,
          subject: `We've received your ${type === 'bug' ? 'bug report' : 'feature request'}!`,
          html: `
            <p>Hi there,</p>
            <p>Thanks for reaching out! We've successfully received your feedback:</p>
            <hr>
            <p><strong>Type:</strong> ${type === 'bug' ? 'Bug Report' : 'Feature Request'}</p>
            <p><strong>Description:</strong></p>
            <pre style="background-color: #f4f4f4; padding: 10px; border-radius: 4px;">${description}</pre>
            <hr>
            <p>Our team will review it shortly. We appreciate you helping us improve!</p>
            <p>If you reply to this email, your message will be sent to our main support inbox.</p>
            <p>Best,</p>
            <p>The Blayz Team</p>
          `
        };
        console.log(`Sending confirmation email to ${contactEmail} via Resend from ${senderEmail} with reply-to ${replyToEmail}...`);
        const resendResponse = await fetch(RESEND_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(emailPayload)
        });
        if (!resendResponse.ok) {
          // Log error but don't fail the entire function if email sending fails
          const errorBody = await resendResponse.text();
          console.error(`Resend API Error (${resendResponse.status}): ${errorBody}`);
        } else {
          console.log('Confirmation email sent successfully.');
        }
      } catch (emailError) {
        // Log error but don't fail the entire function
        console.error('Failed to send confirmation email:', emailError);
      }
    } else if (contactEmail && !resendApiKey) {
      // Log if email was provided but key is missing
      console.warn('Feedback included an email, but RESEND_API_KEY is not configured. Skipping confirmation email.');
    }
    // --- 5. Return Success Response ---
    return new Response(JSON.stringify({
      message: 'Feedback submitted successfully!',
      data: feedbackData
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    // Catch any unexpected errors (parsing, client init, etc.)
    console.error('Unhandled error in submit-feedback function:', error);
    return new Response(JSON.stringify({
      error: 'An unexpected server error occurred.',
      details: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
}); 