import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Sidebar from './Sidebar';
import { getCurrentUser, checkUserAdAccountStatus } from '../../lib/supabase.js';
import FeedbackSystem from '../UI/FeedbackSystem';

const Layout = ({ children }) => {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  
  // Check if this is an auth page or the homepage to show a simplified layout
  const isAuthPage = router.pathname.startsWith('/auth/');
  const isHomePage = router.pathname === '/';
  
  useEffect(() => {
    let isMounted = true;
    
    const checkAuth = async () => {
      try {
        // Always try to get the current user
        const currentUser = await getCurrentUser();
        
        if (isMounted) {
          setUser(currentUser);
          
          // In development mode, perform the auth check but don't enforce redirects
          const isDev = process.env.NODE_ENV === 'development';
          if (isDev) {
            console.log('Development mode: Authentication check complete, but not enforcing redirects');
            console.log('User authenticated:', !!currentUser);
            setLoading(false);
            setInitialized(true);
            return;
          }
          
          // In production, enforce redirects
          if (!currentUser && !isAuthPage) {
            router.push('/auth/login');
          }
          
          if (currentUser && isAuthPage) {
            // Check if user has connected ad accounts
            const adAccountStatus = await checkUserAdAccountStatus(currentUser.id);
            if (!adAccountStatus.connected) {
              console.log('User authenticated but no ad accounts connected, redirecting to accounts');
              router.push('/accounts?first_time=true');
            } else {
              router.push('/reports');
            }
          }
          
          setLoading(false);
          setInitialized(true);
        }
      } catch (error) {
        console.error('Layout auth check error:', error);
        if (isMounted) {
          setLoading(false);
          setInitialized(true);
        }
      }
    };
    
    checkAuth();
    
    return () => {
      isMounted = false;
    };
  }, [isAuthPage, router]);
  
  // Auth page or Homepage layout is simplified
  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        {children}
      </div>
    );
  }
  
  // Render homepage without sidebar or main app structure
  if (isHomePage) {
    return <>{children}</>; // Render children directly
  }
  
  // Main app layout with sidebar
  return (
    <div className={`min-h-screen bg-gray-50 flex flex-col ${router.pathname === '/assistant-dashboard' ? 'h-screen' : ''}`}>
      <div className={`flex ${router.pathname === '/assistant-dashboard' ? 'flex-1 h-full' : 'flex-1'}`}>
        <Sidebar />
        <div className={`flex-1 flex flex-col md:pl-72 ${router.pathname === '/assistant-dashboard' ? 'h-full' : ''}`}>
          <main className={`flex-1 bg-gray-50 ${router.pathname === '/assistant-dashboard' ? 'h-full' : ''}`}>
            <div className={`pt-8 px-4 sm:px-6 lg:px-8 ${router.pathname === '/assistant-dashboard' ? 'h-full pb-0' : 'pb-8'}`} >
              {children}
            </div>
          </main>
        </div>
      </div>
      
      {/* Render FeedbackSystem only when user is logged in or on public pages that aren't auth pages */}
      {user && <FeedbackSystem />}
    </div>
  );
};

export default Layout;
