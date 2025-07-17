'use client';

import { useEffect, useState } from 'react';

interface ScanProgressProps {
  analysisId: string;
  onComplete?: (reportUrl: string) => void;
}

export default function ScanProgress({ analysisId, onComplete }: ScanProgressProps) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Initializing analysis...');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    // Simulate progress stages
    const stages = [
      { progress: 10, status: 'Initializing analysis...' },
      { progress: 25, status: 'Cloning repository...' },
      { progress: 40, status: 'Scanning code for issues...' },
      { progress: 60, status: 'Running security checks...' },
      { progress: 80, status: 'Analyzing code quality...' },
      { progress: 95, status: 'Generating report...' },
      { progress: 100, status: 'Analysis complete!' }
    ];

    let currentStage = 0;
    const interval = setInterval(() => {
      if (currentStage < stages.length) {
        setProgress(stages[currentStage].progress);
        setStatus(stages[currentStage].status);
        
        if (stages[currentStage].progress === 100) {
          setIsComplete(true);
          if (onComplete) {
            // In a real app, this would come from the API
            onComplete(`/reports/${analysisId}`);
          }
        }
        
        currentStage++;
      } else {
        clearInterval(interval);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [analysisId, onComplete]);

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="text-center">
          {/* Spinner */}
          {!isComplete && (
            <div className="mx-auto w-16 h-16 mb-4">
              <svg className="animate-spin text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          )}
          
          {/* Success Icon */}
          {isComplete && (
            <div className="mx-auto w-16 h-16 mb-4">
              <svg className="text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
          )}
          
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {isComplete ? 'Analysis Complete!' : 'Analyzing Repository'}
          </h3>
          
          <p className="text-sm text-gray-600 mb-6">{status}</p>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div 
              className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <p className="text-sm text-gray-500">{progress}% complete</p>
        </div>
      </div>
    </div>
  );
}