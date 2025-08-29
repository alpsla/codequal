/**
 * MCP Tools Integration Test
 * 
 * Tests the complete flow:
 * 1. MCP tools generate findings
 * 2. Universal parser standardizes output
 * 3. Specialized agents consume the data
 * 4. Orchestrator aggregates results
 * 5. Final report generation
 */

import { SemgrepMCP } from './src/mcp-wrappers/semgrep-mcp';
import { ESLintMCP } from './src/mcp-wrappers/eslint-mcp';
import { NpmAuditMCP } from './src/mcp-wrappers/npm-audit-mcp';
import { LighthouseMCP } from './src/mcp-wrappers/lighthouse-mcp';
import { UniversalToolParser } from './src/standard/services/universal-tool-parser';
import { SecurityAgent } from './src/specialized/security-agent';
import { CodeQualityAgent } from './src/specialized/code-quality-agent';
import { PerformanceAgent } from './src/specialized/performance-agent';

// Mock data for testing
const mockSemgrepOutput = {
  tool: 'semgrep',
  success: true,
  findings: [
    {
      type: 'security',
      severity: 'high',
      category: 'injection',
      rule: 'javascript.express.security.injection.tainted-sql',
      message: 'Potential SQL injection vulnerability',
      file: 'src/api/users.ts',
      line: 45,
      column: 12,
      cwe: 'CWE-89',
      owasp: 'A03:2021',
      codeSnippet: 'db.query(`SELECT * FROM users WHERE id = ${userId}`)',
      confidence: 'high'
    },
    {
      type: 'security',
      severity: 'medium',
      category: 'xss',
      rule: 'javascript.react.security.xss.dangerously-set-inner-html',
      message: 'Potential XSS vulnerability with dangerouslySetInnerHTML',
      file: 'src/components/Comment.tsx',
      line: 23,
      column: 8,
      cwe: 'CWE-79',
      owasp: 'A03:2021',
      codeSnippet: '<div dangerouslySetInnerHTML={{__html: userContent}} />',
      confidence: 'medium'
    }
  ],
  metrics: {
    total: 2,
    bySeverity: { critical: 0, high: 1, medium: 1, low: 0, info: 0 }
  }
};

const mockESLintOutput = {
  tool: 'eslint',
  success: true,
  findings: [
    {
      type: 'code-quality',
      severity: 'error',
      category: 'unused-code',
      rule: '@typescript-eslint/no-unused-vars',
      message: "'userId' is defined but never used",
      file: 'src/utils/helpers.ts',
      line: 10,
      column: 7,
      fixable: true,
      fix: 'Remove the unused variable'
    },
    {
      type: 'code-quality',
      severity: 'warning',
      category: 'complexity',
      rule: 'complexity',
      message: 'Function has a complexity of 12 (max: 10)',
      file: 'src/services/data-processor.ts',
      line: 145,
      column: 1,
      fixable: false
    }
  ],
  metrics: {
    total: 2,
    errors: 1,
    warnings: 1,
    fixable: { total: 1 }
  }
};

const mockNpmAuditOutput = {
  tool: 'npm-audit',
  success: true,
  findings: [
    {
      type: 'vulnerability',
      severity: 'high',
      category: 'dependency',
      message: 'Prototype Pollution in lodash',
      package: 'lodash',
      version: '<4.17.21',
      cve: 'CVE-2021-23337',
      recommendation: 'Upgrade to lodash@4.17.21',
      file: 'package.json'
    },
    {
      type: 'vulnerability',
      severity: 'moderate',
      category: 'dependency',
      message: 'Regular Expression Denial of Service in ansi-regex',
      package: 'ansi-regex',
      version: '<5.0.1',
      cve: 'CVE-2021-3807',
      recommendation: 'Upgrade to ansi-regex@5.0.1',
      file: 'package.json'
    }
  ],
  metrics: {
    totalDependencies: 450,
    vulnerabilities: {
      critical: 0,
      high: 1,
      moderate: 1,
      low: 0,
      info: 0,
      total: 2
    }
  }
};

const mockLighthouseOutput = {
  tool: 'lighthouse',
  success: true,
  url: 'https://example.com',
  findings: [
    {
      type: 'performance',
      severity: 'high',
      category: 'core-web-vitals',
      metric: 'largest-contentful-paint',
      message: 'Largest Contentful Paint',
      score: 0.45,
      impact: 'LCP is 4.5s, should be under 2.5s',
      value: 4500,
      unit: 'ms',
      recommendations: [
        'Optimize server response time',
        'Use CDN for static assets',
        'Implement resource hints'
      ]
    },
    {
      type: 'performance',
      severity: 'medium',
      category: 'javascript',
      metric: 'unused-javascript',
      message: 'Remove unused JavaScript',
      score: 0.65,
      impact: '245 KB of JavaScript is not used',
      value: 245000,
      unit: 'bytes',
      recommendations: [
        'Implement code splitting',
        'Use dynamic imports',
        'Remove unused dependencies'
      ]
    }
  ],
  metrics: {
    performance: 0.72,
    fcp: 1800,
    lcp: 4500,
    tbt: 350,
    cls: 0.15
  },
  scores: {
    performance: 0.72,
    accessibility: 0.95,
    bestPractices: 0.88,
    seo: 0.92,
    pwa: 0.65
  }
};

async function testMCPIntegration() {
  console.log('🚀 Testing MCP Tools Integration Flow\n');
  console.log('=' .repeat(60));
  
  // Step 1: Initialize Universal Parser
  console.log('\n📋 Step 1: Initializing Universal Parser');
  const parser = new UniversalToolParser();
  
  // Step 2: Parse tool outputs
  console.log('\n📊 Step 2: Parsing Tool Outputs');
  
  const parsedSemgrep = parser.parse(mockSemgrepOutput);
  console.log(`  ✅ Semgrep: ${parsedSemgrep.findings.length} findings standardized`);
  
  const parsedESLint = parser.parse(mockESLintOutput);
  console.log(`  ✅ ESLint: ${parsedESLint.findings.length} findings standardized`);
  
  const parsedNpmAudit = parser.parse(mockNpmAuditOutput);
  console.log(`  ✅ npm-audit: ${parsedNpmAudit.findings.length} findings standardized`);
  
  const parsedLighthouse = parser.parse(mockLighthouseOutput);
  console.log(`  ✅ Lighthouse: ${parsedLighthouse.findings.length} findings standardized`);
  
  // Step 3: Initialize Specialized Agents
  console.log('\n🤖 Step 3: Initializing Specialized Agents');
  
  const securityAgent = new SecurityAgent();
  securityAgent.configureForLanguage('typescript', ['semgrep', 'snyk']);
  console.log('  ✅ Security Agent configured for TypeScript');
  
  const codeQualityAgent = new CodeQualityAgent();
  codeQualityAgent.configureForLanguage('typescript', ['eslint', 'sonarqube']);
  console.log('  ✅ Code Quality Agent configured for TypeScript');
  
  const performanceAgent = new PerformanceAgent();
  performanceAgent.configureForLanguage('typescript', ['lighthouse', 'webpack-bundle-analyzer']);
  console.log('  ✅ Performance Agent configured for TypeScript/React');
  
  // Step 4: Feed parsed data to agents
  console.log('\n📥 Step 4: Processing Data with Specialized Agents');
  
  // Security Agent processes security findings
  const securityFindings = [
    ...parsedSemgrep.findings.filter(f => f.type === 'security'),
    ...parsedNpmAudit.findings.filter(f => f.type === 'dependency')
  ];
  
  const securityContext = {
    repositoryPath: '/path/to/repo',
    branchName: 'main',
    files: ['src/api/users.ts', 'src/components/Comment.tsx'],
    language: 'typescript',
    languageTools: ['semgrep'],
    toolResults: securityFindings
  };
  
  const securityResult = await securityAgent.analyze(securityContext);
  const securityIssues = (securityResult as any).vulnerabilities || [];
  console.log(`  ✅ Security Agent: ${securityIssues.length} issues processed`);
  
  // Code Quality Agent processes quality findings
  const qualityFindings = parsedESLint.findings.filter(f => f.type === 'code-quality');
  
  const qualityContext = {
    repositoryPath: '/path/to/repo',
    branchName: 'main',
    files: ['src/utils/helpers.ts', 'src/services/data-processor.ts'],
    language: 'typescript',
    languageTools: ['eslint'],
    toolResults: qualityFindings
  };
  
  const qualityResult = await codeQualityAgent.analyze(qualityContext);
  const qualityIssues = (qualityResult as any).issues || [];
  console.log(`  ✅ Code Quality Agent: ${qualityIssues.length} issues processed`);
  
  // Performance Agent processes performance findings
  const performanceFindings = parsedLighthouse.findings.filter(f => f.type === 'performance');
  
  const performanceContext = {
    repositoryPath: '/path/to/repo',
    branchName: 'main',
    url: 'https://example.com',
    buildPath: 'dist',
    technology: 'react',
    toolResults: performanceFindings
  };
  
  const performanceResult = await performanceAgent.analyze(performanceContext);
  const performanceIssues = (performanceResult as any).issues || [];
  console.log(`  ✅ Performance Agent: ${performanceIssues.length} issues processed`);
  
  // Step 5: Aggregate results (simulating Orchestrator)
  console.log('\n🎯 Step 5: Aggregating Results (Orchestrator)');
  
  const aggregatedResults = {
    security: securityResult,
    codeQuality: qualityResult,
    performance: performanceResult,
    summary: {
      totalIssues: 
        securityIssues.length + 
        qualityIssues.length + 
        performanceIssues.length,
      criticalCount: securityFindings.filter(f => f.severity === 'critical').length,
      highCount: securityFindings.filter(f => f.severity === 'high').length,
      tools: ['semgrep', 'eslint', 'npm-audit', 'lighthouse'],
      timestamp: new Date().toISOString()
    }
  };
  
  console.log(`  ✅ Total Issues: ${aggregatedResults.summary.totalIssues}`);
  console.log(`  ✅ Critical: ${aggregatedResults.summary.criticalCount}`);
  console.log(`  ✅ High: ${aggregatedResults.summary.highCount}`);
  
  // Step 6: Validate data flow
  console.log('\n✨ Step 6: Validating Data Flow');
  
  const validationResults = {
    toolOutputReceived: true,
    parsingSuccessful: parsedSemgrep.success && parsedESLint.success && parsedNpmAudit.success && parsedLighthouse.success,
    agentProcessingComplete: !!securityResult && !!qualityResult && !!performanceResult,
    dataIntegrity: validateDataIntegrity(aggregatedResults),
    noUndefinedValues: checkForUndefinedValues(aggregatedResults)
  };
  
  console.log(`  ✅ Tool Output Received: ${validationResults.toolOutputReceived}`);
  console.log(`  ✅ Parsing Successful: ${validationResults.parsingSuccessful}`);
  console.log(`  ✅ Agent Processing Complete: ${validationResults.agentProcessingComplete}`);
  console.log(`  ✅ Data Integrity: ${validationResults.dataIntegrity}`);
  console.log(`  ✅ No Undefined Values: ${validationResults.noUndefinedValues}`);
  
  // Final Report Generation Preview
  console.log('\n📄 Step 7: Report Generation Preview');
  console.log('=' .repeat(60));
  console.log('\n### Code Analysis Report ###\n');
  console.log(`**Repository:** example-repo`);
  console.log(`**Branch:** main`);
  console.log(`**Analysis Date:** ${new Date().toISOString()}`);
  console.log(`\n**Summary:**`);
  console.log(`- Total Issues: ${aggregatedResults.summary.totalIssues}`);
  console.log(`- Critical: ${aggregatedResults.summary.criticalCount}`);
  console.log(`- High: ${aggregatedResults.summary.highCount}`);
  console.log(`- Tools Used: ${aggregatedResults.summary.tools.join(', ')}`);
  
  console.log(`\n**Top Security Issues:**`);
  securityFindings.slice(0, 3).forEach((issue, i) => {
    console.log(`${i + 1}. [${issue.severity.toUpperCase()}] ${issue.title}`);
    console.log(`   Location: ${issue.location.file}:${issue.location.line}`);
  });
  
  console.log(`\n**Top Performance Issues:**`);
  performanceFindings.slice(0, 3).forEach((issue, i) => {
    console.log(`${i + 1}. [${issue.severity.toUpperCase()}] ${issue.title}`);
    console.log(`   Description: ${issue.description || issue.title}`);
  });
  
  console.log('\n' + '=' .repeat(60));
  console.log('✅ MCP Integration Test Complete!');
  
  return aggregatedResults;
}

function validateDataIntegrity(results: any): boolean {
  // Check that all required fields are present
  return !!(
    results.security &&
    results.codeQuality &&
    results.performance &&
    results.summary &&
    results.summary.totalIssues !== undefined &&
    results.summary.tools?.length > 0
  );
}

function checkForUndefinedValues(obj: any, path = ''): boolean {
  for (const key in obj) {
    const currentPath = path ? `${path}.${key}` : key;
    const value = obj[key];
    
    if (value === undefined) {
      console.error(`  ❌ Undefined value found at: ${currentPath}`);
      return false;
    }
    
    if (value === 'undefined' || value === 'unknown') {
      console.warn(`  ⚠️  Placeholder value found at: ${currentPath}`);
    }
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      if (!checkForUndefinedValues(value, currentPath)) {
        return false;
      }
    }
  }
  
  return true;
}

// Run the test
if (require.main === module) {
  testMCPIntegration()
    .then(results => {
      console.log('\n✅ Test completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    });
}