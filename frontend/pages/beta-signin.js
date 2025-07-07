import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image'; // Keep for optional logo
import supabase from '../lib/supabase.js'; // Ensure Supabase client is imported

export default function BetaSignIn() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false); // Controls general loading state and spinner
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false); // Hides form on success
  const [isProcessing, setIsProcessing] = useState(false); // Controls intermediate message display

  // Form submission handler - Logic remains the same
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); // Show spinner in button
    setIsProcessing(false); // Reset processing message state
    setMessage('');
    setIsSuccess(false);

    try {
      const { data, error } = await supabase
        .from('subscribers')
        .insert([{ name: name, email: email }])
        .select();

      if (error && error.code !== '23505') {
        // Handle actual errors (not duplicates)
        throw error;
      }

      // --- Success or Duplicate Entry ---
      setIsSuccess(true); // Hide the form immediately
      setIsProcessing(true); // Show intermediate processing state
      setMessage(
        // You can customize this intermediate message
        <span className="flex items-center justify-center text-gray-400">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Verifying...
        </span>
      );

      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 2500)); // Wait 2.5 seconds

      // Update to final success message
      setMessage(
          <>
              <h2 className="text-xl font-semibold text-gradient-primary mb-3">We're Experiencing High Demand!</h2>
              <p className="text-text-secondary">
                  It seems everyone wants to stop guessing with their Meta Ads! Our servers are working hard. 🔥
              </p>
              <p className="text-text-secondary mt-3">
                  Rest assured, you've been successfully added to the waitlist. We'll email <span className="font-medium text-white">{email}</span> as soon as your access is ready.
              </p>
          </>
      );
      setIsProcessing(false); // Hide the spinner/intermediate state
      setLoading(false); // Optional: Can set loading false here if needed elsewhere

    } catch (error) {
      // Handle errors (that are not duplicates)
      console.error('Error adding subscriber:', error);
      setMessage('Error submitting your request: ' + error.message);
      setIsSuccess(false); // Keep form visible
      setLoading(false); // Stop button spinner
      setIsProcessing(false);
    }
    // Note: setLoading(false) is primarily handled within the success/error paths now
  };

  // Inline styles for consistency with original design (if needed, otherwise rely on classes)
  const globalStyles = `
    body { background-color: #000000 !important; color: #F7FAFC; font-family: 'Inter', sans-serif; }
    .text-gradient-primary {
      background: linear-gradient(90deg, #FE8401, #FFC380);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      display: inline-block;
    }
    button:focus, a:focus, input:focus {
      outline: 2px solid #FE8401;
      outline-offset: 2px;
      box-shadow: 0 0 0 3px rgba(254, 132, 1, 0.4);
    }
    input:-webkit-autofill,
    input:-webkit-autofill:hover, 
    input:-webkit-autofill:focus, 
    input:-webkit-autofill:active {
        -webkit-box-shadow: 0 0 0 30px #1F2937 inset !important; /* Match dark input background */
        -webkit-text-fill-color: #F7FAFC !important; /* Match dark text color */
        caret-color: #F7FAFC !important; /* Ensure cursor is visible */
    }
  `;

  return (
    <>
      <Head>
        <title>Join the Blayz Beta</title>
        <style>{globalStyles}</style> {/* Apply original global styles */}
      </Head>
      {/* Use original dark background and layout */}
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        
        {/* Optional Logo (assuming same structure as before) */}
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

        {/* Use original gradient card styling */}
        <div className="w-full max-w-md p-8 space-y-6 bg-gradient-to-br from-[#1F2937] to-[#111827] rounded-xl shadow-2xl border border-white/10">
          {/* Show Header only if form is visible */}
          {!isSuccess && (
            <>
              <h1 className="text-2xl font-bold text-center text-white">
                Join the <span className="text-gradient-primary">Blayz Beta</span>
              </h1>
              <p className="text-center text-sm text-gray-400">
                Enter your details below to get early access.
              </p>
            </>
          )}

          {/* Display Messages Area */}
          {message && (
              // Use different styling for the final success message vs errors/processing
              <div className={`rounded-md p-4 text-center ${isSuccess && !isProcessing ? 'bg-green-900/30 text-green-300 border border-green-700' : ''} ${!isSuccess ? 'bg-red-900/30 text-red-300 border border-red-700' : ''} ${isProcessing ? 'border border-gray-600' : ''}`}>
                  {message}
              </div>
          )}

          {/* Show form only if not successfully submitted */}
          {!isSuccess && (
            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
               {/* Name Input - Apply original input styling */}
               <div>
                 <label htmlFor="name" className="sr-only">Full Name</label>
                 <input
                   id="name"
                   name="name"
                   type="text"
                   autoComplete="name"
                   required
                   disabled={loading}
                   value={name}
                   onChange={(e) => setName(e.target.value)}
                   className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-700 bg-[#1F2937] placeholder-gray-500 text-text-primary focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm disabled:opacity-50"
                   placeholder="Full Name"
                 />
               </div>
               {/* Email Input - Apply original input styling */}
               <div>
                 <label htmlFor="email-address" className="sr-only">Email address</label>
                 <input
                   id="email-address"
                   name="email"
                   type="email"
                   autoComplete="email"
                   required
                   disabled={loading}
                   value={email}
                   onChange={(e) => setEmail(e.target.value)}
                   className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-700 bg-[#1F2937] placeholder-gray-500 text-text-primary focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm disabled:opacity-50"
                   placeholder="Email address"
                 />
               </div>

               {/* Submit Button - Apply original button styling */}
               <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-primary disabled:opacity-50"
               >
                  {/* Show spinner inside button when loading */}
                  {loading && !isProcessing ? (
                     <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                       <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                       <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                     </svg>
                   ) : (
                     'Join Beta'
                   )}
               </button>
           </form>
          )}
          
          {/* Display success message without form */}
          {isSuccess && !isProcessing && (
            <div className="mt-6 text-center">
                 {/* You can add more details or a link back if needed */}
                 <Link href="/" className="mt-8 inline-block text-primary hover:underline">
                    &larr; Back to Homepage
                 </Link>
            </div>
          )}

        </div>
      </div>
    </>
  );
} 