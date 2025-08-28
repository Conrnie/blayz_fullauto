import { supabase } from '../../lib/supabaseClient';

// Demo strategy data for testing
const DEMO_STRATEGIES = [
  {
    strategy_name: "High-Volume Creative Tester",
    preferences: {
      testing_approach: "high_volume_creative",
      creatives_per_campaign: 8,
      creative_refresh_days: 3,
      optimization_focus: "cost_per_lead",
      scaling_methodology: "conservative",
      scaling_increment: 0.2,
      campaign_structure: "few_adsets_many_creatives",
      automation_level: "moderate",
      budget_range: { min: 50, max: 500 }
    }
  },
  {
    strategy_name: "Messaging Angle Specialist", 
    preferences: {
      testing_approach: "angle_focused",
      creatives_per_angle: 3,
      testing_angles: ["problem_focused", "solution_focused", "social_proof"],
      optimization_focus: "conversion_rate", 
      scaling_methodology: "aggressive",
      scaling_increment: 0.5,
      campaign_structure: "many_adsets_focused_creatives",
      automation_level: "high",
      budget_range: { min: 100, max: 1000 }
    }
  },
  {
    strategy_name: "Conservative Audience Tester",
    preferences: {
      testing_approach: "audience_focused",
      creatives_per_campaign: 5,
      audience_segments: ["lookalike", "interest", "behavioral"],
      optimization_focus: "roas",
      scaling_methodology: "conservative",
      scaling_increment: 0.15,
      campaign_structure: "balanced",
      automation_level: "low",
      budget_range: { min: 25, max: 200 }
    }
  }
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user_id, strategy_type = 'all' } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID required' });
    }

    let strategiesToCreate = DEMO_STRATEGIES;
    
    if (strategy_type !== 'all') {
      strategiesToCreate = DEMO_STRATEGIES.filter(s => 
        s.strategy_name.toLowerCase().includes(strategy_type.toLowerCase())
      );
    }

    const results = [];

    for (const strategyData of strategiesToCreate) {
      // Create strategy
      const { data: strategy, error: strategyError } = await supabase
        .from('marketer_strategies')
        .insert({
          user_id: user_id,
          strategy_name: strategyData.strategy_name,
          preferences: strategyData.preferences,
          is_default: results.length === 0 // First one is default
        })
        .select()
        .single();

      if (strategyError) {
        console.error('Error creating strategy:', strategyError);
        continue;
      }

      // Create demo chat session for this strategy
      const demoMessages = generateDemoConversation(strategyData);
      
      const { data: chatSession, error: chatError } = await supabase
        .from('strategy_chat_sessions')
        .insert({
          user_id: user_id,
          strategy_id: strategy.id,
          messages: demoMessages,
          current_step: 'completed',
          extracted_preferences: strategyData.preferences
        })
        .select()
        .single();

      if (chatError) {
        console.error('Error creating chat session:', chatError);
      }

      results.push({
        strategy: strategy,
        chat_session: chatSession
      });
    }

    return res.status(200).json({
      message: `Created ${results.length} demo strategies`,
      strategies: results
    });

  } catch (error) {
    console.error('Demo data creation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function generateDemoConversation(strategyData) {
  const conversations = {
    "High-Volume Creative Tester": [
      {
        role: "assistant",
        content: "Hi! I'm here to help you set up your automated campaign strategy. Instead of filling out forms, just tell me in your own words: **How do you typically approach Meta ad campaigns?**",
        timestamp: new Date(Date.now() - 300000).toISOString()
      },
      {
        role: "user", 
        content: "I like to test a lot of creatives - usually around 8-10 per campaign. I refresh them every 3-4 days to keep things fresh. My main focus is getting the cost per lead down, and when something works I scale it up gradually, maybe 20% increases to not break what's working.",
        timestamp: new Date(Date.now() - 240000).toISOString()
      },
      {
        role: "assistant",
        content: "That's a solid high-volume testing approach! I can see you prioritize creative variety with conservative scaling to maintain performance. Tell me about your campaign structure - do you prefer fewer adsets with lots of creative variety, or many narrow adsets with focused creatives?",
        timestamp: new Date(Date.now() - 180000).toISOString()
      },
      {
        role: "user",
        content: "Definitely fewer adsets with more creative variety. I find it easier to manage and the algorithm seems to optimize better when it has more creative options within each adset.",
        timestamp: new Date(Date.now() - 120000).toISOString()
      },
      {
        role: "assistant", 
        content: "Perfect! I've got a clear picture of your strategy:\n\n• High-volume creative testing (8-10 creatives per campaign)\n• Creative refresh every 3-4 days\n• Focus on cost per lead optimization\n• Conservative scaling approach (20% increases)\n• Fewer adsets with more creative variety\n\nThis gives you maximum creative testing power while maintaining stable performance. Ready to set up your automation profile?",
        timestamp: new Date(Date.now() - 60000).toISOString()
      }
    ],
    
    "Messaging Angle Specialist": [
      {
        role: "assistant",
        content: "Hi! I'm here to help you set up your automated campaign strategy. Instead of filling out forms, just tell me in your own words: **How do you typically approach Meta ad campaigns?**",
        timestamp: new Date(Date.now() - 300000).toISOString()
      },
      {
        role: "user",
        content: "I'm all about testing different messaging angles. I'll create separate adsets for problem-focused messaging, solution-focused, and social proof approaches. Usually 3-4 creatives per angle. I optimize for conversion rate and when I find a winner, I scale it aggressively because good messaging angles can handle volume.",
        timestamp: new Date(Date.now() - 200000).toISOString()
      },
      {
        role: "assistant",
        content: "I love that systematic approach to angle testing! That's really smart to separate the messaging strategies. When you say you scale aggressively, what does that typically look like - 50% increases, doubling budgets?",
        timestamp: new Date(Date.now() - 120000).toISOString()
      },
      {
        role: "user", 
        content: "Usually 50% increases when the conversion rate is strong. Good messaging resonates broadly so I'm comfortable pushing it harder than creative-dependent campaigns.",
        timestamp: new Date(Date.now() - 60000).toISOString()
      }
    ]
  };

  return conversations[strategyData.strategy_name] || conversations["High-Volume Creative Tester"];
}