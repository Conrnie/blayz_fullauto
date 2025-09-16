import React, { useState, useEffect, useRef } from 'react';
import supabase from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import ReportView from './ReportView';

const AssistantChat = ({ assistant, conversation, onClose }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [analysisMode, setAnalysisMode] = useState(false);
  const [selectedTool, setSelectedTool] = useState(null);
  const [showTools, setShowTools] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [campaignContext, setCampaignContext] = useState(null);
  const [showReportHistory, setShowReportHistory] = useState(false);
  const [reportHistory, setReportHistory] = useState([]);

  // Persist report data and campaign context in localStorage (but not showReport state)
  useEffect(() => {
    const savedReportData = localStorage.getItem('assistantReportData');
    const savedCampaignContext = localStorage.getItem('assistantCampaignContext');
    
    if (savedReportData) {
      try {
        setReportData(JSON.parse(savedReportData));
      } catch (e) {
        console.error('Error parsing saved report data:', e);
        localStorage.removeItem('assistantReportData');
      }
    }
    
    // Don't automatically show report when starting a new chat session
    // Users should explicitly click "View Reports" to see reports
    
    if (savedCampaignContext) {
      try {
        const parsedContext = JSON.parse(savedCampaignContext);
        console.log('Restored campaign context from localStorage:', parsedContext);
        setCampaignContext(parsedContext);
      } catch (e) {
        console.error('Error parsing saved campaign context:', e);
        localStorage.removeItem('assistantCampaignContext');
      }
    } else {
      console.log('No saved campaign context found in localStorage');
    }
  }, []);

  // Save report data to localStorage when it changes
  useEffect(() => {
    if (reportData) {
      localStorage.setItem('assistantReportData', JSON.stringify(reportData));
    } else {
      localStorage.removeItem('assistantReportData');
    }
  }, [reportData]);

  // Note: showReport state is not persisted to localStorage anymore
  // This ensures users always start with the chat interface when opening a new session

  // Save campaign context to localStorage when it changes
  useEffect(() => {
    if (campaignContext) {
      localStorage.setItem('assistantCampaignContext', JSON.stringify(campaignContext));
    } else {
      localStorage.removeItem('assistantCampaignContext');
    }
  }, [campaignContext]);

  // Function to clear stored report data (useful for cleanup)
  const clearStoredReportData = () => {
    localStorage.removeItem('assistantReportData');
    localStorage.removeItem('assistantCampaignContext');
    setReportData(null);
    setShowReport(false);
    setCampaignContext(null);
  };

  const fetchReportHistory = async () => {
    if (!user || !user.id) {
      alert('Please log in to view reports.');
      return;
    }

    const contextToUse = campaignContext;
    if (!contextToUse?.campaign_id) {
      alert('No campaign context available.');
      return;
    }

    try {
      console.log('Fetching report history for campaign_id:', contextToUse.campaign_id, 'user_id:', user.id);
      
      // Fetch all reports from both tables
      // Try to load reports with current campaign_id first, then fallback to user's reports
      const [campaignReportsResult, assistantReportsResult] = await Promise.all([
        supabase
          .from('campaign_reports')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('assistant_reports')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
      ]);
      
      // Combine results
      const allReports = [];
      if (campaignReportsResult.data && campaignReportsResult.data.length > 0) {
        allReports.push(...campaignReportsResult.data.map(r => ({ ...r, source: 'campaign_reports' })));
      }
      if (assistantReportsResult.data && assistantReportsResult.data.length > 0) {
        allReports.push(...assistantReportsResult.data.map(r => ({ ...r, source: 'assistant_reports' })));
      }
      
      // Sort by created_at (most recent first)
      const sortedReports = allReports.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      console.log('Report history fetched:', sortedReports);
      setReportHistory(sortedReports);
      
    } catch (error) {
       console.error('Error fetching report history:', error);
       alert('Error loading report history. Please try again.');
     }
   };

   const loadSpecificReport = (report) => {
     try {
       let parsedReportData = report;
       
       // Handle different data structures based on source
       if (report.source === 'campaign_reports') {
         // Handle campaign_reports format
         if (typeof report.report_data === 'string') {
           try {
             parsedReportData = {
               ...report,
               report_data: JSON.parse(report.report_data),
               ai_insights: typeof report.ai_insights === 'string' ? JSON.parse(report.ai_insights) : report.ai_insights
             };
           } catch (parseError) {
             console.error('Error parsing campaign report data:', parseError);
             alert('Error parsing report data. Please try again.');
             return;
           }
         }
       } else {
         // Handle assistant_reports format
         let reportContent = report.report_content;
         let aiInsights = report.ai_insights;
         
         // Try to parse JSON strings if they exist
         if (typeof reportContent === 'string') {
           try {
             reportContent = JSON.parse(reportContent);
           } catch (e) {
             // report_content is not JSON, use as-is
           }
         }
         
         if (typeof aiInsights === 'string') {
           try {
             aiInsights = JSON.parse(aiInsights);
           } catch (e) {
             // ai_insights is not JSON, use as-is
           }
         }
         
         parsedReportData = {
           ...report,
           report_data: reportContent,
           ai_insights: aiInsights
         };
       }
       
       setReportData(parsedReportData);
       setShowReport(true);
       setShowReportHistory(false);
       
     } catch (error) {
       console.error('Error loading specific report:', error);
       alert('Error loading report. Please try again.');
     }
   };

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const handleInputChange = (e) => {
  setInputValue(e.target.value);
  if (textareaRef.current) {
    textareaRef.current.style.height = 'auto';
    const scrollHeight = textareaRef.current.scrollHeight;
    const maxHeight = 200;
    if (scrollHeight > maxHeight) {
      textareaRef.current.style.height = `${maxHeight}px`;
      textareaRef.current.style.overflowY = 'auto';
    } else {
      textareaRef.current.style.height = `${scrollHeight}px`;
      textareaRef.current.style.overflowY = 'hidden';
    }
  }
};

  // Available tools for the assistant
  const availableTools = [
    {
      id: 'campaign-analysis',
      name: 'Campaign Analysis',
      description: 'Analyze campaign performance and metrics',
      icon: '📊',
      enabled: true
    },
    {
      id: 'creative-optimization',
      name: 'Creative Optimization',
      description: 'Optimize ad creatives and content',
      icon: '🎨',
      enabled: false
    },
    {
      id: 'audience-insights',
      name: 'Audience Insights',
      description: 'Analyze audience behavior and targeting',
      icon: '👥',
      enabled: false
    },
    {
      id: 'budget-optimization',
      name: 'Budget Optimization',
      description: 'Optimize budget allocation and bidding',
      icon: '💰',
      enabled: false
    }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Enhanced AI analysis function that reads the actual report data
  const generateEnhancedAnalysis = async (reportData, userQuery) => {
    if (!reportData) {
      return 'Campaign analysis completed successfully.';
    }

    // Handle both direct report structure and wrapped structure
    const insights = reportData.ai_insights || reportData;
    const campaignData = reportData.report_data || {};
    
    let analysis = `## 🎯 Campaign Analysis Results\n\n`;
    
    // AI's interpretation of the executive summary
    if (insights.executive_summary) {
      analysis += `**📋 My Analysis:**\n`;
      analysis += `Based on the campaign data, here's what I found most significant: ${insights.executive_summary}\n\n`;
    }
    
    // Performance insights with AI interpretation
    if (insights.performance_overview) {
      analysis += `**📊 Performance Insights:**\n`;
      analysis += `Looking at the numbers, ${insights.performance_overview}\n\n`;
    }
    
    // Prioritized recommendations with AI reasoning
    if (insights.actionables && insights.actionables.length > 0) {
      analysis += `**💡 My Top Recommendations:**\n`;
      analysis += `I've analyzed your campaign data and identified these priority actions:\n\n`;
      
      // Sort by impact and take top 3
      const sortedActions = insights.actionables
        .sort((a, b) => {
          const impactOrder = { 'high': 3, 'medium': 2, 'low': 1 };
          return (impactOrder[b.expected_impact] || 0) - (impactOrder[a.expected_impact] || 0);
        })
        .slice(0, 3);
      
      sortedActions.forEach((action, index) => {
        const impact = action.expected_impact === 'high' ? '🚀' : action.expected_impact === 'medium' ? '📈' : '📊';
        analysis += `${index + 1}. ${impact} **${action.target}:** ${action.action}\n`;
        if (action.justification) {
          analysis += `   *Why this matters: ${action.justification}*\n`;
        }
        analysis += `   *Priority: ${action.expected_impact} impact*\n\n`;
      });
    }
    
    // Segment insights summary with AI interpretation
    if (insights.segment_analysis) {
      analysis += `**🎯 Key Audience Insights:**\n`;
      analysis += `Here's what the data reveals about your audience:\n\n`;
      
      if (insights.segment_analysis.demographics) {
        analysis += `• **Demographics:** ${insights.segment_analysis.demographics.substring(0, 100)}...\n`;
      }
      if (insights.segment_analysis.devices) {
        analysis += `• **Device Usage:** ${insights.segment_analysis.devices.substring(0, 100)}...\n`;
      }
      if (insights.segment_analysis.regions) {
        analysis += `• **Geographic Performance:** ${insights.segment_analysis.regions.substring(0, 100)}...\n`;
      }
      if (insights.segment_analysis.times) {
        analysis += `• **Timing Patterns:** ${insights.segment_analysis.times.substring(0, 100)}...\n`;
      }
      analysis += `\n`;
    }
    
    // Add AI's overall assessment and next steps
    analysis += `**🔍 My Assessment:**\n`;
    analysis += `Based on this analysis, your campaign shows `;
    
    // Determine overall performance tone
    if (insights.actionables && insights.actionables.length > 0) {
      const highImpactActions = insights.actionables.filter(a => a.expected_impact === 'high').length;
      if (highImpactActions > 2) {
        analysis += `significant optimization opportunities. There are several high-impact changes that could substantially improve performance.\n\n`;
      } else if (highImpactActions > 0) {
        analysis += `good potential for improvement with some targeted optimizations.\n\n`;
      } else {
        analysis += `solid performance with room for fine-tuning and incremental improvements.\n\n`;
      }
    }
    
    analysis += `📊 **Click "See Full Report" below for detailed breakdowns, charts, and complete actionable insights.**`;
    
    return analysis;
  };

  // Only auto-scroll when new messages are added, not when loading existing messages
  useEffect(() => {
    if (!isLoadingMessages) {
      scrollToBottom();
    }
  }, [messages, isLoadingMessages]);

  useEffect(() => {
    if (conversation?.id) {
      loadMessages();
      // Auto-initialize with config on component mount
      initializeAssistant();
    }
  }, [conversation?.id]);

  const initializeAssistant = async () => {
    if (messages.length > 0) return;
    
    try {
      // Check if assistant has valid ID before initialization
      if (!assistant || !assistant.id) {
        console.error('Assistant object is missing or has no ID:', assistant);
        const errorMessage = {
          role: 'assistant',
          content: "I'm sorry, but there seems to be an issue with the assistant configuration. Please try refreshing the page or contact support if the problem persists.",
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, errorMessage]);
        return;
      }
      
      const result = await generateAIResponse('', assistant, true); // Pass true to indicate initialization
      // Note: response can be null for successful initialization without automated message
      
      if (result?.response && !result.response.includes('Error')) {
        const assistantMessage = {
          role: 'assistant',
          content: result.response,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, assistantMessage]);
        
        // Save assistant message to database
        const { error: assistantMessageError } = await supabase
          .from('assistant_messages')
          .insert({
            conversation_id: conversation.id,
            role: 'assistant',
            content: assistantMessage.content,
            metadata: {
              timestamp: assistantMessage.timestamp,
              assistant_id: assistant.id,
              initialization: true
            }
          });

        if (assistantMessageError) {
          console.error('Error saving initialization message:', assistantMessageError);
        }
      }
    } catch (error) {
      console.error('Error initializing assistant:', error);
      const errorMessage = {
        role: 'assistant',
        content: "I encountered an error during initialization. Please try refreshing the page or contact support if the problem persists.",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const loadMessages = async () => {
    try {
      setIsLoadingMessages(true);
      const { data, error } = await supabase
        .from('assistant_messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        return;
      }

      const formattedMessages = data.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.created_at,
        metadata: msg.metadata
      }));

      // Restore campaignContext from the most recent message that has it
      const messageWithContext = [...formattedMessages]
        .reverse()
        .find(msg => msg.metadata?.campaign_context);
      
      if (messageWithContext && !campaignContext) {
        setCampaignContext(messageWithContext.metadata.campaign_context);
      }

      setMessages(formattedMessages);
      
      // Scroll to bottom after loading messages
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Function to fetch report context for the assistant
  const fetchReportContext = async (campaignId) => {
    try {
      const response = await fetch('/api/get-campaign-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaignId: campaignId,
          userId: user.id
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching report context:', error);
      return null;
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading || !user) return;

    const userMessage = {
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
        // Save user message to database
        const { error: messageError } = await supabase
          .from('assistant_messages')
          .insert({
            conversation_id: conversation.id,
            role: 'user',
            content: userMessage.content,
            metadata: {
              timestamp: userMessage.timestamp
            }
          });

        if (messageError) {
          console.error('Error saving user message:', messageError);
        }

        // Get AI response
        const aiResponse = await generateAIResponse(userMessage.content, assistant);
        
        if (aiResponse === null || (aiResponse.response === null && !aiResponse.hasReport)) {
          // No automated response - let the AI handle the conversation naturally
          console.log('No automated response generated, waiting for user interaction');
          return;
        }
        
        // Calculate metadata first before creating the message
        const messageMetadata = {
          timestamp: new Date().toISOString(),
          assistant_id: assistant.id
        };
        
        // Add campaign context if available (for report-related messages)
        // Debug logging to see what aiResponse contains
        console.log('aiResponse object:', JSON.stringify(aiResponse, null, 2));
        console.log('aiResponse.campaignContext:', aiResponse?.campaignContext);
        console.log('aiResponse.hasReport:', aiResponse?.hasReport);
        console.log('current campaignContext:', campaignContext);
        
        // Check if the AI response included a synthesized report (indicating a report was actually generated)
        if (aiResponse && typeof aiResponse === 'object' && aiResponse.synthesizedReport) {
          messageMetadata.has_report = true;
          messageMetadata.campaign_context = campaignContext;
          console.log('Setting has_report=true from aiResponse.synthesizedReport');
        } else if (aiResponse && typeof aiResponse === 'object' && aiResponse.hasReport) {
          messageMetadata.has_report = true;
          if (campaignContext) {
            messageMetadata.campaign_context = campaignContext;
          }
          console.log('Setting has_report=true from aiResponse.hasReport');
        }
        // Only set campaign_context for metadata, but don't set has_report unless a report was actually generated
        else if (campaignContext) {
          messageMetadata.campaign_context = campaignContext;
          console.log('Setting campaign_context from existing campaignContext (no report generated)');
        }
        
        console.log('Final messageMetadata:', JSON.stringify(messageMetadata, null, 2));

        // Create assistant message with metadata included
        const assistantMessage = {
          role: 'assistant',
          content: aiResponse.response || aiResponse,
          timestamp: messageMetadata.timestamp,
          metadata: messageMetadata
        };

        // Add message to state with complete metadata
        setMessages(prev => [...prev, assistantMessage]);

        // Small delay to ensure state updates are processed
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const { error: assistantMessageError } = await supabase
          .from('assistant_messages')
          .insert({
            conversation_id: conversation.id,
            role: 'assistant',
            content: assistantMessage.content,
            metadata: messageMetadata
          });

        if (assistantMessageError) {
          console.error('Error saving assistant message:', assistantMessageError);
        }

      } catch (error) {
        console.error('Error sending message:', error);
        const errorMessage = {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    };

  const generateAIResponse = async (userInput, assistant, isInitialization = false) => {
    // Handle initialization call
    if (isInitialization) {
      try {
        // Debug logging to track what's being sent to API
        console.log('=== FRONTEND DEBUG ===');
        console.log('Sending user to API:', JSON.stringify(user, null, 2));
        console.log('Assistant ID:', assistant?.id);
        console.log('Conversation:', JSON.stringify(conversation, null, 2));
        
        const response = await fetch('/api/assistant-chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
             message: 'initialize',
             assistant: assistant,
             conversation: conversation,
             messages: [],
             user: user,
             isInitialization: true
           }),
        });

        if (!response.ok) {
          throw new Error(`API response not ok: ${response.status}`);
        }

        const data = await response.json();
        
        // Handle tool calls for initialization
        if (data.tool_calls && data.tool_calls.length > 0) {
          const toolCall = data.tool_calls[0];
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);
          
          if (functionName === 'get-assistant-config') {
            // Fetch assistant config and provide personalized response
            try {
              const { data: configData, error } = await supabase
                .from('ai_assistants')
                .select('model_config, name')
                .eq('id', functionArgs.assistant_id)
                .single();
              
              if (configData?.model_config) {
                 // Config found but no automated response - let user initiate conversation
                 console.log('Assistant config loaded successfully:', configData.name);
                 return { response: null, campaignContext: null, hasReport: false };
               } else {
                 console.error('No model_config found for assistant');
                 return { response: null, campaignContext: null, hasReport: false };
               }
             } catch (error) {
               console.error('Error fetching assistant config:', error);
               return { response: null, campaignContext: null, hasReport: false };
             }
          }
        }
        
        return { response: data.response || null, campaignContext: null, hasReport: false };
      } catch (error) {
        console.error('Error initializing assistant:', error);
        return { response: null, campaignContext: null, hasReport: false };
      }
    }
    // Tool execution validation framework
    const shouldExecuteTool = () => {
      if (!selectedTool) return false;
      
      // Check if this is a follow-up question about existing results
      const followUpIndicators = [
        'based on the report', 'from the analysis', 'according to', 'what do you think',
        'in your opinion', 'do you recommend', 'should we', 'what would you',
        'how do you', 'why do you', 'can you explain', 'tell me more'
      ];
      
      const isFollowUp = followUpIndicators.some(indicator => 
        userInput.toLowerCase().includes(indicator)
      );
      
      if (isFollowUp) {
        console.log('Detected follow-up question, skipping tool execution');
        return false;
      }
      
      // Check for explicit tool execution requests
      const explicitRequests = [
        'run analysis', 'generate report', 'analyze campaign', 'create analysis',
        'perform analysis', 'start analysis', 'new analysis', 'fresh analysis'
      ];
      
      const isExplicitRequest = explicitRequests.some(request => 
        userInput.toLowerCase().includes(request)
      );
      
      return isExplicitRequest;
    };
    
    // Handle tool-specific responses - only execute with explicit validation
    if (shouldExecuteTool()) {
      switch (selectedTool.id) {
        case 'campaign-analysis':
          console.log('Campaign analysis tool triggered');
          console.log('Current campaignContext:', campaignContext);
          console.log('campaignContext?.campaign_id:', campaignContext?.campaign_id);
          
          if (!campaignContext?.campaign_id) {
            console.log('No campaign context available for analysis');
            return 'Campaign analysis requires campaign context. Please start the chat from a campaign setup or ensure you have a campaign selected.';
          }
          
          console.log('Campaign context is available, proceeding with analysis...');

          try {
            // Use the comprehensive edge function for campaign analysis
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
              return 'Please log in to analyze campaigns.';
            }

            const today = new Date().toISOString().split('T')[0];
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            const payload = {
              campaignId: campaignContext.campaign_id,
              userId: session.user.id,
              startDate: thirtyDaysAgo,
              endDate: today,
              trendAnalysisText: `User query: ${userInput}`,
              anomalyAnalysisText: 'Assistant-generated analysis request',
              performanceAnalysisText: 'Comprehensive performance review requested'
            };

            const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-synthesized-report`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
              },
              body: JSON.stringify(payload),
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(`Analysis failed: ${errorData.error || response.statusText}`);
            }

            const data = await response.json();
            
            // Check if the edge function completed successfully and returned a synthesized report
            if (response.ok && data.synthesizedReport) {
              // Store the report data for the 'See Report' button
              setReportData(data.synthesizedReport);
              setCampaignContext({
                campaign_id: payload.campaignId,
                campaign_name: campaignContext?.campaign_name || 'Campaign Analysis'
              });
              
              // Enhanced AI analysis of the report
              const enhancedAnalysis = await generateEnhancedAnalysis(data.synthesizedReport, userInput);
              
              // Return the analysis with synthesizedReport flag for proper metadata detection
              return {
                response: enhancedAnalysis,
                synthesizedReport: data.synthesizedReport
              };
            }
            
            // Fallback: Format the direct response from edge function
            if (data.synthesizedReport && data.synthesizedReport.executive_summary) {
              const report = data.synthesizedReport;
              let formattedResponse = `## Campaign Analysis\n\n**Executive Summary:**\n${report.executive_summary}\n\n`;
              
              if (report.performance_overview) {
                formattedResponse += `**Performance Overview:**\n${report.performance_overview}\n\n`;
              }
              
              if (report.actionables && report.actionables.length > 0) {
                formattedResponse += `**Key Recommendations:**\n`;
                report.actionables.forEach((action, index) => {
                  formattedResponse += `${index + 1}. **${action.target}:** ${action.action} (${action.expected_impact} impact)\n`;
                });
              }
              
              // Store the report data for the 'See Report' button
              setReportData(report);
              setCampaignContext({
                campaign_id: payload.campaignId,
                campaign_name: campaignContext?.campaign_name || 'Campaign Analysis'
              });
              
              return formattedResponse;
            }
            
            return data.analysis || data.message || 'Campaign analysis completed successfully.';
          } catch (error) {
            console.error('Error in campaign analysis:', error);
            return 'Sorry, there was an error performing the campaign analysis. Please try again.';
          }
        
        case 'creative-optimization':
          return `🎨 **Creative Optimization Tool** (Coming Soon)\n\nI'll help you optimize your ad creatives for better performance. This tool will analyze your current creatives and suggest improvements for higher engagement and conversion rates.`;
        
        case 'audience-insights':
          return `👥 **Audience Insights Tool** (Coming Soon)\n\nI'll provide detailed insights about your audience behavior, demographics, and targeting opportunities to help you reach the right people with your campaigns.`;
        
        case 'budget-optimization':
          return `💰 **Budget Optimization Tool** (Coming Soon)\n\nI'll analyze your budget allocation and suggest optimizations to maximize your return on ad spend (ROAS) across all your campaigns.`;
        
        default:
          break;
      }
    }

    // Fallback to analysis mode or general responses
    if (analysisMode) {
      if (!campaignContext?.campaign_id) {
        return 'Analysis mode requires campaign context. Please start the chat from a campaign setup.';
      }

      try {
        const today = new Date().toISOString().split('T')[0];
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const response = await fetch('/api/ai-campaign-analysis', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accountId: campaignContext.ad_account_id || null,
            startDate: thirtyDaysAgo,
            endDate: today,
            campaignIds: [campaignContext.campaign_id],
            userMessage: userInput,
          }),
        });

        if (!response.ok) {
          throw new Error('API response not ok');
        }

        const data = await response.json();
        return data.analysis || 'Analysis completed successfully.';
      } catch (error) {
        console.error('Error in campaign analysis:', error);
        return 'Sorry, there was an error performing the campaign analysis. Please try again.';
      }
    } else {
      // Call the new ChatGPT API endpoint
      try {
        const response = await fetch('/api/assistant-chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: userInput,
            assistant: assistant,
            conversation: conversation,
            messages: messages,
            user: user
          }),
        });

        if (!response.ok) {
          throw new Error(`API response not ok: ${response.status}`);
        }

        const data = await response.json();
        
        // Check if the response indicates the assistant can't access report details (expanded detection)
        if (data.response && (
          data.response.includes("unable to access the specific report details") ||
          data.response.includes("unable to fetch the latest report") ||
          data.response.includes("technical limitation") ||
          data.response.includes("unable to fetch any past campaign reports") ||
          data.response.includes("campaign analysis feature has not been implemented")
        ) && conversation?.context?.campaign_id) {
          console.log('Assistant indicated inability to access report, fetching report context...');
          
          // Fetch the full report context
          const reportContext = await fetchReportContext(campaignContext.campaign_id);
          
          if (reportContext) {
            console.log('Report context fetched successfully, regenerating response with full context...');
            
            // Make another API call with the report context included
            const contextualResponse = await fetch('/api/assistant-chat', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                message: userInput + "\n\nHere is the full campaign report context: " + JSON.stringify(reportContext),
                assistant: assistant,
                conversation: conversation,
                messages: messages
              }),
            });
            
            if (contextualResponse.ok) {
              const contextualData = await contextualResponse.json();
              return contextualData.response || data.response;
            }
          }
        }
        
        // Handle tool calls if present
        if (data.tool_calls && data.tool_calls.length > 0) {
          const toolCall = data.tool_calls[0]; // Handle first tool call
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);
          
          if (functionName === 'campaign_analysis') {
            setCampaignContext({
              campaign_id: functionArgs.campaign_id,
              campaign_name: functionArgs.campaign_name || 'Analyzed Campaign'
            });
            const analysisResult = await generateAIResponse(userInput, assistant, false);
            return analysisResult;
          } else if (functionName === 'get-assistant-config') {
             // Fetch assistant config and provide personalized response
             try {
               const { data: configData, error } = await supabase
                 .from('ai_assistants')
                 .select('model_config, name')
                 .eq('id', functionArgs.assistant_id)
                 .single();
               
               if (configData?.model_config) {
                 // Config found but no automated response - let user initiate conversation
                 console.log('Assistant config loaded successfully for regular response:', configData.name);
                 return { response: null, campaignContext: null, hasReport: false };
               } else {
                 console.error('No model_config found for assistant in regular response');
                 return { response: null, campaignContext: null, hasReport: false };
               }
             } catch (error) {
               console.error('Error fetching assistant config:', error);
               return { response: null, campaignContext: null, hasReport: false };
             }
           }
        }
        
        // Check if the response includes campaign context and set it
        if (data.campaignContext) {
          console.log('Setting campaign context from API response:', data.campaignContext);
          setCampaignContext(data.campaignContext);
          // Also set report data if available
          if (data.analysis) {
            setReportData(data.analysis);
          }
        }
        
        // Return both response and metadata
        // Check if a report was generated by looking for report-related content
        const hasReportContent = data.response && (
          data.response.includes('See Full Report') ||
          data.response.includes('report generated') ||
          data.response.includes('analysis complete') ||
          !!data.campaignContext
        );
        
        return {
          response: data.response || null,
          campaignContext: data.campaignContext || null,
          hasReport: hasReportContent
        };
      } catch (error) {
        console.error('Error calling assistant chat API:', error);
        return { response: null, campaignContext: null, hasReport: false };
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (isLoadingMessages) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center space-x-3">
          <div className="w-4 h-4 bg-primary rounded-full animate-bounce"></div>
          <div className="w-4 h-4 bg-primary rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
          <div className="w-4 h-4 bg-primary rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          <span className="text-gray-600 ml-3">Loading conversation...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-xl overflow-hidden shadow-lg">
      {/* Conditional rendering: Show ReportView or Chat */}
      {showReport ? (
        <ReportView 
          reportData={reportData}
          campaignContext={campaignContext}
          onBackToChat={() => {
            console.log('Back to chat clicked, reportData was:', reportData);
            setShowReport(false);
          }}
        />
      ) : (
        <>
          {/* Header - ChatGPT style */}
          <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-primary to-orange-600 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{assistant.name}</h3>
            <p className="text-gray-500 text-sm">{assistant.description}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {campaignContext && (
            <button
              onClick={async () => {
                if (!user || !user.id) {
                  alert('Please log in to view reports.');
                  return;
                }
                
                try {
                  console.log('Fetching report history for campaign_id:', campaignContext.campaign_id, 'user_id:', user.id);
                  
                  // Fetch only assistant reports
                  const assistantReportsResult = await supabase
                    .from('assistant_reports')
                    .select('*')
                    .eq('campaign_id', campaignContext.campaign_id)
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false });
                  
                  console.log('Assistant reports result:', assistantReportsResult);
                  
                  // Format assistant reports only
                  const allReports = [];
                  if (assistantReportsResult.data && assistantReportsResult.data.length > 0) {
                    allReports.push(...assistantReportsResult.data.map(r => ({ 
                      ...r, 
                      source: 'assistant_reports',
                      title: `Assistant Report - ${new Date(r.created_at).toLocaleDateString()}`,
                      description: 'Generated via AI Assistant'
                    })));
                  }
                  
                  // Reports are already sorted by created_at (most recent first)
                  const sortedReports = allReports;
                  
                  console.log('All reports found:', sortedReports);
                  
                  if (sortedReports.length === 0) {
                    alert('No reports found for this campaign. Please generate a new report first.');
                    return;
                  }
                  
                  setReportHistory(sortedReports);
                  setShowReportHistory(true);
                } catch (error) {
                  console.error('Error fetching report history:', error);
                  alert('Error loading report history. Please try again.');
                }
              }}
              className="flex items-center space-x-2 bg-primary text-white px-3 py-1 rounded-full hover:bg-primary/90 transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>View Reports</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages - ChatGPT style */}
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="max-w-3xl mx-auto">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`py-4 px-4 border-b border-gray-100 last:border-b-0 ${
                message.role === 'user' ? 'bg-gray-50' : 'bg-white'
              }`}
            >
              <div className="flex space-x-4">
                <div className="flex-shrink-0">
                  {message.role === 'user' ? (
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-8 h-8 bg-gradient-to-r from-primary to-orange-600 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 mb-1">
                    {message.role === 'user' ? 'You' : assistant.name}
                  </div>
                  <div className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {message.content}
                  </div>
                  {/* Show 'See Report' button only for messages with actual reports */}
                  {message.role === 'assistant' && 
                   (message.metadata && message.metadata.has_report) && 
                   (campaignContext || (message.metadata && message.metadata.campaign_context)) && (
                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <button
                      onClick={async () => {
                        try {
                          console.log('See Full Report button clicked');
                          const { data: { user } } = await supabase.auth.getUser();
                          if (!user) {
                            console.error('User not authenticated');
                            return;
                          }
                          console.log('User authenticated:', user.id);

                          if (!campaignContext?.campaign_id) {
                            console.error('No campaign context available');
                            return;
                          }
                          console.log('Campaign context available:', campaignContext.campaign_id);

                          // Fetch the most recent report from both tables
                          const [campaignReportsResponse, assistantReportsResponse] = await Promise.all([
                            supabase
                              .from('campaign_reports')
                              .select('*')
                              .eq('campaign_id', campaignContext.campaign_id)
                              .eq('user_id', user.id)
                              .order('created_at', { ascending: false })
                              .limit(1),
                            supabase
                              .from('assistant_reports')
                              .select('*')
                              .eq('user_id', user.id)
                              .order('created_at', { ascending: false })
                              .limit(1)
                          ]);

                          // Find the most recent report between both tables
                          let latestReport = null;
                          let reportSource = null;

                          const campaignReport = campaignReportsResponse.data?.[0];
                          const assistantReport = assistantReportsResponse.data?.[0];

                          if (campaignReport && assistantReport) {
                            if (new Date(campaignReport.created_at) > new Date(assistantReport.created_at)) {
                              latestReport = campaignReport;
                              reportSource = 'campaign_reports';
                            } else {
                              latestReport = assistantReport;
                              reportSource = 'assistant_reports';
                            }
                          } else if (campaignReport) {
                            latestReport = campaignReport;
                            reportSource = 'campaign_reports';
                          } else if (assistantReport) {
                            latestReport = assistantReport;
                            reportSource = 'assistant_reports';
                          }

                          if (!latestReport) {
                            console.error('No reports found');
                            return;
                          }
                          console.log('Latest report found:', latestReport, 'Source:', reportSource);

                          // Parse and set the report data based on source
                          let parsedData;
                          if (reportSource === 'campaign_reports') {
                            parsedData = typeof latestReport.report_data === 'string' 
                              ? JSON.parse(latestReport.report_data) 
                              : latestReport.report_data;
                          } else {
                            // For assistant_reports, use report_content field
                            parsedData = typeof latestReport.report_content === 'string' 
                              ? JSON.parse(latestReport.report_content) 
                              : latestReport.report_content;
                          }
                          setReportData(parsedData);
                          setShowReport(true);
                        } catch (error) {
                          console.error('Error loading latest report:', error);
                        }
                      }}
                      className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      See Full Report
                    </button>
                    </div>
                  )}
                  <div className="text-xs text-gray-500 mt-2">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="py-4 px-4 bg-white">
              <div className="flex space-x-4">
                <div className="w-8 h-8 bg-gradient-to-r from-primary to-orange-600 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 mb-1">{assistant.name}</div>
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                    <span className="text-sm text-gray-500">Thinking...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </div>

      {/* Campaign Context Indicator */}
      {campaignContext && (
        <div className="bg-green-50 border-t border-green-200 px-4 py-2">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center text-sm text-green-800">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span className="font-medium">Campaign Context:</span>
              <span className="ml-2">{campaignContext.campaign_name || `Campaign ${campaignContext.campaign_id}`}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tools Panel */}
      {showTools && (
        <div className="bg-gray-50 border-t border-gray-200 px-4 py-3">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-700">Available Tools</h4>
              <button
                onClick={() => setShowTools(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {availableTools.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => {
                    if (tool.enabled) {
                      setSelectedTool(tool);
                      setShowTools(false);
                    }
                  }}
                  disabled={!tool.enabled}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    tool.enabled
                      ? 'border-gray-200 hover:border-primary hover:bg-primary/5 cursor-pointer'
                      : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-50'
                  } ${
                    selectedTool?.id === tool.id ? 'border-primary bg-primary/10' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <span className="text-lg">{tool.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900">{tool.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{tool.description}</div>
                      {!tool.enabled && (
                        <div className="text-xs text-orange-600 mt-1 font-medium">Coming Soon</div>
                      )}
                      {tool.id === 'campaign-analysis' && !campaignContext?.campaign_id && (
                        <div className="text-xs text-red-600 mt-1 font-medium">⚠️ Requires campaign context</div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input - ChatGPT style */}
      <div className="bg-white border-t border-gray-200 px-4 pt-2 pb-2" style={{padding: '8px 16px 8px 16px'}}>
        <div className="max-w-3xl mx-auto">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder={selectedTool ? `Ask about ${selectedTool.name.toLowerCase()}...` : `Message ${assistant.name}...`}
              className="w-full bg-white border border-gray-300 rounded-xl px-12 py-4 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-none transition-all duration-200 text-base leading-normal shadow-sm"
              rows="1"
              disabled={isLoading}
              style={{ minHeight: '50px', maxHeight: '200px', fontSize: '16px' }}
            />
            {/* Tools - positioned at same height as input */}
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
              <div className="relative">
                <button
                  onClick={() => setShowTools(!showTools)}
                  className={`flex-shrink-0 w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center transition-colors ${showTools ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </button>
                {selectedTool && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-white"></div>
                )}
              </div>

            </div>
            {/* Send Button - positioned at same height as input */}
            <button
              onClick={sendMessage}
              disabled={isLoading || !inputValue.trim()}
              className={`absolute right-3 top-1/2 transform -translate-y-1/2 flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isLoading || !inputValue.trim() ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-primary text-white hover:bg-primary-dark'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Bottom spacing */}
        <div className="h-6"></div>
      </div>
        </>
      )}
      
      {/* Report History Modal */}
      {showReportHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Report History</h2>
              <button
                onClick={() => setShowReportHistory(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-3">
              {reportHistory.map((report, index) => (
                <div
                  key={`${report.source}-${report.id}`}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={async () => {
                    try {
                      let parsedReportData = report;
                      
                      // Handle different data structures based on source
                      if (report.source === 'campaign_reports') {
                        // Handle campaign_reports format
                        if (typeof report.report_data === 'string') {
                          try {
                            parsedReportData = {
                              ...report,
                              report_data: JSON.parse(report.report_data),
                              ai_insights: typeof report.ai_insights === 'string' ? JSON.parse(report.ai_insights) : report.ai_insights
                            };
                          } catch (parseError) {
                            console.error('Error parsing campaign report data:', parseError);
                            alert('Error parsing report data. Please try again.');
                            return;
                          }
                        }
                      } else {
                        // Handle assistant_reports format
                        let aiInsights = report.ai_insights;
                        
                        // If ai_insights is null, try to extract from report_content
                        if (!aiInsights && report.report_content) {
                          aiInsights = report.report_content.ai_insights || report.report_content;
                        }
                        
                        // Parse ai_insights if it's a string
                        if (typeof aiInsights === 'string') {
                          try {
                            aiInsights = JSON.parse(aiInsights);
                          } catch (parseError) {
                            console.error('Error parsing ai_insights:', parseError);
                          }
                        }
                        
                        parsedReportData = {
                          ...report,
                          report_data: report.report_content,
                          ai_insights: aiInsights
                        };
                      }
                      
                      setReportData(parsedReportData);
                      setShowReportHistory(false);
                      setShowReport(true);
                    } catch (error) {
                      console.error('Error loading report:', error);
                      alert('Error loading report. Please try again.');
                    }
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{report.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{report.description}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        Created: {new Date(report.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="ml-4">
                       <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                         AI Assistant
                       </span>
                     </div>
                  </div>
                </div>
              ))}
            </div>
            
            {reportHistory.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>No reports found for this campaign.</p>
                <p className="text-sm mt-1">Generate a new report to get started.</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Report History Modal */}
      {showReportHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Report History</h2>
              <button
                onClick={() => setShowReportHistory(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {reportHistory.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-2">
                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-500">No reports found for this campaign.</p>
                  <p className="text-sm text-gray-400 mt-1">Generate a new report to get started.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reportHistory.map((report, index) => (
                    <div
                      key={`${report.source}-${report.id}`}
                      className="border border-gray-200 rounded-lg p-4 hover:border-primary/30 transition-colors cursor-pointer"
                      onClick={() => loadSpecificReport(report)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                              {report.source === 'campaign_reports' ? 'Campaign Report' : 'Assistant Report'}
                            </span>
                            <span className="text-sm text-gray-500">
                              {new Date(report.created_at).toLocaleDateString()} at {new Date(report.created_at).toLocaleTimeString()}
                            </span>
                          </div>
                          
                          <h3 className="font-medium text-gray-900 mb-1">
                            {report.title || `Report #${index + 1}`}
                          </h3>
                          
                          {report.summary && (
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {report.summary}
                            </p>
                          )}
                        </div>
                        
                        <div className="ml-4 flex-shrink-0">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex justify-end p-6 border-t border-gray-200">
              <button
                onClick={() => setShowReportHistory(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssistantChat;