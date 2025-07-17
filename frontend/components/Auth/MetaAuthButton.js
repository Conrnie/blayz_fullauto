import React, { useState } from 'react';
// import supabase from '../../lib/supabase.js'; // Not directly used, signInWithProvider is
import Button from '../UI/Button';
import { signInWithProvider } from '../../lib/supabase.js';

const MetaAuthButton = ({ onSuccess, onError, className = '' }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleMetaLogin = async () => {
    try {
      setIsLoading(true);
      
      if (typeof window !== 'undefined') {
        const returnUrl = window.location.pathname !== '/auth/login' && 
                           window.location.pathname !== '/auth/signup' ? 
                           window.location.pathname : '/reports';
        localStorage.setItem('returnUrl', returnUrl);
        
        // Mark as signup attempt if coming from signup page
        if (window.location.pathname === '/auth/signup') {
          localStorage.setItem('meta_signup_attempt', 'true');
        }
      }
      
      const { data, error } = await signInWithProvider('facebook', {
        scopes: [
          'public_profile',
          'email',
          'ads_management',
          'ads_read',
          'business_management',
          'read_insights'
        ],
        // Ensure redirectTo is the full URL including the origin
        redirectTo: `${window.location.origin}/auth/callback`
      });

      if (error) {
        console.error('Meta auth error:', error.message);
        onError?.(error);
        return;
      }

      onSuccess?.(data);
    } catch (err) {
      console.error('Failed to initialize Meta auth:', err);
      onError?.(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleMetaLogin}
      disabled={isLoading}
      variant="primary" // Assuming this applies your orange brand color
      fullWidth // This prop should be available on your Button component if w-full was used before
      className={`flex items-center justify-center gap-2 ${className}`} // Removed specific bg/text colors
    >
      {isLoading ? (
        <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full mr-2"></div> // Use border-current for spinner
      ) : (
        <svg
          className="w-5 h-5"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
            clipRule="evenodd"
          />
        </svg>
      )}
      {isLoading ? 'Connecting...' : 'Continue with Meta'}
    </Button>
  );
};

export default MetaAuthButton;
