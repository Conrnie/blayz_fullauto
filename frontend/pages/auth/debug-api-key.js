import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '../../lib/supabaseClient';
import Head from 'next/head';

export default function DebugApiKey() {
  const [debugInfo, setDebugInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const runDebug = async () => {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        
        const info = {
          url: supabaseUrl,
          keyPreview: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 50)}...` : 'NOT SET',
          keyLength: supabaseAnonKey?.length || 0,
          urlLength: supabaseUrl?.length || 0,
        };

        // Try to decode the JWT to see if it's valid
        if (supabaseAnonKey) {
          try {
            const parts = supabaseAnonKey.split('.');
            if (parts.length === 3) {
              // Decode the header
              const header = JSON.parse(atob(parts[0]));
              // Decode the payload
              const payload = JSON.parse(atob(parts[1]));
              
              info.jwtValid = true;
              info.jwtHeader = header;
              info.jwtPayload = {
                iss: payload.iss,
                iat: payload.iat,
                exp: payload.exp,
                aud: payload.aud,
                role: payload.role,
                ref: payload.ref
              };
              info.jwtExpired = payload.exp && (Date.now() / 1000) > payload.exp;
            } else {
              info.jwtValid = false;
              info.jwtError = 'Invalid JWT format - wrong number of parts';
            }
          } catch (jwtError) {
            info.jwtValid = false;
            info.jwtError = jwtError.message;
          }
        }

        // Test basic Supabase connection
        try {
          const supabase = getSupabaseBrowserClient();
          const { data, error } = await supabase.auth.getSession();
          info.connectionTest = {
            success: !error,
            error: error?.message || null,
            hasSession: !!data?.session
          };
        } catch (connError) {
          info.connectionTest = {
            success: false,
            error: connError.message,
            hasSession: false
          };
        }

        // Test a simple API call
        try {
          const response = await fetch(`${supabaseUrl}/rest/v1/`, {
            headers: {
              'apikey': supabaseAnonKey,
              'Authorization': `Bearer ${supabaseAnonKey}`
            }
          });
          
          info.apiTest = {
            status: response.status,
            ok: response.ok,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries())
          };

          if (response.ok) {
            info.apiTest.body = await response.text();
          } else {
            info.apiTest.errorBody = await response.text();
          }
        } catch (apiError) {
          info.apiTest = {
            error: apiError.message
          };
        }

        setDebugInfo(info);
      } catch (error) {
        setDebugInfo({ error: error.message });
      } finally {
        setLoading(false);
      }
    };

    runDebug();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Running API key diagnostics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <Head>
        <title>API Key Debug - Blayz</title>
      </Head>

      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">API Key Debug Information</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Environment Variables</h2>
          <div className="space-y-2 font-mono text-sm">
            <div><strong>URL:</strong> {debugInfo?.url || 'NOT SET'}</div>
            <div><strong>URL Length:</strong> {debugInfo?.urlLength}</div>
            <div><strong>Key Preview:</strong> {debugInfo?.keyPreview || 'NOT SET'}</div>
            <div><strong>Key Length:</strong> {debugInfo?.keyLength}</div>
          </div>
        </div>

        {debugInfo?.jwtValid !== undefined && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">JWT Analysis</h2>
            <div className="space-y-2">
              <div className={`p-2 rounded ${debugInfo.jwtValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                <strong>Valid JWT:</strong> {debugInfo.jwtValid ? 'Yes' : 'No'}
                {debugInfo.jwtError && <div>Error: {debugInfo.jwtError}</div>}
              </div>
              
              {debugInfo.jwtValid && (
                <>
                  <div className={`p-2 rounded ${debugInfo.jwtExpired ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                    <strong>Expired:</strong> {debugInfo.jwtExpired ? 'Yes' : 'No'}
                  </div>
                  
                  <div className="mt-4">
                    <h3 className="font-medium mb-2">JWT Payload:</h3>
                    <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
                      {JSON.stringify(debugInfo.jwtPayload, null, 2)}
                    </pre>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {debugInfo?.connectionTest && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Supabase Connection Test</h2>
            <div className={`p-2 rounded ${debugInfo.connectionTest.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              <strong>Connection:</strong> {debugInfo.connectionTest.success ? 'Success' : 'Failed'}
              {debugInfo.connectionTest.error && <div>Error: {debugInfo.connectionTest.error}</div>}
              <div><strong>Has Session:</strong> {debugInfo.connectionTest.hasSession ? 'Yes' : 'No'}</div>
            </div>
          </div>
        )}

        {debugInfo?.apiTest && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Direct API Test</h2>
            <div className="space-y-2">
              <div className={`p-2 rounded ${debugInfo.apiTest.ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                <strong>Status:</strong> {debugInfo.apiTest.status} - {debugInfo.apiTest.statusText}
              </div>
              
              {debugInfo.apiTest.errorBody && (
                <div className="mt-2">
                  <h3 className="font-medium mb-2">Error Response:</h3>
                  <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
                    {debugInfo.apiTest.errorBody}
                  </pre>
                </div>
              )}
              
              {debugInfo.apiTest.headers && (
                <div className="mt-2">
                  <h3 className="font-medium mb-2">Response Headers:</h3>
                  <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
                    {JSON.stringify(debugInfo.apiTest.headers, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {debugInfo?.error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <strong>Debug Error:</strong> {debugInfo.error}
          </div>
        )}

        <div className="mt-8 text-center">
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Refresh Debug
          </button>
        </div>
      </div>
    </div>
  );
} 