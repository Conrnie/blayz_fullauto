import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import supabase from '../../lib/supabase';
import { getCurrentUser } from '../../lib/supabase';

export default function StrategiesDashboard() {
  const router = useRouter();
  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState(null);

  useEffect(() => {
    const fetchUserAndStrategies = async () => {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      if (currentUser) {
        loadStrategies(currentUser.id);
      } else {
        router.push('/auth/login');
      }
    };
    fetchUserAndStrategies();

    // Real-time subscription
    const handleRealtimeUpdate = (payload) => {
      if (payload.eventType === 'INSERT') {
        setStrategies(prev => [...prev, payload.new]);
      } else if (payload.eventType === 'UPDATE') {
        setStrategies(prev => prev.map(s => s.id === payload.new.id ? payload.new : s));
      } else if (payload.eventType === 'DELETE') {
        setStrategies(prev => prev.filter(s => s.id !== payload.old.id));
      }
    };

    const subscription = supabase
      .channel('marketer_strategies_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'marketer_strategies' }, handleRealtimeUpdate)
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [router]);

  const loadStrategies = async (userId) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('marketer_strategies')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStrategies(data || []);
      setError(null);
    } catch (err) {
      console.error('Failed to load strategies:', err);
      setError('Failed to load strategies. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    router.push('/strategy-setup');
  };

  const showToast = (message, type = 'info') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleDeleteStrategy = async (strategy) => {
    if (!window.confirm(`Are you sure you want to delete "${strategy.strategy_name}"?`)) return;

    try {
      const { error } = await supabase
        .from('marketer_strategies')
        .delete()
        .eq('id', strategy.id);

      if (error) throw error;
      showToast('Strategy deleted successfully', 'success');
      loadStrategies(user.id);
    } catch (err) {
      console.error('Failed to delete strategy:', err);
      showToast('Failed to delete strategy', 'error');
    }
  };

  const openEditModal = (strategy) => {
    setSelectedStrategy(strategy);
    setIsEditModalOpen(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const updatedName = e.target.strategy_name.value;
    const updatedStrategy = { ...selectedStrategy, strategy_name: updatedName };
    try {
      const { error } = await supabase
        .from('marketer_strategies')
        .update({ strategy_name: updatedName })
        .eq('id', selectedStrategy.id);
      if (error) throw error;
      setStrategies(prev => prev.map(s => s.id === selectedStrategy.id ? updatedStrategy : s));
      showToast('Strategy updated successfully', 'success');
      setIsEditModalOpen(false);
    } catch (err) {
      console.error('Failed to update strategy:', err);
      showToast('Failed to update strategy', 'error');
    }
  };

  // Update main return to match structure
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden p-8">
      {/* Top wave decoration */}
      <div className="absolute top-0 left-0 right-0 h-64 overflow-hidden -z-10 opacity-70">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" className="w-full h-full">
          <path fill="#FFF5E9" fillOpacity="1" d="M0,224L48,213.3C96,203,192,181,288,160C384,139,480,117,576,122.7C672,128,768,160,864,186.7C960,213,1056,235,1152,213.3C1248,192,1344,128,1392,96L1440,64L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"></path>
        </svg>
      </div>
      {/* Header */}
      <div className="mb-12">
  <div className="text-center mb-8">
    <h1 className="text-4xl md:text-5xl font-extrabold text-secondary mb-4 tracking-tight">
      My <span className="text-primary">Strategies</span>
    </h1>
    <p className="text-xl text-gray-600 max-w-3xl mx-auto">
      Manage your marketing strategies
    </p>
  </div>
</div>
  
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
          <div className="flex items-center">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Strategies</p>
              <p className="text-2xl font-bold text-gray-900">{strategies.length}</p>
            </div>
          </div>
        </div>
        {/* Add more stats if needed */}
      </div>
  
      {/* Create CTA */}
      <div className="text-center mb-12">
        <button
          onClick={handleCreateNew}
          className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-primary/90 to-primary text-white font-semibold rounded-2xl shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 hover:from-primary hover:to-primary/80 focus:outline-none focus:ring-4 focus:ring-primary/50"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Create New Strategy
        </button>
      </div>
  
      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-gray-200 border-t-primary rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-gradient-to-r from-primary to-primary/80 rounded-full animate-pulse"></div>
            </div>
          </div>
          <p className="mt-6 text-lg text-gray-600 font-medium">Loading your strategies...</p>
          <p className="text-sm text-gray-500">This may take a few moments</p>
        </div>
      ) : error ? (
        <div className="text-center py-20">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 max-w-md mx-auto">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.832-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-red-800 mb-2">Unable to Load Strategies</h3>
            <p className="text-red-600 mb-6">{error}</p>
            <button
              onClick={() => loadStrategies(user.id)}
              className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      ) : strategies.length === 0 ? (
        <div className="text-center py-20">
          <div className="bg-white rounded-3xl p-12 max-w-lg mx-auto border border-gray-200 shadow-xl">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-300 to-gray-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">No Strategies Yet</h3>
            <p className="text-gray-600 mb-8 text-lg leading-relaxed">
              Get started by creating your first marketing strategy.
            </p>
            <button
              onClick={handleCreateNew}
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-primary/90 to-primary text-white font-semibold rounded-2xl shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create Your First Strategy
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {strategies.map((strategy, index) => (
            <div key={strategy.id} className="group bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden hover:shadow-2xl hover:border-gray-200 transition-all duration-500 transform hover:-translate-y-2" style={{ animationDelay: `${index * 100}ms` }}>
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary transition-colors duration-300 mb-2">
                  {strategy.strategy_name}
                </h3>
                <p className="text-gray-500 text-sm mb-4">Created: {new Date(strategy.created_at).toLocaleDateString()}</p>
                <div className="mb-6">
  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Preferences</h4>
  <ul className="space-y-3">
    {Object.entries(strategy.preferences || {}).filter(([key, value]) => {
  if (key === 'completion_trigger') return false;
  if (key === 'ai_generated') return false;
  if (['complete'].includes(key) && !value) return false;
  return true;
}).map(([key, value]) => (
      <li key={key} className="text-sm text-gray-700">
        <span className="font-semibold text-gray-800 capitalize">{key.replace(/_/g, ' ')}:</span>
        {key === 'preferences' && typeof value === 'object' ? (
          <ul className="ml-4 mt-1 space-y-1 list-disc">
            {Object.entries(value).map(([subKey, subValue]) => (
              <li key={subKey} className="text-sm text-gray-600">
                <span className="font-medium capitalize">{subKey}:</span> {subValue}
              </li>
            ))}
          </ul>
        ) : (
          <span className="ml-1">{typeof value === 'object' ? JSON.stringify(value) : value}</span>
        )}
      </li>
    ))}
  </ul>
</div>
              </div>
              {/* Footer with buttons if needed */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-t border-gray-100 flex space-x-3">
  <button 
    onClick={() => openEditModal(strategy)}
    className="flex-1 text-center py-2 px-4 font-semibold rounded-xl transition-all duration-300 border text-sm bg-white text-primary border-primary hover:bg-primary hover:text-white"
  >
    Edit
  </button>
  <button 
    onClick={() => handleDeleteStrategy(strategy)}
    className="flex-1 text-center py-2 px-4 font-semibold rounded-xl transition-all duration-300 border text-sm bg-red-50 text-red-600 border-red-200 hover:bg-red-100 hover:text-red-700"
  >
    Delete
  </button>
</div>
            </div>
          ))}
        </div>
      )}
  
      {toastMessage && (
        <div className={`fixed bottom-4 right-4 p-4 rounded ${toastMessage.type === 'error' ? 'bg-red-500' : 'bg-green-500'} text-white`}>
          {toastMessage.message}
        </div>
      )}
      {/* Wave decoration */}
      <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none">
        <svg className="w-full h-full text-gray-200 fill-current" viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path d="M0,320L48,293.3C96,267,192,213,288,202.7C384,192,480,224,576,234.7C672,245,768,235,864,213.3C960,192,1056,160,1152,149.3C1248,139,1344,149,1392,154.7L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
        </svg>
      </div>
      {/* Edit Modal */}
      {isEditModalOpen && selectedStrategy && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Edit Strategy</h2>
            <form onSubmit={handleUpdate}>
              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2">Strategy Name</label>
                <input 
                  name="strategy_name"
                  defaultValue={selectedStrategy.strategy_name}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:border-primary"
                  required
                />
              </div>
              <div className="flex justify-end space-x-4 mt-6">
                <button 
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-6 py-3 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors font-medium"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}