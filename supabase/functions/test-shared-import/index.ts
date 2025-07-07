// supabase/functions/test-shared-import/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders, getTestMessage } from '../_shared/cors.ts';

console.log("Test function loading...");
console.log("Attempting to log message from shared module:", getTestMessage());
console.log("CORS Headers from shared module:", corsHeaders['Access-Control-Allow-Origin']);

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const responseData = {
      message: "Hello from test-shared-import!",
      sharedMessage: getTestMessage(),
      configuredOrigin: corsHeaders['Access-Control-Allow-Origin']
    };

    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}); 