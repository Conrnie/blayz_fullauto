export const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get("APP_ORIGIN") || "https://www.blayz.io",
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-shared-secret',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

export function getCorsHeaders(origin: string | null) {
  let allowOrigin = '*'; // Default for null or non-matching origins

  const allowedOrigins = [
    Deno.env.get("APP_ORIGIN") || "https://www.blayz.io",
    // Add more allowed origins here if needed, e.g. 'http://localhost:3000'
  ];

  if (origin && allowedOrigins.some(allowed => origin === allowed)) {
    allowOrigin = origin;
  }

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-shared-secret',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };
}

export function getTestMessage() {
  return "Shared module loaded successfully!";
} 