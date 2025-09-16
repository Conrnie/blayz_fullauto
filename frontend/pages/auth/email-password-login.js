import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';
import { getSupabaseBrowserClient } from '../../lib/supabaseClient';

const supabase = getSupabaseBrowserClient();

const EmailPasswordLoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      router.push('/dashboard');
    } catch (error) {
      setError(error.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="mb-8">
        <Link href="/">
          <Image 
            src="/images/svg_logo_blayz.svg" 
            alt="Blayz Logo"
            width={96} 
            height={40} 
          />
        </Link>
      </div>

      <div className="w-full max-w-md p-8 space-y-6 bg-gradient-to-br from-[#1F2937] to-[#111827] rounded-xl shadow-2xl border border-white/10">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">
            Sign in with Email
          </h1>
          <p className="text-center text-sm text-gray-400 mt-2">
            Enter your credentials to access your dashboard.
          </p>
        </div>

        {error && (
          <div className="rounded-md p-4 text-center bg-red-900/30 text-red-300 border border-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
              placeholder="••••••••"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>

        <div className="text-center">
          <Link href="/auth/login" className="text-sm text-primary hover:text-primary/80">
            &larr; Back to other login options
          </Link>
        </div>
      </div>
      <style jsx global>{`
        .text-gradient-primary {
          background: linear-gradient(90deg, #FE8401, #FFC380);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          display: inline-block;
        }
        .bg-background {
          background-color: #000000 !important;
        }
      `}</style>
    </div>
  );
};

export default EmailPasswordLoginForm;