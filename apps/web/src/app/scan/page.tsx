'use client';

import { useState } from 'react';
import { useBilling } from '../../contexts/billing-context';
import AuthenticatedLayout from '../../components/authenticated-layout';
import { fetchWithAuth } from '../../utils/api';
import ScanResults from '../../components/scan-results';
import ScanProgress from '../../components/scan-progress';

interface ScanResult {
  message: string;
  repositoryUrl: string;
  jobId: string;
  status: string;
  estimatedTime?: number;
  reportUrl?: string;
}

export default function ScanPage() {
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const { trialUsage, subscription, hasPaymentMethod, refreshBilling, loading, webScanUsage } = useBilling();

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setScanning(true);

    try {
      console.log('Starting scan for:', repositoryUrl);
      
      const response = await fetchWithAuth('/api/simple-scan', {
        method: 'POST',
        body: JSON.stringify({ repositoryUrl: repositoryUrl }),
      });

      console.log('Scan response status:', response.status);

      // Try to parse response as JSON
      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error('Server returned non-JSON response');
      }

      if (!response.ok) {
        // Handle specific error codes
        if (data.code === 'TRIAL_REPOSITORY_LIMIT') {
          setError(`You can only scan your selected trial repository: ${data.details.allowed_repository}`);
        } else if (data.code === 'TRIAL_LIMIT_REACHED') {
          setError(`Trial limit reached! You've used ${data.details.scans_used} out of ${data.details.scans_limit} scans. Add a payment method to continue with a subscription or pay-as-you-go.`);
        } else {
          setError(data.error || 'Failed to scan repository');
        }
      } else {
        // Show progress indicator
        setAnalysisId(data.analysisId);
        setShowProgress(true);
        setScanning(false);
      }
    } catch (err) {
      console.error('Scan error details:', err);
      if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
        setError('Failed to connect to API server. Please ensure the server is running on port 3001.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to connect to server');
      }
    } finally {
      setScanning(false);
    }
  };

  const isTrialUser = !subscription || subscription.tier === 'free';
  const isSubscribed = subscription && subscription.tier !== 'free';
  const isIndividualPlan = subscription?.tier === 'individual';
  const isTeamPlan = subscription?.tier === 'team';
  const isApiPlan = subscription?.tier === 'api';
  
  const scansRemaining = trialUsage ? (trialUsage.scansLimit - trialUsage.scansUsed) : 10;
  const webScansRemaining = webScanUsage && isIndividualPlan ? (webScanUsage.scansLimit - webScanUsage.scansUsed) : null;
  
  // API plan users can't use web scans
  if (isApiPlan) {
    const canScan = false;
  } else if (isTeamPlan) {
    const canScan = true; // Unlimited for team plan
  } else if (isIndividualPlan) {
    const canScan = webScansRemaining === null || webScansRemaining > 0 || hasPaymentMethod;
  } else {
    const canScan = scansRemaining > 0 || hasPaymentMethod;
  }
  
  const canScan = isApiPlan ? false : 
                  isTeamPlan ? true : 
                  isIndividualPlan ? (webScansRemaining === null || webScansRemaining > 0 || hasPaymentMethod) :
                  (scansRemaining > 0 || hasPaymentMethod);

  return (
    <AuthenticatedLayout>
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Scan Repository</h1>
            <button
              onClick={async () => {
                setRefreshing(true);
                await refreshBilling();
                setRefreshing(false);
              }}
              disabled={refreshing || loading}
              className="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 disabled:opacity-50"
            >
              {refreshing || loading ? 'Refreshing...' : 'Refresh Status'}
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
                    {subscription.tier === 'api' ? 'API Plan - 200 API calls/month (No Web Access)' : 
                     subscription.tier === 'individual' ? `Individual Plan - ${webScansRemaining !== null ? `${webScansRemaining} web scans remaining this month` : '50 web scans/month'}` : 
                     subscription.tier === 'team' ? 'Team Plan - Unlimited Everything' : 'Subscribed'}
                  </h3>
                  <p className={`mt-1 text-sm ${
                    isApiPlan ? 'text-red-700' :
                    isIndividualPlan && webScansRemaining !== null && webScansRemaining <= 5 ? 'text-yellow-700' :
                    'text-blue-700'
                  }`}>
                    {subscription.tier === 'team' 
                      ? 'You have unlimited access to scan any repository via web or API.'
                      : subscription.tier === 'individual'
                      ? webScansRemaining !== null && webScansRemaining === 0 
                        ? 'Monthly web scan limit reached. Add a payment method for pay-as-you-go ($0.50/scan) or upgrade to Team Plan.'
                        : '50 web scans + 200 API calls per month.'
                      : subscription.tier === 'api'
                      ? 'This plan is for API access only. Please upgrade to Individual or Team plan for web scanning.'
                      : 'You can scan any repository.'}
                  </p>
                  {isIndividualPlan && webScansRemaining !== null && webScansRemaining === 0 && hasPaymentMethod && (
                    <p className="mt-2 text-sm text-green-700">
                      ✅ Pay-as-you-go enabled - Each additional scan will be charged $0.50
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Trial Status - Only show for free tier users */}
          {isTrialUser && !isSubscribed && trialUsage && (
            <div className={`mb-6 p-4 rounded-md ${
              hasPaymentMethod ? 'bg-green-50 border border-green-200' :
              scansRemaining > 5 ? 'bg-blue-50 border border-blue-200' : 
              scansRemaining > 0 ? 'bg-yellow-50 border border-yellow-200' : 
              'bg-red-50 border border-red-200'
            }`}>
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className={`h-5 w-5 ${
                    hasPaymentMethod ? 'text-green-400' :
                    scansRemaining > 5 ? 'text-blue-400' : 
                    scansRemaining > 0 ? 'text-yellow-400' : 
                    'text-red-400'
                  }`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className={`text-sm font-medium ${
                    hasPaymentMethod ? 'text-green-800' :
                    scansRemaining > 5 ? 'text-blue-800' : 
                    scansRemaining > 0 ? 'text-yellow-800' : 
                    'text-red-800'
                  }`}>
                    {hasPaymentMethod 
                      ? '✅ Pay-as-you-go enabled ($0.50 per scan)' 
                      : `Free Trial: ${scansRemaining} scans remaining`}
                  </h3>
                  <div className={`mt-2 text-sm ${
                    hasPaymentMethod ? 'text-green-700' :
                    scansRemaining > 5 ? 'text-blue-700' : 
                    scansRemaining > 0 ? 'text-yellow-700' : 
                    'text-red-700'
                  }`}>
                    {hasPaymentMethod ? (
                      <div>
                        <p>You have a payment method on file. Each scan will be charged $0.50.</p>
                        {scansRemaining > 0 && (
                          <p className="mt-1">You still have {scansRemaining} free trial scans remaining.</p>
                        )}
                        <p className="mt-2">
                          <a href="/subscribe" className="font-medium underline text-indigo-600 hover:text-indigo-500">
                            Upgrade to a subscription
                          </a> for unlimited access
                        </p>
                      </div>
                    ) : (
                      <>
                        <div>
                          {trialUsage.trialRepository ? (
                            <p>Your trial is limited to: <code className="bg-gray-100 px-1 py-0.5 rounded">{trialUsage.trialRepository}</code></p>
                          ) : (
                            <p>You can scan one repository during your trial period.</p>
                          )}
                          {scansRemaining === 0 && (
                            <div className="mt-3 p-3 bg-red-50 rounded-md border border-red-200">
                              <p className="font-semibold text-red-900 mb-2">Trial limit reached!</p>
                              <p className="text-sm text-red-800 mb-3">Choose how to continue:</p>
                              <div className="space-y-2">
                                <div className="flex items-center">
                                  <span className="text-red-600 mr-2">•</span>
                                  <p className="text-sm">
                                    <a href="/settings/payment" className="font-medium underline text-red-900 hover:text-red-700">
                                      Add payment method
                                    </a>
                                    <span className="text-red-700"> - Pay $0.50 per scan (pay-as-you-go)</span>
                                  </p>
                                </div>
                                <div className="flex items-center">
                                  <span className="text-red-600 mr-2">•</span>
                                  <p className="text-sm">
                                    <a href="/subscribe" className="font-medium underline text-red-900 hover:text-red-700">
                                      Subscribe
                                    </a>
                                    <span className="text-red-700"> - Get unlimited scans with a monthly plan</span>
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleScan} className="space-y-6">
            <div>
              <label htmlFor="repository" className="block text-sm font-medium text-gray-700">
                Repository or PR URL
              </label>
              <input
                type="text"
                id="repository"
                value={repositoryUrl}
                onChange={(e) => setRepositoryUrl(e.target.value)}
                placeholder="https://github.com/username/repository or https://github.com/username/repository/pull/123"
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
          {result && <ScanResults result={result} />}
          
          {/* Progress Indicator */}
          {showProgress && analysisId && (
            <ScanProgress 
              analysisId={analysisId} 
              onComplete={async (reportUrl) => {
                setShowProgress(false);
                setResult({
                  ...result,
                  reportUrl,
                  status: 'complete'
                });
                // Refresh billing to update scan count
                await refreshBilling();
              }}
            />
          )}
        </div>
      </div>
    </div>
    </AuthenticatedLayout>
  );
}