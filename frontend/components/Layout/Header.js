import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import useAuth from '../../lib/useAuth.js';
import { signOut } from '../../lib/supabase.js';

const Header = () => {
  const router = useRouter();
  const { user, loading, isMock } = useAuth();
  
  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/auth/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  return (
    <header className="relative z-50 site-header">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-white via-gray-50 to-white"></div>
      
      {/* Removed top accent line with brand color */}
      
      {/* Bottom shadow */}
      <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-gray-200/60 to-transparent"></div>
      
      {/* Mock client warning */}
      {isMock && (
        <div className="absolute top-0 left-0 w-full bg-yellow-500 text-center py-1 text-xs text-yellow-900 font-medium">
          Using mock client — real authentication and database operations not available
        </div>
      )}
      
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 relative z-10">
        <div className="flex justify-between h-20">
          {/* Removed logo */}
          <div className="flex items-center">
            {/* Intentionally empty to maintain layout */}
          </div>
          
          <div className="flex items-center">
            {!loading && (
              <>
                {user ? (
                  <div className="flex items-center ml-4 md:ml-6">
                    <span className="text-base text-gray-700 mr-6 block">
                      {user.email} {isMock && '(Mock)'}
                    </span>
                    <button
                      onClick={handleSignOut}
                      className="text-base font-medium text-gray-600 hover:text-primary transition-colors duration-200 px-4 py-2 hover:bg-gray-50 rounded-md"
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <div className="flex space-x-5">
                    <Link href="/auth/login" legacyBehavior>
                      <a className="text-base font-medium text-gray-600 hover:text-primary transition-colors duration-200 px-4 py-2 hover:bg-gray-50 rounded-md">
                        Log In
                      </a>
                    </Link>
                    <Link href="/auth/signup" legacyBehavior>
                      <a className="bg-primary text-white px-5 py-2 rounded-md text-base font-medium hover:bg-primary/90 transition-colors duration-200 shadow-md hover-lift">
                        Sign Up
                      </a>
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
