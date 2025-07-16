import { syncStatuses } from './sync-meta-async.js';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { syncId } = req.query;
    
    if (!syncId) {
      return res.status(400).json({ error: 'Sync ID is required' });
    }

    const syncStatus = syncStatuses.get(syncId);
    
    if (!syncStatus) {
      return res.status(404).json({ 
        error: 'Sync operation not found',
        details: 'The sync operation may have expired or never existed'
      });
    }

    console.log('[Status Check] Returning status for:', syncId, syncStatus.status);
    
    return res.status(200).json({
      syncId,
      status: syncStatus.status,
      message: syncStatus.message,
      data: syncStatus.data,
      timestamp: syncStatus.timestamp
    });

  } catch (error) {
    console.error('[Status Check] Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
} 