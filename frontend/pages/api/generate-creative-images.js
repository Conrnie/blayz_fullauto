import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user_instructions, company_profile_id, user_id } = req.body;

    // Validate required fields
    if (!user_instructions || !company_profile_id || !user_id) {
      return res.status(400).json({ 
        error: 'Missing required fields: user_instructions, company_profile_id, user_id' 
      });
    }

    // For now, return a mock response since we don't have the actual image generation logic
    // This prevents the JSON parsing error and 404
    const mockResponse = {
      success: true,
      message: 'Image generation request received',
      data: {
        user_instructions,
        company_profile_id,
        user_id,
        status: 'processing',
        images: [
          {
            id: 1,
            url: '/images/placeholder-1.jpg',
            prompt: user_instructions,
            status: 'generated'
          },
          {
            id: 2,
            url: '/images/placeholder-2.jpg', 
            prompt: user_instructions,
            status: 'generated'
          }
        ]
      }
    };

    return res.status(200).json(mockResponse);

  } catch (error) {
    console.error('Error in generate-creative-images:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}