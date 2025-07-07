import { generateAndInsertDemoData } from '../../lib/demo-data-generator.js';

export default async function handler(req, res) {
  console.log('[GENERATE_DEMO_API] Received generate demo data request');
  console.log('[GENERATE_DEMO_API] Request method:', req.method);
  
  // Log request headers to help with debugging URL issues
  console.log('[GENERATE_DEMO_API] Request headers:', {
    host: req.headers.host,
    'x-forwarded-host': req.headers['x-forwarded-host'],
    'x-forwarded-proto': req.headers['x-forwarded-proto'],
    origin: req.headers.origin,
    referer: req.headers.referer
  });
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    console.log('[GENERATE_DEMO_API] Invalid method:', req.method);
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // Set API base URL for server-side requests
  // This is crucial since relative URLs in fetch() won't work on the server
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
  const apiBaseUrl = `${protocol}://${host}`;
  
  console.log('[GENERATE_DEMO_API] Setting API base URL:', apiBaseUrl);
  
  // Make API base URL available to other modules for this request
  process.env.API_BASE_URL = apiBaseUrl;
  
  try {
    // Extract options from request
    const options = req.body;
    console.log('[GENERATE_DEMO_API] Generating demo data with options:', options);
    
    // Generate and insert demo data
    const result = await generateAndInsertDemoData(options);
    
    console.log('[GENERATE_DEMO_API] Demo data generation result:', result);
    
    if (result.success) {
      return res.status(200).json(result);
    } else {
      console.error('[GENERATE_DEMO_API] Demo data generation failed:', result.error);
      return res.status(500).json(result);
    }
  } catch (error) {
    console.error('[GENERATE_DEMO_API] Unhandled exception:', error);
    console.error('[GENERATE_DEMO_API] Error stack:', error.stack);
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Unknown error occurred',
      errorType: error.name || 'Unknown'
    });
  }
} 