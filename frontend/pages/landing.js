import Head from 'next/head';
import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function LandingPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Check if this is an OAuth callback that was incorrectly redirected to landing
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      
      // Check for OAuth callback parameters
      const hasOAuthCode = urlParams.has('code') || hashParams.has('code');
      const hasOAuthState = urlParams.has('state') || hashParams.has('state');
      const hasOAuthError = urlParams.has('error') || hashParams.has('error');
      
      if (hasOAuthCode || hasOAuthState || hasOAuthError) {
        console.log('OAuth callback detected on landing page, redirecting to proper callback handler...');
        // Preserve all parameters and redirect to the proper callback
        const fullUrl = window.location.href.replace('/landing', '/auth/callback');
        window.location.href = fullUrl;
        return;
      }
    }
    
    // Initialize animations and other interactive elements
    const animatedElements = document.querySelectorAll('.fade-in-element');
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-fadeIn');
          entry.target.style.opacity = '1';
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1
    });
    
    animatedElements.forEach(element => {
      element.style.opacity = '0';
      observer.observe(element);
    });

    // Mobile menu toggle
    const menuToggle = document.getElementById('menu-toggle');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (menuToggle && mobileMenu) {
        menuToggle.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // Smooth scrolling for anchor links
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    anchorLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (targetId !== '#') {
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    e.preventDefault();
                    targetElement.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    });

    // Form submission handlers
    const forms = [document.getElementById('beta-signup-form'), document.getElementById('beta-signup-form-2')];
    
    forms.forEach((form, index) => {
      if (form) {
        form.addEventListener('submit', function(e) {
          e.preventDefault();
          e.stopPropagation();
          
          const emailInput = this.querySelector('input[type="email"]');
          const email = emailInput ? emailInput.value : '';
          
          if (email && email.includes('@')) {
            localStorage.setItem('betaSignupEmail', email);
            window.location.href = '/auth/signup';
          } else {
            alert('Please enter a valid email address');
          }
        });
      }
    });

    console.log('Sending PageView to CAPI');
    fetch('/api/send-conversion-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventName: 'PageView'
      })
    }).catch(err => console.error('Failed to send PageView:', err));

  }, []);

  return (
    <>
      <Head>
        <title>Blayz - Meta Ads Analysis Made Simple</title>
        <meta name="description" content="Stop drowning in spreadsheets. Get automated analysis, instant diagnostics, and clear action steps for your Meta campaigns." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <style jsx global>{`
          html {
              scroll-behavior: smooth;
          }
          body {
              font-family: 'Inter', sans-serif;
              line-height: 1.6;
              background-color: #ffffff !important;
              color: #111827;
          }
          .fade-in-element {
             opacity: 0;
             transition: opacity 0.6s ease-out, transform 0.6s ease-out;
          }
          @keyframes fadeIn {
              0% { opacity: 0; transform: translateY(20px); }
              100% { opacity: 1; transform: translateY(0); }
          }
          @keyframes float {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-10px); }
          }
          @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.8; }
          }
          @keyframes gradient-x {
              0%, 100% { transform: translateX(0%); }
              50% { transform: translateX(100%); }
          }
          .animate-fadeIn { 
              animation: fadeIn 0.6s ease-out forwards; 
          }
          .animate-float {
              animation: float 3s ease-in-out infinite;
          }
          .animate-pulse-slow {
              animation: pulse 4s ease-in-out infinite;
          }
          .bg-gradient-hero {
              background: linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%);
          }
          .bg-gradient-accent {
              background: linear-gradient(135deg, #FE8401 0%, #ff9500 100%);
          }
          .text-gradient {
              background: linear-gradient(135deg, #FE8401 0%, #ff9500 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
          }
          button:focus, a:focus, input:focus {
              outline: 2px solid #FE8401;
              outline-offset: 2px;
          }
          .hover-lift {
              transition: all 0.3s ease;
          }
          .hover-lift:hover {
              transform: translateY(-4px);
              box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.15);
          }
          .btn-primary {
              background: linear-gradient(135deg, #FE8401 0%, #ff9500 100%);
              transition: all 0.3s ease;
              position: relative;
              overflow: hidden;
          }
          .btn-primary:before {
              content: '';
              position: absolute;
              top: 0;
              left: -100%;
              width: 100%;
              height: 100%;
              background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
              transition: left 0.5s;
          }
          .btn-primary:hover:before {
              left: 100%;
          }
          .btn-primary:hover {
              transform: translateY(-2px);
              box-shadow: 0 15px 35px -5px rgba(254, 132, 1, 0.4);
          }
          input[type="email"]:focus {
              border-color: #FE8401;
              box-shadow: 0 0 0 3px rgba(254, 132, 1, 0.1);
              transform: translateY(-1px);
          }
          .glass-effect {
              background: rgba(255, 255, 255, 0.9);
              backdrop-filter: blur(10px);
              border: 1px solid rgba(255, 255, 255, 0.2);
          }
          .card-hover {
              transition: all 0.3s ease;
              border: 1px solid transparent;
          }
          .card-hover:hover {
              transform: translateY(-5px) scale(1.02);
              box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
              border-color: rgba(254, 132, 1, 0.2);
          }
          .floating-elements::before {
              content: '';
              position: absolute;
              top: 20%;
              right: 10%;
              width: 60px;
              height: 60px;
              background: linear-gradient(135deg, #FE8401, #ff9500);
              border-radius: 50%;
              opacity: 0.1;
              animation: float 6s ease-in-out infinite;
          }
          .floating-elements::after {
              content: '';
            position: absolute;
            bottom: 20%;
              left: 10%;
              width: 40px;
              height: 40px;
              background: linear-gradient(135deg, #3b82f6, #1d4ed8);
              border-radius: 50%;
              opacity: 0.1;
              animation: float 8s ease-in-out infinite reverse;
          }
          
          /* Enhanced Background Animations */
          @keyframes drift {
              0% { transform: translateX(0) translateY(0) rotate(0deg); }
              33% { transform: translateX(30px) translateY(-30px) rotate(120deg); }
              66% { transform: translateX(-20px) translateY(20px) rotate(240deg); }
              100% { transform: translateX(0) translateY(0) rotate(360deg); }
          }
          @keyframes morphing {
              0%, 100% { border-radius: 50%; transform: scale(1); }
              50% { border-radius: 30%; transform: scale(1.2); }
          }
          @keyframes slide {
              0% { transform: translateX(-100px) rotate(0deg); }
              100% { transform: translateX(calc(100vw + 100px)) rotate(360deg); }
          }
          .bg-particle {
              position: absolute;
              pointer-events: none;
              z-index: 1;
          }
          .animate-drift {
              animation: drift 20s ease-in-out infinite;
          }
          .animate-morphing {
              animation: morphing 8s ease-in-out infinite;
          }
          .animate-slide {
              animation: slide 25s linear infinite;
          }
        `}</style>
      </Head>

      <div className="bg-white font-sans text-gray-900">
        {/* Header */}
        <header className="fixed w-full top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative flex justify-between items-center py-4">
              {/* Logo */}
              <div className="flex items-center">
                <a href="#hero" className="flex items-center">
                  <img 
                    src="/images/svg_logo_blayz.svg" 
                    alt="Blayz Logo" 
                    className="h-10 w-auto"
                  />
                </a>
              </div>
              
              {/* Desktop Navigation - Absolutely Centered */}
              <nav className="hidden md:flex items-center space-x-8 absolute left-1/2 transform -translate-x-1/2">
                <a href="#solution" className="text-gray-600 hover:text-primary transition-colors">Solution</a>
                <a href="#how-it-works" className="text-gray-600 hover:text-primary transition-colors">How It Works</a>
                <a href="#benefits" className="text-gray-600 hover:text-primary transition-colors">Benefits</a>
              </nav>
              
              {/* Mobile menu button */}
              <div className="md:hidden flex items-center">
                <button id="menu-toggle" className="text-gray-600 hover:text-primary focus:outline-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
              
              {/* CTA Button */}
              <div className="hidden md:block">
                <button 
                  onClick={() => window.location.href = '/auth/signup'} 
                  className="inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-lg text-base font-medium bg-primary text-white hover:opacity-90 transition-all shadow-sm relative overflow-hidden"
                >
                  Get Started Free
                </button>
              </div>
            </div>
            
            {/* Mobile Navigation Menu */}
            <div id="mobile-menu" className="md:hidden hidden">
              <div className="px-2 pt-2 pb-4 space-y-1 border-t border-gray-100 mt-2">
                <a href="#solution" className="block px-3 py-2 text-gray-600 hover:text-primary transition-colors">Solution</a>
                <a href="#how-it-works" className="block px-3 py-2 text-gray-600 hover:text-primary transition-colors">How It Works</a>
                <a href="#benefits" className="block px-3 py-2 text-gray-600 hover:text-primary transition-colors">Benefits</a>
                <button 
                  onClick={() => window.location.href = '/auth/signup'} 
                  className="block px-3 py-2 text-primary font-semibold w-full text-left"
                >
                  Get Started Free
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section id="hero" className="fade-in-element pt-32 pb-24 bg-gradient-hero relative overflow-hidden floating-elements">
          {/* Enhanced Background Animation Particles */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Floating geometric shapes */}
            <div className="bg-particle absolute top-20 left-10 w-20 h-20 bg-primary/10 rounded-full animate-float"></div>
            <div className="bg-particle absolute top-40 right-20 w-16 h-16 bg-blue-500/10 rounded-full animate-float" style={{animationDelay: '1s'}}></div>
            <div className="bg-particle absolute bottom-20 left-1/4 w-12 h-12 bg-primary/20 rounded-full animate-pulse-slow"></div>
            
            {/* Drifting elements */}
            <div className="bg-particle absolute top-1/3 left-1/3 w-8 h-8 bg-gradient-to-r from-primary/20 to-primary/10 rounded-lg animate-drift" style={{animationDelay: '2s'}}></div>
            <div className="bg-particle absolute top-1/2 right-1/3 w-6 h-6 bg-gradient-to-r from-blue-500/20 to-blue-400/15 animate-drift" style={{animationDelay: '4s'}}></div>
            <div className="bg-particle absolute bottom-1/3 left-1/2 w-10 h-10 bg-gradient-to-r from-primary/15 to-blue-500/10 rounded-full animate-drift" style={{animationDelay: '6s'}}></div>
            
            {/* Morphing shapes */}
            <div className="bg-particle absolute top-1/4 right-1/4 w-14 h-14 bg-primary/8 animate-morphing" style={{animationDelay: '1s'}}></div>
            <div className="bg-particle absolute bottom-1/4 left-1/5 w-18 h-18 bg-blue-500/8 animate-morphing" style={{animationDelay: '3s'}}></div>
            
            {/* Sliding particles */}
            <div className="bg-particle absolute top-1/6 w-3 h-3 bg-primary/30 rounded-full animate-slide" style={{animationDelay: '0s'}}></div>
            <div className="bg-particle absolute top-2/3 w-2 h-2 bg-blue-500/30 rounded-full animate-slide" style={{animationDelay: '8s'}}></div>
            <div className="bg-particle absolute top-1/2 w-4 h-4 bg-primary/20 rounded-full animate-slide" style={{animationDelay: '15s'}}></div>
            
            {/* Large background gradients */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-primary/5 to-transparent rounded-full animate-pulse-slow"></div>
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-blue-500/5 to-transparent rounded-full animate-pulse-slow" style={{animationDelay: '2s'}}></div>
          </div>

          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-5xl mx-auto text-center">
              <div className="mb-6">
                <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-primary/10 text-primary border border-primary/20 animate-pulse-slow">
                  🚀 Free Beta Now Available
                </span>
              </div>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-8 text-gray-900">
                Are Your Meta Ads a<br />
                Black Box of <span className="italic text-gradient">WTF</span>?
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 max-w-4xl mx-auto mb-12 leading-relaxed">
                Get the insider insights your competitors don't have. Our AI analysis reveals hidden campaign issues and opportunities that basic dashboards miss completely.
              </p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-8">
                <button 
                  onClick={() => window.location.href = '/auth/signup'} 
                  className="inline-flex items-center justify-center px-10 py-5 text-lg font-semibold rounded-xl shadow-2xl transform hover:scale-105 bg-primary text-white hover:opacity-90 transition-all"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                  </svg>
                  Get Competitive Intel
                </button>
                <div className="flex items-center space-x-2 text-gray-500">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span className="text-sm">No credit card required</span>
              </div>
            </div>
              
              {/* Trust indicators */}
              <div className="flex flex-wrap justify-center items-center gap-8 text-sm text-gray-500 mb-16">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                  </svg>
                  <span>Secure Meta API</span>
                </div>
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                  </svg>
                  <span>2-minute setup</span>
                </div>
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                  </svg>
                  <span>Campaign diagnosis</span>
                </div>
                </div>

              {/* Hero Product Screenshot */}
              <div className="relative max-w-5xl mx-auto">
                <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
                  <div className="bg-gray-100 px-4 py-3 flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                    <div className="ml-4 text-sm text-gray-600">blayz.io/dashboard</div>
              </div>
                                    <div className="aspect-video bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
                    <img 
                      src="/images/Blayz Dashboard Screen.png" 
                      alt="Blayz Dashboard Interface showing campaign analytics and insights" 
                      className="w-full h-full object-contain"
                    />
                    </div>
                    </div>
                {/* Floating elements around the screenshot */}
                <div className="absolute -top-4 -right-4 w-8 h-8 bg-primary/20 rounded-full animate-pulse-slow"></div>
                <div className="absolute -bottom-4 -left-4 w-6 h-6 bg-blue-500/20 rounded-full animate-float"></div>
              </div>
            </div>
          </div>
        </section>

        {/* See It In Action Section */}
        <section className="fade-in-element py-24 bg-white relative overflow-hidden">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <div className="mb-6">
                  <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
                    🎬 See It In Action
                  </span>
          </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900">
                  From Chaos to <span className="text-primary">Crystal Clear</span> in Seconds
                </h2>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  Watch how Blayz transforms confusing Meta Ads data into actionable insights
                </p>
                    </div>

                                            {/* Revolutionary Split-Screen Transformation */}
               <div className="relative overflow-hidden bg-white rounded-3xl shadow-2xl border border-gray-200">
                 <div className="relative bg-white rounded-3xl overflow-hidden">
                   
                                       {/* Split Screen Container */}
                    <div className="relative h-[700px] lg:h-[600px]">
                      
                      {/* Left Side - The Problem */}
                      <div className="absolute inset-0 lg:inset-y-0 lg:left-0 lg:right-1/2 bg-gradient-to-br from-red-500 to-red-600 flex flex-col">
                        {/* Header */}
                        <div className="p-6 lg:p-8 text-center lg:text-left">
                          <div className="inline-flex items-center px-4 py-2 bg-red-800 bg-opacity-20 rounded-full mb-4">
                            <span className="text-white font-semibold">😵 THE PROBLEM</span>
                    </div>
                          <h3 className="text-2xl lg:text-3xl font-bold text-white mb-2">Spreadsheet Hell</h3>
                          <p className="text-red-100 text-sm lg:text-base">Hours wasted, insights buried</p>
                  </div>
                        
                        {/* Image Container */}
                        <div className="flex-1 p-4 lg:p-8 pt-0 flex items-start justify-center lg:pr-20">
                          <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-2xl p-4 w-full max-w-sm lg:max-w-md transform rotate-1 hover:rotate-0 transition-transform duration-500 mt-2">
                            <img 
                              src="/images/spreadsheet image.png" 
                              alt="Complex spreadsheet chaos" 
                              className="w-full h-auto rounded-xl shadow-2xl border-4 border-white border-opacity-20"
                              style={{imageRendering: 'crisp-edges'}}
                            />
                </div>
              </div>
            </div>

                      {/* Right Side - The Solution */}
                      <div className="absolute inset-0 lg:inset-y-0 lg:left-1/2 lg:right-0 bg-gradient-to-br from-primary to-orange-600 flex flex-col">
                        {/* Header */}
                        <div className="p-6 lg:p-8 text-center lg:text-right">
                          <div className="inline-flex items-center px-4 py-2 bg-white bg-opacity-20 rounded-full mb-4">
                            <span className="text-white font-semibold">✨ THE SOLUTION</span>
          </div>
                          <h3 className="text-2xl lg:text-3xl font-bold text-white mb-2">Blayz Magic</h3>
                          <p className="text-orange-100 text-sm lg:text-base">Instant clarity, pro reports</p>
                        </div>
                        
                        {/* Image Container */}
                        <div className="flex-1 p-2 lg:p-4 pt-0 flex items-start justify-center lg:pl-20">
                          <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-2xl p-3 w-full max-w-xs lg:max-w-sm transform -rotate-1 hover:rotate-0 transition-transform duration-500 mt-2">
                            <img 
                              src="/images/square-executive-summary.png" 
                              alt="Clean Blayz executive summary" 
                              className="w-full h-auto rounded-xl shadow-2xl border-4 border-white border-opacity-20"
                              style={{imageRendering: 'crisp-edges'}}
                            />
          </div>
                  </div>
                </div>

                     {/* Center Lightning Bolt Divider */}
                     <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-1 bg-gradient-to-b from-yellow-400 via-white to-yellow-400 z-10 hidden lg:block">
                       <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-full p-3 shadow-2xl">
                         <svg className="w-6 h-6 text-primary" fill="currentColor" viewBox="0 0 20 20">
                           <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                         </svg>
                      </div>
                    </div>

                     {/* Mobile Separator */}
                     <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 lg:hidden">
                       <div className="bg-white rounded-full p-4 shadow-2xl border-4 border-gray-200">
                         <svg className="w-8 h-8 text-primary" fill="currentColor" viewBox="0 0 20 20">
                           <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                          </svg>
                      </div>
                        </div>

                        </div>

                   {/* Bottom Stats Bar */}
                   <div className="bg-gray-50 px-8 py-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                     <div>
                       <div className="text-2xl font-bold text-red-500">8+ Hours</div>
                       <div className="text-sm text-gray-600">Wasted Weekly on Spreadsheets</div>
                        </div>
                     <div>
                       <div className="text-2xl font-bold text-primary">⚡</div>
                       <div className="text-sm text-gray-600">Instant Transformation</div>
                      </div>
                     <div>
                       <div className="text-2xl font-bold text-green-500">5 Minutes</div>
                       <div className="text-sm text-gray-600">To Professional Reports</div>
                        </div>
                        </div>

                      </div>
                          </div>


                          </div>
                          </div>
        </section>

        {/* Problem Section */}
        <section id="problem" className="fade-in-element py-24 bg-gray-50 relative overflow-hidden">
          {/* Animated background elements */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-10 right-10 w-32 h-32 bg-primary/5 rounded-full animate-pulse-slow"></div>
            <div className="absolute bottom-20 left-10 w-24 h-24 bg-primary/5 rounded-lg animate-drift" style={{animationDelay: '3s'}}></div>
            <div className="absolute top-1/2 left-20 w-16 h-16 bg-blue-500/8 animate-morphing" style={{animationDelay: '1s'}}></div>
            <div className="absolute top-20 left-1/3 w-6 h-6 bg-primary/20 rounded-full animate-slide" style={{animationDelay: '5s'}}></div>
                        </div>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto text-center">
              <div className="mb-6">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                  😤 The Struggle is Real
                </span>
                      </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900">The Daily Meta Ads Struggle</h2>
              <p className="text-lg text-gray-600 mb-16 max-w-3xl mx-auto">
                Sound familiar? You're not alone. Here's what every Meta Ads manager deals with daily.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 card-hover group">
                  <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-red-200 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                    <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </div>
                  <h3 className="text-xl font-semibold mb-4 text-gray-900">Endless Reporting</h3>
                  <p className="text-gray-600 leading-relaxed">Hours lost wrestling spreadsheets for reports that barely scratch the surface. Time that could be spent on strategy.</p>
                  </div>
                
                <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 card-hover group">
                  <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-orange-200 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                    <svg className="w-10 h-10 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                    </svg>
                </div>
                  <h3 className="text-xl font-semibold mb-4 text-gray-900">Campaign Nightmares</h3>
                  <p className="text-gray-600 leading-relaxed">CPA skyrockets without warning. Frantic scrambling to understand what broke while budgets bleed.</p>
              </div>
                
                <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 card-hover group">
                  <div className="w-20 h-20 bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                    <svg className="w-10 h-10 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
              </div>
                  <h3 className="text-xl font-semibold mb-4 text-gray-900">Client Anxiety</h3>
                  <p className="text-gray-600 leading-relaxed">Explaining performance dips with unclear data and murky insights. Trust erodes with every "I'll look into it".</p>
            </div>
                
                <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 card-hover group">
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                    <svg className="w-10 h-10 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                        </svg>
          </div>
                  <h3 className="text-xl font-semibold mb-4 text-gray-900">Always Reactive</h3>
                  <p className="text-gray-600 leading-relaxed">Constantly checking stats, reacting to fires, never feeling ahead of the game. It's exhausting.</p>
                    </div>
                  </div>
              
              <div className="mt-16 p-8 bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl border border-red-100">
                <p className="text-xl font-semibold text-gray-800 mb-2">Sound exhausting?</p>
                <p className="text-gray-600">There's a better way. Let's flip the script.</p>
                      </div>
                      </div>
                    </div>
        </section>

        {/* Solution Section */}
        <section id="solution" className="fade-in-element py-24 relative overflow-hidden">
          {/* Enhanced animated background */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-20 left-20 w-40 h-40 bg-primary/5 rounded-full animate-float"></div>
            <div className="absolute bottom-20 right-20 w-24 h-24 bg-blue-500/5 rounded-full animate-float" style={{animationDelay: '2s'}}></div>
            <div className="absolute top-1/3 right-1/3 w-32 h-32 bg-blue-500/5 animate-morphing" style={{animationDelay: '1s'}}></div>
            <div className="absolute bottom-1/3 left-1/4 w-20 h-20 bg-primary/8 rounded-lg animate-drift" style={{animationDelay: '4s'}}></div>
            <div className="absolute top-10 left-1/2 w-4 h-4 bg-primary/25 rounded-full animate-slide" style={{animationDelay: '7s'}}></div>
            <div className="absolute bottom-10 right-1/3 w-3 h-3 bg-blue-500/25 rounded-full animate-slide" style={{animationDelay: '12s'}}></div>
                  </div>
          
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-5xl mx-auto text-center">
              <div className="mb-6">
                <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-green-100 text-green-700">
                  ✨ The Solution You've Been Waiting For
                </span>
                  </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900">
                Meet <span className="text-gradient">Blayz</span>
              </h2>
              <p className="text-xl text-gray-600 mb-16 max-w-3xl mx-auto">
                Your automated Meta Ads analyst that turns confusion into clarity, chaos into control.
              </p>
              
              <div className="bg-gradient-to-br from-white to-gray-50 p-10 md:p-16 rounded-3xl shadow-2xl border border-gray-100 relative">
                <div className="absolute -top-6 -right-6 w-12 h-12 bg-gradient-accent rounded-full animate-pulse-slow"></div>
                <div className="absolute -bottom-6 -left-6 w-8 h-8 bg-blue-500 rounded-full animate-float"></div>
                
                <div className="space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                      </svg>
                </div>
                      <h3 className="font-semibold text-gray-900 mb-2">Connects Instantly</h3>
                      <p className="text-sm text-gray-600">Secure Meta API integration</p>
                      </div>
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                        </svg>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">Analyzes Everything</h3>
                      <p className="text-sm text-gray-600">Automated performance monitoring</p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-green-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                  </div>
                      <h3 className="font-semibold text-gray-900 mb-2">Delivers Insights</h3>
                      <p className="text-sm text-gray-600">Clear, actionable recommendations</p>
                  </div>
                </div>
                  
                  <div className="border-t border-gray-200 pt-10">
                    <div className="text-center mb-12">
                      <p className="text-lg md:text-xl text-gray-700 mb-6 leading-relaxed">
                        Blayz connects to your Meta Ads account and automatically analyzes performance, identifies issues, and provides clear recommendations.
                      </p>
                      <button 
                        onClick={() => window.location.href = '/auth/signup'} 
                        className="inline-flex items-center justify-center px-8 py-4 bg-primary text-white font-bold text-xl rounded-2xl shadow-lg hover:opacity-90 transition-all duration-300 hover:scale-105"
                      >
                        <span className="mr-2">🎯</span>
                        No more chaos. Just clarity.
                      </button>
                      </div>


                    </div>
                  </div>
                  </div>
              

            </div>
          </div>
        </section>

        {/* How It Works Section - Zigzag Design */}
        <section id="how-it-works" className="fade-in-element py-24 bg-gray-50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-20">
                <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-primary/10 text-primary mb-6">
                  🚀 Simple Process
                </span>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">Get from chaos to clarity in three simple steps</p>
          </div>
              
              <div className="relative">
                {/* Connecting Line */}
                <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/20 via-primary/40 to-primary/20 transform -translate-x-1/2"></div>
                
                <div className="space-y-24">
                  {/* Step 1 - Left Side */}
                  <div className="flex flex-col lg:flex-row items-center gap-12">
                    <div className="w-full lg:w-1/2 lg:pr-16">
                                            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
                        {/* Meta Connect Interface Mockup */}
                        <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                          <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">Connect to Meta</h3>
                            <p className="text-gray-600 text-sm">Securely connect your Meta Ads account to start analyzing your campaigns</p>
                  </div>
                          
                          <div className="space-y-4">
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                                    </svg>
                </div>
                                  <div>
                                    <p className="font-medium text-gray-900">Meta Business Account</p>
                                    <p className="text-sm text-gray-500">Access your ad accounts and campaigns</p>
                                  </div>
                                </div>
                                <div className="text-green-600">
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                    </div>
                  </div>
                </div>
                            
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
                      </svg>
                    </div>
                                  <div>
                                    <p className="font-medium text-gray-900">Secure OAuth 2.0</p>
                                    <p className="text-sm text-gray-500">Your credentials stay safe with Meta</p>
                  </div>
                </div>
                                <div className="text-green-600">
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                    </div>
                  </div>
                </div>
                            
                            <button className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors cursor-default opacity-90">
                              <div className="flex items-center justify-center space-x-2">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                </svg>
                                <span>Connect with Meta</span>
              </div>
                            </button>
                            
                            <p className="text-xs text-gray-500 text-center">
                              By connecting, you agree to our Terms of Service and Privacy Policy
                            </p>
              </div>
            </div>
          </div>
                    </div>
                    
                    {/* Step Number */}
                    <div className="relative z-10 flex-shrink-0">
                      <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-2xl font-bold text-white">1</span>
                    </div>
                  </div>
                    
                    <div className="w-full lg:w-1/2 lg:pl-16">
                      <h3 className="text-2xl font-bold text-gray-900 mb-4">1. Connect Account</h3>
                      <p className="text-lg text-gray-600 mb-4">Secure OAuth integration</p>
                      <p className="text-gray-600">Securely link your Meta Ads account in seconds. Our OAuth integration ensures your data stays protected while giving Blayz access to analyze your campaigns.</p>
                    </div>
                  </div>

                  {/* Step 2 - Right Side */}
                  <div className="flex flex-col lg:flex-row-reverse items-center gap-12">
                                        <div className="w-full lg:w-1/2 lg:pl-16">
                      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow">
                        <img 
                          src="/images/blayz-saas-beta.png" 
                          alt="Blayz SaaS Beta campaign analysis dashboard" 
                          className="w-full h-auto rounded-xl border border-gray-100"
                          style={{imageRendering: 'crisp-edges'}}
                        />
                </div>
                    </div>
                    
                    {/* Step Number */}
                    <div className="relative z-10 flex-shrink-0">
                      <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-2xl font-bold text-white">2</span>
                  </div>
                    </div>
                    
                    <div className="w-full lg:w-1/2 lg:pr-16">
                      <h3 className="text-2xl font-bold text-gray-900 mb-4">2. Generate Report</h3>
                      <p className="text-lg text-gray-600 mb-4">Automated performance analysis</p>
                      <p className="text-gray-600">Click "Generate Report" for any campaign and watch Blayz work its magic. Our AI analyzes your data, identifies patterns, and prepares comprehensive insights in minutes.</p>
                  </div>
                </div>

                  {/* Step 3 - Left Side */}
                  <div className="flex flex-col lg:flex-row items-center gap-12">
                                        <div className="w-full lg:w-1/2 lg:pr-16">
                      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow">
                        <img 
                          src="/images/actionablesscreen.png" 
                          alt="Blayz actionable insights and recommendations screen" 
                          className="w-full h-auto rounded-xl border border-gray-100"
                          style={{imageRendering: 'crisp-edges'}}
                        />
                    </div>
                  </div>
                    
                    {/* Step Number */}
                    <div className="relative z-10 flex-shrink-0">
                      <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-2xl font-bold text-white">3</span>
                    </div>
                  </div>
                    
                    <div className="w-full lg:w-1/2 lg:pl-16">
                      <h3 className="text-2xl font-bold text-gray-900 mb-4">3. Get Insights</h3>
                      <p className="text-lg text-gray-600 mb-4">Clear action recommendations</p>
                      <p className="text-gray-600">Receive detailed reports with performance breakdowns, segment analysis, and prioritized action items. Know exactly what to fix and how to improve your campaigns.</p>
                </div>
              </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* What Blayz Actually Finds */}
        <section id="benefits" className="fade-in-element py-24 bg-gradient-to-br from-gray-50 to-white relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-20 right-20 w-32 h-32 bg-primary/5 rounded-full animate-float"></div>
            <div className="absolute bottom-20 left-20 w-24 h-24 bg-blue-500/5 rounded-full animate-float" style={{animationDelay: '2s'}}></div>
          </div>
          
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-6xl mx-auto">
              
              {/* Header */}
              <div className="text-center mb-20">
                <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-primary/10 text-primary mb-6">
                  🔍 Campaign Intelligence
                </span>
                <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6">
                  What <span className="text-gradient bg-gradient-to-r from-primary to-orange-600 bg-clip-text text-transparent">Blayz</span> Actually Finds
                </h2>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  Professional-grade campaign diagnostics that amplify your expertise. See exactly what's broken and why.
                </p>
                      </div>

              {/* Campaign Killers Section */}
              <div className="mb-16">
                <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">🔍 Campaign Killers We Catch</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  <div className="bg-white rounded-2xl p-6 shadow-lg border border-red-100 hover:shadow-xl transition-all">
                    <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-4">
                      <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                      </svg>
                    </div>
                    <h4 className="font-bold text-gray-900 mb-2">Broken Conversion Tracking</h4>
                    <p className="text-sm text-gray-600">Zero purchases despite OUTCOME_SALES objective. Catch expensive tracking failures instantly.</p>
                  </div>

                  <div className="bg-white rounded-2xl p-6 shadow-lg border border-orange-100 hover:shadow-xl transition-all">
                    <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
                      <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                    </div>
                    <h4 className="font-bold text-gray-900 mb-2">Peak Hours Missed</h4>
                    <p className="text-sm text-gray-600">Best performing times getting 10% budget while worst hours drain 60%. Fix scheduling gaps.</p>
                  </div>

                  <div className="bg-white rounded-2xl p-6 shadow-lg border border-purple-100 hover:shadow-xl transition-all">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                    </div>
                    <h4 className="font-bold text-gray-900 mb-2">Wrong Audience Targeting</h4>
                    <p className="text-sm text-gray-600">High spend on demographics with 0.2x ROAS. Catch audience mismatches bleeding budget.</p>
                  </div>

                </div>
              </div>

              {/* Hidden Opportunities Section */}
              <div className="mb-16">
                <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">📊 Hidden Opportunities</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  <div className="bg-white rounded-2xl p-6 shadow-lg border border-green-100 hover:shadow-xl transition-all">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                    </div>
                    <h4 className="font-bold text-gray-900 mb-2">Top-Performing Ads</h4>
                    <p className="text-sm text-gray-600">Identify your highest-converting ads and scale what's actually working.</p>
                  </div>

                  <div className="bg-white rounded-2xl p-6 shadow-lg border border-blue-100 hover:shadow-xl transition-all">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                      </svg>
                    </div>
                    <h4 className="font-bold text-gray-900 mb-2">Audience Goldmines</h4>
                    <p className="text-sm text-gray-600">Demographic segments your competitors are missing. Untapped conversion potential.</p>
                  </div>

                  <div className="bg-white rounded-2xl p-6 shadow-lg border border-purple-100 hover:shadow-xl transition-all">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                    </div>
                    <h4 className="font-bold text-gray-900 mb-2">Time & Device Goldmines</h4>
                    <p className="text-sm text-gray-600">Peak performance hours and winning device types. Optimize scheduling and targeting.</p>
                  </div>

                </div>
              </div>

              {/* Main Benefits - Reframed */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
                
                {/* Benefit 1 - Reframed */}
                <div className="group">
                  <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 h-full">
                    <div className="relative mb-8">
                      <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/30 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                        <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                      </div>
                      <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-bold">2m</span>
                    </div>
                      </div>
                    <h3 className="text-2xl font-bold mb-4 text-gray-900">Instant Campaign Diagnosis</h3>
                    <p className="text-gray-600 mb-6 leading-relaxed">
                      Know exactly what's broken and why in 2 minutes vs 2 hours of manual analysis. Stop guessing, start fixing.
                    </p>
                    <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                      <p className="text-sm font-semibold text-primary">⚡ 240x faster than manual analysis</p>
                    </div>
                  </div>
                </div>

                {/* Benefit 2 - Reframed */}
                <div className="group">
                  <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 h-full">
                    <div className="relative mb-8">
                      <div className="w-20 h-20 bg-gradient-to-br from-blue-500/20 to-blue-500/30 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                        <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                        </svg>
                    </div>
                      <div className="absolute -top-2 -right-2 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-bold">$</span>
                    </div>
                </div>
                    <h3 className="text-2xl font-bold mb-4 text-gray-900">Stop Wasting Ad Spend</h3>
                    <p className="text-gray-600 mb-6 leading-relaxed">
                      Catch budget-killing issues before they drain your campaigns. Every diagnosis prevents expensive mistakes.
                    </p>
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                      <p className="text-sm font-semibold text-blue-700">💰 Average $2,000+ monthly savings</p>
              </div>
            </div>
          </div>

                {/* Benefit 3 - Reframed */}
                <div className="group">
                  <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 h-full">
                    <div className="relative mb-8">
                                            <div className="w-20 h-20 bg-gradient-to-br from-green-500/20 to-green-500/30 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                        <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
                        </svg>
                  </div>
                      <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-bold">AI</span>
                  </div>
              </div>
                    <h3 className="text-2xl font-bold mb-4 text-gray-900">Your Campaigns' Health Check</h3>
                    <p className="text-gray-600 mb-6 leading-relaxed">
                      AI spots the critical issues you'd miss in spreadsheets. Get diagnosis + your expertise = winning campaigns.
                    </p>
                    <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                      <p className="text-sm font-semibold text-green-700">🎯 AI diagnosis + your expertise</p>
                    </div>
          </div>
                    </div>
                  </div>

              {/* Bottom CTA Bar */}
              <div className="bg-gradient-to-r from-primary to-orange-600 rounded-3xl p-8 text-center text-white shadow-2xl">
                <h3 className="text-2xl md:text-3xl font-bold mb-4">Limited Beta Access - Building with Real Users</h3>
                <p className="text-lg mb-6 opacity-90">Beta spots filled as campaigns are analyzed. Early access = shape the tool's development.</p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
                  <div className="flex items-center space-x-2 text-sm opacity-90">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                    <span>Free Beta Access</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm opacity-90">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                    <span>No Credit Card</span>
                </div>
                  <div className="flex items-center space-x-2 text-sm opacity-90">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                    <span>2-Minute Setup</span>
                    </div>
                  </div>
                
                {/* CTA Button */}
                <div className="flex justify-center">
                  <button 
                    onClick={() => window.location.href = '/auth/signup'} 
                    className="group relative bg-white text-primary font-bold py-4 px-8 rounded-2xl hover:bg-gray-50 transition-all duration-300 hover:scale-105 shadow-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">Get Competitive Intel</span>
                      <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
                      </svg>
                  </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
                  </button>
                </div>
                    </div>

                  </div>
                  </div>
        </section>

        {/* Beta Results Section */}
        <section className="py-24 bg-gradient-to-br from-gray-50 via-white to-gray-50 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-20 right-20 w-40 h-40 bg-primary/5 rounded-full animate-pulse-slow"></div>
            <div className="absolute bottom-20 left-20 w-32 h-32 bg-blue-500/5 rounded-full animate-float"></div>
            <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-primary/8 animate-morphing"></div>
          </div>

          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-20">
                <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-primary/10 text-primary mb-6">
                  📊 Beta Results So Far
                </span>
                <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
                  Building with <span className="text-gradient bg-gradient-to-r from-primary to-orange-600 bg-clip-text text-transparent">Real Users</span>
                </h2>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  Limited Beta Access - Current users getting 40% faster campaign analysis. Next expansion: March 2025.
                </p>
              </div>

              {/* Beta Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                
                {/* Stat 1 */}
                <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                    </svg>
                  </div>
                  <div className="text-4xl font-bold text-gray-900 mb-2">23</div>
                  <p className="text-gray-600 font-medium">Campaigns Analyzed in June</p>
                </div>

                {/* Stat 2 */}
                <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 text-center">
                  <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <div className="text-4xl font-bold text-gray-900 mb-2">2.3min</div>
                  <p className="text-gray-600 font-medium">Average Diagnosis Time</p>
                </div>

                {/* Stat 3 */}
                <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 text-center">
                  <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                    </svg>
                  </div>
                  <div className="text-4xl font-bold text-gray-900 mb-2">67%</div>
                  <p className="text-gray-600 font-medium">Had Budget Misallocation</p>
                </div>

              </div>

              {/* Real Campaign Example */}
              <div className="max-w-4xl mx-auto">
                <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">Recent Campaign Diagnosis:</h3>
                <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
                  <div className="flex items-start space-x-4 mb-6">
                    <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-2">Campaign: E-comm_Summer_Collection</h4>
                      <p className="text-gray-700 leading-relaxed">
                        <strong>Problem:</strong> Campaign spending $180/day with CPA 3x higher than target despite strong traffic.
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-2xl p-6 mb-6">
                    <h5 className="font-semibold text-gray-900 mb-3">Analysis Identified:</h5>
                    <ul className="space-y-2 text-gray-700">
                      <li className="flex items-start space-x-2">
                        <span className="text-red-500 mt-1">•</span>
                        <span>Mobile users converting 67% worse than desktop (device targeting issue)</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="text-orange-500 mt-1">•</span>
                        <span>Peak performance hours (2-4PM) getting only 15% of budget allocation</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="text-green-500 mt-1">•</span>
                        <span>Ages 35-44 demographic showing 2.1x ROAS being under-targeted</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Diagnosis completed in 1.8 minutes</span>
                    <span className="bg-primary/10 text-primary px-3 py-1 rounded-full font-medium">Potential savings: $2,400/month</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 bg-gray-50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900">Your Questions, Answered Straight Up</h2>
              </div>

              <div className="space-y-8">
                {/* FAQ 1 */}
                <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Setup time? Technical?</h3>
                  <p className="text-gray-600 leading-relaxed">
                    ~60 seconds. Authorize via Meta API. No code needed.
                  </p>
                </div>

                {/* FAQ 2 */}
                <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Is client data secure?</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Yes. Official Meta API, read-only access. Security is paramount.
                  </p>
                </div>

                {/* FAQ 3 */}
                <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">What happens after Beta?</h3>
                  <p className="text-gray-600 leading-relaxed">
                    It becomes paid. Plenty of notice, no auto-charge. You choose if you subscribe. (Beta users might get a deal!)
                  </p>
                </div>

                {/* FAQ 4 */}
                <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">What's the difference between Blayz and uploading a spreadsheet to ChatGPT?</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Day and night difference. Blayz uses specialized AI agents that simultaneously analyze thousands of data points across multiple dimensions - demographics, devices, placements, time patterns, and performance correlations. ChatGPT gives you surface-level observations; Blayz delivers deep, actionable insights with precise recommendations tailored to your specific campaign performance.
                  </p>
                </div>

                {/* FAQ 5 */}
                <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Works for all campaign types?</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Yes, for any campaign tracking standard outcomes (Lead Gen, E-comm, Advantage+, etc.). Analyzes core performance trends.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 bg-white border-t border-gray-100">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="mb-6 md:mb-0">
                <a href="#" className="flex items-center">
                  <img 
                    src="/images/svg_logo_blayz.svg" 
                    alt="Blayz Logo" 
                    className="h-10 w-auto"
                  />
                </a>
                <p className="mt-2 text-sm text-gray-500">Automated Meta Ads Analytics</p>
              </div>
              <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-8">
                <Link href="/terms" className="text-gray-500 hover:text-primary transition-colors">Terms</Link>
                <Link href="/privacy" className="text-gray-500 hover:text-primary transition-colors">Privacy</Link>
                <Link href="/contact" className="text-gray-500 hover:text-primary transition-colors">Contact</Link>
              </div>
            </div>
            <div className="mt-8 border-t border-gray-100 pt-8 text-center">
              <p className="text-sm text-gray-500">&copy; 2024 Blayz. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}