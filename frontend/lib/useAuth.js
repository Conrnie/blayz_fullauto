import { useState, useEffect } from 'react';
import supabase, { getCurrentUser } from './supabase';

/**
 * Custom hook for handling authentication
 * This provides a consistent way to check user auth status across components
 */
export default function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMock, setIsMock] = useState(false);

  // Function to persist user to localStorage
  const persistUserToLocalStorage = (user) => {
    if (!user || !window?.localStorage) return;
    
    try {
      const userToStore = {
        id: user.id,
        email: user.email,
        lastSeen: new Date().toISOString()
      };
      localStorage.setItem('blayz-user-data', JSON.stringify(userToStore));
    } catch (error) {
      console.error('Error persisting user to localStorage:', error);
    }
  };

  // Function to get user from localStorage
  const getUserFromLocalStorage = () => {
    if (!window?.localStorage) return null;
    
    try {
      const userData = localStorage.getItem('blayz-user-data');
      if (!userData) return null;
      
      return JSON.parse(userData);
    } catch (error) {
      console.error('Error retrieving user from localStorage:', error);
      return null;
    }
  };

  // Load user on initial mount
  useEffect(() => {
    // First try to get user from localStorage for immediate display
    if (typeof window !== 'undefined') {
      const storedUser = getUserFromLocalStorage();
      if (storedUser) {
        setUser(storedUser);
        // Don't set loading to false yet, still need to verify with Supabase
      }
    }
    
    // Check if using mock client (set to false since we're using real Supabase)
    setIsMock(false);
    
    // Fetch user from supabase
    const fetchUser = async () => {
      try {
        // Try to get active session
        const { data: sessionData } = await supabase.auth.getSession();
        
        if (sessionData?.session?.user) {
          setUser(sessionData.session.user);
          persistUserToLocalStorage(sessionData.session.user);
        } else {
          // Try getCurrentUser as fallback
          const currentUser = await getCurrentUser();
          if (currentUser) {
            setUser(currentUser);
            persistUserToLocalStorage(currentUser);
          }
        }
      } catch (err) {
        console.error('Error fetching auth user:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
    
    // Set up auth state listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change in hook:', event);
        
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          persistUserToLocalStorage(session.user);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          localStorage.removeItem('blayz-user-data');
        } else if (['TOKEN_REFRESHED', 'USER_UPDATED'].includes(event) && session?.user) {
          setUser(session.user);
          persistUserToLocalStorage(session.user);
        }
      }
    );

    return () => {
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  // Function to get auth token for API calls
  const getToken = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      return session?.access_token || null;
    } catch (error) {
      console.error('Error getting auth token:', error);
      throw error;
    }
  };

  return { 
    user, 
    loading, 
    error, 
    isMock,
    isLoggedIn: !!user && user.id !== 'mock-user-id' && user.id !== 'error' && user.id !== 'cached-user-id',
    getToken
  };
} 