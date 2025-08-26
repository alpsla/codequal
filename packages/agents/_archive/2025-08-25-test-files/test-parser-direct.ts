#!/usr/bin/env npx ts-node

const testResponse = `1. **Issue type:** Security  
   **Severity:** High  
   **Exact file path:** source/core/constants.ts  
   **Line number:** 10  
   **Description:** The supportsRequestStreams function uses a try-catch block that could potentially expose the application to unexpected errors.
   
2. **Issue type:** Performance  
   **Severity:** Medium  
   **Exact file path:** test/retry.ts  
   **Line number:** 8  
   **Description:** The retry logic in the test for handling 408 status codes does not implement a backoff strategy.`;

console.log('Testing pattern matching...\n');

const lines = testResponse.split('\n');

for (const line of lines) {
  console.log(`Line: "${line.substring(0, 50)}..."`);
  
  // Test the new pattern
  const match1 = line.match(/^(\d+)\.\s+\*\*Issue type:\*\*/i);
  if (match1) {
    console.log('  ✅ Matched Issue type pattern');
  }
  
  // Test old pattern
  const match2 = line.match(/^(\d+)\.\s+\*\*Title:\*\*/);
  if (match2) {
    console.log('  ✅ Matched Title pattern');
  }
  
  // Test severity
  const severityMatch = line.match(/\*\*Severity:\*\*\s*(\w+)/i);
  if (severityMatch) {
    console.log(`  ✅ Found severity: ${severityMatch[1]}`);
  }
  
  // Test file path
  const fileMatch = line.match(/\*\*Exact file path:\*\*\s*([^\n]+)/i);
  if (fileMatch) {
    console.log(`  ✅ Found file: ${fileMatch[1]}`);
  }
  
  // Test line number
  const lineMatch = line.match(/\*\*Line number:\*\*\s*(\d+)/i);
  if (lineMatch) {
    console.log(`  ✅ Found line: ${lineMatch[1]}`);
  }
}

// Now test the actual parsing logic
console.log('\n\nTesting full parse logic...\n');

const issues: any[] = [];
let currentIssue: any = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Check if this starts a new issue
  const issueStartMatch = line.match(/^(\d+)\.\s+\*\*Issue type:\*\*/i);
  
  if (issueStartMatch) {
    // Save previous issue if exists
    if (currentIssue) {
      issues.push(currentIssue);
    }
    
    // Start new issue
    currentIssue = {
      id: `issue-${issues.length + 1}`,
      severity: 'medium',
      category: 'code-quality',
      title: 'Issue',
      description: '',
      location: {
        file: 'unknown',
        line: 0
      }
    };
    
    console.log(`Started new issue #${issues.length + 1}`);
  } else if (currentIssue) {
    // Parse metadata for current issue
    const severityMatch = line.match(/\*\*Severity:\*\*\s*(\w+)/i);
    if (severityMatch) {
      currentIssue.severity = severityMatch[1].toLowerCase();
      console.log(`  Set severity: ${currentIssue.severity}`);
    }
    
    const fileMatch = line.match(/\*\*Exact file path:\*\*\s*([^\n]+)/i);
    if (fileMatch) {
      currentIssue.location.file = fileMatch[1].trim();
      console.log(`  Set file: ${currentIssue.location.file}`);
    }
    
    const lineMatch = line.match(/\*\*Line number:\*\*\s*(\d+)/i);
    if (lineMatch) {
      currentIssue.location.line = parseInt(lineMatch[1]);
      console.log(`  Set line: ${currentIssue.location.line}`);
    }
    
    const descMatch = line.match(/\*\*Description:\*\*\s*(.+)/i);
    if (descMatch) {
      currentIssue.description = descMatch[1].trim();
      console.log(`  Set description`);
    }
  }
}

// Add last issue
if (currentIssue) {
  issues.push(currentIssue);
}

console.log(`\n\nParsed ${issues.length} issues:`);
issues.forEach((issue, i) => {
  console.log(`\nIssue ${i + 1}:`);
  console.log(`  File: ${issue.location.file}`);
  console.log(`  Line: ${issue.location.line}`);
  console.log(`  Severity: ${issue.severity}`);
});