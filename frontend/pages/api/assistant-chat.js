import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Supabase client for server-side operations
function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase credentials for server-side client.');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export default async function handler(req, res) {
  console.log('🔥 API ENDPOINT HIT! Method:', req.method, 'URL:', req.url);
  console.log('🔥 Request body keys:', Object.keys(req.body || {}));
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, assistant, conversation, messages = [], isInitialization, user, tool_call } = req.body;

console.log('Received user in API:', JSON.stringify(user, null, 2));

    // Debug logging to track the assistant object
    console.log('=== API DEBUG ===');
    console.log('Assistant object received:', JSON.stringify(assistant, null, 2));
    console.log('Assistant ID:', assistant?.id);
    console.log('Assistant name:', assistant?.name);

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Validate assistant object
    if (!assistant || !assistant.id) {
      console.error('Invalid assistant object - missing ID');
      return res.status(400).json({ error: 'Valid assistant with ID is required' });
    }

    // Validate user authentication
    if (!user || !user.id) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    // Build conversation context
    const campaignName = conversation?.context?.campaign_name || assistant?.name || 'Your Campaign';
    let systemPrompt = `You are ${assistant?.name || 'Blayz_SaaS_Assistant'}, an AI campaign optimization advisor for "${campaignName}". You help users optimize their Meta Ads campaign performance with data-driven insights and recommendations.

${assistant.campaign_id ? `Associated Campaign ID: ${assistant.campaign_id}. When the user requests campaign analysis, use this ID automatically with the campaign-analysis tool without asking for confirmation or additional details.` : ''}

Your role:
- Provide actionable campaign optimization advice
- Analyze performance metrics and suggest improvements
- Help with budget allocation, audience targeting, and creative optimization
- Be conversational, helpful, and focused on practical solutions
- Keep responses concise but informative

Context: You are helping users with their Meta Ads campaigns through the Blayz platform.

Your assistant ID is ${assistant.id}. Always use this exact ID when calling tools that require assistant_id.

Available Tools:
You have access to the following tools. Use them when appropriate:
- campaign-analysis: Generate NEW campaign performance analysis and reports. Use whenever the user requests campaign analysis, performance review, optimization advice based on data, or to generate insights about the campaign. Params: {campaign_id: string}.
- creative-generation: Generate creative content including ad headlines and copy using AI workflow automation. Use when users request creative content, headlines, ad copy, or want to generate new advertising materials. Params: {message: string, amount?: number (1-5, default: 3), creative_angle?: string}.

Circumstances for Tools:
- Use campaign-analysis whenever users request to analyze the campaign, review performance, get optimization suggestions, or create fresh insights. Do NOT use for discussing existing reports or asking opinions about reports.
- Use creative-generation when users request specific ad copy, headlines, creative content generation, or want new advertising materials created. IMPORTANT: Before calling the tool, always ask the user to specify: 1) How many ads they want (1-5), and 2) What creative angle/approach they prefer (e.g., emotional, humorous, professional, etc.). Only call the tool after getting these details from the user.
- For questions about existing reports or asking for opinions on reports, respond conversationally without using tools
- Only respond generically if the question is purely conversational or doesn't benefit from data analysis or creative generation`;

    if (assistant?.description) {
      systemPrompt += `\n\nAssistant Description: ${assistant.description}`;
    }

    if (conversation?.context) {
      systemPrompt += `\n\nCampaign Context: ${JSON.stringify(conversation.context)}`;
    }

    // Handle initialization - silently load config without automated responses
    if (isInitialization) {
      try {
        // Simply load the assistant config without generating any automated messages
        const supabase = getServiceClient();
        const { data: configData, error } = await supabase
          .from('ai_assistants')
          .select('model_config, name')
          .eq('id', assistant?.id)
          .single();
        
        if (error) {
          console.error('Error loading assistant config:', error);
          return res.status(500).json({ error: 'Failed to load assistant configuration' });
        }
        
        console.log('Assistant config loaded successfully:', configData?.name);
        // Return success without any automated response - let user initiate conversation
        return res.status(200).json({ 
          success: true, 
          message: 'Assistant initialized successfully',
          response: null // No automated response
        });
      } catch (error) {
        console.error('Error in initialization:', error);
        return res.status(500).json({ error: 'Failed to initialize assistant' });
      }
    }

    // Build message history for context
    const conversationMessages = [
      { role: 'system', content: systemPrompt }
    ];

    // Add previous messages for context (limit to last 10 to avoid token limits)
    const recentMessages = messages.slice(-10);
    recentMessages.forEach(msg => {
      if (msg.role === 'user' || msg.role === 'assistant') {
        conversationMessages.push({
          role: msg.role,
          content: msg.content
        });
      }
    });

    // Add current message
    if (message && message !== 'initialize') {
      conversationMessages.push({
        role: 'user',
        content: message
      });
    }

    // Define available tools for OpenAI
    const tools = [
      {
        type: "function",
        function: {
          name: "campaign-analysis",
          description: "Analyze campaign performance and generate insights",
          parameters: {
            type: "object",
            properties: {
              campaign_id: {
                type: "string",
                description: "The campaign ID to analyze"
              }
            },
            required: ["campaign_id"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "creative-generation",
          description: "Generate creative content including ad headlines and copy using AI workflow automation",
          parameters: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "Creative requirements and context for generating headlines and ad copy"
              },
              amount: {
                type: "integer",
                description: "Number of ads to generate (1-5, default: 3)",
                minimum: 1,
                maximum: 5
              },
              creative_angle: {
                type: "string",
                description: "Creative angle or approach for the ad content (e.g., emotional, humorous, professional, etc.)"
              }
            },
            required: ["message"]
          }
        }
      }
    ];

    // Handle direct tool call from frontend (e.g., form submissions)
    if (tool_call && tool_call.function) {
      console.log('🎯 PROCESSING DIRECT TOOL CALL FROM FRONTEND!');
      console.log('📝 Tool call object:', JSON.stringify(tool_call, null, 2));
      
      const functionName = tool_call.function.name;
      const functionArgs = JSON.parse(tool_call.function.arguments);
      
      if (functionName === 'creative-generation') {
        console.log('🚀 DIRECT CREATIVE GENERATION CALL DETECTED!');
        console.log('📝 Function args:', JSON.stringify(functionArgs, null, 2));
        
        // Extract form data
        const adAmount = functionArgs.amount || 3;
        const creativeAngle = functionArgs.creative_angle || '';
        const companyProfileId = functionArgs.company_profile_id || 'default-company-profile';
        
        const webhookPayload = {
          amount: adAmount,
          message: message,
          creative_angle: creativeAngle,
          company_profile_id: companyProfileId,
          ai_assistant_id: assistant.id
        };
        
        console.log('🌐 SENDING TO CREATIVE GENERATION WEBHOOK (DIRECT CALL)');
        console.log('📝 Webhook payload:', JSON.stringify(webhookPayload, null, 2));
        
        // Call the n8n webhook endpoint
        const webhookUrl = process.env.NEXT_PUBLIC_CREATIVE_WEBHOOK_URL || 'http://145.14.157.237:5678/webhook-test/creative-generation';
        console.log('🌐 Using webhook URL:', webhookUrl);
        console.log('🚀 Making webhook request...');
        
        const n8nResponse = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(webhookPayload)
        });
        
        console.log('📡 Webhook response status:', n8nResponse.status);
        console.log('📡 Webhook response headers:', Object.fromEntries(n8nResponse.headers.entries()));
        
        if (!n8nResponse.ok) {
          const errorBody = await n8nResponse.text();
          console.error(`Creative generation webhook error: Status ${n8nResponse.status}, Body: ${errorBody}`);
          throw new Error(`Creative generation webhook responded with status: ${n8nResponse.status}`);
        }
        
        // Handle response
        const contentType = n8nResponse.headers.get('content-type') || '';
        console.log('Response content type:', contentType);
        
        if (contentType.includes('application/json')) {
          const responseData = await n8nResponse.json();
          console.log('Creative generation webhook response:', responseData);
          return res.status(200).json({ 
            response: JSON.stringify(responseData),
            success: true 
          });
        } else if (contentType.includes('image/') || contentType.includes('application/octet-stream')) {
          console.log('Received binary response (image)');
          const buffer = await n8nResponse.arrayBuffer();
          const base64 = Buffer.from(buffer).toString('base64');
          const responseData = {
            binary_files: [{
              filename: `creative_${Date.now()}.png`,
              data: base64,
              content_type: contentType
            }],
            creative_content: `Generated ${adAmount} ad creative(s) with ${creativeAngle} angle.`
          };
          return res.status(200).json({ 
            response: JSON.stringify(responseData),
            success: true 
          });
        } else {
          const textResponse = await n8nResponse.text();
          console.log('Creative generation text response:', textResponse);
          return res.status(200).json({ 
            response: textResponse,
            success: true 
          });
        }
      }
    }

    // Call OpenAI API with tool support
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: conversationMessages,
      max_tokens: 1000,
      temperature: 0.7,
      tools: tools,
      tool_choice: "auto"
    });

    const aiMessage = completion.choices[0]?.message;

    if (!aiMessage) {
      throw new Error('No response from OpenAI');
    }

    let currentMessages = conversationMessages;
    let currentResponse = completion;
    let hasToolCalls = true;
    let toolExecutionCount = 0;
    const maxToolExecutions = 3; // Prevent infinite loops
    let toolResponses = []; // Move toolResponses declaration outside the loop
    let generatedBinaryFiles = []; // Store binary files for final response

    while (hasToolCalls && toolExecutionCount < maxToolExecutions) {
      const aiMessage = currentResponse.choices[0].message;
      currentMessages.push({ role: 'assistant', content: aiMessage.content, tool_calls: aiMessage.tool_calls });

      if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
        toolExecutionCount++;
        toolResponses = []; // Reset toolResponses for each iteration
        for (const toolCall of aiMessage.tool_calls) {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);
          let toolResult = '';

          if (functionName === 'campaign-analysis') {
            console.log('Executing campaign-analysis in API with args:', functionArgs);
            const supabase = getServiceClient();
            
            // First, get the assistant's campaign_id from the database
            const { data: assistantData, error: assistantError } = await supabase
              .from('ai_assistants')
              .select('campaign_id, meta_campaign_id')
              .eq('id', assistant.id)
              .single();
            
            console.log('Fetched assistantData:', JSON.stringify(assistantData, null, 2));
            console.log('Assistant fetch error:', assistantError);
            
            if (assistantError) {
              toolResult = JSON.stringify({ success: false, error: 'Failed to fetch assistant configuration: ' + assistantError.message });
            } else if (!assistantData.campaign_id && !assistantData.meta_campaign_id) {
              toolResult = JSON.stringify({ success: false, error: 'No campaign ID found for this assistant. Please configure a campaign first.' });
            } else {
              // Use campaign_id or meta_campaign_id for analysis
              const campaignId = assistantData.campaign_id || assistantData.meta_campaign_id;
              console.log('Using campaignId for analysis:', campaignId);
              
              // Calculate startDate and endDate for the analysis
    const defaultNumDays = 30;
    const { data: maxDateData, error: maxError } = await supabase
      .from('ad_set_insights')
      .select('date')
      .eq('campaign_id', campaignId)
      .order('date', { ascending: false })
      .limit(1)
      .single();

    let endDate;
    let startDate;
    if (maxError || !maxDateData?.date) {
      console.error('Error fetching max date:', maxError);
      // Default to last 30 days from today
      const today = new Date();
      endDate = today.toISOString().split('T')[0];
      const start = new Date(today);
      start.setDate(start.getDate() - (defaultNumDays - 1));
      startDate = start.toISOString().split('T')[0];
    } else {
      endDate = maxDateData.date;
      const start = new Date(endDate);
      start.setDate(start.getDate() - (defaultNumDays - 1));
      startDate = start.toISOString().split('T')[0];
    }

    // Compute numDays based on calculated dates
    const numDays = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1;

    console.log('Calculated dates and numDays:', { startDate, endDate, numDays });

    try {
      // Use user ID from request
      const userId = user.id;

      // Call get-synthesized-report with simplified payload (it now handles internal analysis calls)
      const invokeBody = { 
        campaignId, 
        userId, 
        numDays 
      };
      console.log('Invoking get-synthesized-report with simplified body:', JSON.stringify(invokeBody, null, 2));
      
      const { data, error } = await supabase.functions.invoke('get-synthesized-report', {
        body: invokeBody,
        headers: {
          'X-Shared-Secret': process.env.YOUR_SHARED_SECRET || ''
        }
      });
      
      console.log('Edge function response data:', JSON.stringify(data, null, 2));
      console.log('Edge function error:', error);
      
      if (error) {
                toolResult = JSON.stringify({ success: false, error: 'Edge function error: ' + error.message });
              } else {
                // Store the report in assistant_reports table
                try {
                  const { data: reportData, error: reportError } = await supabase
                    .from('assistant_reports')
                    .insert({
                      assistant_id: assistant.id,
                      user_id: user.id,
                      campaign_id: campaignId,
                      report_content: data.synthesizedReport,
                      ai_insights: data.synthesizedReport?.ai_insights || null,
                      status: 'completed',
                      metadata: {
                        numDays: numDays,
                        startDate: startDate,
                        endDate: endDate,
                        generated_via: 'assistant_chat'
                      }
                    })
                    .select()
                    .single();
                  
                  if (reportError) {
                    console.error('Error storing assistant report:', reportError);
                  } else {
                    console.log('Successfully stored assistant report:', reportData?.id);
                  }
                } catch (storeError) {
                  console.error('Error storing assistant report:', storeError);
                }
                
                // Include campaign context information for the frontend to use
                toolResult = JSON.stringify({ 
                  success: true, 
                  analysis: data.synthesizedReport,
                  campaignContext: {
                    campaign_id: campaignId,
                    campaign_name: 'Campaign Analysis'
                  },
                  synthesizedReport: data.synthesizedReport,
                  hasReport: true
                });
              }
    } catch (edgeError) {
      console.log('Edge function invocation error:', edgeError);
      toolResult = JSON.stringify({ success: false, error: 'Failed to call edge functions: ' + edgeError.message });
    }
            }
          } else if (functionName === 'creative-generation') {
            console.log('Executing creative-generation with args:', functionArgs);
            try {
              // Use form data if provided, otherwise fall back to message parsing
              let adAmount, creativeAngle, companyProfileId, message;
              
              if (functionArgs.amount && functionArgs.creative_angle) {
                // Form data provided - use directly
                adAmount = parseInt(functionArgs.amount);
                creativeAngle = functionArgs.creative_angle;
                companyProfileId = functionArgs.company_profile_id;
                message = functionArgs.description || `Create ads that invoke a sense of ${creativeAngle}. ${functionArgs.description || ''}`.trim();
              } else {
                // Fallback to message parsing for backward compatibility
                message = functionArgs.message || 'Generate creative ad content';
                
                // Parse amount and creative angle from the message if provided
                adAmount = 3; // default
                creativeAngle = '';
                
                // Extract amount from message (look for patterns like "3 ads", "generate 5", etc.)
                const amountMatch = message.match(/(\d+)\s*(?:ads?|creatives?)/i) || message.match(/(?:generate|create|make)\s*(\d+)/i);
                if (amountMatch) {
                  adAmount = Math.min(parseInt(amountMatch[1]), 5);
                }
                
                // Extract creative angle from message (look for angle descriptions)
                const anglePatterns = [
                  /(?:angle|approach|tone|style):\s*([^.!?\n]+)/i,
                  /(?:make it|should be|want it)\s+([^.!?\n]*(?:emotional|humorous|professional|serious|playful|bold|creative|innovative|traditional|modern|casual|formal)[^.!?\n]*)/i,
                  /(emotional|humorous|professional|serious|playful|bold|creative|innovative|traditional|modern|casual|formal)\s+(?:approach|angle|tone|style)/i
                ];
                
                for (const pattern of anglePatterns) {
                  const angleMatch = message.match(pattern);
                  if (angleMatch) {
                    creativeAngle = angleMatch[1].trim();
                    break;
                  }
                }
                
                // Get company_profile_id from ai_assistants table
                const supabase = getServiceClient();
                const { data: assistantData, error: assistantError } = await supabase
                  .from('ai_assistants')
                  .select('company_profile_id')
                  .eq('id', assistant.id)
                  .single();
                
                if (assistantError) {
                  console.error('Error fetching assistant data:', assistantError);
                }
                
                companyProfileId = assistantData?.company_profile_id || 'default-company-profile';
              }
              
              const webhookPayload = {
                amount: adAmount,
                message: message,
                creative_angle: creativeAngle,
                company_profile_id: companyProfileId,
                ai_assistant_id: assistant.id
              };
              
              console.log('🎯 CREATIVE GENERATION TOOL CALLED!');
              console.log('📝 Webhook payload:', JSON.stringify(webhookPayload, null, 2));
              
              // Call the new n8n webhook endpoint to start generation
              const webhookUrl = process.env.NEXT_PUBLIC_CREATIVE_WEBHOOK_URL || 'http://145.14.157.237:5678/webhook-test/creative-generation';
              console.log('🌐 Using creative generation webhook URL:', webhookUrl);
              console.log('🚀 Making webhook request...');
              
              const n8nResponse = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(webhookPayload)
              });
              
              console.log('📡 Webhook response status:', n8nResponse.status);
              console.log('📡 Webhook response headers:', Object.fromEntries(n8nResponse.headers.entries()));
              
              if (!n8nResponse.ok) {
                const errorBody = await n8nResponse.text();
                console.error(`Creative generation webhook error: Status ${n8nResponse.status}, Body: ${errorBody}`);
                throw new Error(`Creative generation webhook responded with status: ${n8nResponse.status}`);
              }
              
              // Check content type to determine how to handle the response
              const contentType = n8nResponse.headers.get('content-type') || '';
              console.log('Response content type:', contentType);
              
              let initialResponse;
              if (contentType.includes('application/json')) {
                // JSON response - parse normally
                initialResponse = await n8nResponse.json();
                console.log('Creative generation webhook initial response:', initialResponse);
              } else if (contentType.includes('image/') || contentType.includes('application/octet-stream')) {
                // Binary response (image) - handle as binary data
                console.log('Received binary response (image)');
                const arrayBuffer = await n8nResponse.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                
                // Create a mock response structure for binary data
                initialResponse = {
                  success: true,
                  data: {
                    image: buffer,
                    type: contentType.includes('image/png') ? 'png' : 'jpg'
                  }
                };
              } else {
                // Unknown content type - try text first, then JSON
                const responseText = await n8nResponse.text();
                console.log('Response text:', responseText.substring(0, 200));
                try {
                  initialResponse = JSON.parse(responseText);
                } catch (e) {
                  console.error('Failed to parse response as JSON:', e.message);
                  throw new Error(`Unexpected response format. Content-Type: ${contentType}`);
                }
              }
              
              let n8nData;
              const startTime = Date.now();
              
              // Check if this is an immediate response with results or if we need to wait
              if (initialResponse.success && initialResponse.data) {
                // Immediate response with results (Railway webhook pattern)
                console.log('Received immediate response with results');
                n8nData = initialResponse;
              } else if (initialResponse.status === 'processing' || initialResponse.job_id) {
                // If we get a job_id or processing status, we need to poll for completion
                const jobId = initialResponse.job_id || 'unknown';
                console.log(`Creative generation started with job ID: ${jobId}. Waiting for completion...`);
                
                // Poll for completion (minimum 5 minutes wait)
                const minWaitTime = 5 * 60 * 1000; // 5 minutes minimum
                const maxWaitTime = 6 * 60 * 1000; // 6 minutes maximum
                const pollInterval = 10000; // 10 seconds
                
                let finalResult = null;
                let hasWaitedMinimum = false;
                
                while (Date.now() - startTime < maxWaitTime) {
                  await new Promise(resolve => setTimeout(resolve, pollInterval));
                  
                  // Check if we've waited the minimum time
                  if (Date.now() - startTime >= minWaitTime) {
                    hasWaitedMinimum = true;
                  }
                  
                  try {
                    // Poll the status endpoint (assuming there's a status endpoint)
                    const statusUrl = `http://145.14.157.237:5678/webhook-test/status/${jobId}`;
                    const statusResponse = await fetch(statusUrl, {
                      method: 'GET',
                      headers: {
                        'Content-Type': 'application/json'
                      }
                    });
                    
                    if (statusResponse.ok) {
                      const statusData = await statusResponse.json();
                      console.log('Polling status:', statusData);
                      
                      if (statusData.status === 'completed' && statusData.result) {
                        // Only break if we've waited the minimum time or got results
                        if (hasWaitedMinimum || statusData.result) {
                          finalResult = statusData.result;
                          break;
                        }
                      } else if (statusData.status === 'failed' && hasWaitedMinimum) {
                        throw new Error('Creative generation failed: ' + (statusData.error || 'Unknown error'));
                      }
                    }
                  } catch (pollError) {
                    console.log('Polling error (will retry):', pollError.message);
                    // Only throw error if we've waited minimum time
                    if (hasWaitedMinimum && Date.now() - startTime >= maxWaitTime - 30000) {
                      console.log('Polling failed after minimum wait time');
                    }
                  }
                }
                
                if (!finalResult) {
                  const waitedTime = Math.round((Date.now() - startTime) / 1000);
                  throw new Error(`Technical error: Creative generation could not be completed after ${waitedTime} seconds. Please try again or contact support if the issue persists.`);
                }
                
                // Process the final result
                n8nData = finalResult;
                console.log('Creative generation final result:', n8nData);
              } else {
                // Immediate response with results
                n8nData = initialResponse;
                console.log('Creative generation immediate response:', n8nData);
              }
              
              // Extract the result from webhook response
              let creativeContent = 'Creative ads generated successfully.';
              let binaryFiles = [];
              
              // Handle Railway webhook response format (success/data structure)
              // Check if n8nData is an array (multiple items from n8n workflow)
              let responseData;
              if (Array.isArray(n8nData)) {
                console.log('🔍 n8nData is an array with', n8nData.length, 'items');
                // If it's an array, we need to process all items
                responseData = {
                  items: n8nData,
                  // Collect all images from all items
                  images: n8nData.flatMap(item => {
                    // Handle n8n workflow structure where data is in item.json (like demo page)
                    const actualData = item.json || item.data || item;
                    
                    // Check for image_base64 field (Supabase schema format)
                    if (actualData.image_base64) return [actualData.image_base64];
                    
                    // Fallback checks
                    if (actualData.image) return [actualData.image];
                    if (actualData.images) return actualData.images;
                    if (actualData.files) return actualData.files;
                    if (actualData.base64) return [actualData];
                    return [];
                  })
                };
              } else {
                responseData = n8nData.data || n8nData;
              }
              
              if (responseData.creatives) {
                creativeContent = `Generated ${responseData.creatives.length} creative ads:\n\n${responseData.creatives.map((creative, index) => `**Ad ${index + 1}:**\n${creative}`).join('\n\n')}`;
              } else if (responseData.gemini_response) {
                creativeContent = `🎨 **Creative Generated Successfully!**\n\n${responseData.gemini_response}`;
              } else if (responseData.result) {
                creativeContent = JSON.stringify(responseData.result, null, 2);
              } else if (n8nData.creatives) {
                creativeContent = `Generated ${n8nData.creatives.length} creative ads:\n\n${n8nData.creatives.map((creative, index) => `**Ad ${index + 1}:**\n${creative}`).join('\n\n')}`;
              } else if (responseData.image && Buffer.isBuffer(responseData.image)) {
                // Direct binary image response
                creativeContent = `🎨 **Creative Image Generated Successfully!**\n\nReceived a ${responseData.type || 'PNG'} image file directly from the webhook. The image has been processed and is ready for use.`;
              } else {
                creativeContent = JSON.stringify(responseData, null, 2);
              }
              
              // Debug the complete response structure
              console.log('🔍 FULL RESPONSE DEBUG - responseData keys:', Object.keys(responseData));
              console.log('🔍 FULL RESPONSE DEBUG - n8nData keys:', Object.keys(n8nData));
              
              // Check if n8nData is an array (which it might be if n8n sends multiple items)
              if (Array.isArray(n8nData)) {
                console.log('🔍 n8nData is an ARRAY with length:', n8nData.length);
                n8nData.forEach((item, index) => {
                  console.log(`🔍 Array item ${index}:`, Object.keys(item));
                  console.log(`🔍 Array item ${index} json:`, item.json ? Object.keys(item.json) : 'No json property');
                  console.log(`🔍 Array item ${index} full structure:`, JSON.stringify(item, null, 2).substring(0, 500));
                });
              }
              
              // Check if responseData is an array
              if (Array.isArray(responseData)) {
                console.log('🔍 responseData is an ARRAY with length:', responseData.length);
                responseData.forEach((item, index) => {
                  console.log(`🔍 Response array item ${index}:`, Object.keys(item));
                });
              }
              
              console.log('🔍 responseData.image exists:', !!responseData.image);
              console.log('🔍 responseData.images exists:', !!responseData.images, 'length:', responseData.images?.length);
              console.log('🔍 n8nData.images exists:', !!n8nData.images, 'length:', n8nData.images?.length);
              console.log('🔍 n8nData.files exists:', !!n8nData.files, 'length:', n8nData.files?.length);
              
              // Check for binary files (images) in the response
              if (responseData.image) {
                // Single image from Railway webhook or direct binary response
                let imageData = responseData.image;
                let imageFormat = responseData.type || 'png';
                
                // If it's a Buffer (from direct binary response), convert to base64
                if (Buffer.isBuffer(imageData)) {
                  imageData = imageData.toString('base64');
                  console.log('Converted Buffer to base64, length:', imageData.length);
                }
                
                binaryFiles = [{
                  type: 'image',
                  data: imageData,
                  filename: `creative_image.${imageFormat}`,
                  format: imageFormat
                }];
              } else if (responseData.images && Array.isArray(responseData.images)) {
                binaryFiles = responseData.images.map((img, index) => ({
                  type: 'image',
                  data: img.data || img.base64 || img.url || img,
                  filename: img.filename || `creative_${index + 1}.${img.format || 'png'}`,
                  format: img.format || 'png'
                }));
              } else if (n8nData.images && Array.isArray(n8nData.images)) {
                binaryFiles = n8nData.images.map((img, index) => ({
                  type: 'image',
                  data: img.data || img.base64 || img.url,
                  filename: img.filename || `creative_${index + 1}.${img.format || 'png'}`,
                  format: img.format || 'png'
                }));
              } else if (n8nData.files && Array.isArray(n8nData.files)) {
                binaryFiles = n8nData.files.map((file, index) => ({
                  type: file.type || 'image',
                  data: file.data || file.base64 || file.url,
                  filename: file.filename || `file_${index + 1}`,
                  format: file.format || 'png'
                }));
              } else if (Array.isArray(n8nData)) {
                // Handle n8n workflow array structure - extract images from each item
                binaryFiles = [];
                n8nData.forEach((item, index) => {
                  // Handle n8n nested structure where data is inside 'json' object (like demo page)
                  const actualData = item.json || item.data || item;
                  
                  // Check for image_base64 field (Supabase schema format)
                  if (actualData.image_base64) {
                    console.log(`📸 Found image_base64 in item ${index}:`, typeof actualData.image_base64);
                    binaryFiles.push({
                      type: 'image',
                      data: actualData.image_base64,
                      filename: actualData.filename || `creative_${actualData.id || index + 1}.png`,
                      format: 'png'
                    });
                  }
                  
                  // Check for single image (fallback)
                  if (actualData.image || actualData.base64) {
                    binaryFiles.push({
                      type: 'image',
                      data: actualData.image || actualData.base64,
                      filename: actualData.filename || `creative_${index + 1}.${actualData.format || 'png'}`,
                      format: actualData.format || 'png'
                    });
                  }
                  
                  // Check for multiple images
                  if (actualData.images && Array.isArray(actualData.images)) {
                    actualData.images.forEach((img, imgIndex) => {
                      binaryFiles.push({
                        type: 'image',
                        data: img.data || img.base64 || img.url || img,
                        filename: img.filename || `creative_${index + 1}_${imgIndex + 1}.${img.format || 'png'}`,
                        format: img.format || 'png'
                      });
                    });
                  }
                  
                  // Check for files array
                  if (actualData.files && Array.isArray(actualData.files)) {
                    actualData.files.forEach((file, fileIndex) => {
                      binaryFiles.push({
                        type: file.type || 'image',
                        data: file.data || file.base64 || file.url,
                        filename: file.filename || `file_${index + 1}_${fileIndex + 1}`,
                        format: file.format || 'png'
                      });
                    });
                  }
                });
              }
              
              // COMPREHENSIVE LOGGING FOR DEBUGGING
              console.log('🔍 BINARY FILES PROCESSING RESULT:');
              console.log('🔍 Total binary files processed:', binaryFiles.length);
              console.log('🔍 Binary files details:', binaryFiles.map((file, index) => ({
                index,
                type: file.type,
                filename: file.filename,
                format: file.format,
                hasData: !!file.data,
                dataLength: file.data ? file.data.length : 0,
                dataPreview: file.data ? file.data.substring(0, 50) + '...' : 'No data'
              })));
              
              // Store binary files for final response (not sent to ChatGPT)
              generatedBinaryFiles = binaryFiles;
              console.log('🖼️ Binary files stored for final response:', generatedBinaryFiles.length, 'files');
              console.log('🖼️ First file preview:', generatedBinaryFiles[0] ? {
                type: generatedBinaryFiles[0].type,
                filename: generatedBinaryFiles[0].filename,
                format: generatedBinaryFiles[0].format,
                dataLength: generatedBinaryFiles[0].data ? generatedBinaryFiles[0].data.length : 0
              } : 'No files');

              // Create a summary for ChatGPT without the actual binary data
              const binaryFilesSummary = binaryFiles.map(file => ({
                type: file.type,
                filename: file.filename,
                format: file.format,
                size: file.data ? (typeof file.data === 'string' ? file.data.length : 'binary') : 'unknown'
              }));

              toolResult = JSON.stringify({ 
                success: true,
                has_images: binaryFiles.length > 0
              });
            } catch (webhookError) {
              console.error('Creative generation webhook error:', webhookError);
              toolResult = JSON.stringify({ 
                success: false, 
                error: 'Failed to generate creative content: ' + webhookError.message 
              });
            }
          } else {
            toolResult = JSON.stringify({ success: false, error: 'Unknown tool' });
          }

          toolResponses.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name: functionName,
            content: toolResult
          });
        }

        currentMessages = [...currentMessages, ...toolResponses];

        console.log('🔄 After tool execution - generatedBinaryFiles count:', generatedBinaryFiles.length);
        console.log('🔄 Tool responses count:', toolResponses.length);
        console.log('🔄 Current messages count:', currentMessages.length);

        // Only make another OpenAI call if we haven't reached the limit
        if (toolExecutionCount < maxToolExecutions) {
          console.log('🤖 Making follow-up OpenAI call after tool execution...');
          try {
            currentResponse = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: currentMessages,
              max_tokens: 1000,
              temperature: 0.7,
              tools: tools,
              tool_choice: "auto"
            });
            console.log('✅ Follow-up OpenAI call successful');
          } catch (openaiError) {
            console.error('❌ Follow-up OpenAI call failed:', openaiError);
            hasToolCalls = false;
          }
        } else {
          console.log('🛑 Max tool executions reached, stopping');
          hasToolCalls = false;
        }
      } else {
        hasToolCalls = false;
      }
    }

    console.log('🏁 Reached final response section');
    console.log('🏁 Final generatedBinaryFiles count:', generatedBinaryFiles ? generatedBinaryFiles.length : 'undefined');
    
    const finalMessage = currentResponse.choices[0].message;

    // Extract campaign context and analysis data from tool responses if available
    let campaignContext = null;
    let analysis = null;
    let hasReport = false;
    let synthesizedReport = null;
    let binaryFiles = [];
    
    if (toolResponses && toolResponses.length > 0) {
      for (const toolResponse of toolResponses) {
        try {
          const parsedResult = JSON.parse(toolResponse.content);
          if (parsedResult.campaignContext) {
            campaignContext = parsedResult.campaignContext;
          }
          if (parsedResult.analysis) {
            analysis = parsedResult.analysis;
          }
          if (parsedResult.hasReport) {
            hasReport = true;
          }
          if (parsedResult.synthesizedReport) {
            synthesizedReport = parsedResult.synthesizedReport;
          }
        } catch (e) {
          // Ignore parsing errors for tool responses
          console.error('Error parsing tool response:', e);
        }
      }
    }

    // Check if binary files were generated - if so, provide automated message
    let finalResponse = finalMessage.content;
    console.log('🔍 Final response check - generatedBinaryFiles:', generatedBinaryFiles ? generatedBinaryFiles.length : 'undefined', 'files');
    
    if (generatedBinaryFiles && generatedBinaryFiles.length > 0) {
      const imageCount = generatedBinaryFiles.length;
      const imageWord = imageCount === 1 ? 'creative' : 'creatives';
      finalResponse = `I've successfully generated the creatives for you!`;
      console.log('✅ Using automated message for', imageCount, 'images');
    } else {
      console.log('❌ No binary files found, using ChatGPT response');
    }

    console.log('📤 Final API response binaryFiles:', generatedBinaryFiles ? generatedBinaryFiles.length : 'undefined');
    
    return res.status(200).json({
      response: finalResponse,
      campaignContext: campaignContext,
      analysis: analysis,
      hasReport: hasReport,
      synthesizedReport: synthesizedReport,
      binaryFiles: generatedBinaryFiles,
      success: true
    });

  } catch (error) {
    console.error('Assistant chat API error:', error);
    return res.status(500).json({ 
      error: 'Failed to generate response',
      details: error.message 
    });
  }
}