#!/usr/bin/env npx ts-node

/**
 * Test real DeepWiki analysis with local code search fallback
 * This will run actual DeepWiki analysis and use local search to find locations
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const TEST_PR = 'https://github.com/sindresorhus/ky/pull/700';

async function runRealAnalysis() {
  console.log('🚀 Testing DeepWiki Analysis with Local Code Search Fallback');
  console.log('=' .repeat(60));
  console.log(`PR: ${TEST_PR}`);
  console.log('=' .repeat(60));
  
  // Ensure repositories are cloned
  const cacheDir = '/tmp/codequal-repos';
  const mainRepo = path.join(cacheDir, 'sindresorhus-ky');
  const prRepo = path.join(cacheDir, 'sindresorhus-ky-pr-700');
  
  if (!fs.existsSync(mainRepo) || !fs.existsSync(prRepo)) {
    console.log('⚠️  Repositories not found, cloning...');
    execSync(`mkdir -p ${cacheDir}`);
    
    if (!fs.existsSync(mainRepo)) {
      execSync(`git clone https://github.com/sindresorhus/ky ${mainRepo}`, { stdio: 'inherit' });
    }
    
    if (!fs.existsSync(prRepo)) {
      execSync(`git clone https://github.com/sindresorhus/ky ${prRepo}`, { stdio: 'inherit' });
      execSync(`cd ${prRepo} && git fetch origin pull/700/head:pr-700 && git checkout pr-700`, { stdio: 'inherit' });
    }
  }
  
  console.log('\n📊 Running Real DeepWiki Analysis with Local Search Fallback...\n');
  
  // Run the manual validator with real DeepWiki
  const command = `USE_DEEPWIKI_MOCK=false DEEPWIKI_API_URL=http://localhost:8001 DEEPWIKI_API_KEY=dw-key-e48329b6c05b4a36a18d65af21ac3c2f timeout 120 npx ts-node src/standard/tests/regression/manual-pr-validator.ts ${TEST_PR}`;
  
  try {
    execSync(command, {
      stdio: 'inherit',
      cwd: '/Users/alpinro/Code Prjects/codequal/packages/agents',
      env: {
        ...process.env,
        USE_DEEPWIKI_MOCK: 'false',
        DEEPWIKI_API_URL: 'http://localhost:8001',
        DEEPWIKI_API_KEY: 'dw-key-e48329b6c05b4a36a18d65af21ac3c2f',
        ENABLE_LOCAL_SEARCH: 'true'
      }
    });
    
    // Check if report was generated
    const reportDir = '/Users/alpinro/Code Prjects/codequal/packages/agents/test-outputs/manual-validation';
    const files = fs.readdirSync(reportDir);
    const latestReport = files
      .filter(f => f.includes('sindresorhus-ky-pr700') && f.endsWith('.html'))
      .sort()
      .pop();
    
    if (latestReport) {
      const reportPath = path.join(reportDir, latestReport);
      console.log(`\n✅ Report generated: ${reportPath}`);
      
      // Open in browser
      execSync(`open "${reportPath}"`);
      console.log('📊 Report opened in browser');
      
      // Check for location data in JSON
      const jsonReport = reportPath.replace('.html', '.json');
      if (fs.existsSync(jsonReport)) {
        const data = JSON.parse(fs.readFileSync(jsonReport, 'utf8'));
        
        // Count issues with locations
        let totalIssues = 0;
        let issuesWithLocations = 0;
        
        ['prNewIssues', 'prChangedIssues', 'unchangedIssues'].forEach(category => {
          if (data[category] && Array.isArray(data[category])) {
            data[category].forEach((issue: any) => {
              totalIssues++;
              if (issue.location && issue.location.file !== 'unknown') {
                issuesWithLocations++;
              } else if (issue.file && issue.file !== 'unknown') {
                issuesWithLocations++;
              }
            });
          }
        });
        
        console.log('\n📊 Location Statistics:');
        console.log(`Total Issues: ${totalIssues}`);
        console.log(`Issues with Locations: ${issuesWithLocations}`);
        console.log(`Success Rate: ${totalIssues > 0 ? (issuesWithLocations / totalIssues * 100).toFixed(1) : 0}%`);
        
        if (issuesWithLocations > 0) {
          console.log('\n✅ Local code search successfully recovered location data!');
        } else {
          console.log('\n⚠️  No locations found - may need further debugging');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
  }
}

// Run the test
runRealAnalysis().catch(console.error);