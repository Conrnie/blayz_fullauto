import { useEffect, useState } from 'react';

export default function DebugEnv() {
  const [envVars, setEnvVars] = useState({});

  useEffect(() => {
    setEnvVars({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 
        `${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 10)}...` : 'NOT SET',
      NODE_ENV: process.env.NODE_ENV,
    });
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Environment Variables Debug</h1>
      <pre>{JSON.stringify(envVars, null, 2)}</pre>
      
      <h2>Supabase Client Test</h2>
      <button onClick={() => {
        try {
          const { getSupabaseBrowserClient } = require('../../lib/supabaseClient.js');
          const client = getSupabaseBrowserClient();
          console.log('Supabase client created successfully:', client);
          alert('Check console for Supabase client details');
        } catch (error) {
          console.error('Error creating Supabase client:', error);
          alert('Error: ' + error.message);
        }
      }}>
        Test Supabase Client Creation
      </button>
    </div>
  );
} 