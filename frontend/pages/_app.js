import React, { Component, useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Layout from '../components/Layout/Layout';
import { getSupabaseBrowserClient } from '../lib/supabaseClient.js';
import '../styles/globals.css';

// Import necessary MUI components
import { ThemeProvider } from '@mui/system';
import CssBaseline from '@mui/material/CssBaseline';
import { createTheme } from '@mui/material/styles';
import { CacheProvider } from '@emotion/react';
import createEmotionCache from '../lib/createEmotionCache.js';

// Client-side cache, shared for the whole session of the user in the browser
const clientSideEmotionCache = createEmotionCache();

// Create a basic theme (you can customize this later)
const theme = createTheme({
  palette: {
    primary: {
      main: '#FF5722', // Your brand orange
    },
    secondary: {
      main: '#03A9F4', // Example blue color (can be removed or updated)
    },
    background: {
      default: '#000000' // Set default background to black for CssBaseline
    }
  },
  typography: {
    fontFamily: 'Inter, sans-serif', // Match your global font
  },
});
// const theme = createTheme({}); // Simplest possible theme for debugging

// Error boundary to catch any rendering errors
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
            <div className="text-center">
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Something went wrong</h2>
              <p className="mt-2 text-sm text-gray-600">
                We apologize for the inconvenience. Please try refreshing the page.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  Refresh Page
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function MyApp({ Component, pageProps, emotionCache = clientSideEmotionCache }) {
  const router = useRouter(); // Restored
  const [supabase] = useState(() => getSupabaseBrowserClient());

  useEffect(() => {
    console.log('App starting...');
    
    // Initialize Supabase auth as early as possible
    const initAuth = async () => {
      try {
        console.log('Initializing auth session...');
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error initializing auth session:', error.message);
        } else if (data?.session) {
          console.log('Auth session initialized successfully for user:', data.session.user.email);
          
          // Store in localStorage for redundancy
          if (typeof window !== 'undefined') {
            const userToStore = {
              id: data.session.user.id,
              email: data.session.user.email,
              lastSeen: new Date().toISOString()
            };
            localStorage.setItem('blayz-user-data', JSON.stringify(userToStore));
          }
        } else {
          console.log('No active session found during initialization');
        }
      } catch (err) {
        console.error('Unexpected error during auth initialization:', err);
      }
    };
    
    initAuth();
    
    // Log environment to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Environment:', process.env.NODE_ENV);
    }
    
    // Global unhandled promise rejection handler
    const handleUnhandledRejection = (event) => {
      console.error('Unhandled Promise Rejection:', event.reason);
    };
    
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Determine if the Layout should be applied
  // Exclude landing, beta-signin, privacy, and auth pages from the main Layout
  const authPaths = ['/auth/login', '/auth/signup', '/auth/forgot-password', '/auth/reset-password', '/auth/callback'];
  const standalonePaths = ['/landing', '/beta-signin', '/privacy', '/terms', '/contact'];
  const applyLayout = !standalonePaths.includes(router.pathname) && 
                      !authPaths.includes(router.pathname);

  return (
    <ErrorBoundary>
        <CacheProvider value={emotionCache}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <Head>
                    <title>Blayz - AI-Powered Ad Performance Analysis</title>
                    <meta name="description" content="Optimize your ad campaigns with Blayz's AI-powered performance analysis and actionable insights." />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                    <link rel="icon" href="/favicon.ico" />
                    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
                </Head>
                {applyLayout ? (
                  <Layout supabase={supabase}>
                      <Component {...pageProps} supabase={supabase} />
                  </Layout>
                ) : (
                  <Component {...pageProps} supabase={supabase} /> // Render component directly without Layout for landing page
                )}
            </ThemeProvider>
        </CacheProvider>
    </ErrorBoundary>
  );
}

export default MyApp;
