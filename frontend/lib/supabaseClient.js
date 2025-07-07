import { createClient } from '@supabase/supabase-js'

let supabaseInstance = null;

export function getSupabaseBrowserClient() {
  // Return existing instance if already created
  if (supabaseInstance) {
    return supabaseInstance;
  }
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  // Debug logging
  console.log('=== SUPABASE CLIENT DEBUG ===');
  console.log('URL:', supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'NOT SET');
  console.log('Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 10)}...` : 'NOT SET');
  console.log('URL length:', supabaseUrl?.length || 0);
  console.log('Key length:', supabaseAnonKey?.length || 0);
  
  // Check for missing or placeholder values
  if (!supabaseUrl || !supabaseAnonKey || 
      supabaseUrl === 'https://placeholder.supabase.co' || 
      supabaseAnonKey === 'placeholder-key') {
    console.warn('Supabase environment variables not configured properly.');
    console.warn('Using placeholder client - some features may not work.');
    
    // Create a mock client for build purposes
    supabaseInstance = {
      auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        signOut: () => Promise.resolve({ error: null }),
        signInWithOAuth: () => Promise.resolve({ data: null, error: { message: 'Mock client - no real auth' } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        exchangeCodeForSession: () => Promise.resolve({ data: { session: null }, error: { message: 'Mock client - no real auth' } })
      },
      from: () => ({
        select: () => Promise.resolve({ data: [], error: null }),
        insert: () => Promise.resolve({ data: null, error: null }),
        update: () => Promise.resolve({ data: null, error: null }),
        delete: () => Promise.resolve({ data: null, error: null })
      })
    };
    
    return supabaseInstance;
  }
  
  // Validate URL format
  if (!supabaseUrl.includes('.supabase.co')) {
    console.error('Invalid Supabase URL format. Expected: https://your-project.supabase.co');
  }
  
  // Validate key format (should start with 'eyJ')
  if (!supabaseAnonKey.startsWith('eyJ')) {
    console.error('Invalid Supabase anon key format. Should start with "eyJ"');
  }
  
  // Create and store the real instance using regular createClient (not SSR)
  try {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    });
    console.log('Created new Supabase client instance successfully with real-time enabled');
  } catch (error) {
    console.error('Error creating Supabase client:', error);
    throw error;
  }
  
  return supabaseInstance;
} 