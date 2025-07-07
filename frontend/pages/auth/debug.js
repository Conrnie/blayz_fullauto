import React, { useState, useEffect } from 'react';
import supabase from '../../lib/supabase.js';
import { ensureFacebookTokensTable, verifyFacebookToken, extractTokenFromUrlParams } from '../../lib/meta-auth.js';
import Link from 'next/link';
import Head from 'next/head';

export default function AuthDebug() {
  const [user, setUser] = useState(null);
  const [tokens, setTokens] = useState(null);
  const [duplicateTokens, setDuplicateTokens] = useState(null);
  const [status, setStatus] = useState({ type: 'loading', message: 'Loading...' });
  const [supabaseStatus, setSupabaseStatus] = useState(null);
  const [hashToken, setHashToken] = useState(null);
  const [cleanupInProgress, setCleanupInProgress] = useState(false);
  const [cleanupResult, setCleanupResult] = useState(null);
  const [allPossibleTokens, setAllPossibleTokens] = useState([]);
  const [verificationResults, setVerificationResults] = useState(null);

  // DEVELOPMENT ONLY: Restrict this page to development mode
  if (process.env.NODE_ENV !== 'development') {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Head>
          <title>Access Denied - Blayz Auth Debug</title>
        </Head>
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="text-red-500">This debugging page is only available in development mode.</p>
        <Link href="/dashboard" className="text-blue-500 hover:underline mt-4 inline-block">
          Go to Dashboard
        </Link>
      </div>
    );
  }

  // Function to check for and clean up duplicate tokens
  const checkForDuplicates = async () => {
    if (!user) {
      setStatus({ type: 'error', message: 'No user authenticated. Cannot check for duplicates.' });
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('user_facebook_tokens')
        .select('*')
        .eq('user_id', user.id);
        
      if (error) {
        console.error('Error checking for duplicates:', error);
        setStatus({ type: 'error', message: `Error checking duplicates: ${error.message}` });
        return;
      }
      
      if (data && data.length > 1) {
        setDuplicateTokens({
          count: data.length,
          tokens: data
        });
        setStatus({ 
          type: 'warning', 
          message: `Found ${data.length} token records for this user. Expected only 1.` 
        });
      } else {
        setDuplicateTokens(null);
        setStatus({ 
          type: 'success', 
          message: `No duplicate tokens found. ${data?.length || 0} records exist.` 
        });
      }
    } catch (err) {
      console.error('Error in duplicate check:', err);
      setStatus({ type: 'error', message: `Unexpected error: ${err.message}` });
    }
  };

  // Function to clean up duplicate tokens
  const cleanupDuplicates = async () => {
    if (!duplicateTokens || duplicateTokens.count <= 1) {
      setStatus({ type: 'info', message: 'No duplicates to clean up.' });
      return;
    }
    
    setCleanupInProgress(true);
    
    try {
      // Keep the first token and delete others
      const idsToDelete = duplicateTokens.tokens.slice(1).map(token => token.id);
      console.log(`Keeping token ${duplicateTokens.tokens[0].id}, deleting ${idsToDelete.length} duplicates`);
      
      const { error } = await supabase
        .from('user_facebook_tokens')
        .delete()
        .in('id', idsToDelete);
        
      if (error) {
        console.error('Error cleaning up duplicates:', error);
        setCleanupResult({ success: false, message: `Error: ${error.message}` });
      } else {
        setCleanupResult({ 
          success: true, 
          message: `Successfully deleted ${idsToDelete.length} duplicate tokens.` 
        });
        
        // Refresh token data
        const { data } = await supabase
          .from('user_facebook_tokens')
          .select('*')
          .eq('user_id', user.id)
          .single();
          
        setTokens(data || null);
        setDuplicateTokens(null);
        setStatus({ type: 'success', message: 'Duplicate cleanup successful.' });
      }
    } catch (err) {
      console.error('Error in cleanup:', err);
      setCleanupResult({ success: false, message: `Unexpected error: ${err.message}` });
    } finally {
      setCleanupInProgress(false);
    }
  };

  // Function to clean up ALL tokens for this user and start fresh
  const cleanupAllTokens = async () => {
    if (!user) {
      setStatus({ type: 'error', message: 'No user authenticated. Cannot clean up tokens.' });
      return;
    }
    
    setCleanupInProgress(true);
    
    try {
      // First get all tokens
      const { data, error } = await supabase
        .from('user_facebook_tokens')
        .select('*')
        .eq('user_id', user.id);
        
      if (error) {
        console.error('Error checking for tokens:', error);
        setCleanupResult({ success: false, message: `Error: ${error.message}` });
        return;
      }
      
      if (!data || data.length === 0) {
        setCleanupResult({ 
          success: true, 
          message: 'No tokens found to clean up.' 
        });
        return;
      }
      
      // Delete all tokens
      console.log(`Deleting all ${data.length} tokens for user ${user.id}`);
      
      const { error: deleteError } = await supabase
        .from('user_facebook_tokens')
        .delete()
        .eq('user_id', user.id);
        
      if (deleteError) {
        console.error('Error cleaning up tokens:', deleteError);
        setCleanupResult({ success: false, message: `Error: ${deleteError.message}` });
      } else {
        setCleanupResult({ 
          success: true, 
          message: `Successfully deleted all ${data.length} tokens.` 
        });
        
        // Update UI state
        setTokens(null);
        setDuplicateTokens(null);
        setStatus({ type: 'success', message: 'All tokens deleted successfully.' });
      }
    } catch (err) {
      console.error('Error in token cleanup:', err);
      setCleanupResult({ success: false, message: `Unexpected error: ${err.message}` });
    } finally {
      setCleanupInProgress(false);
    }
  };

  // Function to verify token with Facebook Graph API
  const verifyTokenWithFacebook = async (token) => {
    if (!token) {
      setStatus({ type: 'error', message: 'No token to verify' });
      return;
    }
    
    try {
      setStatus({ type: 'loading', message: 'Verifying token with Facebook...' });
      const result = await verifyFacebookToken(token);
      
      setVerificationResults(result);
      
      if (result.valid) {
        setStatus({ 
          type: 'success', 
          message: `Token verified with Facebook! User ID: ${result.data?.id}, Name: ${result.data?.name}` 
        });
      } else {
        setStatus({ 
          type: 'error', 
          message: `Token verification failed: ${result.error?.message}` 
        });
      }
    } catch (err) {
      console.error('Error verifying token:', err);
      setStatus({ type: 'error', message: `Verification error: ${err.message}` });
    }
  };
  
  // Function to store a verified token
  const storeVerifiedToken = async (token) => {
    if (!user || !token) {
      setStatus({ type: 'error', message: 'User or token missing' });
      return;
    }
    
    try {
      setStatus({ type: 'loading', message: 'Storing token in database...' });
      
      // First verify the token is valid
      const verifyResult = await verifyFacebookToken(token);
      if (!verifyResult.valid) {
        setStatus({ type: 'error', message: 'Cannot store invalid token' });
        return;
      }
      
      // Import the store function dynamically to avoid circular dependencies
      const { storeMetaToken } = await import('../../lib/meta-auth.js');
      const result = await storeMetaToken(user.id, token);
      
      setStatus({ 
        type: 'success', 
        message: 'Token stored successfully!' 
      });
      
      // Refresh token data
      const { data } = await supabase
        .from('user_facebook_tokens')
        .select('*')
        .eq('user_id', user.id)
        .single();
        
      setTokens(data || null);
    } catch (err) {
      console.error('Error storing token:', err);
      setStatus({ type: 'error', message: `Storage error: ${err.message}` });
    }
  };

  useEffect(() => {
    // Extract token from URL
    const urlTokenData = typeof window !== 'undefined' ? extractTokenFromUrlParams() : null;
    if (urlTokenData) {
      setHashToken({
        token_preview: urlTokenData.token.substring(0, 15) + '...',
        token: urlTokenData.token,
        source: urlTokenData.source
      });
    }

    // Extract token from URL hash if present
    if (typeof window !== 'undefined' && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const token = hashParams.get('provider_token');
      if (token) {
        setHashToken({
          token_preview: token.substring(0, 15) + '...',
          full_hash: window.location.hash
        });
      }
    }

    const checkAuthStatus = async () => {
      try {
        // Check if table exists
        await ensureFacebookTokensTable();
        
        // Check Supabase connection first
        console.log('Testing Supabase connection...');
        const connectionTest = await supabase.debug.checkConnection();
        setSupabaseStatus({
          isRealClient: supabase.debug.isRealClient,
          connection: connectionTest
        });
        
        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          setStatus({ 
            type: 'error', 
            message: `Error getting session: ${sessionError.message}` 
          });
          return;
        }
        
        if (!session) {
          setStatus({ 
            type: 'warning', 
            message: 'No active session found. Please log in first.' 
          });
          return;
        }
        
        if (session?.user) {
          const user = session.user;
          
          // Store user
          setUser(user);
          setStatus({ type: 'success', message: 'User is authenticated' });
          
          // Collect all possible token locations
          const possibleTokens = [];
          
          // Check user object tokens
          if (user.provider_token) {
            possibleTokens.push({
              source: 'user.provider_token',
              token: user.provider_token,
              preview: user.provider_token.substring(0, 15) + '...'
            });
          }
          
          // Check identities
          if (user.identities && user.identities.length > 0) {
            user.identities.forEach((identity, index) => {
              if (identity.provider_token) {
                possibleTokens.push({
                  source: `user.identities[${index}].provider_token`,
                  token: identity.provider_token,
                  preview: identity.provider_token.substring(0, 15) + '...'
                });
              }
              
              if (identity.access_token) {
                possibleTokens.push({
                  source: `user.identities[${index}].access_token`,
                  token: identity.access_token,
                  preview: identity.access_token.substring(0, 15) + '...'
                });
              }
            });
          }
          
          // Check app_metadata
          if (user.app_metadata && user.app_metadata.provider_token) {
            possibleTokens.push({
              source: 'user.app_metadata.provider_token',
              token: user.app_metadata.provider_token,
              preview: user.app_metadata.provider_token.substring(0, 15) + '...'
            });
          }
          
          // Check session
          if (session.provider_token) {
            possibleTokens.push({
              source: 'session.provider_token',
              token: session.provider_token,
              preview: session.provider_token.substring(0, 15) + '...'
            });
          }
          
          // Add URL token if found
          if (urlTokenData) {
            possibleTokens.push({
              source: `url.${urlTokenData.source}`,
              token: urlTokenData.token,
              preview: urlTokenData.token.substring(0, 15) + '...'
            });
          }
          
          setAllPossibleTokens(possibleTokens);
          
          // Get Meta token from database if it exists
          if (session.user) {
            const { data: tokenData, error: tokenError } = await supabase
              .from('user_facebook_tokens')
              .select('*')
              .eq('user_id', session.user.id)
              .single();
            
            if (tokenError && tokenError.code !== 'PGRST116') {
              console.error('Error fetching tokens:', tokenError);
            } else {
              setTokens(tokenData || null);
            }
          }
        }
      } catch (error) {
        console.error('Error in auth debug:', error);
        setStatus({ 
          type: 'error', 
          message: `Unexpected error: ${error.message}` 
        });
      }
    };
    
    checkAuthStatus();
  }, []);
  
  const getStatusColor = (type) => {
    switch (type) {
      case 'success': return 'bg-green-100 border-green-500 text-green-700';
      case 'error': return 'bg-red-100 border-red-500 text-red-700';
      case 'warning': return 'bg-yellow-100 border-yellow-500 text-yellow-700';
      case 'loading':
      default: return 'bg-blue-100 border-blue-500 text-blue-700';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Authentication Debug</h1>
      
      {/* Status Message */}
      <div className={`p-4 mb-6 border-l-4 ${getStatusColor(status.type)}`}>
        <p className="font-medium">{status.message}</p>
      </div>
      
      {/* Supabase Connection Status */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Supabase Connection</h2>
        {supabaseStatus ? (
          <div className="bg-gray-100 p-4 rounded">
            <p className="mb-2">
              <span className="font-medium">Using Real Client:</span>{' '}
              {supabaseStatus.isRealClient ? (
                <span className="text-green-600 font-bold">Yes</span>
              ) : (
                <span className="text-red-600 font-bold">No (MOCK CLIENT)</span>
              )}
            </p>
            <p className="mb-2">
              <span className="font-medium">Connection Test:</span>{' '}
              {supabaseStatus.connection?.success ? (
                <span className="text-green-600 font-bold">Successful ({supabaseStatus.connection.duration}ms)</span>
              ) : (
                <span className="text-red-600 font-bold">Failed: {supabaseStatus.connection?.error?.message || 'Unknown error'}</span>
              )}
            </p>
          </div>
        ) : (
          <p>Testing connection...</p>
        )}
      </div>
      
      {/* User Info */}
      {user && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2">User Information</h2>
          <div className="bg-gray-100 p-4 rounded">
            <p><span className="font-medium">User ID:</span> {user.id}</p>
            <p><span className="font-medium">Email:</span> {user.email}</p>
            <p>
              <span className="font-medium">Provider:</span>{' '}
              {user.app_metadata?.provider || 'Not specified'}
            </p>
            <p>
              <span className="font-medium">OAuth Token in User Object:</span>{' '}
              {user.provider_token ? (
                <span className="text-green-600 font-bold">Available</span>
              ) : (
                <span className="text-red-600 font-bold">Not found</span>
              )}
            </p>
          </div>
        </div>
      )}
      
      {/* All Possible Tokens */}
      {allPossibleTokens.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2">All Possible Tokens Found</h2>
          <div className="bg-gray-100 p-4 rounded">
            <p className="mb-2">Found {allPossibleTokens.length} potential tokens:</p>
            <ul className="list-disc pl-5 space-y-2">
              {allPossibleTokens.map((tokenData, idx) => (
                <li key={idx}>
                  <div className="flex flex-col">
                    <p>
                      <span className="font-medium">Source:</span> {tokenData.source}
                    </p>
                    <p>
                      <span className="font-medium">Preview:</span> {tokenData.preview}
                    </p>
                    <div className="mt-1 space-x-2">
                      <button
                        onClick={() => verifyTokenWithFacebook(tokenData.token)}
                        className="px-2 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                      >
                        Verify
                      </button>
                      <button
                        onClick={() => storeVerifiedToken(tokenData.token)}
                        className="px-2 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                      >
                        Store
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      
      {/* URL Hash Token */}
      {hashToken && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Token in URL</h2>
          <div className="bg-gray-100 p-4 rounded">
            <p>
              <span className="font-medium">Token Preview:</span> {hashToken.token_preview}
            </p>
            <p>
              <span className="font-medium">Source:</span> {hashToken.source || 'URL Hash'}
            </p>
            {hashToken.token && (
              <div className="mt-2 space-x-2">
                <button
                  onClick={() => verifyTokenWithFacebook(hashToken.token)}
                  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Verify with Facebook
                </button>
                <button
                  onClick={() => storeVerifiedToken(hashToken.token)}
                  className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Store in Database
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Verification Results */}
      {verificationResults && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Token Verification Results</h2>
          <div className={`bg-gray-100 p-4 rounded ${verificationResults.valid ? 'border-l-4 border-green-500' : 'border-l-4 border-red-500'}`}>
            <p className="font-medium mb-2">
              {verificationResults.valid 
                ? 'Token is valid with Facebook!'
                : 'Token verification failed'}
            </p>
            {verificationResults.valid && verificationResults.data && (
              <div>
                <p>
                  <span className="font-medium">Facebook User ID:</span>{' '}
                  {verificationResults.data.id}
                </p>
                <p>
                  <span className="font-medium">Name:</span>{' '}
                  {verificationResults.data.name}
                </p>
              </div>
            )}
            {!verificationResults.valid && verificationResults.error && (
              <p className="text-red-600">
                Error: {verificationResults.error.message}
              </p>
            )}
          </div>
        </div>
      )}
      
      {/* Token Info */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Meta Token in Database</h2>
        {tokens ? (
          <div className="bg-gray-100 p-4 rounded">
            <p>
              <span className="font-medium">Short-lived Token:</span>{' '}
              {tokens.access_token_shortlived ? (
                <span className="text-green-600 font-bold">Stored</span>
              ) : (
                <span className="text-red-600 font-bold">Not found</span>
              )}
            </p>
            {tokens.access_token_shortlived && (
              <p className="mt-2 text-sm text-gray-700">
                Token Preview: {tokens.access_token_shortlived.substring(0, 15)}...
              </p>
            )}
            <p className="mt-2">
              <span className="font-medium">Last Updated:</span>{' '}
              {tokens.updated_at ? new Date(tokens.updated_at).toLocaleString() : 'Unknown'}
            </p>
          </div>
        ) : (
          <div className="bg-yellow-100 p-4 rounded border-l-4 border-yellow-500">
            <p className="text-yellow-700">
              No Meta token found in the database for this user.
            </p>
          </div>
        )}
      </div>
      
      {/* Duplicate Tokens Section */}
      {user && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Duplicate Token Check</h2>
          <div className="flex space-x-2 mb-4">
            <button
              onClick={checkForDuplicates}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              disabled={!user || cleanupInProgress}
            >
              Check for Duplicates
            </button>
            
            {duplicateTokens && duplicateTokens.count > 1 && (
              <button
                onClick={cleanupDuplicates}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                disabled={cleanupInProgress}
              >
                {cleanupInProgress ? 'Cleaning...' : `Clean Up ${duplicateTokens.count - 1} Duplicates`}
              </button>
            )}
            
            <button
              onClick={cleanupAllTokens}
              className="px-4 py-2 bg-red-800 text-white rounded hover:bg-red-900"
              disabled={cleanupInProgress}
              title="Delete all tokens and start fresh"
            >
              {cleanupInProgress ? 'Cleaning...' : 'Clean ALL Tokens'}
            </button>
          </div>
          
          {duplicateTokens && (
            <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
              <h3 className="font-semibold mb-2">Duplicate Tokens Found</h3>
              <p className="mb-2">Found {duplicateTokens.count} tokens for this user.</p>
              
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left">ID</th>
                      <th className="px-4 py-2 text-left">Token Preview</th>
                      <th className="px-4 py-2 text-left">Created At</th>
                      <th className="px-4 py-2 text-left">Updated At</th>
                      <th className="px-4 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {duplicateTokens.tokens.map((token, index) => (
                      <tr key={token.id} className={index === 0 ? "bg-green-50" : "bg-red-50"}>
                        <td className="px-4 py-2">{token.id}</td>
                        <td className="px-4 py-2">
                          {token.access_token_shortlived 
                            ? token.access_token_shortlived.substring(0, 10) + '...' 
                            : 'No token'}
                        </td>
                        <td className="px-4 py-2">
                          {token.created_at 
                            ? new Date(token.created_at).toLocaleString() 
                            : 'N/A'}
                        </td>
                        <td className="px-4 py-2">
                          {token.updated_at 
                            ? new Date(token.updated_at).toLocaleString() 
                            : 'N/A'}
                        </td>
                        <td className="px-4 py-2">
                          {index === 0 ? (
                            <span className="text-green-600 text-xs">Will be kept</span>
                          ) : (
                            <span className="text-red-600 text-xs">Will be removed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {cleanupResult && (
            <div className={`mt-4 p-3 rounded ${cleanupResult.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {cleanupResult.message}
            </div>
          )}
        </div>
      )}
      
      <div className="mt-8">
        <Link href="/auth/login" className="text-blue-600 hover:underline">
          ← Back to Login
        </Link>
      </div>
    </div>
  );
} 