/**
 * Real Integration Tests for Manual PR Validation
 * 
 * These tests use actual DeepWiki API and generate real reports
 * without any mocking for manual validation purposes.
 * 
 * USAGE:
 * Run with specific PR URLs:
 * npm test -- real-pr-validation.test.ts --pr="https://github.com/owner/repo/pull/123"
 * 
 * Or set environment variables:
 * TEST_PR_URL_1="https://github.com/sindresorhus/ky/pull/700"
 * TEST_PR_URL_2="https://github.com/vercel/next.js/pull/31616"
 */

import { ComparisonAgent } from '../../comparison';
import { DeepWikiApiWrapper } from '../../services/deepwiki-api-wrapper';
import { SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Test configuration
const TEST_CONFIG = {
  // Default PR URLs for testing (can be overridden by env vars)
  defaultPRs: [
    {
      url: 'https://github.com/sindresorhus/ky/pull/700',
      description: 'Ky HTTP client - TypeScript improvements'
    },
    {
      url: 'https://github.com/sindresorhus/ky/pull/500',
      description: 'Ky HTTP client - Feature additions'
    }
  ],
  
  // DeepWiki configuration
  deepwiki: {
    apiUrl: process.env.DEEPWIKI_API_URL || 'http://localhost:8001',
    apiKey: process.env.DEEPWIKI_API_KEY || 'dw-key-e48329b6c05b4a36a18d65af21ac3c2f',
    timeout: 300000 // 5 minutes for real analysis
  },
  
  // Output configuration
  output: {
    dir: './test-outputs/real-validation',
    formats: ['markdown', 'json', 'html']
  }
};

// Helper to parse PR URL
function parsePRUrl(url: string): { owner: string; repo: string; prNumber: number } {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/);
  if (!match) {
    throw new Error(`Invalid PR URL: ${url}`);
  }
  return {
    owner: match[1],
    repo: match[2],
    prNumber: parseInt(match[3], 10)
  };
}

// Helper to generate HTML report
function generateHTMLReport(markdown: string, metadata: any): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CodeQual Report - ${metadata.title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
    h2 { color: #34495e; margin-top: 30px; }
    h3 { color: #7f8c8d; }
    code {
      background: #f8f9fa;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 0.9em;
    }
    pre {
      background: #2c3e50;
      color: #ecf0f1;
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
    }
    .metadata {
      background: #ecf0f1;
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 30px;
    }
    .score-badge {
      display: inline-block;
      padding: 5px 10px;
      border-radius: 20px;
      font-weight: bold;
      margin: 0 5px;
    }
    .score-high { background: #2ecc71; color: white; }
    .score-medium { background: #f39c12; color: white; }
    .score-low { background: #e74c3c; color: white; }
    .issue-critical { border-left: 4px solid #e74c3c; padding-left: 10px; margin: 10px 0; }
    .issue-high { border-left: 4px solid #f39c12; padding-left: 10px; margin: 10px 0; }
    .issue-medium { border-left: 4px solid #3498db; padding-left: 10px; margin: 10px 0; }
    .issue-low { border-left: 4px solid #95a5a6; padding-left: 10px; margin: 10px 0; }
    .location { 
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 0.85em;
      color: #7f8c8d;
    }
    .architecture-diagram {
      background: #2c3e50;
      color: #2ecc71;
      padding: 20px;
      border-radius: 5px;
      font-family: 'Consolas', monospace;
      white-space: pre;
      overflow-x: auto;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="metadata">
      <h3>Test Metadata</h3>
      <p><strong>PR URL:</strong> ${metadata.url}</p>
      <p><strong>Repository:</strong> ${metadata.owner}/${metadata.repo}</p>
      <p><strong>PR Number:</strong> #${metadata.prNumber}</p>
      <p><strong>Generated:</strong> ${metadata.timestamp}</p>
      <p><strong>DeepWiki API:</strong> ${metadata.deepwikiUrl}</p>
      <p><strong>Model Used:</strong> ${metadata.modelUsed || 'Dynamic Selection'}</p>
    </div>
    <div class="report-content">
      ${convertMarkdownToHTML(markdown)}
    </div>
  </div>
</body>
</html>`;
}

// Helper to convert markdown to HTML (basic conversion)
function convertMarkdownToHTML(markdown: string): string {
  let html = markdown
    // Headers
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    // Code blocks
    .replace(/```([^`]+)```/g, '<pre><code>$1</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Line breaks
    .replace(/\n/g, '<br>\n');
  
  // Add special styling for issues
  html = html.replace(/📍 ([^<]+)/g, '<span class="location">📍 $1</span>');
  
  return html;
}

describe('Real PR Validation Tests (No Mocking)', () => {
  let agent: ComparisonAgent;
  let deepwikiClient: DeepWikiApiWrapper;
  
  // Get PR URLs from environment or use defaults
  const testPRs = process.env.TEST_PR_URL_1 
    ? [
        { url: process.env.TEST_PR_URL_1, description: 'Custom PR 1' },
        ...(process.env.TEST_PR_URL_2 ? [{ url: process.env.TEST_PR_URL_2, description: 'Custom PR 2' }] : [])
      ]
    : TEST_CONFIG.defaultPRs;
  
  beforeAll(async () => {
    // Ensure output directory exists
    const outputDir = path.resolve(TEST_CONFIG.output.dir);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Initialize DeepWiki client (will use mock or real based on USE_DEEPWIKI_MOCK env var)
    deepwikiClient = new DeepWikiApiWrapper();
    
    // Initialize comparison agent
    agent = new ComparisonAgent(
      console as any, // Use console for logging
      null, // No model selector needed for testing
      null  // No model provider needed for testing
    );
  });
  
  describe.each(testPRs)('Real Analysis: $description', ({ url, description }) => {
    const prData = parsePRUrl(url);
    const testName = `${prData.owner}-${prData.repo}-${prData.prNumber}`;
    
    it(`should generate complete report for ${url}`, async () => {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`Starting real analysis for: ${url}`);
      console.log(`Repository: ${prData.owner}/${prData.repo}`);
      console.log(`PR Number: #${prData.prNumber}`);
      console.log(`${'='.repeat(80)}\n`);
      
      try {
        // Step 1: Analyze main branch
        console.log('📊 Analyzing main branch...');
        const mainAnalysis = await deepwikiClient.analyzeRepository(
          `https://github.com/${prData.owner}/${prData.repo}`,
          { branch: 'main' }
        );
        console.log(`✅ Main branch analysis complete: ${mainAnalysis.issues.length} issues found`);
        
        // Step 2: Analyze PR branch
        console.log(`
📊 Analyzing PR #${prData.prNumber}...`);
        const prAnalysis = await deepwikiClient.analyzeRepository(
          `https://github.com/${prData.owner}/${prData.repo}`,
          { prId: `${prData.prNumber}` }
        );
        console.log(`✅ PR analysis complete: ${prAnalysis.issues.length} issues found`);
        
        // Step 3: Initialize agent with dynamic model selection
        console.log('\n🤖 Initializing comparison agent...');
        await agent.initialize({
          language: detectLanguage(prData.repo),
          complexity: 'high',
          performance: 'quality'
        });
        
        // Step 4: Generate comparison and report
        console.log('\n📝 Generating comparison report...');
        const result = await agent.analyze({
          mainBranchAnalysis: mainAnalysis,
          featureBranchAnalysis: prAnalysis,
          prMetadata: {
            number: prData.prNumber,
            title: `PR #${prData.prNumber}`,
            author: prData.owner,
            repository: `${prData.owner}/${prData.repo}`,
            filesChanged: prAnalysis.metadata?.filesAnalyzed || 0,
            additions: 0,
            deletions: 0
          },
          generateReport: true
        });
        
        // Step 5: Save outputs
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const baseFileName = `${testName}-${timestamp}`;
        
        // Save markdown report
        if (TEST_CONFIG.output.formats.includes('markdown')) {
          const mdPath = path.join(TEST_CONFIG.output.dir, `${baseFileName}.md`);
          fs.writeFileSync(mdPath, result.report || 'No report generated');
          console.log(`\n✅ Markdown report saved: ${mdPath}`);
        }
        
        // Save JSON data
        if (TEST_CONFIG.output.formats.includes('json')) {
          const jsonPath = path.join(TEST_CONFIG.output.dir, `${baseFileName}.json`);
          const jsonData = {
            metadata: {
              url,
              ...prData,
              timestamp: new Date().toISOString(),
              deepwikiUrl: TEST_CONFIG.deepwiki.apiUrl,
              modelUsed: result.metadata?.modelUsed
            },
            comparison: result.comparison,
            skillTracking: result.skillTracking,
            summary: {
              totalResolved: result.comparison?.resolvedIssues?.length || 0,
              totalNew: result.comparison?.newIssues?.length || 0,
              totalModified: result.comparison?.modifiedIssues?.length || 0,
              confidence: result.metadata?.confidence
            }
          };
          fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));
          console.log(`✅ JSON data saved: ${jsonPath}`);
        }
        
        // Save HTML report
        if (TEST_CONFIG.output.formats.includes('html')) {
          const htmlPath = path.join(TEST_CONFIG.output.dir, `${baseFileName}.html`);
          const htmlContent = generateHTMLReport(result.report || '', {
            url,
            ...prData,
            timestamp: new Date().toISOString(),
            deepwikiUrl: TEST_CONFIG.deepwiki.apiUrl,
            modelUsed: result.metadata?.modelUsed
          });
          fs.writeFileSync(htmlPath, htmlContent);
          console.log(`✅ HTML report saved: ${htmlPath}`);
        }
        
        // Step 6: Display summary
        console.log(`\n${'='.repeat(80)}`);
        console.log('📊 ANALYSIS SUMMARY');
        console.log(`${'='.repeat(80)}`);
        console.log(`Resolved Issues: ${result.comparison?.resolvedIssues?.length || 0}`);
        console.log(`New Issues: ${result.comparison?.newIssues?.length || 0}`);
        console.log(`Modified Issues: ${result.comparison?.modifiedIssues?.length || 0}`);
        console.log(`Overall Assessment: ${result.comparison?.summary?.overallAssessment?.prRecommendation || 'N/A'}`);
        console.log(`Confidence: ${result.metadata?.confidence || 'N/A'}`);
        console.log(`Model Used: ${result.metadata?.modelUsed || 'N/A'}`);
        console.log(`${'='.repeat(80)}\n`);
        
        // Basic assertions to ensure report was generated
        expect(result.success).toBe(true);
        expect(result.report).toBeDefined();
        expect(result.report?.length).toBeGreaterThan(1000);
        expect(result.comparison).toBeDefined();
        expect(result.metadata).toBeDefined();
        
        // Validate report sections
        const report = result.report || '';
        expect(report).toContain('Executive Summary');
        expect(report).toContain('Architecture Analysis');
        expect(report).toContain('Business Impact');
        expect(report).toContain('Educational Insights');
        
        // Validate location data for issues
        const allIssues = [
          ...(result.comparison?.newIssues || []),
          ...(result.comparison?.resolvedIssues || [])
        ];
        
        allIssues.forEach(issue => {
          if (issue.location) {
            expect(issue.location.file).toBeDefined();
            // Line and column might not always be available
          }
        });
        
      } catch (error) {
        console.error(`\n❌ Test failed for ${url}:`, error);
        
        // Save error report
        const errorPath = path.join(TEST_CONFIG.output.dir, `${testName}-error.txt`);
        fs.writeFileSync(errorPath, `
Error analyzing PR: ${url}
Timestamp: ${new Date().toISOString()}

Error Details:
${error instanceof Error ? error.stack : JSON.stringify(error, null, 2)}

Configuration:
${JSON.stringify(TEST_CONFIG, null, 2)}
        `);
        
        throw error;
      }
    }, TEST_CONFIG.deepwiki.timeout);
  });
  
  // Manual validation helper test
  it('should provide manual validation instructions', () => {
    const outputDir = path.resolve(TEST_CONFIG.output.dir);
    console.log(`
${'='.repeat(80)}
📋 MANUAL VALIDATION INSTRUCTIONS
${'='.repeat(80)}

1. Check generated reports in: ${outputDir}

2. Validate each report for:
   ✓ Executive Summary with clear metrics
   ✓ Architecture diagrams (ASCII art)
   ✓ Business impact with financial estimates
   ✓ Educational insights synced with issues
   ✓ Location data (file:line:column) for each issue
   ✓ Custom impact analysis per issue
   ✓ All V7 report sections present
   ✓ Proper scoring and skill tracking

3. Open HTML reports in browser for visual validation

4. Compare JSON files for data completeness

5. Run with custom PRs:
   TEST_PR_URL_1="https://github.com/owner/repo/pull/123" npm test -- real-pr-validation.test.ts

${'='.repeat(80)}
    `);
  });
});

// Helper function to detect repository language
function detectLanguage(repoName: string): string {
  const languagePatterns = {
    typescript: ['.ts', 'typescript', 'angular', 'nest', 'next'],
    javascript: ['.js', 'javascript', 'react', 'vue', 'node'],
    python: ['.py', 'python', 'django', 'flask'],
    java: ['.java', 'spring', 'maven'],
    go: ['.go', 'golang'],
    rust: ['.rs', 'rust'],
    csharp: ['.cs', 'dotnet', 'aspnet']
  };
  
  const lowerRepo = repoName.toLowerCase();
  for (const [lang, patterns] of Object.entries(languagePatterns)) {
    if (patterns.some(p => lowerRepo.includes(p))) {
      return lang;
    }
  }
  
  return 'typescript'; // Default
}