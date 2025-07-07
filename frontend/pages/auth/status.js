import React, { useEffect, useState } from 'react';
import Head from 'next/head';

export default function StatusPage() {
  const [frontendStatus, setFrontendStatus] = useState('Loading...');
  const [supabaseStatus, setSupabaseStatus] = useState('Checking...');
  const [apiStatus, setApiStatus] = useState('Checking...');
  const [envVars, setEnvVars] = useState({});
  
  useEffect(() => {
    // Check frontend status
    setFrontendStatus('Online ✅');
    
    // Check environment variables
    const vars = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not set',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set (hidden)' : 'Not set',
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'Not set',
      NODE_ENV: process.env.NODE_ENV || 'Not set'
    };
    setEnvVars(vars);
    
    // Check Supabase status
    const checkSupabase = async () => {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
          setSupabaseStatus('Not configured (missing environment variables) ❌');
          return;
        }
        
        try {
          const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
          );
          
          const { error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
          
          if (error) {
            setSupabaseStatus(`Error: ${error.message} ❌`);
          } else {
            setSupabaseStatus('Connected ✅');
          }
        } catch (error) {
          setSupabaseStatus(`Client error: ${error.message} ❌`);
        }
      } catch (error) {
        setSupabaseStatus(`Module error: ${error.message} ❌`);
      }
    };
    
    // Check API status
    const checkAPI = async () => {
      try {
        if (!process.env.NEXT_PUBLIC_API_URL) {
          setApiStatus('Not configured (missing NEXT_PUBLIC_API_URL) ❌');
          return;
        }
        
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/health`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (response.ok) {
            setApiStatus('Connected ✅');
          } else {
            setApiStatus(`Error: HTTP ${response.status} ❌`);
          }
        } catch (error) {
          setApiStatus(`Fetch error: ${error.message} ❌`);
        }
      } catch (error) {
        setApiStatus(`Unknown error: ${error.message} ❌`);
      }
    };
    
    checkSupabase();
    checkAPI();
  }, []);
  
  return (
    <>
      <Head>
        <title>System Status - Blayz</title>
      </Head>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">System Status</h1>
          
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Services</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="font-medium">Frontend</span>
                <span className={frontendStatus.includes('✅') ? 'text-green-600' : 'text-red-600'}>
                  {frontendStatus}
                </span>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="font-medium">Supabase</span>
                <span className={supabaseStatus.includes('✅') ? 'text-green-600' : 'text-red-600'}>
                  {supabaseStatus}
                </span>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="font-medium">Backend API</span>
                <span className={apiStatus.includes('✅') ? 'text-green-600' : 'text-red-600'}>
                  {apiStatus}
                </span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Environment Variables</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-2 text-left">Variable</th>
                    <th className="px-4 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(envVars).map(([key, value]) => (
                    <tr key={key} className="border-b">
                      <td className="px-4 py-2 font-mono text-sm">{key}</td>
                      <td className="px-4 py-2">
                        <span className={value === 'Not set' ? 'text-red-600' : 'text-green-600'}>
                          {value}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}