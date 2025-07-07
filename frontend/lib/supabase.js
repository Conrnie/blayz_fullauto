import { getSupabaseBrowserClient } from './supabaseClient.js';

// Initialize the client once and export it as default
const supabase = getSupabaseBrowserClient();

export default supabase;

// Debug helper can be simplified or removed if getSupabaseClient handles its own logging
// For now, let's assume getSupabaseClient provides a valid client or throws.

// export function isMockClient() {
//   // This logic would need to change if we still want to detect mock vs real,
//   // potentially by exposing a similar function from supabaseClient.js
//   // For now, assume getSupabaseClient gives a real client or fails.
//   const client = getSupabaseClient();
//   // This is a placeholder; actual check would depend on supabaseClient.js implementation
//   return !client; 
// }

// Get the client instance
// This top-level call might still be tricky if this module is imported very early.
// It's often better to call getSupabaseClient() inside each exported function
// right when it's needed, or use useMemo in components.
// However, to minimize changes to the existing structure of this file,
// we'll get it once here and assume it works due to the checks in getSupabaseClient.
// If issues persist, we might move getSupabaseClient() calls into each function.

// No longer need a top-level supabase constant here.
// We will get the client inside each function when needed.

export async function signUp(email, password) {
  // const supabase = getSupabaseClient(); // No longer needed here
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  
  if (error) throw error;
  return data;
}

export async function signIn(email, password) {
  // const supabase = getSupabaseClient(); // No longer needed here
  console.log(`Attempting to sign in user: ${email}`);
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) {
    console.error('Sign in error:', error.message);
    throw error;
  }
  
  if (data?.session && typeof window !== 'undefined') {
    try {
      const userToStore = {
        id: data.user.id,
        email: data.user.email,
        lastSeen: new Date().toISOString()
      };
      
      localStorage.setItem('blayz-user-data', JSON.stringify(userToStore));
      
      console.log('Successfully signed in and persisted session for:', data.user.email);
      console.log('Session expires at:', new Date(data.session.expires_at * 1000).toLocaleString());
    } catch (storageError) {
      console.error('Error storing auth data to localStorage:', storageError);
    }
  }
  return data;
}

export async function signOut() {
  // const supabase = getSupabaseClient(); // No longer needed here
  console.log('Attempting to sign out user...');
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    console.error('Sign out error:', error.message);
    throw error;
  }
  
  // Clear any custom localStorage items if needed
  if (typeof window !== 'undefined') {
    localStorage.removeItem('blayz-user-data');
    // localStorage.removeItem('blayz-auth-token'); // This key was in the old init, might be handled by supabase-js itself
  }
  console.log('Successfully signed out.');
  return true;
}

export async function getCurrentUser() {
  // const supabase = getSupabaseClient(); // No longer needed here
  console.log('getCurrentUser called');
  // Prefer getSession to ensure active session is considered
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
  if (sessionError) {
    console.error('Error getting session in getCurrentUser:', sessionError.message);
      return null;
    }
    
  if (session) {
    console.log('Current session found:', session);
    // Optionally, verify blayz-user-data with session user
    if (typeof window !== 'undefined') {
    try {
        const storedUserData = JSON.parse(localStorage.getItem('blayz-user-data'));
        if (storedUserData && storedUserData.id !== session.user.id) {
          console.warn('Mismatch between localStorage user data and session user. Clearing local.');
          localStorage.removeItem('blayz-user-data');
        }
      } catch (e) {
        console.warn('Could not parse blayz-user-data from localStorage');
        localStorage.removeItem('blayz-user-data');
      }
    }
    return session.user;
  }
  
  console.log('No active session found by getCurrentUser.');
  return null;
}

export async function getUserProfile(userId) {
  // const supabase = getSupabaseClient(); // No longer needed here
  if (!userId) {
    console.warn('getUserProfile called without userId');
    return null;
  }
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) {
    console.error('Error fetching user profile:', error.message);
    // Don't throw, just return null if profile not found or error
    return null; 
  }
  return data;
}

export async function signInWithProvider(provider, options = {}) {
  // const supabase = getSupabaseClient(); // No longer needed here
    console.log(`Signing in with provider: ${provider}`);
    
  // Clear any existing OAuth state to prevent PKCE conflicts, but be selective
  if (typeof window !== 'undefined') {
    // Check if we have an active session before clearing everything
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Only clear if no active session exists
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.includes('supabase.auth') && key.includes('code-verifier')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        console.log('Cleared stale OAuth code verifier state');
      } else {
        console.log('Active session found, preserving auth state');
      }
    } catch (err) {
      console.log('Could not check session, clearing OAuth state as precaution');
      // Clear OAuth-specific keys only
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('supabase.auth') && key.includes('code-verifier')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    }
  }
    
  // The supabase instance is now fetched from getSupabaseClient at the top of the module.
  // No need for re-initialization checks here.

  const redirectTo = options.redirectTo || (typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : '/auth/callback');
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: redirectTo,
        ...(options.scopes && { scopes: options.scopes }), // Pass scopes if provided
        ...(options.queryParams && { queryParams: options.queryParams }),
        // Explicitly enable PKCE flow
        skipBrowserRedirect: false,
      },
    });

  if (error) {
    console.error(`Error signing in with ${provider}:`, error.message);
    console.error('Full error object:', error); // Log full error for more details
    throw error;
  }
  
  console.log('OAuth initiation successful, redirecting to provider...');
  return data;
}

export async function hasConnectedMeta(userId) {
  // const supabase = getSupabaseClient(); // No longer needed here
  if (!userId) return false;
  try {
    // Use the correct table name - meta_connections instead of user_facebook_tokens
    const { data, error } = await supabase
      .from('meta_connections')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle(); // Use maybeSingle to not error if no row found

    if (error) {
      console.error('Error checking Meta connection:', error.message);
      return false;
    }
    return !!data; // True if a token record exists, false otherwise
  } catch (e) {
    console.error('Exception in hasConnectedMeta:', e);
    return false;
  }
}

export async function checkUserAdAccountStatus(userId) {
  if (!userId) return { connected: false, error: 'No user ID provided' };
  
  try {
    console.log('Checking ad account status for user:', userId);
    
    // Check if user has connected Meta accounts
    const { data: connection, error: connectionError } = await supabase
      .from('meta_connections')
      .select('id, token_expires_at')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (connectionError) {
      console.error('Error checking meta connection:', connectionError);
      return { connected: false, error: connectionError.message };
    }
    
    if (!connection) {
      return { connected: false, reason: 'no_connection' };
    }
    
    // Check if token is expired
    if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
      return { connected: false, reason: 'token_expired' };
    }
    
    return { connected: true };
  } catch (err) {
    console.error('Error checking ad account status:', err);
    return { connected: false, error: err.message };
  }
}

// No longer need the complex comments about default export here,
// as we are now explicitly creating and exporting the client as default.
