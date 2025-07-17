'use client';

import { useState, useEffect } from 'react';
import AuthenticatedLayout from '../../components/authenticated-layout';
import { fetchWithAuth } from '../../utils/api';

interface UsageStats {
  subscription: {
    tier: string;
    status: string;
    currentPeriodEnd?: string;
  };
  usage: {
    api: {
      used: number;
      limit: number;
      remaining: number;
      percentage: number;
    };
    webScans: {
      used: number;
      limit: number;
      remaining: number;
      percentage: number;
    };
    trial: {
      used: number;
      limit: number;
      remaining: number;
    };
  };
  apiKeys: Array<{
    name: string;
    usage_count: number;
    usage_limit: number;
    created_at: string;
  }>;
  recentAnalyses: Array<{
    id: string;
    repository_url: string;
    pr_number: number;
    quality_score: number;
    created_at: string;
  }>;
  recommendations: Array<{
    type: string;
    message: string;
    action: string;
  }>;
}

export default function UsagePage() {
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsageStats();
  }, []);

  const fetchUsageStats = async () => {
    try {
      const response = await fetchWithAuth('/api/usage-stats');
      if (!response.ok) {
        throw new Error('Failed to fetch usage stats');
      }
      const data = await response.json();
      setUsageStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load usage data');
    } finally {
      setLoading(false);
    }
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      </AuthenticatedLayout>
    );
  }

  if (error || !usageStats) {
    return (
      <AuthenticatedLayout>
        <div className="min-h-screen bg-gray-50 py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600">{error || 'Failed to load usage data'}</p>
            </div>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Usage Dashboard</h1>
            <p className="mt-2 text-gray-600">Monitor your API calls, web scans, and usage limits</p>
          </div>

          {/* Subscription Info */}
          <div className="bg-white rounded-lg shadow mb-6 p-6">
            <h2 className="text-xl font-semibold mb-4">Subscription</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Current Plan</p>
                <p className="text-lg font-medium capitalize">{usageStats.subscription.tier}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className="text-lg font-medium capitalize">{usageStats.subscription.status}</p>
              </div>
              {usageStats.subscription.currentPeriodEnd && (
                <div>
                  <p className="text-sm text-gray-600">Billing Period Ends</p>
                  <p className="text-lg font-medium">{formatDate(usageStats.subscription.currentPeriodEnd)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Recommendations */}
          {usageStats.recommendations.length > 0 && (
            <div className="mb-6">
              {usageStats.recommendations.map((rec, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg mb-3 ${
                    rec.type === 'upgrade' ? 'bg-blue-50 border border-blue-200' : 'bg-yellow-50 border border-yellow-200'
                  }`}
                >
                  <p className={rec.type === 'upgrade' ? 'text-blue-800' : 'text-yellow-800'}>
                    {rec.message}
                  </p>
                  {rec.type === 'upgrade' && (
                    <a
                      href="/subscribe"
                      className="inline-block mt-2 text-sm font-medium text-blue-600 hover:text-blue-500"
                    >
                      Upgrade Now →
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Usage Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* API Usage */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">API Usage</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">API Calls</span>
                    <span className="text-sm font-medium">
                      {usageStats.usage.api.used} / {usageStats.usage.api.limit === -1 ? 'Unlimited' : usageStats.usage.api.limit}
                    </span>
                  </div>
                  {usageStats.usage.api.limit !== -1 && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${getProgressBarColor(usageStats.usage.api.percentage)}`}
                        style={{ width: `${Math.min(usageStats.usage.api.percentage, 100)}%` }}
                      ></div>
                    </div>
                  )}
                </div>
                {usageStats.usage.api.limit !== -1 && (
                  <p className="text-sm text-gray-600">
                    {usageStats.usage.api.remaining} calls remaining this month
                  </p>
                )}
              </div>
            </div>

            {/* Web Scans */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Web Scans</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">Scans Used</span>
                    <span className="text-sm font-medium">
                      {usageStats.usage.webScans.used} / {usageStats.usage.webScans.limit === -1 ? 'Unlimited' : usageStats.usage.webScans.limit}
                    </span>
                  </div>
                  {usageStats.usage.webScans.limit !== -1 && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${getProgressBarColor(usageStats.usage.webScans.percentage)}`}
                        style={{ width: `${Math.min(usageStats.usage.webScans.percentage, 100)}%` }}
                      ></div>
                    </div>
                  )}
                </div>
                {usageStats.usage.webScans.limit !== -1 && (
                  <p className="text-sm text-gray-600">
                    {usageStats.usage.webScans.remaining} scans remaining this month
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Trial Usage (if applicable) */}
          {usageStats.subscription.tier === 'free' && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">Trial Usage</h3>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Trial Scans</span>
                  <span className="text-sm font-medium">
                    {usageStats.usage.trial.used} / {usageStats.usage.trial.limit}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getProgressBarColor((usageStats.usage.trial.used / usageStats.usage.trial.limit) * 100)}`}
                    style={{ width: `${Math.min((usageStats.usage.trial.used / usageStats.usage.trial.limit) * 100, 100)}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {usageStats.usage.trial.remaining} trial scans remaining
                </p>
              </div>
            </div>
          )}

          {/* API Keys */}
          {usageStats.apiKeys.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">API Keys</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Usage
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {usageStats.apiKeys.map((key, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {key.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {key.usage_count} / {key.usage_limit === -1 ? 'Unlimited' : key.usage_limit}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(key.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recent Analyses */}
          {usageStats.recentAnalyses.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Recent Analyses</h3>
              <div className="space-y-3">
                {usageStats.recentAnalyses.map((analysis) => (
                  <div key={analysis.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {analysis.repository_url.split('/').slice(-2).join('/')} PR #{analysis.pr_number}
                      </p>
                      <p className="text-xs text-gray-500">{formatDate(analysis.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">Score: {analysis.quality_score}/100</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}