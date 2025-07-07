import React, { useState, useEffect } from 'react';
import { metaApi } from '../../lib/api.js';

const AdAccountsList = ({ onAccountSelect, selectedAccountId }) => {
  const [adAccounts, setAdAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchAdAccounts = async () => {
      try {
        setLoading(true);
        const accounts = await metaApi.getAdAccounts();
        setAdAccounts(accounts);
      } catch (err) {
        console.error('Error fetching ad accounts:', err);
        setAdAccounts([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAdAccounts();
  }, []);
  
  if (loading) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (adAccounts.length === 0) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <p className="text-gray-500 mb-2">No ad accounts available.</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Your Ad Accounts</h3>
      <div className="space-y-2">
        {adAccounts.map((account) => (
          <div 
            key={account.id}
            className={`p-3 rounded-md cursor-pointer transition-colors ${
              selectedAccountId === account.account_id 
                ? 'bg-primary/10 border border-primary' 
                : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
            }`}
            onClick={() => onAccountSelect(account.account_id)}
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">{account.name}</h4>
                <p className="text-sm text-gray-500">ID: {account.account_id}</p>
              </div>
              {selectedAccountId === account.account_id && (
                <svg className="h-5 w-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">Status:</span> {account.status}
              </div>
              <div>
                <span className="text-gray-500">Currency:</span> {account.currency}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdAccountsList;
