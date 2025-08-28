import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// AI Strategy Extraction Prompts
const STRATEGY_ANALYSIS_PROMPT = `You are setting up automated optimization rules for existing Meta campaigns. Keep this conversation SHORT and focused on optimization thresholds - assume they already have campaigns running.

OPTIMIZATION AREAS TO COVER (ask 1-2 questions per area max):

1. CREATIVE INTELLIGENCE RULES
- What CTR threshold triggers new creative generation? (e.g., "Generate new creatives when CTR drops below 1%")
- Creative fatigue detection: How many days before auto-refreshing? (e.g., "Refresh creatives every 7 days")

2. SCALING & KILL CRITERIA  
- Performance triggers for scaling: (e.g., "Scale at 2x ROAS after $200 spend")
- Kill criteria: (e.g., "Pause campaigns at $50 CPA after $300 spend")

3. TARGETING OPTIMIZATION
- Audience expansion rules: (e.g., "Expand to lookalikes when converting audience reaches 1000 people")
- When to build negative audiences: (e.g., "Exclude after 3 impressions with no click")

4. PERFORMANCE INSIGHTS PREFERENCES
- Primary KPI focus: (e.g., "Optimize for CPA under $30")
- Alert preferences: (e.g., "Alert when campaigns drop 20% in performance")

CONVERSATION STYLE:
- Ask ONE direct question about thresholds/criteria
- Get specific numbers and triggers
- Keep it conversational but efficient
- Assume they're experienced marketers
- Total conversation should be 4-6 exchanges max

RESPONSE FORMAT (JSON):
{
  "response": "Your focused question about campaign operations (stay in current phase until complete)",
  "extracted_preferences": {
    // Only include optimization rules they've specified
    "creative_intelligence": {
      "ctr_threshold": "CTR number that triggers new creative generation",
      "fatigue_detection": "days/criteria for auto-refresh",
      "creative_analysis": "what patterns to identify in winners"
    },
    "scaling_optimization": {
      "scaling_triggers": "ROAS/CPA thresholds for scaling up", 
      "kill_criteria": "spend/performance thresholds for pausing",
      "budget_redistribution": "how to move budget from losers to winners"
    },
    "targeting_optimization": {
      "audience_expansion": "criteria for expanding to new audiences",
      "negative_audiences": "when/how to build exclusion lists",
      "performance_adjustments": "targeting tweaks based on performance"
    },
    "performance_insights": {
      "primary_kpi": "main metric to optimize for",
      "alert_preferences": "when to send performance alerts", 
      "winner_analysis": "what insights to extract from top performers"
    }
  },
  "optimization_rules_complete": false,
  "phase_complete": false,
  "strategy_complete": false,
  "final_strategy": null,
  "confidence_level": 0.7
}

When optimization rules are complete (after 4-6 exchanges):
{
  "response": "Perfect! Your optimization assistant is ready. I'll now monitor your campaigns and automatically: [list their specific rules]. Ready to connect your Meta campaigns?",
  "optimization_rules_complete": true,
  "final_automation": {
    "creative_rules": ["Generate new creatives when CTR < X%", "Auto-refresh every X days"],
    "scaling_rules": ["Scale at X ROAS after $X spend", "Pause at $X CPA after $X spend"], 
    "targeting_rules": ["Expand audiences when X conversions", "Build negatives after X impressions"],
    "insight_rules": ["Optimize for X KPI", "Alert when performance drops X%"]
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
      model: "gpt-4o-mini-2024-07-18", // Using available model 
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