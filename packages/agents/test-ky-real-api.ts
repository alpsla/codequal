import { DeepWikiApiWrapper } from './dist/standard/services/deepwiki-api-wrapper';
import * as fs from 'fs';

async function testKyRepositoryReal() {
  console.log('🚀 Starting REAL DeepWiki analysis of ky repository...');
  console.log('Repository: https://github.com/sindresorhus/ky');
  console.log('Mode: USE_DEEPWIKI_MOCK=false (Real API)');
  console.log('API URL:', process.env.DEEPWIKI_API_URL || 'http://localhost:8001');
  console.log('');
  
  try {
    // Initialize service
    const deepwikiApi = new DeepWikiApiWrapper();
    
    // Run analysis on main branch
    console.log('📊 Analyzing main branch with REAL DeepWiki...');
    const startTime = Date.now();
    
    const mainAnalysis = await deepwikiApi.analyzeRepository('https://github.com/sindresorhus/ky', {
      branch: 'main'
    });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('✅ Analysis complete in', duration, 'seconds');
    console.log('');
    
    // Check results
    console.log('📋 Analysis Results:');
    console.log('├─ Total issues found:', mainAnalysis.issues.length);
    console.log('├─ Response type:', typeof mainAnalysis);
    console.log('├─ Has issues array:', Array.isArray(mainAnalysis.issues));
    
    // Analyze issue quality
    if (mainAnalysis.issues.length > 0) {
      console.log('');
      console.log('🔍 Issue Quality Check:');
      
      const withLocation = mainAnalysis.issues.filter(i => i.location && i.location.file && i.location.file !== 'Unknown location');
      const withUnknownLocation = mainAnalysis.issues.filter(i => !i.location || i.location.file === 'Unknown location');
      const withRecommendation = mainAnalysis.issues.filter(i => i.recommendation);
      
      console.log('├─ Issues with valid location:', withLocation.length, '/', mainAnalysis.issues.length);
      console.log('├─ Issues with unknown location:', withUnknownLocation.length, withUnknownLocation.length > 0 ? '❌ BUG-068 DETECTED' : '✅');
      console.log('├─ Issues with recommendations:', withRecommendation.length);
      
      // Sample first 3 issues
      console.log('');
      console.log('📝 Sample Issues (first 3):');
      mainAnalysis.issues.slice(0, 3).forEach((issue, i) => {
        console.log(`\n[${i + 1}] ${issue.title || 'Untitled'}`);
        console.log('  Severity:', issue.severity || 'undefined');
        console.log('  Category:', issue.category || 'undefined');
        console.log('  Location:', issue.location ? `${issue.location.file}:${issue.location.line || '?'}` : 'Unknown');
        console.log('  Has recommendation:', issue.recommendation ? 'Yes' : 'No');
      });
    }
    
    // Save raw response for debugging
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const rawPath = `ky-real-analysis-raw-${timestamp}.json`;
    fs.writeFileSync(rawPath, JSON.stringify(mainAnalysis, null, 2));
    
    console.log('');
    console.log('💾 Raw response saved to:', rawPath);
    
    // Bug detection summary
    console.log('');
    console.log('🐛 Bug Detection Summary:');
    const bugs = {
      'BUG-068 (Unknown locations)': mainAnalysis.issues.some(i => !i.location || i.location.file === 'Unknown location'),
      'BUG-082 (V8 Format Issues)': false, // Check after generating report
    };
    
    Object.entries(bugs).forEach(([bug, detected]) => {
      console.log(`├─ ${bug}: ${detected ? '❌ DETECTED' : '✅ OK'}`);
    });
    
    return {
      success: true,
      issues: mainAnalysis.issues.length,
      duration,
      rawPath
    };
    
  } catch (error: any) {
    console.error('❌ Analysis failed:', error.message);
    if (error.message.includes('ECONNREFUSED')) {
      console.error('');
      console.error('⚠️  DeepWiki connection failed. Please ensure:');
      console.error('1. kubectl port-forward is running:');
      console.error('   kubectl port-forward -n codequal-dev deployment/deepwiki 8001:8001');
      console.error('2. DeepWiki pod is running:');
      console.error('   kubectl get pods -n codequal-dev -l app=deepwiki');
    }
    return { success: false, error: error.message };
  }
}

testKyRepositoryReal().then(result => {
  process.exit(result.success ? 0 : 1);
});