// Mock implementation for demo mode

// AI Strategy Extraction Prompts
const STRATEGY_ANALYSIS_PROMPT = `You are an expert Meta ads strategist helping to extract and understand a marketer's campaign approach.

Analyze the user's description and:
1. Extract key strategy elements (testing approach, scaling preferences, optimization focus, etc.)
2. Identify what specific follow-up questions would help clarify their approach
3. Respond in a conversational, expert tone

Current conversation context: The user is describing their Meta ads strategy approach.

Based on their response, either:
- Ask 1-2 specific follow-up questions to clarify important details
- If you have enough info, summarize their strategy and confirm understanding

Keep responses conversational and show you understand their expertise level.`;

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

    // Call AI service to analyze and respond
    const aiResponse = await analyzeStrategyConversation(conversationText, message);

    // Determine if strategy is complete
    const messageCount = conversation_history.filter(msg => msg.role === 'user').length;
    const hasEnoughInfo = messageCount >= 3 && aiResponse.confidence > 0.8;

    let response = {
      assistant_message: aiResponse.response,
      current_step: hasEnoughInfo ? 'confirmation' : 'discovery',
      extracted_preferences: aiResponse.extracted_preferences || {},
      strategy_complete: false
    };

    // If we have enough information, offer to finalize
    if (hasEnoughInfo) {
      response.assistant_message += `\n\n✅ **I think I understand your strategy!** Would you like me to summarize what I've learned and set up your automation profile, or do you want to add anything else?`;
      
      // Check if user is confirming to complete
      if (message.toLowerCase().includes('yes') || message.toLowerCase().includes('sounds good') || message.toLowerCase().includes('that works')) {
        const finalStrategy = await extractFinalStrategy(conversationText);
        response.strategy_complete = true;
        response.final_strategy = finalStrategy;
        response.assistant_message = `Perfect! I've created your personalized automation strategy:\n\n${finalStrategy.summary}\n\nYour campaigns will now run according to your preferences. Ready to create your first automated campaign?`;
      }
    }

    return res.status(200).json(response);

  } catch (error) {
    console.error('Strategy chat error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function analyzeStrategyConversation(conversationText, latestMessage) {
  // This would call your AI service (Anthropic, OpenAI, etc.)
  // For now, providing structured logic that can be enhanced with AI

  const keywords = {
    testing: ['test', 'creative', 'audience', 'split', 'a/b'],
    scaling: ['scale', 'budget', 'increase', 'expand'],
    optimization: ['optimize', 'cpa', 'roas', 'ctr', 'conversion'],
    automation: ['automatic', 'hands-off', 'manual', 'control']
  };

  const preferences = {};
  let response = '';
  let confidence = 0.3; // Base confidence

  // Extract testing approach
  if (latestMessage.match(/test|creative|audience/i)) {
    confidence += 0.2;
    if (latestMessage.match(/\d+\s*(creative|ad)/i)) {
      const match = latestMessage.match(/(\d+)\s*(creative|ad)/i);
      preferences.creatives_per_test = parseInt(match[1]);
      response += `I see you like testing ${match[1]} creatives at once. `;
    }
    
    if (!response.includes('What about')) {
      response += `What's your typical approach to scaling the winners? Do you increase budgets gradually or more aggressively?`;
    }
  }

  // Extract scaling preferences  
  else if (latestMessage.match(/scale|budget|increase/i)) {
    confidence += 0.2;
    if (latestMessage.match(/gradual|slow|conservative/i)) {
      preferences.scaling_approach = 'conservative';
      response += `Got it - conservative scaling to maintain performance. `;
    } else if (latestMessage.match(/aggressive|fast|quick/i)) {
      preferences.scaling_approach = 'aggressive';
      response += `Understood - aggressive scaling to maximize reach quickly. `;
    }
    
    response += `How do you typically structure your campaigns? Many adsets with few creatives, or fewer adsets with more creative variety?`;
  }

  // Extract campaign structure
  else if (latestMessage.match(/adset|campaign|structure/i)) {
    confidence += 0.2;
    response += `That campaign structure makes sense. What metrics do you focus on most for optimization - cost per lead, conversion rate, or ROAS?`;
  }

  // Extract optimization focus
  else if (latestMessage.match(/cpa|cpl|roas|conversion|ctr/i)) {
    confidence += 0.3;
    if (latestMessage.match(/cpa|cpl|cost per lead/i)) {
      preferences.optimization_metric = 'cost_per_lead';
    } else if (latestMessage.match(/roas|return/i)) {
      preferences.optimization_metric = 'roas';
    }
    response += `Perfect! I'm getting a clear picture of your strategy approach.`;
  }

  // Default exploratory questions
  else {
    const questionOptions = [
      "That's interesting! Tell me more about how you handle creative testing - do you prefer lots of variations or focus on perfecting fewer concepts?",
      "I see your approach. What about budget management - how do you typically scale campaigns that are performing well?",
      "That makes sense for your style. How hands-on do you like to be with campaign optimization vs letting it run automatically?"
    ];
    
    response = questionOptions[Math.floor(Math.random() * questionOptions.length)];
    confidence += 0.1;
  }

  return {
    response,
    confidence,
    extracted_preferences: preferences
  };
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