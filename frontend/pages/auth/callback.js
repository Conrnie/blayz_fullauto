import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { getSupabaseBrowserClient } from '../../lib/supabaseClient';
import Head from 'next/head';

export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const processingRef = useRef(false); // Prevent double processing

  useEffect(() => {
    // Prevent double processing in React strict mode
    if (processingRef.current) {
      console.log('OAuth callback already processing, skipping...');
      return;
    }
    
    processingRef.current = true;
    console.log('=== AUTH CALLBACK STARTED ===');
    console.log('URL:', window.location.href);
    
    const handleAuth = async () => {
      const supabase = getSupabaseBrowserClient();
      
      try {
        // Check URL parameters for OAuth code
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        
        // ALSO check for provider token in URL fragment (for Facebook OAuth)
        let providerToken = null;
        let hasImplicitFlowTokens = false;
        const hash = window.location.hash.substring(1);
        if (hash) {
          const hashParams = new URLSearchParams(hash);
          providerToken = hashParams.get('provider_token');
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          
          // Check if we have tokens from implicit flow
          hasImplicitFlowTokens = !!(accessToken && refreshToken);
          
          if (providerToken) {
            console.log('Found provider token in URL fragment:', providerToken.substring(0, 15) + '...');
            // Store provider token for later use in accounts page
            localStorage.setItem('pending_meta_provider_token', providerToken);
          }
        }
        
        console.log('Callback URL params:', { 
          code: code ? `${code.substring(0, 8)}...` : null, 
          state: state ? `${state.substring(0, 8)}...` : null,
          hasProviderToken: !!providerToken,
          hasImplicitFlowTokens,
          fullURL: window.location.href
        });
        
        // Handle implicit flow (tokens in fragment) or authorization code flow
        if (!code && !hasImplicitFlowTokens) {
          console.error('No OAuth code or tokens found in URL');
          setError('Invalid authentication callback - no code or tokens found');
          setIsProcessing(false);
          return;
        }
        
        // If we have implicit flow tokens, check for existing session
        if (hasImplicitFlowTokens && !code) {
          console.log('Implicit flow detected, checking for existing session...');
          try {
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            if (sessionData?.session) {
              console.log('Found existing valid session from implicit flow!');
              console.log('User:', sessionData.session.user.email);
              console.log('Provider:', sessionData.session.user.app_metadata?.provider);
              
              // If this is a Facebook OAuth session with provider token, store it
              if (sessionData.session.user.app_metadata?.provider === 'facebook' && providerToken) {
                console.log('Storing Facebook provider token from implicit flow...');
                localStorage.setItem('pending_meta_provider_token', providerToken);
              }
              
              setIsProcessing(false);
              // Check if user needs to connect ad accounts
              await redirectBasedOnAdAccountStatus(sessionData.session.user.id);
              return;
            } else {
              console.log('No existing session found, this should not happen with implicit flow');
              setError('Authentication failed - session not found');
              setIsProcessing(false);
              return;
            }
          } catch (err) {
            console.error('Error checking session for implicit flow:', err);
            setError('Authentication error: ' + err.message);
            setIsProcessing(false);
            return;
          }
        }
        
        if (!code) {
          console.error('No OAuth code found in URL for authorization code flow');
          setError('Invalid authentication callback - no code found');
          setIsProcessing(false);
          return;
        }
        
        console.log('OAuth code found, exchanging for session...');
        
        // Use exchangeCodeForSession to properly handle PKCE flow
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        
        if (exchangeError) {
          console.error('Error exchanging code for session:', exchangeError);
          
          // Handle specific PKCE errors with improved fallback
          if (exchangeError.message.includes('code verifier') || exchangeError.message.includes('invalid request')) {
            console.log('PKCE error detected, trying fallback session check...');
            
            // Try to get session directly as fallback
            try {
              const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
              if (sessionData?.session) {
                console.log('Found existing valid session, proceeding...');
                
                // Check if this session has Facebook provider token
                console.log('Fallback session provider:', sessionData.session.user.app_metadata?.provider);
                console.log('Fallback session provider_token:', sessionData.session.provider_token);
                
                // If this is a Facebook OAuth session with provider token, store it
                if (sessionData.session.user.app_metadata?.provider === 'facebook' && sessionData.session.provider_token) {
                  console.log('Storing Facebook provider token from fallback session...');
                  localStorage.setItem('pending_meta_provider_token', sessionData.session.provider_token);
                }
                
                setIsProcessing(false);
                // Check if user needs to connect ad accounts
                await redirectBasedOnAdAccountStatus(sessionData.session.user.id);
                return;
              }
            } catch (fallbackError) {
              console.log('Fallback session check failed:', fallbackError);
            }
            
            // Only clear OAuth state if fallback fails
            console.log('Clearing potentially corrupted OAuth state...');
            if (typeof window !== 'undefined') {
              // Be more selective about what we clear to avoid disrupting active sessions
              const keysToRemove = [];
              for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.includes('supabase.auth.token')) {
                  keysToRemove.push(key);
                }
              }
              keysToRemove.forEach(key => localStorage.removeItem(key));
            }
            setError('Authentication session expired. Please try signing in again.');
          } else {
            setError('Authentication failed: ' + exchangeError.message);
          }
          setIsProcessing(false);
          return;
        }
        
        if (data?.session) {
          console.log('Successfully exchanged code for session!');
          console.log('User:', data.session.user.email);
          console.log('Provider:', data.session.user.app_metadata?.provider);
          
          // Check if we have provider-specific data for Facebook/Meta
          console.log('Full session data:', JSON.stringify(data.session, null, 2));
          console.log('Provider token:', data.session.provider_token);
          console.log('Provider refresh token:', data.session.provider_refresh_token);
          console.log('User identities:', data.session.user.identities);
          
          // If this is a Facebook OAuth, store the provider token for later use
          if (data.session.user.app_metadata?.provider === 'facebook' && data.session.provider_token) {
            console.log('Storing Facebook provider token for Meta connection processing...');
            localStorage.setItem('pending_meta_provider_token', data.session.provider_token);
          }
          
          // NEW: Trigger Meta Conversion API event for new registrations via Meta
          if (data.session.user.app_metadata?.provider === 'facebook') {
            const createdAt = new Date(data.session.user.created_at);
            const now = new Date();
            if (now - createdAt < 60000) { // Within 1 minute - assume new registration
              console.log('New Meta registration detected - sending CAPI event');
              fetch('/api/send-conversion-event', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  eventName: 'CompleteRegistration',
                  email: data.session.user.email // For hashed matching (optional)
                })
              }).catch(err => console.error('Failed to send CAPI event:', err));
            }
          }
          
          setIsProcessing(false);
          
          // Check if user needs to connect ad accounts before redirecting
          await redirectBasedOnAdAccountStatus(data.session.user.id);
        } else {
          console.error('No session returned from code exchange');
          setError('Authentication failed - no session created');
          setIsProcessing(false);
        }
        
      } catch (err) {
        console.error('Error in OAuth callback:', err);
        setError('Authentication error: ' + err.message);
        setIsProcessing(false);
      }
    };

    // Function to check ad account connection status and redirect accordingly
    const redirectBasedOnAdAccountStatus = async (userId) => {
      try {
        console.log('Checking ad account connection status for user:', userId);
        
        const supabase = getSupabaseBrowserClient();
        
        // Check if user has connected Meta accounts
        const { data: connection, error: connectionError } = await supabase
          .from('meta_connections')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (connectionError) {
          console.error('Error checking meta connection:', connectionError);
          // If we can't check, just redirect to reports
          router.push('/reports');
          return;
        }
        
        if (!connection) {
          console.log('No Meta connection found, redirecting to accounts page');
          // Check if we have a pending provider token to process
          const hasPendingToken = localStorage.getItem('pending_meta_provider_token');
          if (hasPendingToken) {
            console.log('Found pending provider token, redirecting with auto-processing flag');
            router.push('/accounts?auto=true');
          } else {
            router.push('/accounts?first_time=true');
          }
        } else {
          console.log('Meta connection exists, redirecting to reports');
          router.push('/reports');
        }
      } catch (err) {
        console.error('Error checking ad account status:', err);
        // Default to reports page if check fails
        router.push('/reports');
      }
    };

    handleAuth();

    // Cleanup function
    return () => {
      // No cleanup needed for this approach
    };
  }, [router]);

  // Handle error state
  useEffect(() => {
    if (error) {
      setTimeout(() => {
        router.push('/auth/login?error=' + encodeURIComponent(error));
      }, 3000);
    }
  }, [error, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-2">
      <Head>
        <title>Authentication - Blayz</title>
        <meta name="description" content="Authenticating you..." />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="flex w-full flex-1 flex-col items-center justify-center px-20 text-center">
        <div className="bg-white p-8 rounded-md shadow-md max-w-md w-full">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            {error ? 'Authentication Failed' : 'Authenticating...'}
          </h1>
          {error ? (
            <div>
              <p className="text-red-600 mb-6">{error}</p>
              <p className="text-gray-600">Redirecting to login page...</p>
            </div>
          ) : (
            <div>
              <p className="text-gray-600 mb-6">Please wait while we complete your authentication.</p>
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="flex h-24 w-full items-center justify-center border-t">
        <p className="text-gray-600">Powered by Blayz</p>
      </footer>
    </div>
  );
} 