export default function handler(req, res) {
  res.status(200).json({ 
    message: 'API is working correctly', 
    method: req.method,
    timestamp: new Date().toISOString()
  });
} 