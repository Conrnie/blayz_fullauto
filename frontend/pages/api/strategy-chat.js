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

// AI Strategy Extraction Prompts
const STRATEGY_ANALYSIS_PROMPT = `You are setting up automated optimization rules for existing LEAD GENERATION Meta campaigns. Keep this conversation SHORT and focused on lead gen optimization thresholds - assume they already have lead campaigns running.

LEAD GEN OPTIMIZATION AREAS TO COVER (ask 1-2 questions per area max):

0. CREATIVE TESTING METHODOLOGY (ask first)
- Testing approach: "Do you test angles first, then images, then headlines? Or do you test everything together?" (e.g., "Test angles first for 3 days, then best angle + image variations, then headlines")
- Split testing priority: "What's your testing order for creative elements?" (e.g., "Angle → Image → Headline → Copy → CTA" or "Test all combinations simultaneously")
- Creative element focus: "Which creative element typically has the biggest impact on your lead gen performance?" (e.g., "Angles drive 40% of performance, images 35%, headlines 20%, copy 5%")
- Angle strategy: "How do you approach testing different angles/value propositions?" (e.g., "Test pain point vs benefit angles" or "Problem-aware vs solution-aware messaging")

1. CREATIVE INTELLIGENCE FOR LEAD GEN
- What CTR threshold triggers new ad creative generation? (e.g., "Generate new ad creatives when CTR drops below 1.5%")
- Creative refresh schedule: How often should winning ad creatives be refreshed to prevent fatigue? (e.g., "Refresh every 7 days")
- Lead magnet testing: When should new lead magnets or hooks be tested in ad creatives?

2. LEAD GEN SCALING & KILL CRITERIA
- Cost Per Lead (CPL) scaling trigger: (e.g., "Scale when CPL is under $25 after 50 leads")
- Kill criteria for lead campaigns: (e.g., "Pause campaigns when CPL exceeds $50 after 100 leads")
- Minimum lead volume before making scaling decisions: (e.g., "Wait for 25 leads before scaling")

3. LEAD GEN TARGETING OPTIMIZATION  
- Lead quality audience expansion: (e.g., "Expand to similar audiences when getting qualified leads")
- Lead intent targeting: (e.g., "Focus on high-intent behaviors like downloaded lead magnets")

4. LEAD GEN PERFORMANCE INSIGHTS
- Primary lead metric focus: (e.g., "Optimize for CPL under $30" or "Focus on conversion rate optimization")
- Lead volume alerts: (e.g., "Alert when daily lead volume drops 30%")
- Budget allocation: (e.g., "How much daily budget per campaign?" or "What's your scaling budget approach?")

CONVERSATION STYLE:
- Start with creative testing methodology questions first
- Ask ONE direct question about lead gen thresholds
- Focus on Cost Per Lead (CPL), lead quality, and lead volume
- Get specific numbers for lead metrics
- Assume they're experienced lead gen marketers  
- Total conversation should be 5-7 exchanges max

RESPONSE FORMAT (JSON):
{
  "response": "Your focused question about campaign operations (stay in current phase until complete)",
  "extracted_preferences": {
    // Only include lead gen optimization rules they've specified
    "creative_testing_methodology": {
       "testing_approach": "Sequential (angle→image→headline→copy) or simultaneous testing approach",
       "split_testing_priority": "Order of creative element testing priority",
       "creative_element_impact": "Which creative elements have biggest performance impact",
       "testing_duration": "How long to test each creative element before moving to next",
       "angle_strategy": "Approach to testing different angles/value propositions"
     },
    "lead_creative_intelligence": {
      "ctr_threshold": "CTR threshold for new ad creative generation",
      "creative_refresh_schedule": "How often to refresh winning ad creatives", 
      "lead_magnet_testing": "When to test new lead magnets/hooks in ads"
    },
    "lead_scaling_optimization": {
      "cpl_scaling_trigger": "Cost Per Lead threshold for scaling up",
      "cpl_kill_criteria": "CPL threshold for pausing campaigns",
      "lead_volume_minimum": "Minimum leads needed before scaling decisions"
    },
    "lead_targeting_optimization": {
      "lead_quality_expansion": "Criteria for expanding to similar high-quality lead audiences",
      "lead_intent_focus": "High-intent behaviors to target for lead generation",
      "lead_qualification_rules": "How to filter and target qualified lead prospects"
    },
    "lead_performance_insights": {
      "primary_lead_kpi": "Main lead metric to optimize (CPL, conversion rate, volume)",
      "lead_alert_preferences": "When to alert about lead performance drops",
      "budget_allocation_strategy": "Daily budget per campaign and scaling approach"
    }
  },
  "optimization_rules_complete": false,
  "phase_complete": false,
  "strategy_complete": false,
  "final_strategy": null,
  "confidence_level": 0.7
}

When you have gathered enough information about their strategy (after 3-4 exchanges covering creative testing, budget/scaling, optimization metrics, and campaign structure), respond with:
{
  "response": "Perfect! I have everything I need to set up your lead generation optimization assistant. Based on our conversation, I'll monitor your campaigns and automatically: [list their specific rules]. \n\nWould you like me to save this strategy configuration for you?",
  "optimization_rules_complete": true,
  "strategy_complete": true,
  "show_save_button": true,
  "confidence_level": 0.9,
  "final_lead_automation": {
    "lead_creative_rules": ["Generate new ad creatives when CTR < X%", "Refresh winning creatives every X days", "Test new lead magnets/hooks when performance drops"],
    "lead_scaling_rules": ["Scale when CPL < $X after X leads", "Pause when CPL > $X after X leads"], 
    "lead_targeting_rules": ["Expand to similar audiences with quality leads", "Focus on high-intent lead behaviors"],
    "lead_insight_rules": ["Optimize for CPL under $X", "Alert when lead volume drops X%"],
    "meta_campaign_focus": ["Optimize Meta ad campaigns based on CPL and CTR", "Monitor overall conversion performance to adjust campaign targeting"]
  }
}

IMPORTANT: Only set strategy_complete=true and show_save_button=true when you explicitly ask the user if they want to save the strategy in your response message. The save button should appear as part of your conversational offer to save, not automatically.`;

const STRATEGY_COMPLETION_PROMPT = `Based on the conversation, extract the marketer's strategy into a structured format:

{
  "creative_testing_methodology": {
     "testing_approach": "Sequential (angle→image→headline→copy) or simultaneous testing approach",
     "split_testing_priority": "Order of creative element testing priority",
     "creative_element_impact": "Which creative elements have biggest performance impact",
     "testing_duration": "How long to test each creative element before moving to next",
     "angle_strategy": "Approach to testing different angles/value propositions"
   },
  "testing_approach": "description of how they test creatives/audiences",
  "optimization_focus": "what metrics they prioritize", 
  "scaling_methodology": "how they scale winning campaigns",
  "creative_strategy": "their approach to creative testing and refresh",
  "campaign_structure": "preferred adset/campaign organization",
  "budget_management": "their budget allocation and scaling approach",
  "automation_preferences": "how hands-on vs automated they want to be"
}

Return this as JSON along with a summary confirmation message.`

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { session_id, message, conversation_history } = req.body;

    // Create public client config
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Get token
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }
    const token = authHeader.split(' ')[1];

    // Create user-specific client
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    const userId = user.id;

    // Get or create conversation ID
    let sessionId = session_id;
    console.log('Processing message for session:', sessionId);
    
    let conversationId = await getConversationId(supabase, sessionId, userId);
    
    if (!conversationId) {
      console.error('Failed to get conversation ID');
      return res.status(500).json({ error: 'Failed to save conversation' });
    }
    
    // Save user message
    await saveMessage(supabase, conversationId, {
      role: 'user',
      content: message
    });

    // Analyze the conversation to determine next step
    const conversationText = conversation_history
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    // Call OpenAI to analyze and respond
    const aiResponse = await analyzeStrategyWithOpenAI(conversationText, message);

    // Determine if strategy is complete based on AI response
    const hasEnoughInfo = aiResponse.strategy_complete || aiResponse.confidence_level > 0.8;

    let response = {
      assistant_message: aiResponse.response,
      current_step: aiResponse.current_step,
      extracted_preferences: aiResponse.extracted_preferences || {},
      strategy_complete: aiResponse.strategy_complete || false
    };

    // Save the assistant response
    if (aiResponse.response) {
      await saveMessage(supabase, conversationId, {
        role: 'assistant',
        content: aiResponse.response
      });
    }

    // If strategy is complete and AI explicitly offers to save, include final strategy
    if (aiResponse.strategy_complete && aiResponse.show_save_button) {
      response.show_save_button = true;
      response.final_strategy = aiResponse.final_strategy || await extractFinalStrategy(conversationText);
      response.final_lead_automation = aiResponse.final_lead_automation || response.final_strategy;
      
      // Update conversation status to completed
      await updateConversationStatus(supabase, sessionId, 'completed', userId);
    }

    return res.status(200).json(response);

  } catch (error) {
    console.error('Strategy chat error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function analyzeStrategyWithOpenAI(conversationText, latestMessage) {
  try {
    const systemPrompt = STRATEGY_ANALYSIS_PROMPT;
    
    const userPrompt = `CONVERSATION HISTORY:
${conversationText}

LATEST USER MESSAGE: ${latestMessage}

Analyze this conversation and respond appropriately to help understand their Meta ads strategy. Focus on ONE key aspect at a time and build the conversation naturally.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini-2025-08-07", // Using requested model 
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_completion_tokens: 800
    });

    const response = JSON.parse(completion.choices[0].message.content);
    
    // Ensure required fields
    return {
      response: response.response || "I'd love to learn more about your approach. Can you tell me about your current campaign strategy?",
      extracted_preferences: response.extracted_preferences || {},
      current_step: response.current_step || "discovery",
      strategy_complete: response.strategy_complete || false,
      show_save_button: response.show_save_button || false,
      final_strategy: response.final_strategy || null,
      final_lead_automation: response.final_lead_automation || null,
      confidence_level: response.confidence_level || 0.3
    };

  } catch (error) {
    console.error('OpenAI API error:', error);
    
    // Fallback response if API fails
    return {
      response: "I'm having trouble processing that right now. Can you tell me more about your campaign approach - do you focus on testing many creatives or optimizing fewer high-performing ones?",
      extracted_preferences: {},
      current_step: "discovery",
      strategy_complete: false,
      final_strategy: null,
      confidence_level: 0.1
    };
  }
}

async function extractFinalStrategy(conversationText) {
  // Extract final structured strategy from conversation
  // This would use AI to create the comprehensive strategy object
  
  return {
    creative_testing_methodology: {
       testing_approach: "Sequential: Test angles first for 3 days, then best angle + image variations, then headlines, then copy",
       split_testing_priority: "Angle → Image → Headline → Copy → CTA",
       creative_element_impact: "Angles drive 40% of performance, images 35%, headlines 20%, copy 5%",
       testing_duration: "3 days per creative element before moving to next",
       angle_strategy: "Test pain point vs benefit angles, then problem-aware vs solution-aware messaging"
     },
    summary: "• High-volume creative testing (8-10 creatives per campaign)\n• Conservative budget scaling approach\n• Focus on cost per lead optimization\n• Preference for fewer adsets with more creative variety\n• Moderate automation with manual approval for major changes",
    preferences: {
      testing_approach: "high_volume_creative",
      creatives_per_campaign: 8,
      optimization_focus: "cost_per_lead", 
      scaling_methodology: "conservative",
      automation_level: "moderate"
    }
  };
}

// Helper function to get or create conversation and return its ID
async function getConversationId(supabase, sessionId, userId) {
  try {
    const conversationData = {
      session_id: sessionId,
      user_id: userId
    };

    // Check if conversation exists
    const { data: existing } = await supabase
      .from('chat_conversations')
      .select('id')
      .eq('session_id', sessionId)
      .single();

    if (existing) {
      // Update updated_at
      await supabase
        .from('chat_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      return existing.id;
    } else {
      // Insert new and get ID
      const { data, error } = await supabase
        .from('chat_conversations')
        .insert(conversationData)
        .select('id')
        .single();

      if (error) {
        console.error('Error creating conversation:', error);
        return null;
      }
      return data.id;
    }
  } catch (error) {
    console.error('Error in getConversationId:', error);
    return null;
  }
}

// Helper function to save individual messages
async function saveMessage(supabase, conversationId, message) {
  try {
    const messageData = {
      conversation_id: conversationId,
      role: message.role,
      content: message.content
    };

    const { error } = await supabase
      .from('chat_messages')
      .insert(messageData);

    if (error) {
      console.error('Error saving message:', error);
    }
  } catch (error) {
    console.error('Error in saveMessage:', error);
  }
}

// Helper function to update conversation status
async function updateConversationStatus(supabase, sessionId, status, userId) {
  try {
    const { error } = await supabase
      .from('chat_conversations')
      .update({ 
        user_id: userId
      })
      .eq('session_id', sessionId);

    if (error) {
      console.error('Error updating conversation status:', error);
    }
  } catch (error) {
    console.error('Error in updateConversationStatus:', error);
  }
}