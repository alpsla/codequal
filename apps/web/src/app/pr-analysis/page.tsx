'use client';

import { useState } from 'react';
import { useBilling } from '../../contexts/billing-context';

export default function PRAnalysisPage() {
  const [prUrl, setPrUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { trialUsage, subscription, refreshBilling } = useBilling();

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setAnalyzing(true);

    try {
      // Extract repository URL and PR number from the PR URL
      const prMatch = prUrl.match(/github\.com\/([^\/]+\/[^\/]+)\/pull\/(\d+)/);
      if (!prMatch) {
        throw new Error('Invalid PR URL format. Please use: https://github.com/owner/repo/pull/123');
      }

      const [, repoPath, prNumber] = prMatch;
      const repositoryUrl = `https://github.com/${repoPath}`;

      const response = await fetch('/api/analyze-pr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          repository_url: repositoryUrl,
          pr_number: parseInt(prNumber)
        }),
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === 'TRIAL_REPOSITORY_LIMIT') {
          setError(`You can only analyze PRs from your trial repository: ${data.details.allowed_repository}`);
        } else if (data.code === 'TRIAL_LIMIT_REACHED') {
          setError(`Trial limit reached! You've used ${data.details.scans_used} out of ${data.details.scans_limit} scans.`);
        } else {
          setError(data.error || 'Failed to analyze PR');
        }
      } else {
        setResult(data);
        await refreshBilling();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze PR');
      console.error('PR analysis error:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const isTrialUser = !subscription || subscription.tier === 'free';
  const scansRemaining = trialUsage ? (trialUsage.scansLimit - trialUsage.scansUsed) : 10;
  const canAnalyze = !isTrialUser || scansRemaining > 0;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Analyze Pull Request</h1>
          
          {/* Trial Status */}
          {isTrialUser && trialUsage && (
            <div className={`mb-6 p-4 rounded-md ${
              scansRemaining > 5 ? 'bg-blue-50 border border-blue-200' : 
              scansRemaining > 0 ? 'bg-yellow-50 border border-yellow-200' : 
              'bg-red-50 border border-red-200'
            }`}>
              <p className={`text-sm ${
                scansRemaining > 5 ? 'text-blue-700' : 
                scansRemaining > 0 ? 'text-yellow-700' : 
                'text-red-700'
              }`}>
                <strong>Trial Status:</strong> {scansRemaining} scans remaining
                {trialUsage.trialRepository && (
                  <> • Limited to: <code className="bg-gray-100 px-1 py-0.5 rounded">{trialUsage.trialRepository}</code></>
                )}
              </p>
            </div>
          )}

          <form onSubmit={handleAnalyze} className="space-y-6">
            <div>
              <label htmlFor="pr-url" className="block text-sm font-medium text-gray-700">
                Pull Request URL
              </label>
              <input
                type="url"
                id="pr-url"
                value={prUrl}
                onChange={(e) => setPrUrl(e.target.value)}
                placeholder="https://github.com/owner/repo/pull/123"
                className="mt-1 block w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                required
                disabled={!canAnalyze}
              />
              <p className="mt-2 text-sm text-gray-500">
                Enter the full URL of the GitHub pull request you want to analyze
              </p>
            </div>

            <button
              type="submit"
              disabled={analyzing || !canAnalyze}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                canAnalyze 
                  ? 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500' 
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              {analyzing ? 'Analyzing...' : 'Analyze Pull Request'}
            </button>
          </form>

          {/* Example PRs */}
          <div className="mt-6 p-4 bg-gray-50 rounded-md">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Example Pull Requests for Testing:</h3>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• https://github.com/facebook/react/pull/27513</li>
              <li>• https://github.com/vercel/next.js/pull/55682</li>
              <li>• https://github.com/microsoft/vscode/pull/193215</li>
            </ul>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
              {error.includes('Trial limit reached') && (
                <a href="/subscribe" className="mt-2 inline-block text-sm font-medium text-red-900 underline">
                  Upgrade to continue
                </a>
              )}
            </div>
          )}

          {/* Results Display */}
          {result && (
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Analysis Results</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="space-y-4">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-3 rounded border border-gray-200">
                      <dt className="text-sm font-medium text-gray-500">Files Changed</dt>
                      <dd className="mt-1 text-2xl font-semibold text-gray-900">
                        {result.filesChanged || 0}
                      </dd>
                    </div>
                    <div className="bg-white p-3 rounded border border-gray-200">
                      <dt className="text-sm font-medium text-gray-500">Lines Modified</dt>
                      <dd className="mt-1 text-2xl font-semibold text-gray-900">
                        +{result.additions || 0} -{result.deletions || 0}
                      </dd>
                    </div>
                  </div>
                  
                  {/* Raw Result */}
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm font-medium text-gray-700">
                      View Full Analysis
                    </summary>
                    <pre className="mt-2 text-xs text-gray-600 overflow-auto bg-white p-3 rounded border border-gray-200">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </details>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}