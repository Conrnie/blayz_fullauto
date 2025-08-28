import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const StrategySetupChat = ({ onStrategyComplete }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    initializeChatSession();
  }, [user]);

  const initializeChatSession = async () => {
    if (!user) return;

    // Create new chat session
    const { data: session, error } = await supabase
      .from('strategy_chat_sessions')
      .insert({
        user_id: user.id,
        current_step: 'discovery',
        messages: []
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating chat session:', error);
      return;
    }

    setSessionId(session.id);

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
    if (!inputValue.trim() || !sessionId || isLoading) return;

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
      // Call AI to process the message and generate response
      const response = await fetch('/api/strategy-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.access_token}`
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: userMessage.content,
          conversation_history: updatedMessages
        })
      });

      const result = await response.json();

      if (result.assistant_message) {
        const assistantMessage = {
          role: 'assistant',
          content: result.assistant_message,
          timestamp: new Date().toISOString()
        };

        const finalMessages = [...updatedMessages, assistantMessage];
        setMessages(finalMessages);

        // Update session in database
        await supabase
          .from('strategy_chat_sessions')
          .update({
            messages: finalMessages,
            current_step: result.current_step || 'discovery',
            extracted_preferences: result.extracted_preferences || {}
          })
          .eq('id', sessionId);

        // Check if strategy is complete
        if (result.strategy_complete) {
          onStrategyComplete(result.final_strategy);
        }
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
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 rounded-t-lg">
        <h2 className="text-2xl font-bold">Campaign Strategy Setup</h2>
        <p className="text-orange-100 mt-2">Tell me about your approach, and I'll build your automation profile</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50 min-h-[400px]">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-orange-500 text-white'
                    : 'bg-white text-gray-800 shadow-md border'
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
                <div className={`text-xs mt-2 ${
                  message.role === 'user' ? 'text-orange-100' : 'text-gray-500'
                }`}>
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white text-gray-800 shadow-md border px-4 py-2 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                  <span className="text-sm text-gray-600">Analyzing your strategy...</span>
                </div>
              </div>
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t p-4 rounded-b-lg">
        <div className="flex space-x-4">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Describe your campaign strategy in your own words..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
            rows="3"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default StrategySetupChat;