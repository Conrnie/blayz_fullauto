import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import supabase, { signOut, getCurrentUser } from '../../lib/supabase.js';

const Sidebar = () => {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  

  
  useEffect(() => {
    setIsClient(true);
    // 'supabase' is now the client instance, no need to call getSupabaseClient()
    // const supabase = getSupabaseClient(); // This line is removed/changed
    const fetchUser = async () => {
      try {
        // In development mode, we can use a mock user for UI testing
        const isDev = process.env.NODE_ENV === 'development';
        if (isDev) {
          console.log('Development mode: Using mock user data for UI');
          setLoading(false);
          return;
        }
        
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUser();
    
    let authListener;
    try {
      authListener = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (event === 'SIGNED_IN') {
            setUser(session?.user || null);
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
          }
        }
      );
    } catch (error) {
      console.error('Error setting up auth listener:', error);
    }
    
    return () => {
      if (authListener && authListener.data && authListener.data.subscription) {
        try {
          authListener.data.subscription.unsubscribe();
        } catch (error) {
          console.error('Error unsubscribing:', error);
        }
      }
    };
  }, []);
  
  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/auth/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const navItems = [
    {
      name: 'Assistant Dashboard',
      href: '/assistant-dashboard',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
    },
    {
      name: 'Strategy',
      href: '/dashboard/strategies',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
    },
    {
      name: 'Reports',
      href: '/reports',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      name: 'Ad Accounts',
      href: '/accounts',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      name: 'Company Profiles',
      href: '/company-profiles',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
  ];

  // Apply inline styles directly to ensure fixed position
  const sidebarStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '18rem', // 72px in rem
    height: '100vh',
    zIndex: 50,
    transform: 'none', // Explicitly prevent transforms
    backfaceVisibility: 'hidden', // Helps with fixed positioning
    willChange: 'transform', // Performance hint for browsers
  };

  return (
    <div 
      style={sidebarStyle}
      className="sidebar hidden md:block"
    >
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#FE8401] via-[#FF9933] to-[#FFBB66] rounded-r-lg"></div>
      
      {/* Subtle shine effect */}
      <div className="absolute right-0 inset-y-0 w-16 bg-gradient-to-l from-white/10 to-transparent"></div>
      
      <div className="h-full flex flex-col relative z-10">
        {/* Logo Section */}
        <div className="px-6 py-6 border-b border-white/20">
          <Link href="/" legacyBehavior>
            <a className="flex items-center">
              <img 
                src="/images/Blayz_white.svg" 
                alt="Blayz" 
                className="h-12 w-auto drop-shadow-md" 
              />
            </a>
          </Link>
        </div>
        
        {/* Navigation Section */}
        <div className="flex-1 flex flex-col pt-6 pb-6 overflow-y-auto">
          <div className="flex-1 px-4 space-y-3">
            {navItems.map((item) => {
              const isActive = isClient && router.pathname.startsWith(item.href);
              return (
                <Link key={item.name} href={item.href} legacyBehavior>
                  <a
                    className={`${isActive
                        ? 'bg-white/20 text-white shadow-md'
                        : 'text-white/90 hover:bg-white/10 hover:text-white hover:shadow-sm'
                      } group flex items-center px-4 py-4 h-15 text-base font-medium rounded-md transition-colors duration-200`}
                  >
                    <span className={`mr-4 h-7 w-7 transition-colors duration-200 ${isActive ? 'text-white' : 'text-white/80 group-hover:text-white'}`}>
                      {item.icon}
                    </span>
                    <span className="font-medium">{item.name}</span>
                  </a>
                </Link>
              );
            })}
          </div>
        </div>
        
        {/* User Section */}
        <div className="px-4 py-4 border-t border-white/20">
          {!loading && (
            <>
              {user ? (
                <div className="space-y-3 flex flex-col items-start px-4">
                  <div className="text-sm text-white/90 font-medium truncate">
                    {user.email}
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center py-2 text-base font-medium text-white/90 hover:text-white transition-colors duration-200 hover:bg-white/10 rounded-md"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Link href="/auth/login" legacyBehavior>
                    <a className="w-full flex items-center justify-center px-4 py-2 text-base font-medium text-white hover:bg-white/10 transition-colors duration-200 rounded-md">
                      Log In
                    </a>
                  </Link>
                  <Link href="/auth/signup" legacyBehavior>
                    <a className="w-full flex items-center justify-center bg-white text-primary px-4 py-2 rounded-md text-base font-medium hover:bg-white/90 transition-colors duration-200 shadow-md">
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
  );
};

export default Sidebar;
