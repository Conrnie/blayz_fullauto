import React from 'react';

function ErrorPage({ statusCode, err }) {
  console.error('Error page rendered with:', { statusCode, err });
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-10 bg-white rounded-xl shadow-md">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            {statusCode
              ? `An error ${statusCode} occurred on server`
              : 'An error occurred on client'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            We're sorry for the inconvenience. Please try again later.
          </p>
          
          <div className="mt-4">
            <a
              href="/"
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Go back to homepage
            </a>
          </div>
          
          <div className="mt-6 p-4 bg-gray-50 rounded-md text-left">
            <p className="text-xs text-gray-500">
              If this error persists, please contact support with the following information:
            </p>
            <div className="mt-2 overflow-x-auto">
              <pre className="text-xs bg-gray-100 p-2 rounded">
                <code>
                  {JSON.stringify({ statusCode, timestamp: new Date().toISOString() }, null, 2)}
                </code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

ErrorPage.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode, err };
};

export default ErrorPage;