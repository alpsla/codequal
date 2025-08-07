/**
 * Simple test to run real PR analysis via API
 */

import * as dotenv from 'dotenv';
dotenv.config();

const API_URL = 'http://localhost:3001';
const API_KEY = 'test_key';
const TEST_PR_URL = 'https://github.com/vercel/swr/pull/2950';
const TEST_REPO_URL = 'https://github.com/vercel/swr';
const TEST_PR_NUMBER = 2950;

// Add option to use quick mode for testing
const ANALYSIS_MODE = process.env.ANALYSIS_MODE || 'quick';

async function runAnalysis() {
  console.log('🚀 Starting PR analysis via API...\n');
  
  try {
    // Submit analysis request
    console.log(`📋 Submitting analysis for PR: ${TEST_PR_URL}`);
    const response = await fetch(`${API_URL}/v1/analyze-pr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify({
        repositoryUrl: TEST_REPO_URL,
        prNumber: TEST_PR_NUMBER,
        analysisMode: ANALYSIS_MODE as 'quick' | 'comprehensive' | 'deep'
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to submit analysis: ${response.status} - ${error}`);
    }
    
    const { analysisId } = await response.json();
    console.log(`✅ Analysis started with ID: ${analysisId}\n`);
    
    // Poll for results
    console.log('⏳ Waiting for analysis to complete...');
    let lastProgress = -1;
    let attempts = 0;
    const maxAttempts = 180; // 15 minutes
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5 seconds
      
      const statusResponse = await fetch(`${API_URL}/v1/analysis/${analysisId}`, {
        headers: { 'X-API-Key': API_KEY }
      });
      
      if (!statusResponse.ok) {
        throw new Error(`Failed to get status: ${statusResponse.status}`);
      }
      
      const status = await statusResponse.json();
      
      // Log progress changes
      if (status.progress !== lastProgress) {
        lastProgress = status.progress;
        console.log(`📊 Progress: ${status.progress}% - ${status.currentStep || status.status}`);
      }
      
      // Check if complete
      if (status.status === 'completed' || status.status === 'complete') {
        console.log('\n✅ Analysis completed!');
        
        if (status.result?.report) {
          // Debug: log the structure
          console.log('\n🔍 Report structure:', Object.keys(status.result.report));
          console.log('🔍 Report type:', typeof status.result.report);
          
          if (status.result.report.exports) {
            console.log('🔍 Exports:', Object.keys(status.result.report.exports));
          }
          if (status.result.report.fullReport?.exports) {
            console.log('🔍 Full Report Exports:', Object.keys(status.result.report.fullReport.exports));
          }
          
          // Save the report
          const fs = await import('fs/promises');
          const path = await import('path');
          const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
          const filename = `pr-${TEST_PR_NUMBER}-analysis-${timestamp}.md`;
          const filepath = path.join(__dirname, 'reports', filename);
          
          await fs.mkdir(path.dirname(filepath), { recursive: true });
          
          // Extract the markdown report from the result
          const markdownReport = status.result?.report?.fullReport?.exports?.markdownReport || 
                                status.result?.report?.markdownReport ||
                                status.result?.report || 
                                JSON.stringify(status.result, null, 2);
          await fs.writeFile(filepath, markdownReport);
          
          console.log(`\n📄 Report saved to: ${filepath}`);
          
          // Show preview
          console.log('\n📋 Report Preview:');
          console.log('='.repeat(60));
          const reportPreview = typeof markdownReport === 'string' 
            ? markdownReport.substring(0, 1500) + '...'
            : JSON.stringify(markdownReport, null, 2).substring(0, 1500) + '...';
          console.log(reportPreview);
          console.log('='.repeat(60));
          
          // Show summary
          if (status.result.overallScore !== undefined) {
            console.log(`\n📊 Overall Score: ${status.result.overallScore}/100`);
          }
          if (status.result.decision) {
            console.log(`🎯 Decision: ${status.result.decision}`);
          }
          if (status.result.comparison?.newIssues) {
            console.log(`🐛 New Issues Found: ${status.result.comparison.newIssues.length}`);
          }
        } else {
          console.log('\n⚠️  Analysis completed but no report available');
          console.log('Full response:', JSON.stringify(status, null, 2));
        }
        
        break;
      }
      
      if (status.status === 'failed') {
        throw new Error(`Analysis failed: ${status.error}`);
      }
      
      attempts++;
    }
    
    if (attempts >= maxAttempts) {
      console.error('\n❌ Analysis timed out after 15 minutes');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

// Run the test
runAnalysis().then(() => {
  console.log('\n✨ Test completed');
  process.exit(0);
}).catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});