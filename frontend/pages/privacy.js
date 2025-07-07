import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function PrivacyPolicy() {
  return (
    <>
      <Head>
        <title>Privacy Policy - Blayz</title>
        <meta name="description" content="Blayz Privacy Policy - How we collect, use, and protect your data" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center">
                <img 
                  src="/images/svg_logo_blayz.svg" 
                  alt="Blayz Logo" 
                  className="h-8 w-auto"
                />
              </Link>
              <Link 
                href="/" 
                className="text-gray-600 hover:text-primary transition-colors text-sm font-medium"
              >
                ← Back to Home
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-lg shadow-sm border p-8 md:p-12">
            {/* Title */}
            <div className="text-center mb-12">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Privacy Policy
              </h1>
              <p className="text-gray-600 text-lg">
                Last updated: January 2025
              </p>
            </div>

            {/* Content */}
            <div className="prose prose-lg max-w-none">
              
              {/* Introduction */}
              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Introduction</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  At Blayz, we take your privacy seriously. This Privacy Policy explains how we collect, use, 
                  and protect your information when you use our automated Meta Ads analytics platform.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  By using Blayz, you agree to the collection and use of information in accordance with this policy.
                </p>
              </section>

              {/* Information We Collect */}
              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Information We Collect</h2>
                
                <h3 className="text-xl font-medium text-gray-900 mb-3">Account Information</h3>
                <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                  <li>Email address and basic profile information when you sign up</li>
                  <li>Meta/Facebook account connection details (via OAuth)</li>
                  <li>Ad account IDs and campaign data you choose to analyze</li>
                </ul>

                <h3 className="text-xl font-medium text-gray-900 mb-3">Meta Ads Data</h3>
                <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                  <li>Campaign performance metrics (impressions, clicks, conversions, spend)</li>
                  <li>Ad set and ad-level data for analysis</li>
                  <li>Demographic and geographic performance breakdowns</li>
                  <li>This data is accessed read-only through Meta's official API</li>
                </ul>

                <h3 className="text-xl font-medium text-gray-900 mb-3">Usage Information</h3>
                <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                  <li>How you interact with our platform</li>
                  <li>Reports generated and analysis requested</li>
                  <li>Technical information like IP address and browser type</li>
                </ul>
              </section>

              {/* How We Use Your Information */}
              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">How We Use Your Information</h2>
                <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                  <li><strong>Provide our service:</strong> Generate AI-powered analytics and recommendations for your Meta Ads</li>
                  <li><strong>Improve our platform:</strong> Enhance our analysis algorithms and user experience</li>
                  <li><strong>Communicate with you:</strong> Send important updates, support responses, and product announcements</li>
                  <li><strong>Ensure security:</strong> Protect against fraud and unauthorized access</li>
                </ul>
              </section>

              {/* Data Security */}
              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Data Security</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  We implement industry-standard security measures to protect your data:
                </p>
                <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                  <li>All data transmission is encrypted using HTTPS/TLS</li>
                  <li>Access to Meta data is read-only through official APIs</li>
                  <li>Data is stored securely with Supabase (SOC 2 Type 2 compliant)</li>
                  <li>Regular security audits and monitoring</li>
                  <li>Limited access controls - only authorized personnel can access data</li>
                </ul>
              </section>

              {/* Data Sharing */}
              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Data Sharing</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  We do not sell, trade, or rent your personal information. We may share data only in these limited circumstances:
                </p>
                <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                  <li><strong>Service providers:</strong> Trusted third-party services that help us operate (like Supabase for database hosting)</li>
                  <li><strong>Legal requirements:</strong> When required by law or to protect our rights</li>
                  <li><strong>Business transfers:</strong> In the event of a merger or acquisition (with notice to users)</li>
                </ul>
              </section>

              {/* Your Rights */}
              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Your Rights</h2>
                <p className="text-gray-700 leading-relaxed mb-4">You have the following rights regarding your data:</p>
                <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                  <li><strong>Access:</strong> Request a copy of your personal data</li>
                  <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                  <li><strong>Deletion:</strong> Request deletion of your account and associated data</li>
                  <li><strong>Portability:</strong> Export your data in a machine-readable format</li>
                  <li><strong>Disconnect:</strong> Revoke Meta account access at any time</li>
                </ul>
                <p className="text-gray-700 leading-relaxed">
                  To exercise these rights, please contact us at the information provided below.
                </p>
              </section>

              {/* Cookies and Tracking */}
              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Cookies and Tracking</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  We use essential cookies and similar technologies to:
                </p>
                <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                  <li>Keep you logged in to your account</li>
                  <li>Remember your preferences and settings</li>
                  <li>Analyze platform usage to improve our service</li>
                </ul>
                <p className="text-gray-700 leading-relaxed">
                  You can control cookies through your browser settings, though some features may not work properly if disabled.
                </p>
              </section>

              {/* Changes to Privacy Policy */}
              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Changes to This Privacy Policy</h2>
                <p className="text-gray-700 leading-relaxed">
                  We may update this Privacy Policy from time to time. We will notify you of any significant changes 
                  by email or through our platform. Your continued use of Blayz after changes are posted constitutes 
                  acceptance of the updated policy.
                </p>
              </section>

              {/* Contact Information */}
              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contact Us</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  If you have any questions about this Privacy Policy or how we handle your data, please contact us:
                </p>
                <div className="bg-gray-50 p-6 rounded-lg border">
                  <p className="text-gray-700 mb-2">
                    <strong>Email:</strong> privacy@blayz.io
                  </p>
                  <p className="text-gray-700 mb-2">
                    <strong>Support:</strong> Through your Blayz dashboard
                  </p>
                  <p className="text-gray-700">
                    <strong>Response Time:</strong> We typically respond within 48 hours
                  </p>
                </div>
              </section>

            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t mt-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="mb-4 md:mb-0">
                <Link href="/" className="flex items-center">
                  <img 
                    src="/images/svg_logo_blayz.svg" 
                    alt="Blayz Logo" 
                    className="h-6 w-auto"
                  />
                </Link>
              </div>
              <div className="flex items-center space-x-6 text-sm">
                <Link href="/terms" className="text-gray-600 hover:text-primary transition-colors">
                  Terms of Service
                </Link>
                <Link href="/privacy" className="text-gray-600 hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
                <Link href="/contact" className="text-gray-600 hover:text-primary transition-colors">
                  Contact
                </Link>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-gray-200 text-center">
              <p className="text-sm text-gray-500">&copy; 2024 Blayz. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
} 