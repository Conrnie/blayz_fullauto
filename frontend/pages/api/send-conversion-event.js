import crypto from 'crypto';

function hashData(data) {
  if (!data) return null;
  return crypto.createHash('sha256').update(data.toLowerCase().trim()).digest('hex');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_TOKEN;

  if (!pixelId || !accessToken) {
    return res.status(500).json({ error: 'CAPI not configured' });
  }

  const { eventName, email } = req.body;
  console.log(`Sending CAPI event: ${eventName}`); // NEW: Debug log

  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.connection.remoteAddress;
  const ua = req.headers['user-agent'];
  const eventTime = Math.floor(Date.now() / 1000);

  const payload = {
    data: [{
      event_name: eventName,
      event_time: eventTime,
      action_source: 'website',
      user_data: {
        client_ip_address: ip,
        client_user_agent: ua,
      }
    }]
  };

  // Add hashed email if provided (for better event matching)
  if (email) {
    payload.data[0].user_data.em = hashData(email);
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v20.0/${pixelId}/events?access_token=${accessToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (result.events_received) {
      return res.status(200).json({ success: true });
    } else {
      return res.status(500).json({ error: 'Failed to send event', details: result });
    }
  } catch (err) {
    console.error('CAPI error:', err);
    return res.status(500).json({ error: err.message });
  }
} 