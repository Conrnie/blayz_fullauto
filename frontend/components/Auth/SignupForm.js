import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';
import MetaAuthButton from './MetaAuthButton';

const SignupForm = () => {
  const [error, setError] = useState('');
  const [betaEmail, setBetaEmail] = useState('');
  const router = useRouter();
  
  // Parse query parameters for any error messages and check for pre-filled email
  useEffect(() => {
    if (router.query.error) {
      setError(decodeURIComponent(router.query.error));
    }
    
    // Check for email from beta signup
    const storedEmail = localStorage.getItem('betaSignupEmail');
    if (storedEmail) {
      setBetaEmail(storedEmail);
      // Clear the stored email after using it
      localStorage.removeItem('betaSignupEmail');
    }
  }, [router.query]);
  
  const handleMetaSuccess = (data) => {
    // The redirect is handled by the OAuth provider and callback
    console.log('Meta auth initiated, waiting for redirect...');
  };
  
  const handleMetaError = (err) => {
    setError(err.message || 'Failed to authenticate with Meta. Please try again.');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      {/* Logo */}
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

      {/* Main Card */}
      <div className="w-full max-w-md p-8 space-y-6 bg-gradient-to-br from-[#1F2937] to-[#111827] rounded-xl shadow-2xl border border-white/10">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">
            Join the <span className="text-gradient-primary">Blayz Beta</span>
          </h1>
          <p className="text-center text-sm text-gray-400 mt-2">
            Connect your Meta Ads account to get started
          </p>
          {betaEmail && (
            <p className="text-center text-xs text-primary mt-2">
              Welcome, {betaEmail}! 👋
            </p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-md p-4 text-center bg-red-900/30 text-red-300 border border-red-700">
            {error}
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-300">
                Why Meta authentication?
              </h3>
              <div className="mt-2 text-sm text-blue-200">
                <p>Blayz analyzes your Meta Ads performance. We need access to your ad accounts to provide automated insights and recommendations.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Meta Auth Button */}
        <div className="space-y-4">
          <MetaAuthButton 
            onSuccess={handleMetaSuccess} 
            onError={handleMetaError}
          />
        </div>

        {/* Footer Links */}
        <div className="text-center space-y-2">
          <div className="text-sm">
            <Link href="/auth/login" className="text-primary hover:text-primary/80">
              Already have an account? Sign in
            </Link>
          </div>
          <div className="text-sm">
            <Link href="/" className="text-gray-400 hover:text-white">
              ← Back to Homepage
            </Link>
          </div>
        </div>

        {/* Security Note */}
        <div className="text-xs text-gray-500 text-center">
          <p>🔒 Secure OAuth authentication via Meta's official API</p>
          <p>We only request read-only access to your ad account data</p>
        </div>
      </div>

      {/* Global Styles */}
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

export default SignupForm;
