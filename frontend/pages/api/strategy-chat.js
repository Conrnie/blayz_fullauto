import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// AI Strategy Extraction Prompts
const STRATEGY_ANALYSIS_PROMPT = `You are an expert Meta ads strategist helping to extract and understand a marketer's campaign approach. Your goal is to have a natural conversation that uncovers their advertising strategy and preferences.

CONVERSATION APPROACH:
- Ask ONE focused question at a time
- Build on what they've shared naturally
- Be conversational and engaging, not robotic
- Probe deeper into specific strategies they mention
- Focus on practical campaign management preferences

KEY AREAS TO EXPLORE:
1. Creative Strategy: Do they test many creatives or focus on angles? How often do they refresh?
2. Budget & Scaling: Conservative testing vs aggressive scaling? How do they identify winners?
3. Audience Strategy: Broad vs narrow targeting? Lookalikes vs interest-based?
4. Campaign Structure: Few adsets with variety or many narrow adsets?
5. Optimization Goals: What metrics drive their decisions?
6. Automation Preferences: What would they want automated vs manual control?

RESPONSE FORMAT (JSON):
{
  "response": "Your natural, conversational response with ONE focused question",
  "extracted_preferences": {
    // Only include preferences that are clearly evident from the conversation
    "budget_approach": "conservative|aggressive|testing_focused",
    "creative_strategy": "high_volume_testing|angle_focused|brand_consistency", 
    "audience_strategy": "broad_testing|narrow_targeting|lookalike_focus",
    "scaling_approach": "gradual|aggressive|test_first",
    "optimization_goal": "cpl|cpa|roas|awareness",
    "campaign_structure": "few_adsets_many_creatives|many_adsets_focused",
    "automation_comfort": "high|medium|low"
  },
  "current_step": "discovery|clarification|completion",
  "strategy_complete": false,
  "final_strategy": null,
  "confidence_level": 0.7 // How confident you are in the extracted preferences (0-1)
}

When strategy is complete (confidence > 0.8 and most preferences identified):
{
  "response": "Perfect! I have a clear picture of your strategy. Let me summarize what I've learned...",
  "strategy_complete": true,
  "final_strategy": {
    "summary": "Brief description of their overall approach",
    "automation_rules": ["Specific automation rules based on their preferences"],
    "preferences": // Same extracted_preferences object
  }
}`;

const STRATEGY_COMPLETION_PROMPT = `Based on the conversation, extract the marketer's strategy into a structured format:

{
  "testing_approach": "description of how they test creatives/audiences",
  "optimization_focus": "what metrics they prioritize", 
  "scaling_methodology": "how they scale winning campaigns",
  "creative_strategy": "their approach to creative testing and refresh",
  "campaign_structure": "preferred adset/campaign organization",
  "budget_management": "their budget allocation and scaling approach",
  "automation_preferences": "how hands-on vs automated they want to be"
}

Return this as JSON along with a summary confirmation message.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { session_id, message, conversation_history } = req.body;

    // For demo mode, skip database operations
    console.log('Demo: Processing message for session:', session_id);

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

    // If strategy is complete, include final strategy
    if (aiResponse.strategy_complete && aiResponse.final_strategy) {
      response.final_strategy = aiResponse.final_strategy;
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
      model: "gpt-5-mini-2025-08-07", // Using the latest model as requested
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 800
    });

    const response = JSON.parse(completion.choices[0].message.content);
    
    // Ensure required fields
    return {
      response: response.response || "I'd love to learn more about your approach. Can you tell me about your current campaign strategy?",
      extracted_preferences: response.extracted_preferences || {},
      current_step: response.current_step || "discovery",
      strategy_complete: response.strategy_complete || false,
      final_strategy: response.final_strategy || null,
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