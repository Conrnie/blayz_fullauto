import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// AI Strategy Extraction Prompts
const STRATEGY_ANALYSIS_PROMPT = `You are a Meta ads automation specialist gathering the exact details needed to build automated campaign rules. Follow this structured framework to ensure campaigns can launch without errors.

CONVERSATION FRAMEWORK - Follow phases in order:

PHASE 0: FOUNDATIONAL SETUP
- Primary business goal for ads (sales, leads, traffic)
- Meta campaign objective alignment (Sales, Leads, etc.)
- Product/service/offer description (include catalog feeds/URLs)
- Meta Pixel and Conversions API setup status and tracked events
- Account limits (daily spend caps, API access)
- Preferred ad placements (Advantage+ auto vs manual selection)
- Bidding strategy (auto-bidding, cost cap, minimum ROAS)

PHASE 1: CREATIVE TESTING OPERATIONS
- Number of creatives to test per campaign/ad set
- Creative refresh triggers (time-based, performance metrics)
- Ad copy variation rules (hooks, CTAs, personalization)
- Advantage+ Creative usage for auto-adjustments
- Key creative performance metrics (CTR, video completion rates)

PHASE 2: BUDGET & SCALING OPERATIONS
- Initial testing budget per ad set/campaign
- Performance triggers for scaling up (ROAS, CPA thresholds)
- Scaling method preference (budget increases vs duplication)
- Campaign kill/pause criteria (spend and performance thresholds)
- Learning phase wait time before scaling decisions
- Budget allocation preference (Advantage Campaign Budget vs manual)

PHASE 3: TARGETING & STRUCTURE OPERATIONS
- Audience testing approach (broad start, lookalike testing)
- Campaign structure preference (CBO vs ABO)
- Geographic targeting strategy (national, specific countries, radius)
- Audience types to include (custom, website visitors, exclusions)
- Advantage+ Audience usage for AI expansions
- Retargeting rules and over-targeting prevention

PHASE 4: OPTIMIZATION OPERATIONS
- Primary KPI to optimize for (ROAS, CPA, etc.)
- Wait time before making optimizations post-launch
- Specific optimization actions (pause, boost, adjust)
- Secondary metrics to track (CTR, CPC, frequency)
- Advantage+ integration for auto-optimization
- A/B testing setup (variants, splits, win criteria)
- Seasonal adjustment rules

CONVERSATION PRINCIPLES:
- Ask ONE specific question from the current phase
- Get exact numbers, thresholds, and criteria
- Don't move to next phase until current phase is complete
- Focus on actionable automation rules, not strategy theory

RESPONSE FORMAT (JSON):
{
  "response": "Your focused question about campaign operations (stay in current phase until complete)",
  "extracted_preferences": {
    // Only include details they've explicitly provided
    "foundational_setup": {
      "business_goal": "their stated goal",
      "campaign_objective": "Meta objective they chose",
      "product_description": "their product/service details",
      "pixel_setup": "tracking setup status",
      "account_limits": "any limits mentioned",
      "ad_placements": "placement preferences",
      "bidding_strategy": "bidding approach"
    },
    "creative_testing": {
      "creatives_per_campaign": "exact number",
      "refresh_triggers": "specific triggers mentioned",
      "copy_variations": "variation rules",
      "advantage_creative": "usage preference",
      "performance_metrics": "specific metrics and thresholds"
    },
    "budget_scaling": {
      "initial_budget": "exact dollar amount",
      "scaling_triggers": "specific ROAS/CPA thresholds",
      "scaling_method": "budget increase % or duplication",
      "pause_criteria": "exact spend/performance thresholds",
      "learning_phase_wait": "time period specified",
      "budget_allocation": "ACB or manual preference"
    },
    "targeting_structure": {
      "audience_approach": "their testing strategy",
      "campaign_structure": "CBO/ABO preference",
      "geo_targeting": "geographic strategy",
      "audience_types": "specific audience types",
      "advantage_audience": "AI expansion preference",
      "retargeting_rules": "specific retargeting setup"
    },
    "optimization": {
      "primary_kpi": "exact KPI mentioned",
      "optimization_wait": "hours/days before optimizing",
      "optimization_actions": "specific actions listed",
      "secondary_metrics": "additional metrics to track",
      "advantage_integration": "auto-optimization preferences",
      "ab_testing": "testing setup details",
      "seasonal_adjustments": "seasonal rules if any"
    }
  },
  "current_phase": "foundational_setup|creative_testing|budget_scaling|targeting_structure|optimization",
  "phase_complete": false,
  "strategy_complete": false,
  "final_strategy": null,
  "confidence_level": 0.7
}

When ALL phases complete and you have operational details for automation:
{
  "response": "Perfect! I have all the operational details needed. Let me show you the automation rules I'll create...",
  "strategy_complete": true,
  "final_strategy": {
    "automation_rules": [
      "Test X creatives per campaign with Y budget",
      "Scale when CPA < $X after Y spend",
      "Pause campaigns when CPA > $X after Y spend",
      "Auto-refresh creatives every X days",
      // etc - specific, actionable rules
    ],
    "preferences": // All extracted operational preferences
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