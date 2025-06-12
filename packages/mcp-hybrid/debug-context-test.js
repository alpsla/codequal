#!/usr/bin/env node

// Quick debug script to check skill gap logic
const mockFiles = [
  {
    path: 'src/components/Auth.tsx',
    content: `import React, { useState } from 'react';
export const Auth: React.FC = () => {
  const [user, setUser] = useState(null);
  // Missing error handling
  const login = async () => {
    const response = await fetch('/api/login');
    setUser(response);
  };
  return <div>Auth Component</div>;
};`,
    language: 'typescript',
    changeType: 'added'
  },
  {
    path: 'src/api/auth.ts',
    content: 'export const authenticate = async (credentials: any) => { return true; }',
    language: 'typescript',
    changeType: 'added'
  }
];

// Check for test files
const hasTestFiles = mockFiles.some(f => 
  f.path.includes('test') || 
  f.path.includes('spec') || 
  f.path.endsWith('.test.ts') ||
  f.path.endsWith('.test.js')
);

console.log('Has test files:', hasTestFiles); // Should be false

// Check for error handling
const hasErrorHandling = mockFiles.some(f => 
  f.content.includes('try') || 
  f.content.includes('catch') || 
  f.content.includes('.catch') ||
  f.content.includes('error')
);

console.log('Has error handling:', hasErrorHandling); // Should be false

// Check for async
const hasAsync = mockFiles.some(f => f.content.includes('async'));
console.log('Has async:', hasAsync); // Should be true

// Check if files were added
const hasAddedFiles = mockFiles.some(f => f.changeType === 'added');
console.log('Has added files:', hasAddedFiles); // Should be true

// Expected gaps
console.log('\nExpected skill gaps:');
if (!hasTestFiles && hasAddedFiles) {
  console.log('- Unit testing');
}
if (!hasErrorHandling && hasAsync) {
  console.log('- Error handling');
}
