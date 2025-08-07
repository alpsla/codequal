#!/usr/bin/env node

/**
 * Real API Test with Timeout Handling and Fallback
 * 
 * This handles DeepWiki API timeouts gracefully and falls back
 * to cached or mock data when necessary.
 */

const { ComparisonAgent } = require('./dist/standard/comparison/comparison-agent');
const { DeepWikiService } = require('./dist/standard/services/deepwiki-service');
const { registerDeepWikiApi } = require('./dist/standard/services/deepwiki-api-wrapper');
const { deepWikiApiManager } = require('../../apps/api/dist/services/deepwiki-api-manager');
const { generateEnhancedMockAnalysis } = require('../../apps/api/dist/services/deepwiki-mock-enhanced');
const { createRedisCacheService } = require('./dist/standard/services/redis-cache.service');
const fs = require('fs');
const path = require('path');

// Configuration
const USE_REAL_API = process.env.USE_DEEPWIKI_MOCK !== 'true';
const API_TIMEOUT = 30000; // 30 seconds timeout
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const logger = {
  info: (msg, data) => console.log(`[INFO] ${msg}`, data ? JSON.stringify(data) : ''),
  error: (msg, data) => console.error(`[ERROR] ${msg}`, data || ''),
  warn: (msg, data) => console.warn(`[WARN] ${msg}`, data || ''),
  debug: (msg, data) => console.log(`[DEBUG] ${msg}`, data || '')
};

// Create a timeout promise
function createTimeoutPromise(ms) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`API call timed out after ${ms}ms`)), ms);
  });
}

// Wrapper for API calls with timeout
async function callWithTimeout(apiCall, timeout = API_TIMEOUT) {
  return Promise.race([
    apiCall,
    createTimeoutPromise(timeout)
  ]);
}

// Register DeepWiki API with timeout and fallback
registerDeepWikiApi({
  async analyzeRepository(repositoryUrl, options) {
    console.log(`\n📡 Calling DeepWiki API for: ${repositoryUrl}`);
    console.log(`   Branch: ${options?.branch || 'main'}`);
    console.log(`   Mode: ${USE_REAL_API ? 'REAL API' : 'MOCK'}`);
    
    if (!USE_REAL_API) {
      // Use mock directly if configured
      console.log('   Using MOCK data (USE_DEEPWIKI_MOCK=true)');
      const mockData = generateEnhancedMockAnalysis(repositoryUrl, options);
      return convertMockToStandard(mockData);
    }
    
    try {
      // Try real API with timeout
      console.log(`   Attempting REAL API call (timeout: ${API_TIMEOUT}ms)...`);
      
      const result = await callWithTimeout(
        deepWikiApiManager.analyzeRepository(repositoryUrl, options),
        API_TIMEOUT
      );
      
      console.log(`   ✅ REAL API responded successfully!`);
      console.log(`   Issues found: ${result.issues?.length || 0}`);
      
      return {
        issues: (result.issues || []).map(issue => ({
          id: issue.id || `DW-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          severity: (issue.severity || 'medium').toLowerCase(),
          category: issue.category || 'code-quality',
          type: issue.type || 'general',
          title: issue.title || issue.message || 'Issue detected',
          message: issue.message || issue.description || '',
          description: issue.description || issue.message || '',
          location: issue.location || { file: 'unknown', line: 0 },
          codeSnippet: issue.evidence?.snippet || issue.codeSnippet,
          suggestedFix: issue.remediation?.immediate || issue.suggestedFix,
          remediation: issue.remediation,
          recommendation: issue.recommendation,
          rule: issue.rule,
          cwe: issue.cwe || issue.CWE,
          cvss: issue.cvss,
          metadata: {
            ...issue.metadata,
            remediation: issue.remediation
          }
        })),
        scores: result.scores || {
          overall: 75,
          security: 70,
          performance: 80,
          maintainability: 85,
          testing: 75
        },
        metadata: {
          timestamp: new Date().toISOString(),
          tool_version: '4.0.0',
          duration_ms: result.metadata?.duration_ms || 15000,
          files_analyzed: result.metadata?.files_analyzed || 100,
          branch: options?.branch || 'main',
          total_lines: result.metadata?.total_lines || 10000,
          source: 'REAL_API'
        }
      };
      
    } catch (error) {
      if (error.message.includes('timed out')) {
        console.log(`   ⏱️ API call timed out after ${API_TIMEOUT}ms`);
        console.log(`   Falling back to MOCK data...`);
      } else {
        console.log(`   ❌ API error: ${error.message}`);
        console.log(`   Falling back to MOCK data...`);
      }
      
      // Fallback to mock data
      const mockData = generateEnhancedMockAnalysis(repositoryUrl, options);
      const result = convertMockToStandard(mockData);
      result.metadata.source = 'MOCK_FALLBACK';
      result.metadata.fallback_reason = error.message;
      
      console.log(`   ✅ Using MOCK data (${mockData.vulnerabilities.length} issues)`);
      return result;
    }
  }
});

// Convert mock data to standard format
function convertMockToStandard(mockData) {
  return {
    issues: mockData.vulnerabilities.map(v => ({
      id: v.id,
      severity: v.severity.toLowerCase(),
      category: v.category.toLowerCase().replace(' ', '-'),
      type: 'vulnerability',
      message: v.title,
      title: v.title,
      description: v.impact,
      location: v.location,
      codeSnippet: v.evidence?.snippet,
      suggestedFix: v.remediation?.immediate,
      remediation: v.remediation,
      metadata: {
        cwe: v.cwe?.id,
        cvss: v.cvss,
        remediation: v.remediation
      }
    })),
    scores: mockData.scores || {
      overall: 74,
      security: 72,
      performance: 78,
      maintainability: 76,
      testing: 71
    },
    metadata: {
      timestamp: new Date().toISOString(),
      tool_version: '4.0.0',
      duration_ms: 1000,
      files_analyzed: mockData.metadata?.files_analyzed || 250,
      branch: mockData.metadata?.branch || 'main',
      total_lines: mockData.metadata?.total_lines || 50000,
      source: 'MOCK'
    }
  };
}

async function generateReportWithTimeoutHandling() {
  try {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║     PR ANALYSIS WITH TIMEOUT HANDLING & FALLBACK              ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
    
    console.log('Configuration:');
    console.log(`  - API Mode: ${USE_REAL_API ? 'REAL (with fallback)' : 'MOCK'}`);
    console.log(`  - Timeout: ${API_TIMEOUT}ms`);
    console.log(`  - Redis: ${REDIS_URL}`);
    console.log(`  - Fallback: Enabled\n`);
    
    // Test Redis
    console.log('🔌 Testing Redis connection...');
    const cacheService = createRedisCacheService(REDIS_URL, logger);
    if (cacheService) {
      console.log('✅ Redis connected\n');
    } else {
      console.log('⚠️  Redis not available\n');
    }
    
    // Initialize services
    const deepWikiService = new DeepWikiService(logger, cacheService);
    const comparisonAgent = new ComparisonAgent(logger);
    
    // Use a smaller repository for faster response
    const repoUrl = 'https://github.com/sindresorhus/is-odd';
    const prNumber = 1234;
    
    console.log('📦 Repository:', repoUrl);
    console.log('📝 PR Number:', prNumber);
    console.log('👤 Author: Alex Johnson\n');
    
    await comparisonAgent.initialize({
      language: 'javascript',
      complexity: 'low',
      performance: 'balanced',
      rolePrompt: 'Expert JavaScript code reviewer'
    });
    
    // Analyze main branch
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Analyzing MAIN branch');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const mainStart = Date.now();
    const mainAnalysis = await deepWikiService.analyzeRepository(repoUrl, 'main');
    const mainDuration = ((Date.now() - mainStart) / 1000).toFixed(2);
    
    console.log(`\n✅ Main branch analyzed in ${mainDuration}s`);
    console.log(`   Issues: ${mainAnalysis.issues.length}`);
    console.log(`   Score: ${mainAnalysis.scores?.overall}`);
    console.log(`   Source: ${mainAnalysis.metadata?.source || 'Unknown'}`);
    
    // Analyze PR branch
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Analyzing PR branch');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const prStart = Date.now();
    const prAnalysis = await deepWikiService.analyzeRepository(repoUrl, `pr/${prNumber}`);
    const prDuration = ((Date.now() - prStart) / 1000).toFixed(2);
    
    console.log(`\n✅ PR branch analyzed in ${prDuration}s`);
    console.log(`   Issues: ${prAnalysis.issues.length}`);
    console.log(`   Score: ${prAnalysis.scores?.overall}`);
    console.log(`   Source: ${prAnalysis.metadata?.source || 'Unknown'}`);
    
    // Run comparison
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 Running Comprehensive Comparison');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const compareStart = Date.now();
    const result = await comparisonAgent.analyze({
      mainBranchAnalysis: mainAnalysis,
      featureBranchAnalysis: prAnalysis,
      prMetadata: {
        number: prNumber,
        title: 'Optimize isOdd function performance',
        description: `This PR optimizes the isOdd function:
        - Removes unnecessary type checking
        - Uses bitwise operations for 2x speed improvement
        - Adds comprehensive test coverage`,
        author: 'Alex Johnson',
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        repository_url: repoUrl,
        filesChanged: 3,
        linesAdded: 42,
        linesRemoved: 18
      },
      userProfile: {
        userId: 'alex-johnson',
        username: 'ajohnson',
        overallScore: 78,
        categoryScores: {
          security: 75,
          performance: 85,
          codeQuality: 78,
          architecture: 72,
          dependencies: 70,
          testing: 80
        }
      },
      generateReport: true,
      generatePRComment: true
    });
    
    const compareDuration = ((Date.now() - compareStart) / 1000).toFixed(2);
    console.log(`\n✅ Comparison completed in ${compareDuration}s`);
    
    // Display results
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    ANALYSIS RESULTS                         ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    
    if (result.summary) {
      console.log('\n📈 Issue Summary:');
      console.log(`   ✅ Resolved: ${result.summary.totalResolved}`);
      console.log(`   🆕 New: ${result.summary.totalNew}`);
      console.log(`   📝 Modified: ${result.summary.totalModified}`);
      console.log(`   ⏸️  Unchanged: ${result.summary.totalUnchanged}`);
      
      const hasCritical = result.newIssues?.some(i => i.issue?.severity === 'critical');
      const hasHigh = result.newIssues?.some(i => i.issue?.severity === 'high');
      
      console.log('\n🎯 PR Decision:');
      if (hasCritical) {
        console.log('   ❌ DECLINED - Critical issues');
      } else if (hasHigh) {
        console.log('   ⚠️  REVIEW REQUIRED - High issues');
      } else {
        console.log('   ✅ APPROVED - No blocking issues');
      }
    }
    
    // Save report
    if (result.report) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const reportsDir = path.join(__dirname, 'reports', 'timeout-handled');
      
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
      
      const reportPath = path.join(reportsDir, `pr-${prNumber}-${timestamp}.md`);
      fs.writeFileSync(reportPath, result.report);
      
      const finalPath = path.join(__dirname, 'REPORT-WITH-TIMEOUT-HANDLING.md');
      fs.writeFileSync(finalPath, result.report);
      
      console.log('\n📄 Report Files:');
      console.log(`   ✅ Saved: ${reportPath}`);
      console.log(`   ✅ Latest: REPORT-WITH-TIMEOUT-HANDLING.md`);
      
      // Check if Required Fix sections have actual code
      const hasCodeFixes = result.report.includes('// Check user authorization') ||
                          result.report.includes('// Use parameterized queries') ||
                          result.report.includes('// Sanitize') ||
                          result.report.includes('await db.query');
      
      console.log('\n✔️ Report Validation:');
      console.log(`   ${hasCodeFixes ? '✅' : '❌'} Contains actual code fixes`);
      
      const lines = result.report.split('\n');
      console.log(`   Lines: ${lines.length}`);
      console.log(`   Size: ${(result.report.length / 1024).toFixed(2)} KB`);
      
      // Preview with focus on Required Fix sections
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('              REPORT PREVIEW (Required Fix sections)        ');
      console.log('═══════════════════════════════════════════════════════════');
      
      // Find and display Required Fix sections
      const requiredFixLines = [];
      let inRequiredFix = false;
      let codeBlockCount = 0;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('**Required Fix:**')) {
          inRequiredFix = true;
          requiredFixLines.push('\n' + lines[i]);
          codeBlockCount = 0;
        } else if (inRequiredFix) {
          requiredFixLines.push(lines[i]);
          if (lines[i].startsWith('```')) {
            codeBlockCount++;
            if (codeBlockCount === 2) {
              inRequiredFix = false;
              requiredFixLines.push('');
            }
          }
        }
        
        if (requiredFixLines.length > 50) break;
      }
      
      if (requiredFixLines.length > 0) {
        console.log(requiredFixLines.join('\n'));
      } else {
        // Show first 50 lines if no Required Fix found
        console.log(lines.slice(0, 50).join('\n'));
      }
      
      console.log('\n... [See REPORT-WITH-TIMEOUT-HANDLING.md for full report]');
    }
    
    const totalTime = ((Date.now() - mainStart) / 1000).toFixed(2);
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                  ✅ GENERATION COMPLETE                     ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`⏱️  Total time: ${totalTime} seconds`);
    console.log(`🔌 API Used: ${mainAnalysis.metadata?.source === 'REAL_API' ? 'REAL' : 'MOCK/FALLBACK'}`);
    console.log(`💾 Redis: ${cacheService ? 'Enabled' : 'Disabled'}`);
    console.log(`📄 Report has actual code fixes: ${result.report?.includes('await db.query') ? 'YES ✅' : 'NO ❌'}`);
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
  }
  
  setTimeout(() => process.exit(0), 1000);
}

// Run
console.log('Starting PR analysis with timeout handling and fallback...\n');
generateReportWithTimeoutHandling();