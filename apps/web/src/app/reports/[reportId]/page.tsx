'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AuthenticatedLayout from '../../../components/authenticated-layout';
import { fetchWithAuth } from '../../../utils/api';

interface Report {
  id: string;
  repository_url: string;
  pr_number?: number;
  analysis_type: string;
  status: string;
  created_at: string;
  summary?: {
    filesAnalyzed: number;
    issuesFound: number;
    codeQualityScore: number;
    recommendations: string[];
  };
  details?: any;
}

export default function ReportPage() {
  const params = useParams();
  const reportId = params.reportId as string;
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReport();
  }, [reportId]);

  const fetchReport = async () => {
    try {
      const response = await fetchWithAuth(`/api/reports/${reportId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Report not found');
        } else {
          setError('Failed to load report');
        }
        return;
      }

      const data = await response.json();
      setReport(data.report);
    } catch (err) {
      setError('Failed to load report');
      console.error('Error fetching report:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  if (error || !report) {
    return (
      <AuthenticatedLayout>
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white shadow rounded-lg p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
              <p className="text-red-600">{error || 'Report not found'}</p>
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
          {/* Report Header */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Analysis Report</h1>
            
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Repository</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <a href={report.repository_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-500">
                    {report.repository_url.replace('https://github.com/', '')}
                  </a>
                </dd>
              </div>
              
              {report.pr_number && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Pull Request</dt>
                  <dd className="mt-1 text-sm text-gray-900">#{report.pr_number}</dd>
                </div>
              )}
              
              <div>
                <dt className="text-sm font-medium text-gray-500">Analysis Type</dt>
                <dd className="mt-1 text-sm text-gray-900 capitalize">{report.analysis_type}</dd>
              </div>
              
              <div>
                <dt className="text-sm font-medium text-gray-500">Date</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(report.created_at).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </div>

          {/* Summary Section */}
          {report.summary && (
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Summary</h2>
              
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 mb-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-indigo-600">{report.summary.codeQualityScore}%</p>
                  <p className="text-sm text-gray-500 mt-1">Code Quality Score</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-900">{report.summary.filesAnalyzed}</p>
                  <p className="text-sm text-gray-500 mt-1">Files Analyzed</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-yellow-600">{report.summary.issuesFound}</p>
                  <p className="text-sm text-gray-500 mt-1">Issues Found</p>
                </div>
              </div>

              {report.summary.recommendations && report.summary.recommendations.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Key Recommendations</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {report.summary.recommendations.map((rec, index) => (
                      <li key={index} className="text-sm text-gray-600">{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Detailed Results */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Detailed Analysis</h2>
            
            {/* This would be replaced with actual formatted report content */}
            <div className="prose max-w-none">
              <pre className="text-sm text-gray-700 overflow-auto bg-gray-50 p-4 rounded">
                {JSON.stringify(report.details || report, null, 2)}
              </pre>
            </div>

            {/* Export Options */}
            <div className="mt-6 flex space-x-4">
              <button
                onClick={() => window.open(`/api/reports/${reportId}/export/markdown`, '_blank')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Export as Markdown
              </button>
              <button
                onClick={() => window.open(`/api/reports/${reportId}/export/json`, '_blank')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Export as JSON
              </button>
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}