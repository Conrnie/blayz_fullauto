import { useEffect } from 'react';
import { useRouter } from 'next/router';
import supabase from '../lib/supabase';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error checking session:', error);
          // If there's an error, redirect to landing page
          router.replace('/landing');
          return;
        }

        if (session?.user) {
          // User is authenticated, redirect to creative demo (main dashboard)
          router.replace('/creative-demo');
        } else {
          // User is not authenticated, redirect to landing page
          router.replace('/landing');
        }
      } catch (error) {
        console.error('Unexpected error during auth check:', error);
        router.replace('/landing');
      }
    };

    checkAuthAndRedirect();
  }, [router]);

  // Show loading while redirecting
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-12 h-12 border-4 border-[#FE8401] border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-white text-lg">Loading Blayz...</p>
      </div>
    </div>
  );
}