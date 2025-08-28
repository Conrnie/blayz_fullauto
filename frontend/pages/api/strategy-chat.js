import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// AI Strategy Extraction Prompts
const STRATEGY_ANALYSIS_PROMPT = `You are setting up automated optimization rules for existing LEAD GENERATION Meta campaigns. Keep this conversation SHORT and focused on lead gen optimization thresholds - assume they already have lead campaigns running.

LEAD GEN OPTIMIZATION AREAS TO COVER (ask 1-2 questions per area max):

1. CREATIVE INTELLIGENCE FOR LEAD GEN
- What CTR threshold triggers new ad creative generation? (e.g., "Generate new ad creatives when CTR drops below 1.5%")
- Lead capture method: Are you using Meta lead forms or driving traffic to their landing pages?
- For Meta lead forms: Test new form headlines/fields when completion rate drops below what %?
- Creative refresh: How often should winning ad creatives be refreshed to prevent fatigue?

2. LEAD GEN SCALING & KILL CRITERIA
- Cost Per Lead (CPL) scaling trigger: (e.g., "Scale when CPL is under $25 after 50 leads")
- Kill criteria for lead campaigns: (e.g., "Pause campaigns when CPL exceeds $50 after 100 leads")
- Minimum lead volume before making scaling decisions: (e.g., "Wait for 25 leads before scaling")

3. LEAD GEN TARGETING OPTIMIZATION  
- Lead quality audience expansion: (e.g., "Expand to similar audiences when getting qualified leads")
- Lead intent targeting: (e.g., "Focus on high-intent behaviors like downloaded lead magnets")

4. LEAD GEN PERFORMANCE INSIGHTS
- Primary lead metric focus: (e.g., "Optimize for CPL under $30" or "Lead quality score above 70%")
- Lead volume alerts: (e.g., "Alert when daily lead volume drops 30%")

CONVERSATION STYLE:
- Ask ONE direct question about lead gen thresholds
- Focus on Cost Per Lead (CPL), lead quality, and lead volume
- Get specific numbers for lead metrics
- Assume they're experienced lead gen marketers  
- Total conversation should be 4-6 exchanges max

RESPONSE FORMAT (JSON):
{
  "response": "Your focused question about campaign operations (stay in current phase until complete)",
  "extracted_preferences": {
    // Only include lead gen optimization rules they've specified
    "lead_creative_intelligence": {
      "ctr_threshold": "CTR threshold for new ad creative generation",
      "lead_capture_method": "Meta lead forms or client landing pages",
      "form_completion_threshold": "Form completion rate that triggers Meta form optimization", 
      "creative_refresh_schedule": "How often to refresh winning ad creatives",
      "lead_magnet_testing": "When to test new lead magnets/form headlines"
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
      "primary_lead_kpi": "Main lead metric to optimize (CPL, lead quality, volume)",
      "lead_alert_preferences": "When to alert about lead performance drops",
      "lead_quality_analysis": "What makes a high-quality lead in their business"
    }
  },
  "optimization_rules_complete": false,
  "phase_complete": false,
  "strategy_complete": false,
  "final_strategy": null,
  "confidence_level": 0.7
}

When lead gen optimization rules are complete (after 4-6 exchanges):
{
  "response": "Perfect! Your lead generation optimization assistant is ready. I'll now monitor your lead campaigns and automatically: [list their specific lead gen rules]. Ready to connect your Meta lead generation campaigns?",
  "optimization_rules_complete": true,
  "final_lead_automation": {
    "lead_creative_rules": ["Generate new ad creatives when CTR < X%", "Test new Meta lead forms when completion < X%", "Refresh winning creatives every X days"],
    "lead_scaling_rules": ["Scale when CPL < $X after X leads", "Pause when CPL > $X after X leads"], 
    "lead_targeting_rules": ["Expand to similar audiences with quality leads", "Focus on high-intent lead behaviors"],
    "lead_insight_rules": ["Optimize for CPL under $X", "Alert when lead volume drops X%"],
    "meta_lead_optimization": ["Auto-optimize Meta lead forms based on completion rates", "Monitor landing page performance for campaign optimization (not page changes)"]
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