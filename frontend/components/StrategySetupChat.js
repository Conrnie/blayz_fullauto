import React, { useState, useEffect, useRef } from 'react';
import supabase from '../lib/supabase';
import { getCurrentUser } from '../lib/supabase';

const StrategySetupChat = ({ onStrategyComplete, user = null }) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [showSaveButton, setShowSaveButton] = useState(false);
  const [strategyData, setStrategyData] = useState({
    summary: '',
    preferences: {},
    complete: false
  });
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [strategyName, setStrategyName] = useState('');
  const messagesEndRef = useRef(null);
  const [accessToken, setAccessToken] = useState(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Initialize chat session with the provided user or demo user
    if (user) {
      console.log("Initializing chat with user:", user);
      setAccessToken(user.access_token || 'demo-token');
      initializeChatSession(user);
    }
  }, [user]);

  const initializeChatSession = async (currentUser) => {
    if (!currentUser) return;

    // Generate a proper UUID for session
    const newSessionId = crypto.randomUUID();
    setSessionId(newSessionId);

    // Start with the opening message
    const openingMessage = {
      role: 'assistant',
      content: `Hi! I'm here to help you set up your automated campaign strategy. 

Instead of filling out forms, just tell me in your own words: **How do you typically approach Meta ad campaigns?** 

Describe your ideal strategy - testing approach, what you focus on, how you scale winners, anything that matters to you. I'll learn from your description and ask follow-up questions to build your perfect automation profile.`,
      timestamp: new Date().toISOString()
    };

    setMessages([openingMessage]);
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading || !user) return;

    const userMessage = {
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      // Check for strategy completion trigger phrases
      const completionTriggers = [
        'complete my lead generation strategy',
        'complete the strategy',
        'finish the strategy',
        'show me save options',
        'i want to save',
        'save this strategy'
      ];
      
      const userInput = userMessage.content.toLowerCase();
      const shouldTriggerCompletion = completionTriggers.some(trigger => 
        userInput.includes(trigger)
      );

      if (shouldTriggerCompletion) {
        // Simulate AI completing the strategy (in real, this would be from API)
        const assistantMessage = {
          role: 'assistant',
          content: '🎯 Perfect! I\'ve analyzed your requirements and completed your lead generation strategy. Your strategy includes optimized targeting, budget allocation, and creative testing methodology.\n\n**Strategy Summary:**\n• Budget: $1500/day\n• Targeting: Lookalike audiences + Interest targeting\n• Creative Testing: Sequential testing (angles → images → headlines)\n• Optimization: CPA optimization with 7-day attribution\n\nYour strategy is ready to be saved when you\'re ready!',
          timestamp: new Date().toISOString()
        };

        const finalMessages = [...updatedMessages, assistantMessage];
        setMessages(finalMessages);

        // Update strategy data and show save button - but don't auto-save
        setStrategyData({
          summary: 'AI-Completed Lead Generation Strategy',
          preferences: {
            budget: '$1500/day',
            targeting: 'Lookalike audiences + Interest targeting',
            creative_testing: 'Sequential testing: angles → images → headlines',
            optimization: 'CPA optimization with 7-day attribution'
          },
          complete: true,
          ai_generated: true,
          completion_trigger: userMessage.content
        });
        setShowSaveButton(true);
        setIsLoading(false);
        return;
      }

      // Try API call, fallback to demo response if it fails
      try {
        const response = await fetch('/api/strategy-chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            session_id: sessionId,
            message: userMessage.content,
            conversation_history: updatedMessages
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.assistant_message) {
          const assistantMessage = {
            role: 'assistant',
            content: result.assistant_message,
            timestamp: new Date().toISOString()
          };

          const finalMessages = [...updatedMessages, assistantMessage];
          setMessages(finalMessages);

          // Check if save button should be shown (but don't auto-save)
          if (result.show_save_button || result.strategy_complete) {
            setShowSaveButton(true);
            setStrategyData(result.final_lead_automation || result.final_strategy || {
              summary: 'Lead generation strategy completed',
              preferences: result.extracted_preferences || {},
              complete: true
            });
          }
        }
      } catch (apiError) {
        console.log('API call failed, using demo response:', apiError);
        
        // Demo fallback response
        const demoResponses = [
          "That's a great approach! Can you tell me more about your typical budget range and how you usually scale winning campaigns?",
          "Interesting strategy! What's your usual cost per lead target, and at what point do you typically pause underperforming ads?",
          "I see you focus on lead generation. How do you typically test your creative elements - do you test angles first, then images, or do you test everything together?",
          "Thanks for sharing that! What's your approach to audience targeting - do you prefer lookalike audiences, interest targeting, or a mix of both?",
          "That makes sense! How often do you refresh your ad creatives to prevent fatigue, and what CTR threshold typically triggers you to create new ads?"
        ];
        
        const randomResponse = demoResponses[Math.floor(Math.random() * demoResponses.length)];
        
        const assistantMessage = {
          role: 'assistant',
          content: randomResponse,
          timestamp: new Date().toISOString()
        };

        const finalMessages = [...updatedMessages, assistantMessage];
        setMessages(finalMessages);
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

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl overflow-hidden">


      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 bg-white min-h-[400px] max-h-[calc(100vh-300px)]">
        <div className="space-y-4 max-w-3xl mx-auto">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} w-full`}
            >
              <div
                className={`max-w-[85%] px-4 py-3 rounded-lg shadow-sm ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-primary to-orange-600 text-white'
                    : 'bg-gray-100 text-gray-800 border border-gray-200'
                }`}
              >
                <div className="whitespace-pre-wrap text-sm leading-relaxed break-words">{message.content}</div>
                
                <div className={`text-[10px] mt-2 flex items-center space-x-2 ${
                  message.role === 'user' ? 'text-white/70' : 'text-gray-500'
                }`}>
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-800 shadow-sm border border-gray-200 px-4 py-3 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                  <span className="text-base text-gray-500">AI is analyzing your strategy...</span>
                </div>
              </div>
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </div>

      {/* Save Button - Only show when strategy is complete */}
      {showSaveButton && (
        <div className="bg-gray-50 border-t border-gray-200 p-6">
          <div className="flex justify-center">
            <button
              onClick={() => setShowSaveModal(true)}
              className="bg-gradient-to-r from-primary to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 shadow-button hover:shadow-feature transform hover:-translate-y-1 flex items-center space-x-2 text-base"
            >
              <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <span>Save Strategy Profile</span>
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="bg-white border-t border-gray-200 p-6">
        <div className="flex space-x-4 max-w-3xl mx-auto">
          <div className="flex-1 relative">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Describe your Meta ads strategy approach in detail..."
              className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-none transition-all duration-200 text-sm leading-normal"
              rows="3"
              disabled={isLoading}
            />
            <div className="absolute bottom-3 right-3 text-xs text-gray-400">
              Press Enter to send
            </div>
          </div>
          <button
            onClick={sendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="bg-gradient-to-r from-primary to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 shadow-button hover:shadow-feature transform hover:-translate-y-0.5 disabled:transform-none flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            <span>Send</span>
          </button>
        </div>
        

      </div>
      
      {/* Save Strategy Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-90vw border border-gray-300 shadow-lg">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">💾 Save Your Strategy</h3>
            <input
              type="text"
              value={strategyName}
              onChange={(e) => setStrategyName(e.target.value)}
              placeholder="Enter strategy name..."
              className="w-full p-3 bg-white border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-primary text-gray-800 placeholder-gray-500"
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowSaveModal(false);
                  setStrategyName('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                ❌ Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    // Get current user
                    const user = await getCurrentUser();
                    if (!user) {
                      alert('Please sign in to save strategies');
                      return;
                    }

                    // Create strategy object with custom name
                    const strategyToSave = {
                      user_id: user.id,
                      strategy_name: strategyName,
                      preferences: {
                        ...strategyData,
                        summary: strategyData?.summary || `Lead generation strategy: ${strategyName}`,
                        saved_at: new Date().toISOString()
                      }
                    };
                    
                    console.log('Saving strategy to Supabase:', strategyToSave);
                    
                    // Save to Supabase marketer_strategies table
                    const { data, error } = await supabase
                      .from('marketer_strategies')
                      .insert([strategyToSave])
                      .select();
                    
                    if (error) {
                      console.error('Error saving strategy:', error);
                      alert('Failed to save strategy. Please try again.');
                      return;
                    }
                    
                    console.log('Strategy saved successfully:', data);
                    alert(`Strategy "${strategyName}" saved successfully!`);
                    
                    // Call the parent's save function with the saved data
                    if (onStrategyComplete) {
                      onStrategyComplete(data[0]);
                    }
                    
                    setShowSaveModal(false);
                    setStrategyName('');
                  } catch (error) {
                    console.error('Error saving strategy:', error);
                    alert('Failed to save strategy. Please try again.');
                  }
                }}
                disabled={!strategyName.trim()}
                className="bg-primary hover:bg-orange-600 disabled:bg-gray-600 disabled:text-gray-400 text-white px-4 py-2 rounded-lg transition-colors shadow-button"
              >
                ✅ Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
   );
 };

export default StrategySetupChat;