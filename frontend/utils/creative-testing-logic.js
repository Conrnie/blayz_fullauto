// Creative Testing Methodology Logic
// Handles sequential and simultaneous testing approaches for Meta ad campaigns

export const TESTING_APPROACHES = {
  SEQUENTIAL: 'sequential',
  SIMULTANEOUS: 'simultaneous',
  HYBRID: 'hybrid'
};

export const CREATIVE_ELEMENTS = {
  ANGLE: 'angle',
  IMAGE: 'image',
  HEADLINE: 'headline', 
  COPY: 'copy',
  CTA: 'cta'
};

/**
 * Creates a testing plan based on user's methodology preferences
 * @param {Object} methodology - User's creative testing methodology
 * @returns {Object} Structured testing plan
 */
export function createTestingPlan(methodology) {
  const {
    testing_approach,
    split_testing_priority,
    creative_element_impact,
    testing_duration
  } = methodology;

  if (testing_approach?.toLowerCase().includes('sequential')) {
    return createSequentialTestingPlan(split_testing_priority, testing_duration);
  } else if (testing_approach?.toLowerCase().includes('simultaneous')) {
    return createSimultaneousTestingPlan(creative_element_impact);
  } else {
    return createHybridTestingPlan(methodology);
  }
}

/**
 * Creates a sequential testing plan (test one element at a time)
 */
function createSequentialTestingPlan(priority, duration) {
  const priorityOrder = parsePriorityOrder(priority);
  const testDuration = parseDuration(duration);
  
  return {
    approach: TESTING_APPROACHES.SEQUENTIAL,
    phases: priorityOrder.map((element, index) => ({
      phase: index + 1,
      element: element,
      duration_days: testDuration,
      description: `Test ${element} variations for ${testDuration} days`,
      success_criteria: getSuccessCriteria(element),
      next_action: index < priorityOrder.length - 1 
        ? `Move to ${priorityOrder[index + 1]} testing`
        : 'Launch winning combination'
    })),
    total_duration: priorityOrder.length * testDuration,
    automation_rules: [
      'Automatically advance to next phase when statistical significance reached',
      'Pause losing variations after 24 hours if performance < 50% of winner',
      'Scale winning elements immediately in next phase'
    ]
  };
}

/**
 * Creates a simultaneous testing plan (test all elements together)
 */
function createSimultaneousTestingPlan(elementImpact) {
  const impactWeights = parseElementImpact(elementImpact);
  
  return {
    approach: TESTING_APPROACHES.SIMULTANEOUS,
    strategy: {
      description: 'Test all creative elements simultaneously with weighted focus',
      element_weights: impactWeights,
      testing_matrix: generateTestingMatrix(impactWeights),
      duration_days: 7,
      success_criteria: 'Overall campaign performance improvement'
    },
    automation_rules: [
      'Allocate more budget to high-impact elements',
      'Generate more variations for elements with highest impact weights',
      'Pause combinations with CTR < 1.0% after 48 hours'
    ]
  };
}

/**
 * Creates a hybrid testing plan (combination approach)
 */
function createHybridTestingPlan(methodology) {
  return {
    approach: TESTING_APPROACHES.HYBRID,
    strategy: {
      description: 'Start with high-impact elements, then test combinations',
      phase_1: 'Test highest impact element first (3 days)',
      phase_2: 'Test winning element + secondary elements simultaneously (4 days)',
      total_duration: 7
    },
    automation_rules: [
      'Begin with element identified as highest impact',
      'Automatically combine winners in phase 2',
      'Scale successful combinations immediately'
    ]
  };
}

/**
 * Helper functions
 */
function parsePriorityOrder(priority) {
  if (!priority) return [CREATIVE_ELEMENTS.ANGLE, CREATIVE_ELEMENTS.IMAGE, CREATIVE_ELEMENTS.HEADLINE, CREATIVE_ELEMENTS.COPY];
  
  const elements = priority.toLowerCase()
    .split(/[→>\-,\s]+/)
    .map(el => el.trim())
    .filter(el => el.length > 0);
    
  return elements.map(el => {
    if (el.includes('angle')) return CREATIVE_ELEMENTS.ANGLE;
    if (el.includes('image')) return CREATIVE_ELEMENTS.IMAGE;
    if (el.includes('headline')) return CREATIVE_ELEMENTS.HEADLINE;
    if (el.includes('copy')) return CREATIVE_ELEMENTS.COPY;
    if (el.includes('cta')) return CREATIVE_ELEMENTS.CTA;
    return el;
  });
}

function parseDuration(duration) {
  if (!duration) return 3;
  const match = duration.match(/\d+/);
  return match ? parseInt(match[0]) : 3;
}

function parseElementImpact(impact) {
  if (!impact) return { angle: 40, image: 35, headline: 20, copy: 5 };
  
  const weights = {};
  const matches = impact.match(/(\w+)\s*(\d+)%/g) || [];
  
  matches.forEach(match => {
    const [, element, percentage] = match.match(/(\w+)\s*(\d+)%/);
    weights[element.toLowerCase()] = parseInt(percentage);
  });
  
  return weights;
}

function getSuccessCriteria(element) {
  const criteria = {
    angle: 'CTR improvement > 25% or conversion rate > 15% (angles drive core messaging)',
    image: 'CTR improvement > 20% or CTR > 2.0%',
    headline: 'CTR improvement > 15% or engagement rate > 3%',
    copy: 'Conversion rate improvement > 10%',
    cta: 'Click-through rate improvement > 25%'
  };
  
  return criteria[element] || 'Performance improvement > 15%';
}

function generateTestingMatrix(weights) {
  const elements = Object.keys(weights);
  const variations = {
    high_impact: elements.filter(el => weights[el] >= 50),
    medium_impact: elements.filter(el => weights[el] >= 20 && weights[el] < 50),
    low_impact: elements.filter(el => weights[el] < 20)
  };
  
  return {
    primary_focus: variations.high_impact,
    secondary_focus: variations.medium_impact,
    minimal_testing: variations.low_impact,
    recommended_combinations: generateCombinations(variations)
  };
}

function generateCombinations(variations) {
  const combinations = [];
  
  // High impact + medium impact combinations
  variations.high_impact.forEach(high => {
    variations.medium_impact.forEach(medium => {
      combinations.push(`${high} + ${medium}`);
    });
  });
  
  return combinations.slice(0, 6); // Limit to 6 combinations
}

/**
 * Common angle testing strategies for lead generation
 */
export const ANGLE_STRATEGIES = {
  PAIN_VS_BENEFIT: {
    name: 'Pain Point vs Benefit',
    angles: [
      'Problem-focused: "Struggling with [pain point]?"',
      'Solution-focused: "Get [desired outcome] in [timeframe]"',
      'Urgency-focused: "Stop [pain] before it gets worse"',
      'Aspiration-focused: "Achieve [dream outcome] faster"'
    ],
    testing_approach: 'Test pain point angles first, then benefit angles with winning pain points'
  },
  AWARENESS_LEVELS: {
    name: 'Customer Awareness Levels',
    angles: [
      'Problem-unaware: "Most people don\'t realize [hidden problem]"',
      'Problem-aware: "If you\'re dealing with [known problem]..."',
      'Solution-aware: "Unlike other [solutions], this [unique approach]..."',
      'Product-aware: "See why [product] outperforms [competitor]"'
    ],
    testing_approach: 'Start with problem-aware, then test solution-aware with winning messaging'
  },
  SOCIAL_PROOF_ANGLES: {
    name: 'Social Proof & Authority',
    angles: [
      'Expert authority: "[Industry expert] reveals [secret]"',
      'Peer proof: "How [similar person] achieved [result]"',
      'Numbers proof: "Join [X] people who [achieved result]"',
      'Case study: "[Specific person] went from [before] to [after]"'
    ],
    testing_approach: 'Test authority angles first, then peer proof with winning authority messaging'
  }
};

/**
 * Generates angle testing plan based on strategy
 */
export function generateAngleTestingPlan(angleStrategy, industry = 'general') {
  const strategy = detectAngleStrategy(angleStrategy);
  
  return {
    strategy_type: strategy.name,
    testing_phases: strategy.angles.map((angle, index) => ({
      phase: index + 1,
      angle_type: angle.split(':')[0],
      message_framework: angle.split(':')[1]?.trim(),
      duration_days: 3,
      success_criteria: 'CTR > 2.0% and CPL within target range'
    })),
    automation_rules: [
      'Test 2-3 variations per angle type',
      'Advance to next angle when statistical significance reached',
      'Combine winning angles with top-performing images in phase 2'
    ],
    recommended_variations: generateAngleVariations(strategy, industry)
  };
}

function detectAngleStrategy(strategy) {
  if (!strategy) return ANGLE_STRATEGIES.PAIN_VS_BENEFIT;
  
  const strategyLower = strategy.toLowerCase();
  
  if (strategyLower.includes('pain') || strategyLower.includes('benefit')) {
    return ANGLE_STRATEGIES.PAIN_VS_BENEFIT;
  }
  if (strategyLower.includes('aware') || strategyLower.includes('problem')) {
    return ANGLE_STRATEGIES.AWARENESS_LEVELS;
  }
  if (strategyLower.includes('social') || strategyLower.includes('proof')) {
    return ANGLE_STRATEGIES.SOCIAL_PROOF_ANGLES;
  }
  
  return ANGLE_STRATEGIES.PAIN_VS_BENEFIT;
}

function generateAngleVariations(strategy, industry) {
  const baseVariations = strategy.angles.slice(0, 2); // Take first 2 angles
  
  return baseVariations.map(angle => ({
    angle_framework: angle,
    variations: [
      'Direct approach: [Framework] + immediate value prop',
      'Question format: Turn framework into compelling question',
      'Story format: "[Customer type] discovered [solution]..."'
    ]
  }));
}

/**
 * Generates automation rules based on testing methodology
 */
export function generateAutomationRules(testingPlan, campaignGoals) {
  const baseRules = [
    'Monitor performance every 6 hours',
    'Pause ads with CTR < 0.8% after 24 hours',
    'Scale winning variations by 50% when CPL target is met'
  ];
  
  const approachSpecificRules = {
    [TESTING_APPROACHES.SEQUENTIAL]: [
      'Advance to next testing phase automatically when significance reached',
      'Carry forward winning elements to next phase',
      'Maintain budget allocation across phases'
    ],
    [TESTING_APPROACHES.SIMULTANEOUS]: [
      'Reallocate budget to winning combinations every 12 hours',
      'Generate new variations for top-performing elements',
      'Test maximum 12 combinations simultaneously'
    ],
    [TESTING_APPROACHES.HYBRID]: [
      'Switch to combination testing after phase 1 completion',
      'Prioritize budget for validated high-impact elements',
      'Maintain 70/30 budget split between phases'
    ]
  };
  
  return {
    base_rules: baseRules,
    approach_rules: approachSpecificRules[testingPlan.approach] || [],
    campaign_specific: generateCampaignSpecificRules(campaignGoals)
  };
}

function generateCampaignSpecificRules(goals) {
  if (!goals) return [];
  
  const rules = [];
  
  if (goals.cpl_target) {
    rules.push(`Scale when CPL < $${goals.cpl_target}`);
    rules.push(`Pause when CPL > $${goals.cpl_target * 1.5}`);
  }
  
  if (goals.ctr_target) {
    rules.push(`Generate new creatives when CTR < ${goals.ctr_target}%`);
  }
  
  return rules;
}