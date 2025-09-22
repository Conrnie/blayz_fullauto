import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';
import MetaAuthButton from './MetaAuthButton';

const LoginForm = () => {
  const [error, setError] = useState('');
  const router = useRouter();
  
  useEffect(() => {
    if (router.query.error) {
      setError(decodeURIComponent(router.query.error));
    }
  }, [router.query]);
  
  const handleMetaSuccess = (data) => {
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
            Welcome back to <span className="text-gradient-primary">Blayz</span>
          </h1>
          <p className="text-center text-sm text-gray-400 mt-2">
            Sign in with your Meta account to continue
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-md p-4 text-center bg-red-900/30 text-red-300 border border-red-700">
            {error}
          </div>
        )}

        {/* Meta Auth Button */}
        <div className="space-y-4">
          <MetaAuthButton 
            onSuccess={handleMetaSuccess} 
            onError={handleMetaError}
          />
        </div>

        {/* Features List */}
        <div className="mt-8">
          <h3 className="text-sm font-medium text-gray-300 mb-4">What you'll get:</h3>
          <ul className="space-y-3 text-sm text-gray-400">
            <li className="flex items-start">
              <svg className="w-5 h-5 mr-2 text-primary flex-shrink-0 mt-0.5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M5 13l4 4L19 7"></path>
              </svg>
              AI-Powered Campaign Insights
            </li>
            <li className="flex items-start">
              <svg className="w-5 h-5 mr-2 text-primary flex-shrink-0 mt-0.5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M5 13l4 4L19 7"></path>
              </svg>
              Optimize Your Ad Spend Effortlessly
            </li>
            <li className="flex items-start">
              <svg className="w-5 h-5 mr-2 text-primary flex-shrink-0 mt-0.5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M5 13l4 4L19 7"></path>
              </svg>
              Clear, Actionable Performance Reports
            </li>
          </ul>
        </div>

        {/* Alternative Login Methods */}
        <div className="mt-6 pt-6 border-t border-gray-700">
          <p className="text-center text-sm text-gray-400 mb-3">
            Or sign in with email:
          </p>
          <Link 
            href="/auth/email-password-login" 
            className="w-full flex justify-center py-2 px-4 border border-gray-600 rounded-md text-sm font-medium text-white bg-slate-700 hover:bg-slate-600 transition-colors"
          >
            Sign in with Email & Password
          </Link>
        </div>

        {/* Footer Links */}
        <div className="text-center space-y-2">
          <div className="text-sm">
            <Link href="/auth/signup" className="text-primary hover:text-primary/80">
              New to Blayz? Join the Beta
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

export default LoginForm;
