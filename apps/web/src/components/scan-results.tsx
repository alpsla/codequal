'use client';

interface ScanResultsProps {
  result: {
    message: string;
    repositoryUrl: string;
    jobId: string;
    status: string;
    estimatedTime?: number;
    reportUrl?: string;
  };
}

export default function ScanResults({ result }: ScanResultsProps) {
  return (
    <div className="mt-6 space-y-4">
      {/* Success Message */}
      <div className="p-4 bg-green-50 border border-green-200 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-green-800">
              Analysis Started Successfully!
            </h3>
            <p className="mt-2 text-sm text-green-700">
              Your repository is being analyzed. This typically takes 3-5 minutes.
            </p>
          </div>
        </div>
      </div>

      {/* Analysis Details */}
      <div className="bg-white shadow rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Analysis Details</h4>
        
        <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">Repository</dt>
            <dd className="mt-1 text-sm text-gray-900">
              <a href={result.repositoryUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-500">
                {result.repositoryUrl.replace('https://github.com/', '')}
              </a>
            </dd>
          </div>
          
          <div>
            <dt className="text-sm font-medium text-gray-500">Job ID</dt>
            <dd className="mt-1 text-sm text-gray-900 font-mono">{result.jobId}</dd>
          </div>
          
          <div>
            <dt className="text-sm font-medium text-gray-500">Status</dt>
            <dd className="mt-1">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                {result.status === 'queued' ? 'In Queue' : result.status}
              </span>
            </dd>
          </div>
          
          {result.estimatedTime && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Estimated Time</dt>
              <dd className="mt-1 text-sm text-gray-900">
                ~{Math.round(result.estimatedTime / 60)} minutes
              </dd>
            </div>
          )}
        </dl>

        {/* Next Steps */}
        <div className="mt-6 p-4 bg-gray-50 rounded-md">
          <h5 className="text-sm font-medium text-gray-700 mb-2">What happens next?</h5>
          <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
            <li>We analyze your repository structure and code quality</li>
            <li>Generate insights about maintainability and best practices</li>
            <li>Create a comprehensive report with actionable recommendations</li>
          </ul>
        </div>

        {/* View Results Button */}
        <div className="mt-6">
          {result.reportUrl ? (
            <a
              href={result.reportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              View Analysis Report
            </a>
          ) : (
            <button
              disabled
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-400 bg-gray-50 cursor-not-allowed"
            >
              Report will be available when analysis completes...
            </button>
          )}
        </div>
      </div>
    </div>
  );
}