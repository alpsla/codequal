'use client';

import { useState, useEffect } from 'react';
import { useBilling } from '../../contexts/billing-context';

export default function ScanPage() {
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { trialUsage, subscription, refreshBilling } = useBilling();

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setScanning(true);

    try {
      const response = await fetch('/api/repository/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ repository_url: repositoryUrl }),
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error codes
        if (data.code === 'TRIAL_REPOSITORY_LIMIT') {
          setError(`You can only scan your selected trial repository: ${data.details.allowed_repository}`);
        } else if (data.code === 'TRIAL_LIMIT_REACHED') {
          setError(`Trial limit reached! You've used ${data.details.scans_used} out of ${data.details.scans_limit} scans. Please upgrade to continue.`);
        } else {
          setError(data.error || 'Failed to scan repository');
        }
      } else {
        setResult(data);
        // Refresh billing to update scan count
        await refreshBilling();
      }
    } catch (err) {
      setError('Failed to connect to server');
      console.error('Scan error:', err);
    } finally {
      setScanning(false);
    }
  };

  const isTrialUser = !subscription || subscription.tier === 'free';
  const scansRemaining = trialUsage ? (trialUsage.scansLimit - trialUsage.scansUsed) : 10;
  const canScan = !isTrialUser || scansRemaining > 0;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Scan Repository</h1>
          
          {/* Trial Status */}
          {isTrialUser && trialUsage && (
            <div className={`mb-6 p-4 rounded-md ${
              scansRemaining > 5 ? 'bg-blue-50 border border-blue-200' : 
              scansRemaining > 0 ? 'bg-yellow-50 border border-yellow-200' : 
              'bg-red-50 border border-red-200'
            }`}>
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className={`h-5 w-5 ${
                    scansRemaining > 5 ? 'text-blue-400' : 
                    scansRemaining > 0 ? 'text-yellow-400' : 
                    'text-red-400'
                  }`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className={`text-sm font-medium ${
                    scansRemaining > 5 ? 'text-blue-800' : 
                    scansRemaining > 0 ? 'text-yellow-800' : 
                    'text-red-800'
                  }`}>
                    Free Trial: {scansRemaining} scans remaining
                  </h3>
                  <div className={`mt-2 text-sm ${
                    scansRemaining > 5 ? 'text-blue-700' : 
                    scansRemaining > 0 ? 'text-yellow-700' : 
                    'text-red-700'
                  }`}>
                    {trialUsage.trialRepository ? (
                      <p>Your trial is limited to: <code className="bg-gray-100 px-1 py-0.5 rounded">{trialUsage.trialRepository}</code></p>
                    ) : (
                      <p>You can scan one repository during your trial period.</p>
                    )}
                    {scansRemaining === 0 && (
                      <p className="mt-2">
                        <a href="/subscribe" className="font-medium underline">
                          Upgrade now
                        </a> to continue scanning or pay $0.50 per scan.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleScan} className="space-y-6">
            <div>
              <label htmlFor="repository" className="block text-sm font-medium text-gray-700">
                Repository URL
              </label>
              <input
                type="text"
                id="repository"
                value={repositoryUrl}
                onChange={(e) => setRepositoryUrl(e.target.value)}
                placeholder="https://github.com/username/repository"
                className="mt-1 block w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                required
                disabled={!canScan}
              />
            </div>

            <button
              type="submit"
              disabled={scanning || !canScan}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                canScan 
                  ? 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500' 
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              {scanning ? 'Scanning...' : 'Scan Repository'}
            </button>
          </form>

          {/* Error Display */}
          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Results Display */}
          {result && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
              <h3 className="text-lg font-medium text-green-900 mb-2">Scan Complete!</h3>
              <pre className="text-sm text-gray-700 overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}