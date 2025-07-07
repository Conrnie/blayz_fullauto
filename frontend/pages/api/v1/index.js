export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return res.status(200).json({
    version: '1.0.0',
    status: 'active',
    endpoints: [
      '/api/v1/data-status/campaigns-exist'
    ]
  });
} 