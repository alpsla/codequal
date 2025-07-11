'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthenticatedLayout from '../../components/authenticated-layout';
import { fetchWithAuth } from '../../utils/api';
import { useBilling } from '../../contexts/billing-context';

interface ApiKey {
  id: string;
  name: string;
  key?: string; // Only returned on creation
  created_at: string;
  expires_at: string | null;
  usage_count: number;
  usage_limit: number | null;
}

export default function ApiKeysPage() {
  const router = useRouter();
  const { subscription, loading: billingLoading, refreshBilling } = useBilling();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKey, setNewKey] = useState<ApiKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasApiAccess = subscription && (
    subscription.tier === 'api' || 
    subscription.tier === 'individual' || 
    subscription.tier === 'team'
  );

  useEffect(() => {
    // Wait for billing data to load
    if (billingLoading) {
      return;
    }
    
    if (hasApiAccess) {
      loadApiKeys();
    } else {
      setLoading(false);
    }
  }, [hasApiAccess, billingLoading]);

  const loadApiKeys = async () => {
    try {
      const response = await fetchWithAuth('/api/keys');
      const data = await response.json();
      
      if (data.success) {
        setApiKeys(data.keys);
      }
    } catch (err) {
      console.error('Failed to load API keys:', err);
      setError('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  const createApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    setCreating(true);
    setError(null);
    
    try {
      const response = await fetchWithAuth('/api/keys', {
        method: 'POST',
        body: JSON.stringify({ name: newKeyName.trim() }),
      });

      const data = await response.json();
      
      if (data.success) {
        setNewKey(data.key);
        setNewKeyName('');
        await loadApiKeys();
      } else {
        setError(data.error || 'Failed to create API key');
      }
    } catch (err) {
      console.error('Failed to create API key:', err);
      setError('Failed to create API key');
    } finally {
      setCreating(false);
    }
  };

  const deleteApiKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) return;

    try {
      const response = await fetchWithAuth(`/api/keys/${keyId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        await loadApiKeys();
      }
    } catch (err) {
      console.error('Failed to delete API key:', err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('API key copied to clipboard!');
  };

  // Show loading state while checking subscription
  if (billingLoading) {
    return (
      <AuthenticatedLayout>
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  // Check access after billing data is loaded
  if (!hasApiAccess) {
    console.log('API Keys Page - No API access:', {
      subscription,
      hasApiAccess,
      tier: subscription?.tier
    });
    
    return (
      <AuthenticatedLayout>
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white shadow rounded-lg p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">API Access Required</h1>
              <p className="text-gray-600 mb-6">
                You need an API subscription or Individual/Team plan to access the API.
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Current plan: {subscription?.tier || 'none'}
              </p>
              <div className="space-x-2">
                <button
                  onClick={() => router.push('/subscribe')}
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                  View Plans
                </button>
                <button
                  onClick={() => refreshBilling()}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Refresh Status
                </button>
              </div>
            </div>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white shadow rounded-lg">
            <div className="p-6 border-b border-gray-200">
              <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
              <p className="mt-2 text-sm text-gray-600">
                Manage your API keys for programmatic access to CodeQual.
              </p>
            </div>

            {/* New key notification */}
            {newKey && (
              <div className="p-4 bg-green-50 border-b border-green-200">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-medium text-green-800">
                      API Key Created Successfully
                    </h3>
                    <p className="mt-1 text-sm text-green-700">
                      Save this key now. You won't be able to see it again!
                    </p>
                    <div className="mt-3 p-3 bg-white rounded border border-green-300">
                      <code className="text-xs break-all">{newKey.key}</code>
                    </div>
                    <button
                      onClick={() => copyToClipboard(newKey.key!)}
                      className="mt-2 text-sm text-green-600 hover:text-green-500"
                    >
                      Copy to clipboard
                    </button>
                    <button
                      onClick={() => setNewKey(null)}
                      className="mt-2 ml-4 text-sm text-gray-600 hover:text-gray-500"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Create new key form */}
            <div className="p-6 border-b border-gray-200">
              <form onSubmit={createApiKey} className="flex gap-4">
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="API key name (e.g., Production Server)"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
                <button
                  type="submit"
                  disabled={creating || !newKeyName.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
                >
                  {creating ? 'Creating...' : 'Create API Key'}
                </button>
              </form>
              {error && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
              )}
            </div>

            {/* API Keys list */}
            <div className="p-6">
              {loading ? (
                <p className="text-gray-500">Loading API keys...</p>
              ) : apiKeys.length === 0 ? (
                <p className="text-gray-500">No API keys yet. Create one above to get started.</p>
              ) : (
                <div className="space-y-4">
                  {apiKeys.map((key) => (
                    <div key={key.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">{key.name}</h3>
                          <p className="mt-1 text-xs text-gray-500">
                            Created: {new Date(key.created_at).toLocaleDateString()}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            Usage: {key.usage_count} calls
                            {key.usage_limit && ` / ${key.usage_limit} limit`}
                          </p>
                        </div>
                        <button
                          onClick={() => deleteApiKey(key.id)}
                          className="text-sm text-red-600 hover:text-red-500"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* API Usage Info */}
            <div className="p-6 bg-gray-50 rounded-b-lg">
              <h3 className="text-sm font-medium text-gray-900 mb-2">API Usage Limits</h3>
              <div className="text-sm text-gray-600">
                {subscription?.tier === 'api' && (
                  <p>API Plan: 500 API calls per month</p>
                )}
                {subscription?.tier === 'individual' && (
                  <p>Individual Plan: 1,000 API calls per month + unlimited web scans</p>
                )}
                {subscription?.tier === 'team' && (
                  <p>Team Plan: Unlimited API calls + unlimited web scans</p>
                )}
              </div>
              
              <h3 className="text-sm font-medium text-gray-900 mt-4 mb-2">Quick Start</h3>
              <pre className="text-xs bg-gray-100 p-3 rounded overflow-x-auto">
{`# Example API usage
curl -X POST http://localhost:3001/v1/analyze-pr \\
  -H "X-API-Key: your-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{"repositoryUrl": "https://github.com/owner/repo/pull/123"}'`}
              </pre>
              
              <p className="mt-4 text-sm">
                <a href="/api-docs" className="text-indigo-600 hover:text-indigo-500">
                  View full API documentation →
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}