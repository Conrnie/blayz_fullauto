export default async function handler(req, res) {
	if (req.method !== 'POST') {
		res.setHeader('Allow', ['POST']);
		return res.status(405).json({ success: false, error: 'Method Not Allowed' });
	}

	try {
		const webhookUrl = process.env.N8N_LANDING_CHECKER_WEBHOOK;
		if (!webhookUrl) {
			return res.status(500).json({ success: false, error: 'N8N_LANDING_CHECKER_WEBHOOK is not set' });
		}
		const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};

		// Enrich payload with server-side context where possible
		const payload = {
			...body,
			ip: (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').toString(),
			server_timestamp: new Date().toISOString(),
			server: 'next-api-proxy'
		};

		const resp = await fetch(webhookUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});

		if (!resp.ok) {
			const text = await resp.text().catch(() => '');
			return res.status(502).json({ success: false, error: 'Upstream error', status: resp.status, body: text });
		}

		return res.status(200).json({ success: true });
	} catch (error) {
		return res.status(500).json({ success: false, error: error?.message || 'Internal error' });
	}
}



