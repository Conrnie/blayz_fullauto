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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, assistant, conversation, messages = [], isInitialization, user } = req.body;

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
- get-assistant-config: Fetch model_config for strategy details (offer, target market, etc.). Use when needing personalized config for recommendations. Params: {assistant_id: string}.
- campaign-analysis: Generate NEW campaign performance analysis and reports. Use whenever the user requests campaign analysis, performance review, optimization advice based on data, or to generate insights about the campaign. Params: {campaign_id: string}.

Circumstances for Tools:
- Use get-assistant-config when users ask about ad creatives, recommendations, testing strategies, or optimization advice to provide personalized responses
- Use campaign-analysis whenever users request to analyze the campaign, review performance, get optimization suggestions, or create fresh insights. Do NOT use for discussing existing reports or asking opinions about reports.
- For general questions about ad creative types or strategies, use get-assistant-config to personalize advice
- For questions about existing reports or asking for opinions on reports, respond conversationally without using tools
- Only respond generically if the question is purely conversational or doesn't benefit from personalized data`;

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
          description: "Analyze campaign performance metrics. Use when user requests report or optimization insights.",
          parameters: {
            type: "object",
            properties: { campaign_id: { type: "string", description: "The campaign ID to analyze" } },
            required: ["campaign_id"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get-assistant-config",
          description: "Fetch model_config for strategy details (offer, target market, etc.). Use when needing personalized config.",
          parameters: {
            type: "object",
            properties: { assistant_id: { type: "string", description: "The assistant ID" } },
            required: ["assistant_id"]
          }
        }
      }
    ];

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

          if (functionName === 'get-assistant-config') {
            console.log('Executing get-assistant-config in API with args:', functionArgs);
            const supabase = getServiceClient();
            const { data: configData, error } = await supabase
              .from('ai_assistants')
              .select('model_config, name')
              .eq('id', assistant?.id)
              .single();
            if (error) {
              toolResult = JSON.stringify({ success: false, error: error.message });
            } else {
              toolResult = JSON.stringify({ success: true, config: configData });
            }
          } else if (functionName === 'campaign-analysis') {
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

        // Only make another OpenAI call if we haven't reached the limit
        if (toolExecutionCount < maxToolExecutions) {
          currentResponse = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: currentMessages,
            max_tokens: 1000,
            temperature: 0.7,
            tools: tools,
            tool_choice: "auto"
          });
        } else {
          hasToolCalls = false;
        }
      } else {
        hasToolCalls = false;
      }
    }

    const finalMessage = currentResponse.choices[0].message;

    // Extract campaign context and analysis data from tool responses if available
    let campaignContext = null;
    let analysis = null;
    let hasReport = false;
    let synthesizedReport = null;
    
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

    return res.status(200).json({
      response: finalMessage.content,
      campaignContext: campaignContext,
      analysis: analysis,
      hasReport: hasReport,
      synthesizedReport: synthesizedReport,
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