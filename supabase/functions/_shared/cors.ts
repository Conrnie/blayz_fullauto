export const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get("APP_ORIGIN") || "https://www.blayz.io",
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-shared-secret',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

export function getTestMessage() {
  return "Shared module loaded successfully!";
} 