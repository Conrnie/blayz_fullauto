import { useState, useEffect } from 'react';
import { Button, TextField, Alert, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { supabase } from '../lib/supabase';

export default function AuthWrapper({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  useEffect(() => {
    // Check current auth state
    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      setUser(session?.user || null);
      setLoading(false);
      
      if (event === 'SIGNED_IN') {
        setShowAuth(false);
        setAuthSuccess('Successfully signed in!');
        setTimeout(() => setAuthSuccess(''), 3000);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error getting session:', error);
      } else {
        setUser(session?.user || null);
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`
          }
        });
        
        if (error) {
          setAuthError(error.message);
        } else {
          setAuthSuccess('Check your email for the confirmation link!');
          setEmail('');
          setPassword('');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (error) {
          setAuthError(error.message);
        }
      }
    } catch (error) {
      setAuthError('An unexpected error occurred');
      console.error('Auth error:', error);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
      } else {
        setUser(null);
        setAuthSuccess('Successfully signed out!');
        setTimeout(() => setAuthSuccess(''), 3000);
      }
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setAuthError('');
    setAuthSuccess('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-[#FE8401] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading Blayz...</p>
        </div>
      </div>
    );
  }

  // Show auth dialog if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-slate-800 rounded-xl p-8 border border-slate-700">
            {/* Logo/Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-[#FE8401] to-[#FF9933] bg-clip-text text-transparent mb-2">
                Welcome to Blayz
              </h1>
              <p className="text-slate-300">AI-Powered Meta Ads Automation</p>
            </div>

            {/* Auth Form */}
            <form onSubmit={handleAuth} className="space-y-4">
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                required
                variant="outlined"
                className="bg-slate-700"
                InputLabelProps={{ style: { color: '#94a3b8' } }}
                InputProps={{ 
                  style: { color: 'white', backgroundColor: '#374151' }
                }}
              />

              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
                required
                variant="outlined"
                className="bg-slate-700"
                InputLabelProps={{ style: { color: '#94a3b8' } }}
                InputProps={{ 
                  style: { color: 'white', backgroundColor: '#374151' }
                }}
              />

              {authError && (
                <Alert severity="error" className="bg-red-900/20 text-red-400">
                  {authError}
                </Alert>
              )}

              {authSuccess && (
                <Alert severity="success" className="bg-green-900/20 text-green-400">
                  {authSuccess}
                </Alert>
              )}

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={authLoading}
                className="bg-[#FE8401] hover:bg-[#e5750a] py-3"
                size="large"
              >
                {authLoading ? 'Please wait...' : (isSignUp ? 'Sign Up' : 'Sign In')}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    resetForm();
                  }}
                  className="text-[#FE8401] hover:text-[#e5750a] text-sm"
                >
                  {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                </button>
              </div>
            </form>

            {/* Demo Access */}
            <div className="mt-6 pt-6 border-t border-slate-700">
              <p className="text-slate-400 text-sm text-center mb-3">
                Or continue without account:
              </p>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => setUser({ email: 'demo@blayz.io', id: 'demo' })}
                className="border-slate-600 text-white hover:border-[#FE8401]"
              >
                Continue as Demo User
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated - show main app with user info
  return (
    <div>
      {/* User bar */}
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold bg-gradient-to-r from-[#FE8401] to-[#FF9933] bg-clip-text text-transparent">
              Blayz
            </h1>
            <div className="text-slate-300 text-sm">
              Welcome, {user.email || 'Demo User'}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <a 
              href="/agent-demo" 
              className="text-slate-300 hover:text-[#FE8401] text-sm"
            >
              Agent Demo
            </a>
            <a 
              href="/creative-demo" 
              className="text-slate-300 hover:text-[#FE8401] text-sm"
            >
              Creative Demo
            </a>
            <a 
              href="/automation-setup" 
              className="text-slate-300 hover:text-[#FE8401] text-sm"
            >
              Automation
            </a>
            <Button
              variant="outlined"
              size="small"
              onClick={handleSignOut}
              className="border-slate-600 text-white hover:border-red-400"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      {children}
    </div>
  );
}