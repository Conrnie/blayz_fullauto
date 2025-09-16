{
  "nodes": [
    {
      "parameters": {
        "jsCode": "// Extract visual description from Claude's JSON response and format for Gemini API\nconst claudeResponse = $input.all()[0].json.text;\n\n// Parse Claude's JSON response\nlet visualDescription;\ntry {\n  const parsedResponse = JSON.parse(claudeResponse);\n  visualDescription = parsedResponse.visual_description || claudeResponse;\n} catch (error) {\n  // Fallback if parsing fails\n  visualDescription = claudeResponse;\n}\n\n// Create the properly formatted JSON body for Gemini API\nconst jsonBody = {\n  \"contents\": [\n    {\n      \"parts\": [\n        {\n          \"text\": visualDescription\n        }\n      ]\n    }\n  ],\n  \"generationConfig\": {\n    \"temperature\": 0.7,\n    \"maxOutputTokens\": 1024\n  }\n};\n\nreturn {\n  json: {\n    body: JSON.stringify(jsonBody)\n  }\n};"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        4240,
        1760
      ],
      "id": "0d470b12-e711-459e-a0f8-d939315a682a",
      "name": "Format JSON Body"
    },
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "1ffd1467-a5f0-48a2-a735-ab0ccfbf2e37",
        "options": {}
      },
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2.1,
      "position": [
        3472,
        1760
      ],
      "id": "79d63ddf-6561-4c7c-bd91-f015f8c8e815",
      "name": "Webhook1",
      "webhookId": "1ffd1467-a5f0-48a2-a735-ab0ccfbf2e37"
    },
    {
      "parameters": {
        "promptType": "define",
        "text": "=You are an expert Meta Ads creative strategist specializing in visual ad creative generation. Your task is to analyze the provided company profile and user instructions to create a detailed visual concept for ad creative generation.\n\n**Input Data:**\n- Company Profile\n\n-------------------------------------------------------\n\nCompany-Name: {{ $json.body.company_profile.company_name }}\n\nBrand_Colors: \n{{ $json.body.company_profile.display_summary.brand_colors.values() }}\n\nSummary: \n{{ $json.body.company_profile.full_profile.summary }}\n\nBrand_voice: \n{{ $json.body.company_profile.full_profile.branding.brand_voice_inferred }}\n\nIndustry: \n{{ $json.body.company_profile.full_profile.industry }}\n\nTarget_market. \nPsychographic:\n{{ $json.body.company_profile.full_profile.target_market }}\nDemographics:\n{{ $json.body.company_profile.full_profile.target_audience.demographics_hints }}\n\nProduct-Offers:\n{{ $json.body.company_profile.full_profile.products_offers[0].values() }}\n\nObservered_painpoints:\n{{ $json.body.company_profile.full_profile.target_audience.observed_pain_points_solved }}\n\nKey_needs:\n{{ $json.body.company_profile.full_profile.target_audience.key_needs_addressed_by_products }}\n\nPrimary_offer:\n{{ $json.body.company_profile.full_profile.primary_offering }}\n\nKey_differenator:\n{{ $json.body.company_profile.full_profile.key_differentiators }}\n\nConsiderations:\n{{ $json.body.company_profile.full_profile.customer_journey_inferred.consideration_factors_highlighted }}\n\nPricing_strategy:\n{{ $json.body.company_profile.full_profile.pricing_strategy_observed.values() }}\n\nUnique_value:\n{{ $json.body.company_profile.full_profile.unique_value_proposition_uvp_inferred }}\n\nKey_milestones:\n{{ $json.body.company_profile.full_profile.goals_and_milestones_from_custom_knowledge.key_milestones_achieved_or_targeted }}\n\nCompetitor_overview:\n{{ $json.body.company_profile.full_profile.competitor_overview_from_custom_knowledge_or_research }}\n\n-------------------------------------------------------\n\n- User Instructions:\n{{ $json.body.user_instructions }}\n\n**Your Task:**\nCreate a detailed visual description for generating a business advertisement image. Focus on:\n\n1. **Visual Composition**: Detailed description of the image layout, elements, and arrangement\n2. **Visual Style**: Photography, illustration, or graphic design approach\n3. **Color Scheme**: Specific colors that align with brand (primary: #FE8401, secondary: #FF9933, accent: #FFF7EB)\n4. **Mood and Tone**: Emotional feel the visual should convey\n5. **Brand Elements**: How to incorporate logo, typography, and brand identity\n6. **Key Message**: How to visually represent the value proposition\n\nProvide a comprehensive, detailed description that an AI image generator can use to create the advertisement. Be specific about composition, colors, lighting, style, and visual elements.\n\nRespond ONLY in JSON format with the following structure:\n{\n  \"visual_description\": \"your detailed visual description here\"\n}",
        "batching": {}
      },
      "type": "@n8n/n8n-nodes-langchain.chainLlm",
      "typeVersion": 1.7,
      "position": [
        3888,
        1760
      ],
      "id": "73e716a3-46af-48df-b4b2-22a1c4d197b7",
      "name": "Basic LLM Chain1"
    },
    {
      "parameters": {
        "model": {
          "__rl": true,
          "mode": "list",
          "value": "claude-sonnet-4-20250514",
          "cachedResultName": "Claude 4 Sonnet"
        },
        "options": {}
      },
      "type": "@n8n/n8n-nodes-langchain.lmChatAnthropic",
      "typeVersion": 1.3,
      "position": [
        3760,
        1904
      ],
      "id": "b9585b25-8690-494a-b446-5b4c13b52ddd",
      "name": "Anthropic Chat Model1",
      "credentials": {
        "anthropicApi": {
          "id": "P9gk0MwcOtzFTEdi",
          "name": "Anthropic account"
        }
      }
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "X-goog-api-key",
              "value": "AIzaSyCpWdBJ1VdCZRrkYctYxZXN70yp1I2fGas"
            },
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ $json.body }}",
        "options": {
          "response": {
            "response": {}
          }
        }
      },
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [
        4864,
        1760
      ],
      "id": "43f30fee-8255-4a72-aa13-b572d31375f1",
      "name": "HTTP Request1"
    },
    {
      "parameters": {
        "jsCode": "// Extract and validate generated image\nconst geminiResponse = $input.all()[0].json;\n\n// Extract the base64 image data from Gemini response\nlet imageData = null;\nlet success = false;\nlet error = null;\n\ntry {\n  if (geminiResponse.candidates && geminiResponse.candidates[0] && \n      geminiResponse.candidates[0].content && geminiResponse.candidates[0].content.parts) {\n    \n    // Look for image data in the response\n    const parts = geminiResponse.candidates[0].content.parts;\n    for (const part of parts) {\n      if (part.inlineData && part.inlineData.data) {\n        imageData = part.inlineData.data;\n        success = true;\n        break;\n      }\n    }\n  }\n  \n  if (!imageData) {\n    error = 'No image data found in Gemini response';\n  }\n} catch (e) {\n  error = `Error processing Gemini response: ${e.message}`;\n}\n\n// Store image for quality validation\nreturn {\n  json: {\n    success: success,\n    image_data: imageData,\n    gemini_response: geminiResponse,\n    error: error\n  }\n};"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        5072,
        1760
      ],
      "id": "b109c77c-80ad-414a-b874-e910f9d54946",
      "name": "Extract Image Data"
    },
    {
      "parameters": {
        "model": {
          "__rl": true,
          "mode": "list",
          "value": "gemini-2.5-flash-image-preview",
          "cachedResultName": "Gemini 2.5 Flash Image Preview"
        },
        "promptType": "define",
        "text": "You are an expert image quality analyst specializing in advertising creatives. Analyze the provided image and evaluate its quality for Meta Ads campaigns.\n\nEvaluate the image on these criteria (score each 1-10):\n\n**Technical Quality (1-10):**\n- Image resolution and clarity\n- Color balance and saturation\n- Composition and framing\n- Visual hierarchy\n\n**Marketing Effectiveness (1-10):**\n- Brand message clarity\n- Visual appeal to target audience\n- Call-to-action visibility\n- Emotional impact\n\n**Brand Alignment (1-10):**\n- Consistency with brand colors\n- Brand voice representation\n- Professional appearance\n- Industry appropriateness\n\n**Overall Assessment:**\nProvide an overall score (1-10) and determine if the image meets quality standards (7+ is acceptable).\n\nRespond ONLY in JSON format:\n{\n  \"overall_score\": number,\n  \"is_acceptable\": boolean,\n  \"scores\": {\n    \"technical_quality\": number,\n    \"marketing_effectiveness\": number,\n    \"brand_alignment\": number\n  },\n  \"analysis\": \"detailed analysis text\",\n  \"improvement_suggestions\": [\"suggestion1\", \"suggestion2\"]\n}",
        "options": {
          "systemMessage": "You are a professional advertising creative analyst with expertise in Meta Ads performance optimization."
        }
      },
      "type": "@n8n/n8n-nodes-langchain.chainLlm",
      "typeVersion": 1.7,
      "position": [
        5280,
        1760
      ],
      "id": "quality-validator-node",
      "name": "Quality Validator"
    },
    {
      "parameters": {
        "model": {
          "__rl": true,
          "mode": "list",
          "value": "gemini-2.5-flash-image-preview",
          "cachedResultName": "Gemini 2.5 Flash Image Preview"
        },
        "options": {}
      },
      "type": "@n8n/n8n-nodes-langchain.lmChatGoogleGenerativeAi",
      "typeVersion": 1.1,
      "position": [
        5152,
        1904
      ],
      "id": "gemini-quality-model",
      "name": "Gemini Quality Model",
      "credentials": {
        "googleGenerativeAiApi": {
          "id": "your-gemini-credentials-id",
          "name": "Google Generative AI"
        }
      }
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": "",
            "typeValidation": "strict"
          },
          "conditions": [
            {
              "id": "quality-check",
              "leftValue": "={{ JSON.parse($json.text).is_acceptable }}",
              "rightValue": true,
              "operator": {
                "type": "boolean",
                "operation": "equals"
              }
            }
          ],
          "combinator": "and"
        },
        "options": {}
      },
      "type": "n8n-nodes-base.if",
      "typeVersion": 2,
      "position": [
        5488,
        1760
      ],
      "id": "quality-decision-node",
      "name": "Quality Decision"
    },
    {
      "parameters": {
        "jsCode": "// Prepare enhanced image generation prompt\nconst qualityAnalysis = JSON.parse($input.all()[0].json.text);\nconst originalImageData = $input.all()[1].json.image_data;\nconst originalPrompt = $input.all()[1].json.gemini_response;\n\n// Create enhancement prompt based on quality analysis\nconst enhancementPrompt = {\n  \"contents\": [\n    {\n      \"parts\": [\n        {\n          \"text\": `Improve this advertising image based on the following analysis and suggestions:\\n\\nQuality Analysis: ${qualityAnalysis.analysis}\\n\\nImprovement Suggestions:\\n${qualityAnalysis.improvement_suggestions.map(s => `- ${s}`).join('\\n')}\\n\\nGenerate an enhanced version that addresses these issues while maintaining the original concept and brand elements.`\n        }\n      ]\n    }\n  ],\n  \"generationConfig\": {\n    \"temperature\": 0.7,\n    \"maxOutputTokens\": 1024\n  }\n};\n\nreturn {\n  json: {\n    body: JSON.stringify(enhancementPrompt),\n    original_analysis: qualityAnalysis\n  }\n};"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        5696,
        1904
      ],
      "id": "enhancement-prompt-node",
      "name": "Enhancement Prompt"
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "X-goog-api-key",
              "value": "AIzaSyCpWdBJ1VdCZRrkYctYxZXN70yp1I2fGas"
            },
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ $json.body }}",
        "options": {
          "response": {
            "response": {}
          }
        }
      },
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [
        5904,
        1904
      ],
      "id": "enhancement-generation-node",
      "name": "Generate Enhanced Image"
    },
    {
      "parameters": {
        "jsCode": "// Format final response with quality analysis\nconst qualityData = $input.all()[0].json;\nconst enhancedResponse = $input.all()[1] ? $input.all()[1].json : null;\nconst originalData = $input.all()[2].json;\n\nlet finalImageData = null;\nlet wasEnhanced = false;\nlet qualityAnalysis = null;\n\ntry {\n  // Parse quality analysis\n  qualityAnalysis = JSON.parse(qualityData.text);\n  \n  if (enhancedResponse && enhancedResponse.candidates && enhancedResponse.candidates[0]) {\n    // Use enhanced image\n    const parts = enhancedResponse.candidates[0].content.parts;\n    for (const part of parts) {\n      if (part.inlineData && part.inlineData.data) {\n        finalImageData = part.inlineData.data;\n        wasEnhanced = true;\n        break;\n      }\n    }\n  }\n  \n  // Fallback to original if enhancement failed\n  if (!finalImageData && originalData.image_data) {\n    finalImageData = originalData.image_data;\n    wasEnhanced = false;\n  }\n\n} catch (e) {\n  // Use original image if parsing fails\n  finalImageData = originalData.image_data;\n  wasEnhanced = false;\n}\n\n// Return comprehensive response\nreturn {\n  json: {\n    success: !!finalImageData,\n    data: {\n      image: finalImageData ? `data:image/png;base64,${finalImageData}` : null,\n      quality_analysis: {\n        overall_score: qualityAnalysis?.overall_score || 0,\n        was_enhanced: wasEnhanced,\n        analysis: qualityAnalysis?.analysis || \"Quality analysis unavailable\",\n        scores: qualityAnalysis?.scores || {},\n        processing_note: wasEnhanced ? \"Image was enhanced based on quality analysis\" : \"Original image met quality standards\"\n      }\n    },\n    error: !finalImageData ? \"Failed to generate or enhance image\" : null,\n    timestamp: new Date().toISOString()\n  }\n};"
      },
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [
        6112,
        1760
      ],
      "id": "final-response-formatter",
      "name": "Format Final Response"
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ $json }}",
        "options": {}
      },
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.1,
      "position": [
        6320,
        1760
      ],
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Respond to Webhook"
    }
  ],
  "connections": {
    "Format JSON Body": {
      "main": [
        [
          {
            "node": "HTTP Request1",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Webhook1": {
      "main": [
        [
          {
            "node": "Basic LLM Chain1",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Basic LLM Chain1": {
      "main": [
        [
          {
            "node": "Format JSON Body",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Anthropic Chat Model1": {
      "ai_languageModel": [
        [
          {
            "node": "Basic LLM Chain1",
            "type": "ai_languageModel",
            "index": 0
          }
        ]
      ]
    },
    "HTTP Request1": {
      "main": [
        [
          {
            "node": "Extract Image Data",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Extract Image Data": {
      "main": [
        [
          {
            "node": "Quality Validator",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Quality Validator": {
      "main": [
        [
          {
            "node": "Quality Decision",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Gemini Quality Model": {
      "ai_languageModel": [
        [
          {
            "node": "Quality Validator",
            "type": "ai_languageModel",
            "index": 0
          }
        ]
      ]
    },
    "Quality Decision": {
      "main": [
        [
          {
            "node": "Final Response Formatter",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Enhancement Prompt",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Enhancement Prompt": {
      "main": [
        [
          {
            "node": "Generate Enhanced Image",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Generate Enhanced Image": {
      "main": [
        [
          {
            "node": "Format Final Response",
            "type": "main",
            "index": 1
          }
        ]
      ]
    },
    "Format Final Response": {
      "main": [
        [
          {
            "node": "Respond to Webhook",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "pinData": {
    "Webhook1": [
      {
        "headers": {
          "host": "primary-production-7c692.up.railway.app",
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
          "content-length": "7767",
          "accept": "*/*",
          "accept-encoding": "gzip, deflate, br, zstd",
          "accept-language": "nl-NL,nl;q=0.8",
          "content-type": "application/json",
          "origin": "http://localhost:3002",
          "priority": "u=1, i",
          "referer": "http://localhost:3002/",
          "sec-ch-ua": "\"Chromium\";v=\"140\", \"Not=A?Brand\";v=\"24\", \"Brave\";v=\"140\"",
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": "\"Windows\"",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "cross-site",
          "sec-gpc": "1",
          "x-forwarded-for": "178.228.229.167",
          "x-forwarded-host": "primary-production-7c692.up.railway.app",
          "x-forwarded-proto": "https",
          "x-railway-edge": "railway/europe-west4-drams3a",
          "x-railway-request-id": "TcGPbwN8QVejD3nUjUJq2g",
          "x-real-ip": "178.228.229.167",
          "x-request-start": "1757098542284"
        },
        "params": {},
        "query": {},
        "body": {
          "user_instructions": "Make a split screen ad with before and after blayz.\n\nWith the headline: \"Still Manually Analyzing?\"",
          "company_profile": {
            "profile_id": "49c5820f-8e7b-4659-b495-2b71192c477c",
            "company_name": "Blayz",
            "website_url": "https://www.blayz.io",
            "created_at": "2025-08-17T08:13:25.116586+00:00",
            "last_updated_at": "2025-08-17T09:29:08.061+00:00",
            "status": "completed",
            "display_summary": {
              "brand_colors": {
                "accent": "#FFF7EB",
                "primary": "#FE8401",
                "secondary": "#FF9933",
                "customColors": []
              }
            },
            "full_profile": {
              "name": "Blayz",
              "summary": "Blayz is an automated AI-powered platform designed to analyze Meta Ads campaigns. It identifies performance issues and budget drain, providing clear, actionable insights and recommendations to optimize ad spend and improve campaign efficiency.",
              "branding": {
                "slogan_observed": "Stop Throwing Away 30% of Your Meta Ad Budget to Zuckerberg",
                "brand_voice_inferred": "Problem-solving, efficient, clear, empowering, direct, and focused on immediate value and time/cost savings.",
                "color_palette_observed": "not found",
                "logo_description_or_url": "Blayz Logo; Blayz Dashboard Interface showing campaign analytics and insights"
              },
              "industry": "Ad Tech",
              "location": "not found",
              "business_name": "Blayz",
              "target_market": "Businesses and marketing professionals managing Meta Ads campaigns.",
              "products_offers": [
                {
                  "name": "Automated Meta Ads Analysis and Recommendations Platform",
                  "description": "Blayz connects to Meta Ads accounts via a secure API to automatically analyze campaign performance. It identifies budget-draining issues like broken conversion tracking, missed peak hours, or wrong audience targeting, and highlights hidden opportunities (top-performing ads, audience goldmines, optimal times/devices). It delivers clear, prioritized action items and professional reports.",
                  "target_customer_hint": "Meta Ads managers, marketing agencies, businesses running Meta Ads campaigns who struggle with manual reporting, budget waste, and lack of clear insights."
                }
              ],
              "profile_purpose": "To provide deep contextual understanding of Blayz for enhanced ad campaign analysis.",
              "target_audience": {
                "demographics_hints": "not found",
                "psychographics_hints": "Seek efficiency, value data-driven decisions, desire control over ad spend, frustrated with manual processes, proactive in optimizing campaigns, financially conscious (seeking to save ad budget).",
                "primary_segments_observed": [
                  "Meta Ads Managers",
                  "Marketing Agencies",
                  "Businesses running Meta Ads"
                ],
                "observed_pain_points_solved": [
                  "Spreadsheet Hell (hours wasted, insights buried)",
                  "Endless Reporting (time lost on creating basic reports)",
                  "Campaign Nightmares (CPA spikes, budget bleeding without clear cause)",
                  "Client Anxiety (explaining performance dips with unclear data)",
                  "Always Reactive (constantly checking stats, putting out fires)",
                  "Throwing away 30% of Meta Ad Budget to Zuckerberg"
                ],
                "key_needs_addressed_by_products": [
                  "Need for clear, actionable insights from complex Meta Ads data",
                  "Reduction of time spent on manual reporting and analysis",
                  "Proactive identification and resolution of campaign issues (e.g., CPA skyrockets, budget bleeding)",
                  "Ability to confidently explain performance to clients with clear data",
                  "Transition from reactive to proactive campaign management"
                ]
              },
              "primary_offering": "Automated Meta Ads campaign analysis and optimization recommendations.",
              "displayed_summary": "Blayz is an AI-powered Meta Ads analyst that pinpoints exactly what's draining your ad budget in seconds, transforming chaos into clarity for campaign managers.",
              "key_differentiators": [
                "Specialized AI agents tailored for Meta Ads data analysis",
                "Exceptional speed (60 seconds to 2 minutes for diagnosis, 240x faster than manual)",
                "Delivers deep, actionable insights and precise recommendations, not just surface-level observations",
                "Focus on quantifiable budget savings (e.g., average $2,000+ monthly savings)",
                "Secure Meta API integration (read-only access, OAuth 2.0)",
                "Identifies specific 'Campaign Killers' and 'Hidden Opportunities'"
              ],
              "customer_journey_inferred": {
                "advocacy_drivers_hint": "not found",
                "retention_strategies_hint": "Actively 'Building with Real Users' by allowing early beta users to 'shape the tool's development'. Potential 'deal' for beta users when it transitions to paid, suggesting loyalty incentives.",
                "awareness_channels_observed": [
                  "Company Website (blayz.io)",
                  "Beta Program Announcements (e.g., 'Free Beta Now Available')"
                ],
                "consideration_factors_highlighted": [
                  "Free Beta Access",
                  "No credit card required",
                  "2-minute setup",
                  "Secure Meta API integration",
                  "Instant transformation from chaos to clarity",
                  "240x faster than manual analysis",
                  "Potential average $2,000+ monthly savings",
                  "AI diagnosis combined with user expertise for winning campaigns"
                ],
                "purchase_triggers_or_process_hint": "The current trigger is 'Free Beta Access' with no credit card required and a promise of significant savings and efficiency. After the beta, it will become a paid service, with users choosing to subscribe after receiving notice. The core trigger is the immediate and quantifiable value proposition of saving money and time on Meta Ads."
              },
              "pricing_strategy_observed": {
                "pricing_model_hint": "Currently free Beta Access; will transition to a paid subscription model after the beta phase.",
                "price_points_observed_or_range": "Free Beta Access",
                "competitive_positioning_on_price": "Initially free to encourage adoption and gather user feedback, positioning itself as a superior, specialized alternative to manual analysis or generic AI tools.",
                "value_proposition_related_to_price": "The value proposition emphasizes significant time savings (240x faster analysis) and substantial financial savings (average $2,000+ monthly savings) by catching budget-draining issues."
              },
              "distribution_channels_observed": [
                "Direct via company website (blayz.io)"
              ],
              "unique_value_proposition_uvp_inferred": "Blayz provides an automated, AI-powered analysis of Meta Ads campaigns that precisely identifies budget drains and hidden opportunities 240x faster than manual methods, delivering deep, actionable insights and potentially saving thousands of dollars monthly, unlike generic AI tools.",
              "goals_and_milestones_from_custom_knowledge": {
                "stated_long_term_goals": [
                  "Transition from free beta to a paid subscription service",
                  "Expand beyond current beta capacity (Next expansion: March 2025)"
                ],
                "stated_short_term_goals": [
                  "Fill limited beta access spots",
                  "Continue building with real users and integrating feedback"
                ],
                "key_milestones_achieved_or_targeted": [
                  "23 Campaigns Analyzed in June",
                  "2.3 minutes average diagnosis time",
                  "67% of analyzed campaigns had budget misallocation",
                  "Diagnosis completed in 1.8 minutes for a specific example campaign",
                  "Potential savings: $2,400/month identified for a specific example campaign",
                  "40% faster campaign analysis for current users"
                ]
              },
              "competitor_overview_from_custom_knowledge_or_research": [
                {
                  "competitor_name": "Manual Spreadsheet Analysis",
                  "perceived_strengths": [
                    "No direct software cost"
                  ],
                  "perceived_weaknesses": [
                    "Time-consuming (8+ hours/week wasted)",
                    "Insights buried and difficult to find",
                    "Error-prone",
                    "Leads to reactive campaign management",
                    "Results in wasted ad spend"
                  ],
                  "market_position_relative": "Traditional, inefficient, and costly in terms of time and lost ad budget."
                },
                {
                  "competitor_name": "Generic AI (e.g., ChatGPT with spreadsheet upload)",
                  "perceived_strengths": [
                    "Can process data for basic observations"
                  ],
                  "perceived_weaknesses": [
                    "Provides only surface-level observations",
                    "Lacks specialized analysis for Meta Ads campaigns",
                    "Does not deliver deep, actionable insights with precise recommendations"
                  ],
                  "market_position_relative": "Basic, non-specialized, provides limited actionable value compared to Blayz."
                }
              ]
            },
            "error_message": null
          },
          "user_id": "8044b492-ffbf-46ed-87d3-ddf13e841e96"
        },
        "webhookUrl": "https://primary-production-7c692.up.railway.app/webhook/1ffd1467-a5f0-48a2-a735-ab0ccfbf2e37",
        "executionMode": "production"
      }
    ]
  },
  "meta": {
    "templateCredsSetupCompleted": true,
    "instanceId": "23d7b5a2563450a4c8d873c239b6511aba49aac884c119adeb90c4ff59ba6400"
  }
}