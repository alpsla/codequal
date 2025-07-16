'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { fetchWithAuth } from '../../../utils/api';

export default function ReportPage() {
  const params = useParams();
  const reportId = params.reportId as string;
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReport();
  }, [reportId]);

  const fetchReport = async () => {
    try {
      const response = await fetchWithAuth(`/api/analysis/${reportId}/html`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Report not found');
        } else {
          setError('Failed to load report');
        }
        return;
      }

      const html = await response.text();
      setHtmlContent(html);
    } catch (err) {
      setError('Failed to load report');
      console.error('Error fetching report:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading report...</p>
        </div>
      </div>
    );
  }

  if (error || !htmlContent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-4xl mb-4">
            <i className="fas fa-exclamation-circle"></i>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600">{error || 'Report not found'}</p>
          <a 
            href="/dashboard" 
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <i className="fas fa-arrow-left mr-2"></i>
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="report-container"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}