import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[Async Sync] Starting async sync process...');
    
    // Environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET;
    const sharedSecret = process.env.YOUR_SHARED_SECRET;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseJwtSecret || !sharedSecret) {
      console.error('[Async Sync] Missing required environment variables');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Validate Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const token = authHeader.split(' ')[1];
    let decodedToken;
    try {
      decodedToken = jwt.verify(token, supabaseJwtSecret);
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const userId = decodedToken.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Invalid user session' });
    }

    const { ad_account_id } = req.body;
    if (!ad_account_id) {
      return res.status(400).json({ error: 'Ad account ID is required' });
    }

    // Generate a unique sync ID
    const syncId = `sync_${userId}_${Date.now()}`;
    
    console.log('[Async Sync] Created sync ID:', syncId);

    // Start the sync process in the background (don't await)
    startBackgroundSync(syncId, userId, ad_account_id, sharedSecret, supabaseUrl);

    // Return immediately with sync ID
    return res.status(200).json({
      syncId,
      status: 'started',
      message: 'Sync operation started. Use the sync ID to check progress.'
    });

  } catch (error) {
    console.error('[Async Sync] Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

// Background sync function (runs without blocking the response)
async function startBackgroundSync(syncId, userId, adAccountId, sharedSecret, supabaseUrl) {
  console.log('[Background Sync] Starting background sync for:', syncId);
  
  try {
    // Update sync status to "in_progress"
    await updateSyncStatus(syncId, 'in_progress', 'Initializing sync...', null);

    const edgeUrl = `${supabaseUrl}/functions/v1/sync-meta-data`;
    
    const response = await fetch(edgeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sharedSecret}`,
      },
      body: JSON.stringify({
        user_id: userId,
        ad_account_id: adAccountId
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('[Background Sync] Error from edge function:', errorData);
      await updateSyncStatus(syncId, 'failed', 'Sync failed', errorData);
      return;
    }

    const result = await response.json();
    console.log('[Background Sync] Sync completed successfully:', result);
    
    await updateSyncStatus(syncId, 'completed', 'Sync completed successfully', result);

  } catch (error) {
    console.error('[Background Sync] Error during sync:', error);
    await updateSyncStatus(syncId, 'failed', 'Sync failed due to error', { error: error.message });
  }
}

// Helper function to update sync status (in a real app, this would use a database)
// For now, we'll use a simple in-memory store
const syncStatuses = new Map();

async function updateSyncStatus(syncId, status, message, data) {
  syncStatuses.set(syncId, {
    status,
    message,
    data,
    timestamp: new Date().toISOString()
  });
  console.log('[Status Update]', syncId, status, message);
}

// Export the status checker for the status endpoint
export { syncStatuses }; 