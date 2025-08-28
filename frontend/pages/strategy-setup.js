import React, { useState } from 'react';
import Layout from '../components/Layout/Layout';
import StrategySetupChat from '../components/StrategySetupChat';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/router';

export default function StrategySetup() {
  const { user, isLoading: authLoading } = useAuth();
  const [isCompleting, setIsCompleting] = useState(false);
  const router = useRouter();

  const handleStrategyComplete = async (finalStrategy) => {
    setIsCompleting(true);
    
    try {
      // Save the completed strategy
      const { data: strategy, error } = await supabase
        .from('marketer_strategies')
        .insert({
          user_id: user.id,
          strategy_name: `${user.email?.split('@')[0]}'s Strategy`,
          preferences: finalStrategy.preferences,
          is_default: true
        })
        .select()
        .single();

      if (error) throw error;

      // Redirect to campaign creation or dashboard
      router.push('/dashboard?strategy_complete=true');
      
    } catch (error) {
      console.error('Error saving strategy:', error);
      alert('Error saving strategy. Please try again.');
    } finally {
      setIsCompleting(false);
    }
  };

  if (authLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-red-800 font-semibold mb-2">Authentication Required</h2>
            <p className="text-red-700">Please log in to set up your campaign strategy.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto py-8">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Set Up Your Automation Strategy
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl">
            Instead of complex forms, just describe your approach to Meta ads in your own words. 
            Our AI will learn your strategy and build custom automation rules that work exactly how you prefer.
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                1
              </div>
              <span className="ml-2 font-medium text-orange-600">Strategy Discovery</span>
            </div>
            <div className="flex-1 h-1 bg-gray-200 rounded-full">
              <div className="h-1 bg-orange-500 rounded-full" style={{ width: '33%' }}></div>
            </div>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-sm font-medium">
                2
              </div>
              <span className="ml-2 text-gray-500">Campaign Creation</span>
            </div>
            <div className="flex-1 h-1 bg-gray-200 rounded-full"></div>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-sm font-medium">
                3
              </div>
              <span className="ml-2 text-gray-500">Go Live</span>
            </div>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden h-[600px]">
          {isCompleting ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mb-4"></div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Creating Your Strategy Profile...</h3>
              <p className="text-gray-600 text-center max-w-md">
                I'm analyzing your preferences and setting up your custom automation rules. This will just take a moment.
              </p>
            </div>
          ) : (
            <StrategySetupChat onStrategyComplete={handleStrategyComplete} />
          )}
        </div>

        {/* Example Strategies */}
        <div className="mt-12">
          <h3 className="text-2xl font-semibold text-gray-900 mb-6">
            Example Strategy Descriptions
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <h4 className="font-semibold text-gray-900 mb-3">High-Volume Tester</h4>
              <p className="text-gray-700 italic text-sm mb-3">
                "I like to test 8-10 creatives per campaign and refresh them every 3-4 days. I focus on cost per lead and scale winners conservatively by 20% increases. I prefer fewer adsets with more creative variety rather than many narrow adsets."
              </p>
              <div className="text-xs text-gray-500">
                → AI creates automation for frequent creative testing with conservative scaling
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-6">
              <h4 className="font-semibold text-gray-900 mb-3">Angle-Focused Specialist</h4>
              <p className="text-gray-700 italic text-sm mb-3">
                "I test different messaging angles - problem-focused vs solution-focused vs social proof. Usually 3-4 creatives per angle across separate adsets. I optimize for conversion rate and scale aggressively when something hits."
              </p>
              <div className="text-xs text-gray-500">
                → AI creates automation for systematic angle testing with rapid scaling
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}