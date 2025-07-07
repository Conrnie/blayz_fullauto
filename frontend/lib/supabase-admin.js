import { createClient } from '@supabase/supabase-js';

// Get the Supabase URL from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zrsevaevonthrspehpaj.supabase.co';

// Hardcoded service role key for development to ensure we can run demo data generation
// In production, you should use an environment variable instead
const hardcodedServiceKey = null; // Removed hardcoded service key for security

const getServiceRoleKey = () => {
  // Try to get the key from environment variables first
  const envKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (envKey) {
    console.log('[SUPABASE_ADMIN] Using service role key from environment variable');
    return envKey;
  }
  
  // Log that we're using a hardcoded key
  console.log('[SUPABASE_ADMIN] Using hardcoded service role key - NOT RECOMMENDED FOR PRODUCTION');
  return hardcodedServiceKey;
};

// Create a Supabase client with the service role key
let supabaseAdmin;

try {
  const serviceRoleKey = getServiceRoleKey();
  
  console.log('[SUPABASE_ADMIN] Initializing with URL available:', !!supabaseUrl);
  console.log('[SUPABASE_ADMIN] Service role key available:', !!serviceRoleKey);
  
  if (!supabaseUrl) {
    console.error('[SUPABASE_ADMIN] Missing Supabase URL. Admin client cannot be initialized.');
    throw new Error('Missing Supabase URL');
  }
  
  if (!serviceRoleKey) {
    console.error('[SUPABASE_ADMIN] Missing Supabase service role key. Admin client cannot be initialized.');
    throw new Error('Missing Supabase service role key');
  }
  
  supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  console.log('[SUPABASE_ADMIN] ✅ Supabase admin client initialized with service role key');
  
  // Test connection by making a small query
  supabaseAdmin.from('user_profiles').select('count', { count: 'exact', head: true })
    .then(({ count, error }) => {
      if (error) {
        console.error('[SUPABASE_ADMIN] Connection test failed:', error);
      } else {
        console.log(`[SUPABASE_ADMIN] Connection test successful. Found ${count} profiles.`);
      }
    })
    .catch(err => {
      console.error('[SUPABASE_ADMIN] Connection test failed with exception:', err);
    });
    
} catch (error) {
  console.error('[SUPABASE_ADMIN] ❌ Error initializing Supabase admin client:', error);
  // Create a mock client instead of the dummy client
  supabaseAdmin = createMockClient();
}

// Create a mock client for SSR when environment variables aren't available
// This will prevent build errors, but won't work for actual DB operations
function createMockClient() {
  console.warn('CREATING MOCK SUPABASE CLIENT - Database operations will not work');
  console.warn('Using mock Supabase client for server-side rendering');
  
  return {
    _opts: { mockMode: true },
    from: () => ({
      insert: () => ({ data: null, error: { message: 'Mock client cannot perform database operations' } }),
      select: () => ({ data: null, error: { message: 'Mock client cannot perform database operations' } }),
      update: () => ({ data: null, error: { message: 'Mock client cannot perform database operations' } }),
      delete: () => ({ data: null, error: { message: 'Mock client cannot perform database operations' } }),
    }),
    auth: {
      onAuthStateChange: () => ({ data: null, error: null, subscription: { unsubscribe: () => {} } }),
    },
    // Add other methods as needed to simulate the Supabase client
    storage: {
      from: () => ({
        upload: () => ({ data: null, error: { message: 'Mock client cannot perform storage operations' } }),
        download: () => ({ data: null, error: { message: 'Mock client cannot perform storage operations' } }),
      })
    },
  };
}

export default supabaseAdmin; 