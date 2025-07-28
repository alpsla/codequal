'use client';

import { useState } from 'react';
import { useBilling } from '../../contexts/billing-context';
import AuthenticatedLayout from '../../components/authenticated-layout';
import { fetchWithAuth } from '../../utils/api';

interface BlockingIssue {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  type: string;
  description: string;
}

interface PositiveFinding {
  icon: string;
  text: string;
}

interface PRDecision {
  status: 'BLOCKED' | 'APPROVED';
  reason: string;
  confidence?: number;
}

interface PRInfo {
  number: string;
  title: string;
  filesChanged: number;
  additions: number;
  deletions: number;
}

interface Repository {
  primaryLanguage: string;
}

interface AnalysisResult {
  analysisId?: string;
  pr?: PRInfo;
  repository?: Repository;
  decision?: PRDecision;
  blockingIssues?: BlockingIssue[];
  positiveFindings?: PositiveFinding[];
  summary?: string;
  recommendations?: string[];
  reportUrl?: string;
}

export default function PRAnalysisPage() {
  const [prUrl, setPrUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [useRealAnalysis, setUseRealAnalysis] = useState(false);
  const [useGitHubData, setUseGitHubData] = useState(false);
  const { trialUsage, subscription, hasPaymentMethod, refreshBilling, webScanUsage } = useBilling();

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setAnalyzing(true);

    try {
      // Extract repository URL and PR number from the PR URL
      const prMatch = prUrl.match(/github\.com\/([^/]+\/[^/]+)\/pull\/(\d+)/);
      if (!prMatch) {
        throw new Error('Invalid PR URL format. Please use: https://github.com/owner/repo/pull/123');
      }

      const [, repoPath, prNumber] = prMatch;
      const repositoryUrl = `https://github.com/${repoPath}`;

      // Select endpoint based on toggles
      let endpoint;
      if (useGitHubData) {
        endpoint = '/api/github-pr-analysis';
      } else if (useRealAnalysis) {
        endpoint = '/api/test-analysis';
      } else {
        endpoint = '/api/mock-pr-analysis';
      }
      
      const response = await fetchWithAuth(endpoint, {
        method: 'POST',
        body: JSON.stringify({ 
          repositoryUrl: repositoryUrl,
          prNumber: parseInt(prNumber)
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === 'TRIAL_REPOSITORY_LIMIT') {
          setError(`You can only analyze PRs from your trial repository: ${data.details.allowed_repository}`);
        } else if (data.code === 'TRIAL_LIMIT_REACHED') {
          setError(`Trial limit reached! You've used ${data.details.scans_used} out of ${data.details.scans_limit} scans. Add a payment method to continue with a subscription or pay-as-you-go.`);
        } else if (data.error && data.error.includes('404')) {
          setError('PR not found. Please check the URL and ensure the PR exists and is accessible.');
        } else if (data.error && data.error.includes('GitHub PR fetch failed')) {
          setError('Failed to fetch PR from GitHub. The PR might be private or the URL might be incorrect.');
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
  const isSubscribed = subscription && subscription.tier !== 'free';
  const isIndividualPlan = subscription?.tier === 'individual';
  const isTeamPlan = subscription?.tier === 'team';
  const isApiPlan = subscription?.tier === 'api';
  
  const scansRemaining = trialUsage ? (trialUsage.scansLimit - trialUsage.scansUsed) : 10;
  const webScansRemaining = webScanUsage && isIndividualPlan ? (webScanUsage.scansLimit - webScanUsage.scansUsed) : null;
  
  const canAnalyze = isApiPlan ? false : 
                    isTeamPlan ? true : 
                    isIndividualPlan ? (webScansRemaining === null || webScansRemaining > 0 || hasPaymentMethod) :
                    (scansRemaining > 0 || hasPaymentMethod);

  return (
    <AuthenticatedLayout>
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Analyze Pull Request</h1>
              <button
                onClick={() => refreshBilling()}
                className="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700"
              >
                Refresh Status
              </button>
            </div>
          
          {/* Subscription Status */}
          {isSubscribed && (
            <div className={`mb-6 p-4 rounded-md ${
              isApiPlan ? 'bg-red-50 border border-red-200' : 
              isIndividualPlan && webScansRemaining !== null && webScansRemaining <= 5 ? 'bg-yellow-50 border border-yellow-200' :
              'bg-blue-50 border border-blue-200'
            }`}>
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className={`h-5 w-5 ${
                    isApiPlan ? 'text-red-400' :
                    isIndividualPlan && webScansRemaining !== null && webScansRemaining <= 5 ? 'text-yellow-400' :
                    'text-blue-400'
                  }`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className={`text-sm font-medium ${
                    isApiPlan ? 'text-red-800' :
                    isIndividualPlan && webScansRemaining !== null && webScansRemaining <= 5 ? 'text-yellow-800' :
                    'text-blue-800'
                  }`}>
                    {subscription.tier === 'api' ? 'API Plan - No Web Access' : 
                     subscription.tier === 'individual' ? `Individual Plan - ${webScansRemaining !== null ? `${webScansRemaining} analyses remaining this month` : '50 analyses/month'}` : 
                     subscription.tier === 'team' ? 'Team Plan - Unlimited Everything' : 'Subscribed'}
                  </h3>
                  <p className={`mt-1 text-sm ${
                    isApiPlan ? 'text-red-700' :
                    isIndividualPlan && webScansRemaining !== null && webScansRemaining <= 5 ? 'text-yellow-700' :
                    'text-blue-700'
                  }`}>
                    {subscription.tier === 'team' 
                      ? 'You have unlimited access to analyze any PR.'
                      : subscription.tier === 'individual'
                      ? webScansRemaining !== null && webScansRemaining === 0 
                        ? 'Monthly limit reached. Add payment method for pay-as-you-go ($0.50/analysis).'
                        : 'PR analysis counts towards your monthly web scan limit.'
                      : subscription.tier === 'api'
                      ? 'This plan is for API access only. Please upgrade to Individual or Team plan.'
                      : 'You can analyze pull requests.'}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Trial Status */}
          {isTrialUser && !isSubscribed && trialUsage && (
            <div className={`mb-6 p-4 rounded-md ${
              hasPaymentMethod ? 'bg-green-50 border border-green-200' :
              scansRemaining > 5 ? 'bg-blue-50 border border-blue-200' : 
              scansRemaining > 0 ? 'bg-yellow-50 border border-yellow-200' : 
              'bg-red-50 border border-red-200'
            }`}>
              <p className={`text-sm ${
                hasPaymentMethod ? 'text-green-700' :
                scansRemaining > 5 ? 'text-blue-700' : 
                scansRemaining > 0 ? 'text-yellow-700' : 
                'text-red-700'
              }`}>
                {hasPaymentMethod ? (
                  <><strong>Pay-as-you-go enabled:</strong> $0.50 per analysis</>
                ) : (
                  <>
                    <strong>Trial Status:</strong> {scansRemaining} scans remaining
                    {trialUsage.trialRepository && (
                      <> • Limited to: <code className="bg-gray-100 px-1 py-0.5 rounded">{trialUsage.trialRepository}</code></>
                    )}
                    {scansRemaining === 0 && (
                      <div className="mt-2 text-sm">
                        <span className="font-medium">Continue with: </span>
                        <a href="/settings/payment" className="font-medium underline text-indigo-600 hover:text-indigo-500">
                          Pay-per-scan
                        </a>
                        <span> or </span>
                        <a href="/subscribe" className="font-medium underline text-indigo-600 hover:text-indigo-500">
                          Subscribe
                        </a>
                      </div>
                    )}
                  </>
                )}
              </p>
              {hasPaymentMethod && scansRemaining > 0 && (
                <p className="text-xs text-green-600 mt-1">
                  You still have {scansRemaining} free trial scans remaining
                </p>
              )}
            </div>
          )}

          <form onSubmit={handleAnalyze} className="space-y-6">
            {/* Analysis Mode Toggles */}
            <div className="space-y-3">
              {/* Real Analysis Toggle */}
              <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <div>
                  <label htmlFor="real-analysis" className="text-sm font-medium text-gray-700">
                    Use Real Analysis
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Enable to perform actual code analysis (may take 2-5 minutes)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setUseRealAnalysis(!useRealAnalysis);
                    if (!useRealAnalysis) setUseGitHubData(false);
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    useRealAnalysis ? 'bg-indigo-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      useRealAnalysis ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* GitHub Data Toggle */}
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-md">
                <div>
                  <label htmlFor="github-data" className="text-sm font-medium text-gray-700">
                    Use Real GitHub Data
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Fetch actual PR data from GitHub API (fast, basic analysis)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setUseGitHubData(!useGitHubData);
                    if (!useGitHubData) setUseRealAnalysis(false);
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    useGitHubData ? 'bg-green-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      useGitHubData ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
            
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
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                <strong className="text-gray-700">Small PR (Performance):</strong>
                <br />
                <code className="text-xs bg-gray-200 px-1 py-0.5 rounded">https://github.com/facebook/react/pull/27513</code>
              </li>
              <li>
                <strong className="text-gray-700">Medium PR (Feature):</strong>
                <br />
                <code className="text-xs bg-gray-200 px-1 py-0.5 rounded">https://github.com/vercel/next.js/pull/55682</code>
              </li>
              <li>
                <strong className="text-gray-700">Large PR (Enhancement):</strong>
                <br />
                <code className="text-xs bg-gray-200 px-1 py-0.5 rounded">https://github.com/microsoft/vscode/pull/193215</code>
              </li>
              <li>
                <strong className="text-gray-700">Security Fix:</strong>
                <br />
                <code className="text-xs bg-gray-200 px-1 py-0.5 rounded">https://github.com/nodejs/node/pull/48409</code>
              </li>
              <li>
                <strong className="text-gray-700">Documentation Update:</strong>
                <br />
                <code className="text-xs bg-gray-200 px-1 py-0.5 rounded">https://github.com/microsoft/TypeScript/pull/55456</code>
              </li>
              <li>
                <strong className="text-gray-700">Bug Fix:</strong>
                <br />
                <code className="text-xs bg-gray-200 px-1 py-0.5 rounded">https://github.com/vuejs/core/pull/9199</code>
              </li>
              <li>
                <strong className="text-gray-700">Refactoring:</strong>
                <br />
                <code className="text-xs bg-gray-200 px-1 py-0.5 rounded">https://github.com/angular/angular/pull/51823</code>
              </li>
            </ul>
            {!hasPaymentMethod && subscription?.tier === 'free' && (
              <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-xs text-yellow-800">
                  <strong>Trial Limitation:</strong> During your trial, you can only analyze PRs from the repository you first scan. 
                  Add a payment method or upgrade to analyze PRs from any repository.
                </p>
              </div>
            )}
            {hasPaymentMethod && subscription?.tier === 'free' && (
              <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded">
                <p className="text-xs text-green-800">
                  <strong>Pay-as-you-go:</strong> You can analyze PRs from any repository. Each analysis costs $0.50.
                </p>
              </div>
            )}
            {subscription && subscription.tier !== 'free' && (
              <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
                <p className="text-xs text-blue-800">
                  <strong>{subscription.tier === 'team' ? 'Team Plan' : subscription.tier === 'individual' ? 'Individual Plan' : 'API Plan'}:</strong> 
                  {subscription.tier === 'team' 
                    ? ' Unlimited PR analysis from any repository.'
                    : subscription.tier === 'individual'
                    ? ' Up to 50 PR analyses per month from any repository.'
                    : ' API access for programmatic analysis.'}
                </p>
              </div>
            )}
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
              {/* If we have an analysis ID, redirect to the report page */}
              {result.analysisId ? (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <div className="text-center">
                    <div className="mb-4">
                      <i className="fas fa-check-circle text-green-500 text-4xl"></i>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Analysis Complete!</h3>
                    <p className="text-gray-600 mb-4">Your PR analysis has been completed successfully.</p>
                    <a 
                      href={`/reports/${result.analysisId}`}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      View Full Report
                      <i className="fas fa-arrow-right ml-2"></i>
                    </a>
                  </div>
                </div>
              ) : (
                /* Legacy JSON display */
                <>
                  <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-t-lg p-6 text-white">
                    <h2 className="text-2xl font-bold mb-2">Code Analysis Report</h2>
                    <p className="text-sm opacity-90">Pull Request #{result.pr?.number} - {result.pr?.title}</p>
                    <div className="flex items-center mt-4 space-x-6 text-sm">
                      <span>📅 {new Date().toLocaleDateString()}</span>
                      <span>🔍 v1.0.0</span>
                      <span>🔗 {result.analysisId}</span>
                    </div>
                  </div>

              {/* PR Stats */}
              <div className="bg-white border-x border-gray-200 p-4">
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{result.pr?.filesChanged || 0}</div>
                    <div className="text-sm text-gray-500">Files Changed</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">+{result.pr?.additions || 0}</div>
                    <div className="text-sm text-gray-500">Lines Added</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">-{result.pr?.deletions || 0}</div>
                    <div className="text-sm text-gray-500">Lines Removed</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{result.repository?.primaryLanguage}</div>
                    <div className="text-sm text-gray-500">Language</div>
                  </div>
                </div>
              </div>

              {/* PR Decision */}
              {result.decision && (
                <div className={`p-6 ${result.decision.status === 'BLOCKED' ? 'bg-red-50' : 'bg-green-50'}`}>
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      {result.decision.status === 'BLOCKED' ? (
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                          <svg className="w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                          <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="ml-4 flex-1">
                      <h3 className={`text-xl font-bold ${result.decision.status === 'BLOCKED' ? 'text-red-900' : 'text-green-900'}`}>
                        PR Decision: {result.decision.status}
                      </h3>
                      <p className={`mt-1 ${result.decision.status === 'BLOCKED' ? 'text-red-700' : 'text-green-700'}`}>
                        {result.decision.reason}
                      </p>
                      {result.decision.confidence && (
                        <div className="mt-3">
                          <div className="flex items-center">
                            <span className="text-sm font-medium text-gray-700 mr-2">Confidence:</span>
                            <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-xs">
                              <div className="bg-blue-600 h-2 rounded-full" style={{width: `${result.decision.confidence}%`}}></div>
                            </div>
                            <span className="ml-2 text-sm font-medium text-gray-700">{result.decision.confidence}%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Issues and Findings */}
              <div className="bg-white border border-gray-200 rounded-b-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Blocking Issues */}
                  {result.blockingIssues && result.blockingIssues.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold text-red-900 mb-3 flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Blocking Issues
                      </h4>
                      <div className="space-y-3">
                        {result.blockingIssues.map((issue, index) => (
                          <div key={index} className="border-l-4 border-red-500 pl-4 py-2">
                            <div className="flex items-center">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                issue.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
                              }`}>
                                {issue.severity}
                              </span>
                              <span className="ml-2 text-sm font-medium text-gray-900">{issue.type}</span>
                            </div>
                            <p className="mt-1 text-sm text-gray-600">{issue.description}</p>
                            {issue.file && (
                              <p className="mt-1 text-xs text-gray-500 font-mono">{issue.file}:{issue.line}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Positive Findings */}
                  {result.positiveFindings && result.positiveFindings.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold text-green-900 mb-3 flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Positive Findings
                      </h4>
                      <div className="space-y-2">
                        {result.positiveFindings.map((finding, index) => (
                          <div key={index} className="flex items-start">
                            <span className="text-green-500 mr-2">{finding.icon}</span>
                            <span className="text-sm text-gray-700">{finding.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Summary and Recommendations */}
                {result.summary && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Summary</h4>
                    <p className="text-sm text-gray-600">{result.summary}</p>
                  </div>
                )}

                {result.recommendations && result.recommendations.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Recommendations</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {result.recommendations.map((rec: string, index: number) => (
                        <li key={index} className="text-sm text-gray-600">{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* View Report Button */}
                {result.reportUrl && (
                  <div className="mt-6 text-center">
                    <a
                      href={result.reportUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      View Full Report
                      <svg className="ml-2 -mr-1 w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </a>
                  </div>
                )}
              </div>
                </>
              )}
            </div>
          )}
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}