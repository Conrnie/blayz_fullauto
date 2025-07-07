// Test endpoint for Requesty API with Gemini 2.5
import { NextResponse } from 'next/server';

// --- API Configurations ---
// Requesty API Config (Primary)
const REQUESTY_API_KEY = process.env.REQUESTY_API_KEY;
const REQUESTY_BASE_URL = process.env.REQUESTY_BASE_URL || 'https://router.requesty.ai/v1';
const REQUESTY_MODEL_GEMINI_2_5 = process.env.REQUESTY_MODEL || 'google/gemini-2.5-pro-exp-03-25';
const REQUESTY_MODEL_GEMINI_2_0 = 'google/gemini-2.0-flash-exp';

// OpenRouter API Config (Fallback 1)
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const OPENROUTER_MODEL = 'google/gemini-1.5-pro-latest';

// Direct Gemini API Config (Fallback 2)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1/models';
const GEMINI_MODEL = 'gemini-1.5-pro-latest';

// Retry Settings
const MAX_RETRIES_REQUESTY = 4;
const MAX_RETRIES_OPENROUTER = 3;
const MAX_RETRIES_GEMINI_DIRECT = 2;
// --- End API Configurations ---

// Utility function to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- AI Service Functions ---

// Primary API: Requesty with Gemini 2.5
async function callRequestyAPI(prompt, retryCount = 0) {
  console.log(`[TEST_GEMINI_API] Calling Requesty API with Gemini 2.5 Pro (attempt ${retryCount + 1}/${MAX_RETRIES_REQUESTY})`);
  
  try {
    const response = await fetch(`${REQUESTY_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${REQUESTY_API_KEY}`
      },
      body: JSON.stringify({
        model: REQUESTY_MODEL_GEMINI_2_5,
        messages: [
          { role: "user", content: prompt }
        ]
      })
    });
    
    if (!response.ok) {
      const responseText = await response.text();
      console.error(`[TEST_GEMINI_API] Requesty API error: ${response.status} - ${responseText}`);
      
      // Check for rate limits or server errors that might be temporary
      if (
        response.status === 429 || // Rate limit
        response.status === 500 || // Internal server error
        response.status === 502 || // Bad gateway 
        response.status === 503 || // Service unavailable
        response.status === 504    // Gateway timeout
      ) {
        if (retryCount < MAX_RETRIES_REQUESTY - 1) {
          const backoffTime = Math.pow(2, retryCount) * 1000; // Exponential backoff
          console.log(`[TEST_GEMINI_API] Retrying Requesty in ${backoffTime}ms...`);
          await wait(backoffTime);
          return callRequestyAPI(prompt, retryCount + 1);
        }
      }
      
      throw new Error(`Requesty API error: ${response.status} - ${responseText}`);
    }
    
    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '';
    
    if (!content) {
      throw new Error('Empty response from Requesty API');
    }
    
    return {
      content,
      source: 'requesty',
      model: REQUESTY_MODEL_GEMINI_2_5
    };
  } catch (error) {
    if (retryCount < MAX_RETRIES_REQUESTY - 1) {
      const backoffTime = Math.pow(2, retryCount) * 1000;
      console.log(`[TEST_GEMINI_API] Requesty API error: ${error.message}. Retrying in ${backoffTime}ms...`);
      await wait(backoffTime);
      return callRequestyAPI(prompt, retryCount + 1);
    }
    throw error; // Re-throw if all retries failed
  }
}

// Fallback 1: OpenRouter with Gemini
async function callOpenRouterAPI(prompt, retryCount = 0) {
  console.log(`[TEST_GEMINI_API] Fallback 1: Calling OpenRouter API with Gemini model (attempt ${retryCount + 1}/${MAX_RETRIES_OPENROUTER})`);
  
  try {
    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://blayz.app', // Using app domain as referer
        'X-Title': 'Blayz Test'
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: "user", content: prompt }
        ]
      })
    });
    
    if (!response.ok) {
      const responseText = await response.text();
      console.error(`[TEST_GEMINI_API] OpenRouter API error: ${response.status} - ${responseText}`);
      
      if (response.status === 429 || (response.status >= 500 && response.status < 600)) {
        if (retryCount < MAX_RETRIES_OPENROUTER - 1) {
          const backoffTime = Math.pow(2, retryCount) * 1500; // Longer backoff for OpenRouter
          console.log(`[TEST_GEMINI_API] Retrying OpenRouter in ${backoffTime}ms...`);
          await wait(backoffTime);
          return callOpenRouterAPI(prompt, retryCount + 1);
        }
      }
      
      throw new Error(`OpenRouter API error: ${response.status} - ${responseText}`);
    }
    
    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '';
    
    if (!content) {
      throw new Error('Empty response from OpenRouter API');
    }
    
    return {
      content,
      source: 'openrouter',
      model: OPENROUTER_MODEL
    };
  } catch (error) {
    if (retryCount < MAX_RETRIES_OPENROUTER - 1) {
      const backoffTime = Math.pow(2, retryCount) * 1500;
      console.log(`[TEST_GEMINI_API] OpenRouter API error: ${error.message}. Retrying in ${backoffTime}ms...`);
      await wait(backoffTime);
      return callOpenRouterAPI(prompt, retryCount + 1);
    }
    throw error; // Re-throw if all retries failed
  }
}

// Fallback 2: Direct Gemini API
async function callDirectGeminiAPI(prompt, retryCount = 0) {
  console.log(`[TEST_GEMINI_API] Fallback 2: Calling Direct Gemini API (attempt ${retryCount + 1}/${MAX_RETRIES_GEMINI_DIRECT})`);
  
  try {
    const response = await fetch(`${GEMINI_BASE_URL}/${GEMINI_MODEL}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_ONLY_HIGH"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_ONLY_HIGH"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_ONLY_HIGH"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_ONLY_HIGH"
          }
        ]
      })
    });
    
    if (!response.ok) {
      const responseText = await response.text();
      console.error(`[TEST_GEMINI_API] Direct Gemini API error: ${response.status} - ${responseText}`);
      
      if (response.status === 429 || (response.status >= 500 && response.status < 600)) {
        if (retryCount < MAX_RETRIES_GEMINI_DIRECT - 1) {
          const backoffTime = Math.pow(2, retryCount) * 2000; // Even longer backoff for direct Gemini
          console.log(`[TEST_GEMINI_API] Retrying Direct Gemini in ${backoffTime}ms...`);
          await wait(backoffTime);
          return callDirectGeminiAPI(prompt, retryCount + 1);
        }
      }
      
      throw new Error(`Direct Gemini API error: ${response.status} - ${responseText}`);
    }
    
    const result = await response.json();
    
    // Extract content from Gemini API response format
    const content = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    if (!content) {
      throw new Error('Empty response from Direct Gemini API');
    }
    
    return {
      content,
      source: 'direct_gemini',
      model: GEMINI_MODEL
    };
  } catch (error) {
    if (retryCount < MAX_RETRIES_GEMINI_DIRECT - 1) {
      const backoffTime = Math.pow(2, retryCount) * 2000;
      console.log(`[TEST_GEMINI_API] Direct Gemini API error: ${error.message}. Retrying in ${backoffTime}ms...`);
      await wait(backoffTime);
      return callDirectGeminiAPI(prompt, retryCount + 1);
    }
    throw error; // Re-throw if all retries failed
  }
}

// Fallback 3: Requesty with Gemini 2.0 (last resort)
async function callRequestyWithGemini2(prompt) {
  console.log(`[TEST_GEMINI_API] Last resort fallback: Calling Requesty API with Gemini 2.0`);
  
  try {
    const response = await fetch(`${REQUESTY_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${REQUESTY_API_KEY}`
      },
      body: JSON.stringify({
        model: REQUESTY_MODEL_GEMINI_2_0,
        messages: [
          { role: "user", content: prompt }
        ]
      })
    });
    
    if (!response.ok) {
      const responseText = await response.text();
      console.error(`[TEST_GEMINI_API] Requesty with Gemini 2.0 error: ${response.status} - ${responseText}`);
      throw new Error(`Final fallback failed: ${response.status} - ${responseText}`);
    }
    
    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '';
    
    if (!content) {
      throw new Error('Empty response from final fallback');
    }
    
    return {
      content,
      source: 'requesty_fallback',
      model: REQUESTY_MODEL_GEMINI_2_0
    };
  } catch (error) {
    console.error(`[TEST_GEMINI_API] Final fallback error: ${error.message}`);
    throw error; // All fallbacks failed
  }
}

// Main function to call AI with fallbacks
async function generateAIResponse(prompt) {
  console.log('[TEST_GEMINI_API] Starting AI response generation with fallback chain');
  
  try {
    // Primary API: Requesty with Gemini 2.5
    return await callRequestyAPI(prompt);
  } catch (requestyError) {
    console.error('[TEST_GEMINI_API] Primary API (Requesty) failed:', requestyError.message);
    console.log('[TEST_GEMINI_API] Trying fallback 1: OpenRouter...');
    
    try {
      // Fallback 1: OpenRouter with Gemini
      return await callOpenRouterAPI(prompt);
    } catch (openRouterError) {
      console.error('[TEST_GEMINI_API] Fallback 1 (OpenRouter) failed:', openRouterError.message);
      console.log('[TEST_GEMINI_API] Trying fallback 2: Direct Gemini API...');
      
      try {
        // Fallback 2: Direct Gemini API
        return await callDirectGeminiAPI(prompt);
      } catch (directGeminiError) {
        console.error('[TEST_GEMINI_API] Fallback 2 (Direct Gemini) failed:', directGeminiError.message);
        console.log('[TEST_GEMINI_API] Trying final fallback: Requesty with Gemini 2.0...');
        
        try {
          // Fallback 3: Requesty with Gemini 2.0
          return await callRequestyWithGemini2(prompt);
        } catch (finalError) {
          // All fallbacks failed
          console.error('[TEST_GEMINI_API] All fallbacks failed. Final error:', finalError.message);
          throw new Error(`All AI services failed: ${finalError.message}`);
        }
      }
    }
  }
}

export default async function handler(req, res) {
  console.log('[TEST_GEMINI_API] Handler started - With Fallbacks');
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    console.log('[TEST_GEMINI_API] Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      console.log('[TEST_GEMINI_API] Missing prompt');
      return res.status(400).json({ error: 'Missing prompt in request body' });
    }
    
    console.log('[TEST_GEMINI_API] Prompt length:', prompt.length);
    
    try {
      const result = await generateAIResponse(prompt);
      
      console.log(`[TEST_GEMINI_API] AI response generated successfully with ${result.source} (${result.model})`);
      
      return res.status(200).json({
        content: result.content,
        source: result.source,
        model: result.model
      });
    } catch (aiError) {
      console.error('[TEST_GEMINI_API] All AI services failed:', aiError.message);
      return res.status(500).json({ 
        error: 'All AI services failed', 
        details: aiError.message 
      });
    }
  } catch (error) {
    console.error('[TEST_GEMINI_API] Handler error:', error.message);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message
    });
  }
} 