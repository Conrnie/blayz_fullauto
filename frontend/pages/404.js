import React from 'react';
import Link from 'next/link';
import Button from '../components/UI/Button';

export default function Custom404() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h1 className="text-9xl font-extrabold text-primary">404</h1>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">Page Not Found</h2>
          <p className="mt-2 text-sm text-gray-600">
            Sorry, we couldn't find the page you're looking for.
          </p>
        </div>
        
        <div className="mt-8">
          <Link href="/" legacyBehavior>
            <a>
              <Button variant="primary" className="w-full">
                Go back home
              </Button>
            </a>
          </Link>
        </div>
        
        <div className="mt-6">
          <p className="text-sm text-gray-500">
            Looking for one of these pages?
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Link href="/dashboard" legacyBehavior>
              <a className="text-sm text-primary hover:underline">
                Dashboard
              </a>
            </Link>
            <Link href="/rules" legacyBehavior>
              <a className="text-sm text-primary hover:underline">
                Rules
              </a>
            </Link>
            <Link href="/accounts" legacyBehavior>
              <a className="text-sm text-primary hover:underline">
                Accounts
              </a>
            </Link>
            <Link href="/auth/login" legacyBehavior>
              <a className="text-sm text-primary hover:underline">
                Log In
              </a>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}