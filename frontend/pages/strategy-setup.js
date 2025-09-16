import React, { useState } from 'react';
import Layout from '../components/Layout/Layout';
import StrategySetupChat from '../components/StrategySetupChat';
import { useRouter } from 'next/router';

// Demo user for testing
const DEMO_USER = {
  id: 'demo-user-123',
  email: 'demo@blayz.com',
  access_token: 'demo-token'
};

export default function StrategySetup() {
  // Use demo user for now to test the interface
  const user = DEMO_USER;
  const authLoading = false;
  const [isCompleting, setIsCompleting] = useState(false);
  const router = useRouter();

  const handleStrategyComplete = async (finalStrategy) => {
    setIsCompleting(true);
    
    try {
      // For demo mode, simulate saving the strategy
      console.log('Demo: Saving strategy:', finalStrategy);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      alert(`✅ Strategy saved successfully!\n\nStrategy: ${finalStrategy.summary || 'Custom strategy created'}\n\nIn a real environment, this would save to your database and create automation rules.`);
      
      // For demo, just show success instead of redirect
      setIsCompleting(false);
      
    } catch (error) {
      console.error('Error saving strategy:', error);
      alert('Error saving strategy. Please try again.');
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
      <div className="fixed inset-0 bg-white overflow-y-auto z-10 pl-80 flex flex-col">
        {/* Header */}
        <div className="w-full bg-white border-b border-gray-200">
          <div className="flex justify-center py-4">
            <div className="w-full max-w-5xl px-4">
              <div className="relative flex items-center justify-center">
                <div className="absolute left-0">
                    <button
                      onClick={() => router.push('/dashboard')}
                      className="inline-flex items-center text-primary hover:text-primary/80 transition-colors"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                      Back to Dashboard
                    </button>
                </div>
                
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-secondary">
                    Set Up Your Automation Strategy
                  </h1>
                  <p className="text-sm text-gray-500 mt-1">
                    Describe your Meta ads approach in your own words
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="w-full flex justify-center py-4 flex-1 min-h-0">
          <div className="w-full max-w-5xl px-4 flex flex-col h-full">
            {/* Chat Interface */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden flex-1 min-h-[500px]">
            {isCompleting ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <p className="text-gray-500">Completing your strategy...</p>
              </div>
            ) : (
               <StrategySetupChat onStrategyComplete={handleStrategyComplete} user={user} />
             )}
             </div>
           </div>
         </div>
       </div>
     </Layout>
   );
}