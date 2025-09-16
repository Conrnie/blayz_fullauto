import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import supabase from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import AssistantChat from '../components/Assistant/AssistantChat';

export default function AssistantDashboard() {
  const router = useRouter();
  const { user } = useAuth();

  if (!user) {
    router.push('/login');
    return null;
  }
  const [assistants, setAssistants] = useState([]);
  const [selectedAssistant, setSelectedAssistant] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('=== ASSISTANT DASHBOARD DEBUG ===');
    console.log('useEffect triggered, user:', user);
    console.log('User authenticated:', !!user);
    console.log('Loading state:', isLoading);
    
    // Always try to fetch assistants to test database connection
    console.log('Attempting to fetch assistants...');
    fetchAssistants();
  }, [user]);

  const fetchAssistants = async () => {
    console.log('=== FETCH ASSISTANTS DEBUG ===');
    console.log('Fetching assistants for user ID:', user?.id);
    try {
      setIsLoading(true);
      
      // First, let's try to fetch all assistants to see if the query works
      const { data: allData, error: allError } = await supabase
        .from('ai_assistants')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      console.log('All assistants query result:', allData);
      console.log('All assistants query error:', allError);
      
      if (allError) {
        console.error('Error fetching all assistants:', allError);
        return;
      }
      
      // If we have a user, filter by user_id, otherwise show all
      let filteredData = allData;
      if (user?.id) {
        filteredData = allData?.filter(assistant => assistant.user_id === user.id) || [];
        console.log('Filtered assistants for user:', filteredData);
      }
      
      console.log('Successfully fetched assistants, total count:', allData?.length || 0);
      console.log('User-specific count:', filteredData?.length || 0);
      setAssistants(filteredData || []);
      console.log('Assistants state set to:', filteredData);
    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      setIsLoading(false);
      console.log('Loading state set to false');
    }
  };

  const startChatWithAssistant = async (assistant) => {
    try {
      // Check if there's an existing active conversation
      const { data: existingConversations, error: fetchError } = await supabase
        .from('assistant_conversations')
        .select('*')
        .eq('assistant_id', assistant.id)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('updated_at', { ascending: false })
        .limit(1);

      if (fetchError) {
        console.error('Error fetching conversations:', fetchError);
        return;
      }

      let conversation;
      if (existingConversations && existingConversations.length > 0) {
        conversation = existingConversations[0];
      } else {
        // Create a new conversation
        const { data: newConversation, error: createError } = await supabase
          .from('assistant_conversations')
          .insert({
            assistant_id: assistant.id,
            user_id: user.id,
            title: `Chat with ${assistant.name}`,
            context: {
              started_at: new Date().toISOString()
            },
            status: 'active'
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating conversation:', createError);
          return;
        }

        conversation = newConversation;
      }

      setSelectedAssistant(assistant);
      setSelectedConversation(conversation);
    } catch (error) {
      console.error('Error starting chat:', error);
    }
  };

  // Show chat interface if an assistant is selected
  if (selectedAssistant && selectedConversation) {
    return (
      <div className="bg-white h-full flex flex-col">
        <AssistantChat 
          assistant={selectedAssistant}
          conversation={selectedConversation}
          onClose={() => {
            setSelectedAssistant(null);
            setSelectedConversation(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen px-4 py-8">
      <div className="mb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold text-secondary mb-4 tracking-tight">
          AI <span className="text-primary">Assistants</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Manage your AI assistants and create specialized helpers for different aspects of your Meta advertising campaigns.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="flex items-center space-x-3">
            <div className="w-4 h-4 bg-primary rounded-full animate-bounce"></div>
            <div className="w-4 h-4 bg-primary rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
            <div className="w-4 h-4 bg-primary rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            <span className="text-gray-600 ml-3">Loading your assistants...</span>
          </div>
        </div>
      ) : assistants.length === 0 ? (
        <div className="flex justify-center py-20">
          <div className="bg-white rounded-3xl p-12 max-w-2xl w-full border border-gray-200 shadow-xl text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-300 to-gray-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">No AI Assistants Yet</h3>
            <p className="text-gray-600 mb-8 text-lg leading-relaxed">
              Create your first AI assistant to help automate and optimize your Meta advertising campaigns. Each assistant can be specialized for different tasks.
            </p>
            <button
              onClick={() => router.push('/setup-assistant')}
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-primary/90 to-primary text-white font-semibold rounded-2xl shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create Your First Assistant
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Create New Assistant Button */}
          <div className="flex justify-center mb-8">
            <button
              onClick={() => router.push('/setup-assistant')}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-primary/90 to-primary text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create New Assistant
            </button>
          </div>

          {/* Assistant Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assistants.map((assistant) => (
              <div key={assistant.id} className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-orange-600 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    Active
                  </span>
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-2">{assistant.name}</h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{assistant.description}</p>
                
                <div className="text-xs text-gray-500 mb-4">
                  Created {new Date(assistant.created_at).toLocaleDateString()}
                </div>
                
                <button
                  onClick={() => startChatWithAssistant(assistant)}
                  className="w-full bg-gradient-to-r from-primary to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-3 px-4 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span>Start Chat</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}