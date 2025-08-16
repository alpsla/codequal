#!/usr/bin/env npx ts-node

import axios from 'axios';
import { setTimeout } from 'timers/promises';

const DEEPWIKI_URL = process.env.DEEPWIKI_API_URL || 'http://localhost:8001';
const DEEPWIKI_API_KEY = process.env.DEEPWIKI_API_KEY || 'dw-key-e48329b6c05b4a36a18d65af21ac3c2f';

interface TestStrategy {
  name: string;
  description: string;
  systemPrompt?: string;
  userPrompt: string;
  model?: string;
  temperature?: number;
  responseFormat?: any;
  maxTokens?: number;
}

interface TestResult {
  strategy: string;
  success: boolean;
  structureScore: number; // 0-100, how structured is the response
  issuesFound: number;
  hasFileLocations: boolean;
  hasLineNumbers: boolean;
  responseLength: number;
  duration: number;
  sample?: string;
}

class DeepWikiPromptOptimizer {
  private results: TestResult[] = [];
  private testRepo = 'https://github.com/vercel/swr';
  
  /**
   * Test a specific prompt strategy
   */
  async testStrategy(strategy: TestStrategy): Promise<TestResult> {
    console.log(`\n🧪 Testing: ${strategy.name}`);
    console.log(`   ${strategy.description}`);
    
    const startTime = Date.now();
    
    try {
      const response = await axios.post(
        `${DEEPWIKI_URL}/chat/completions/stream`,
        {
          repo_url: this.testRepo,
          messages: [
            ...(strategy.systemPrompt ? [{
              role: 'system' as const,
              content: strategy.systemPrompt
            }] : []),
            {
              role: 'user' as const,
              content: strategy.userPrompt
            }
          ],
          stream: false,
          provider: 'openrouter',
          model: strategy.model || 'openai/gpt-4o',
          temperature: strategy.temperature ?? 0.1,
          max_tokens: strategy.maxTokens || 4000,
          ...(strategy.responseFormat ? { response_format: strategy.responseFormat } : {})
        },
        {
          headers: {
            'Authorization': `Bearer ${DEEPWIKI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000,
          responseType: 'text'
        }
      );
      
      const duration = Date.now() - startTime;
      const content = String(response.data);
      
      // Analyze response structure
      const analysis = this.analyzeResponse(content);
      
      console.log(`   ✅ Response received (${duration}ms)`);
      console.log(`   Structure score: ${analysis.structureScore}/100`);
      console.log(`   Issues found: ${analysis.issuesFound}`);
      console.log(`   Has file locations: ${analysis.hasFileLocations ? 'YES' : 'NO'}`);
      console.log(`   Has line numbers: ${analysis.hasLineNumbers ? 'YES' : 'NO'}`);
      
      const result: TestResult = {
        strategy: strategy.name,
        success: true,
        structureScore: analysis.structureScore,
        issuesFound: analysis.issuesFound,
        hasFileLocations: analysis.hasFileLocations,
        hasLineNumbers: analysis.hasLineNumbers,
        responseLength: content.length,
        duration,
        sample: content.substring(0, 300)
      };
      
      this.results.push(result);
      return result;
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.log(`   ❌ Failed: ${error.message}`);
      
      const result: TestResult = {
        strategy: strategy.name,
        success: false,
        structureScore: 0,
        issuesFound: 0,
        hasFileLocations: false,
        hasLineNumbers: false,
        responseLength: 0,
        duration
      };
      
      this.results.push(result);
      return result;
    }
  }
  
  /**
   * Analyze response for structure and content
   */
  private analyzeResponse(content: string): {
    structureScore: number;
    issuesFound: number;
    hasFileLocations: boolean;
    hasLineNumbers: boolean;
  } {
    let score = 0;
    let issuesFound = 0;
    
    // Check for JSON structure
    const isJson = this.isValidJson(content);
    if (isJson) {
      score += 40;
      try {
        const parsed = JSON.parse(content);
        if (parsed.issues && Array.isArray(parsed.issues)) {
          score += 20;
          issuesFound = parsed.issues.length;
        }
      } catch {}
    }
    
    // Check for markdown structure
    const hasMarkdownHeaders = (content.match(/^#{1,4}\s+/gm) || []).length;
    if (hasMarkdownHeaders > 0) score += Math.min(15, hasMarkdownHeaders * 3);
    
    // Check for numbered/bulleted lists
    const hasNumberedList = (content.match(/^\d+\.\s+/gm) || []).length;
    const hasBulletList = (content.match(/^[-*]\s+/gm) || []).length;
    if (hasNumberedList > 0) {
      score += Math.min(15, hasNumberedList * 2);
      issuesFound = Math.max(issuesFound, hasNumberedList);
    }
    if (hasBulletList > 0) {
      score += Math.min(10, hasBulletList);
      issuesFound = Math.max(issuesFound, hasBulletList);
    }
    
    // Check for code blocks
    const hasCodeBlocks = (content.match(/```/g) || []).length / 2;
    if (hasCodeBlocks > 0) score += Math.min(10, hasCodeBlocks * 3);
    
    // Check for structured patterns
    const hasKeyValuePairs = (content.match(/^\s*[\w\s]+:\s+.+$/gm) || []).length;
    if (hasKeyValuePairs > 3) score += 10;
    
    // Check for file locations
    const filePatterns = [
      /\b[\w\/]+\.(ts|js|tsx|jsx|json|md)\b/g,
      /`[^`]+\.(ts|js|tsx|jsx|json|md)`/g,
      /src\/[\w\/]+\.(ts|js|tsx|jsx)/g,
      /\.\/[\w\/]+\.(ts|js|tsx|jsx)/g
    ];
    
    let hasFileLocations = false;
    for (const pattern of filePatterns) {
      if (pattern.test(content)) {
        hasFileLocations = true;
        break;
      }
    }
    
    // Check for line numbers
    const hasLineNumbers = /\b(line|Line|L)[\s:#]*\d+\b/.test(content) ||
                          /:\d+:\d+/.test(content) || // file:line:column format
                          /\(\d+:\d+\)/.test(content); // (line:column) format
    
    // Ensure score doesn't exceed 100
    score = Math.min(100, score);
    
    return {
      structureScore: score,
      issuesFound,
      hasFileLocations,
      hasLineNumbers
    };
  }
  
  private isValidJson(str: string): boolean {
    try {
      JSON.parse(str.trim());
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Generate comprehensive report
   */
  generateReport() {
    console.log('\n' + '='.repeat(70));
    console.log('📊 DeepWiki Prompt Optimization Results');
    console.log('='.repeat(70));
    
    // Sort by structure score
    const sorted = [...this.results].sort((a, b) => b.structureScore - a.structureScore);
    
    console.log('\n🏆 Top Strategies by Structure Score:');
    sorted.slice(0, 5).forEach((r, i) => {
      console.log(`${i + 1}. ${r.strategy}: ${r.structureScore}/100`);
      console.log(`   Issues: ${r.issuesFound}, Files: ${r.hasFileLocations ? '✅' : '❌'}, Lines: ${r.hasLineNumbers ? '✅' : '❌'}`);
    });
    
    // Best for specific criteria
    console.log('\n🎯 Best Strategies by Criteria:');
    
    const mostIssues = sorted.reduce((max, r) => r.issuesFound > max.issuesFound ? r : max);
    console.log(`Most issues found: ${mostIssues.strategy} (${mostIssues.issuesFound} issues)`);
    
    const withFiles = sorted.filter(r => r.hasFileLocations);
    if (withFiles.length > 0) {
      console.log(`Best with file locations: ${withFiles[0].strategy}`);
    }
    
    const withLines = sorted.filter(r => r.hasLineNumbers);
    if (withLines.length > 0) {
      console.log(`Best with line numbers: ${withLines[0].strategy}`);
    }
    
    const fastest = sorted.reduce((min, r) => r.duration < min.duration ? r : min);
    console.log(`Fastest response: ${fastest.strategy} (${fastest.duration}ms)`);
    
    // Overall recommendation
    console.log('\n💡 Recommendations:');
    if (sorted[0].structureScore >= 60) {
      console.log(`✅ Use "${sorted[0].strategy}" for best structured output`);
      console.log(`   Sample output:\n   ${sorted[0].sample}`);
    } else {
      console.log('⚠️ No strategy achieved highly structured output (score >= 60)');
      console.log('   Consider combining strategies or post-processing the text response');
    }
    
    // Save detailed results
    const fs = require('fs');
    fs.mkdirSync('./test-results', { recursive: true });
    fs.writeFileSync(
      './test-results/deepwiki-prompt-optimization-results.json',
      JSON.stringify({
        timestamp: new Date().toISOString(),
        repository: this.testRepo,
        results: this.results,
        recommendations: {
          bestOverall: sorted[0].strategy,
          mostIssues: mostIssues.strategy,
          bestWithFiles: withFiles[0]?.strategy,
          bestWithLines: withLines[0]?.strategy,
          fastest: fastest.strategy
        }
      }, null, 2)
    );
    
    console.log('\n💾 Detailed results saved to: ./test-results/deepwiki-prompt-optimization-results.json');
  }
}

/**
 * Define test strategies
 */
const strategies: TestStrategy[] = [
  {
    name: 'JSON-Forced-System',
    description: 'System prompt enforcing JSON + response_format parameter',
    systemPrompt: 'You MUST respond with valid JSON only. No additional text. Start with { and end with }.',
    userPrompt: `Analyze this repository and return ONLY a JSON object:
{
  "issues": [
    {"severity": "critical|high|medium|low", "file": "path/to/file.ts", "line": 123, "description": "Issue description"}
  ],
  "summary": "Brief summary"
}`,
    responseFormat: { type: 'json_object' }
  },
  
  {
    name: 'Markdown-Structured',
    description: 'Request markdown with specific structure',
    userPrompt: `Analyze this repository and provide results in this EXACT markdown format:

## Issues Found

### Critical Issues
1. **[File: src/index.ts, Line: 45]** Description of critical issue
2. **[File: src/utils.ts, Line: 123]** Another critical issue

### High Priority Issues
1. **[File: path/to/file.ts, Line: 89]** High priority issue description

### Medium Priority Issues
1. **[File: path/to/file.ts, Line: 200]** Medium priority issue

Provide at least 5 issues with EXACT file paths and line numbers.`
  },
  
  {
    name: 'XML-Style',
    description: 'Request XML-like structure in plain text',
    userPrompt: `Analyze this repository and format your response like this:

<analysis>
  <issue>
    <severity>critical</severity>
    <file>src/index.ts</file>
    <line>45</line>
    <description>Memory leak in event handler</description>
  </issue>
  <issue>
    <severity>high</severity>
    <file>src/api/client.ts</file>
    <line>89</line>
    <description>Missing error handling</description>
  </issue>
</analysis>

Find at least 5 real issues with specific file locations.`
  },
  
  {
    name: 'CSV-Table',
    description: 'Request CSV/table format',
    userPrompt: `Analyze this repository and return results as a CSV table:

Severity,File,Line,Description
critical,src/index.ts,45,"Memory leak in event handler"
high,src/api/client.ts,89,"Missing error handling"
medium,src/utils/cache.ts,156,"Inefficient cache implementation"

Provide at least 5 issues in this exact CSV format with real file paths and line numbers.`
  },
  
  {
    name: 'Code-Comments-Style',
    description: 'Request output formatted like code comments',
    userPrompt: `Analyze this repository and format issues like code review comments:

// FILE: src/index.ts
// LINE: 45
// SEVERITY: critical
// ISSUE: Memory leak - event listeners not removed
// FIX: Add cleanup in useEffect return

// FILE: src/api/client.ts  
// LINE: 89
// SEVERITY: high
// ISSUE: Missing error handling for network failures
// FIX: Add try-catch block

Provide at least 5 issues in this format.`
  },
  
  {
    name: 'Mini-Model-JSON',
    description: 'Try smaller model with JSON request',
    systemPrompt: 'Respond only with valid JSON.',
    userPrompt: 'List 3 main issues in this repo as JSON: {"issues": [{"file": "...", "issue": "..."}]}',
    model: 'openai/gpt-4o-mini',
    maxTokens: 1000
  },
  
  {
    name: 'Numbered-Checklist',
    description: 'Request numbered checklist format',
    userPrompt: `Analyze this repository and provide a numbered checklist of issues:

1. ☐ [CRITICAL] Fix memory leak in src/index.ts:45 - Event listeners not cleaned up
2. ☐ [HIGH] Add error handling in src/api/client.ts:89 - Network failures not caught
3. ☐ [HIGH] Security issue in src/auth/validator.ts:234 - SQL injection vulnerability
4. ☐ [MEDIUM] Performance issue in src/utils/cache.ts:156 - Inefficient cache lookups
5. ☐ [LOW] Code quality in src/components/Button.tsx:12 - Missing TypeScript types

Find at least 8 real issues with this exact format including file:line notation.`
  },
  
  {
    name: 'YAML-Style',
    description: 'Request YAML-like structure',
    userPrompt: `Analyze this repository and format response as YAML:

issues:
  - severity: critical
    file: src/index.ts
    line: 45
    description: Memory leak in event handler
  - severity: high  
    file: src/api/client.ts
    line: 89
    description: Missing error handling

Provide at least 5 issues in this YAML format.`
  },
  
  {
    name: 'One-Line-Per-Issue',
    description: 'One line per issue with delimiter',
    userPrompt: `Analyze this repository. Output one issue per line with pipe delimiters:

CRITICAL|src/index.ts|45|Memory leak in event handler
HIGH|src/api/client.ts|89|Missing error handling for network failures
MEDIUM|src/utils/cache.ts|156|Inefficient cache implementation

Provide at least 8 issues in this format. Each line must have: SEVERITY|FILE|LINE|DESCRIPTION`
  },
  
  {
    name: 'Temperature-Zero',
    description: 'Ultra-low temperature for consistency',
    systemPrompt: 'Be extremely precise and consistent in your response format.',
    userPrompt: `List exactly 5 issues in this exact format:
Issue 1: [file.ts:123] Description
Issue 2: [file.ts:456] Description
Issue 3: [file.ts:789] Description`,
    temperature: 0.0
  }
];

/**
 * Run optimization tests
 */
async function runOptimizationTests() {
  const optimizer = new DeepWikiPromptOptimizer();
  
  console.log('🚀 DeepWiki Prompt Optimization Test Suite');
  console.log(`📦 Testing with repository: ${optimizer['testRepo']}`);
  console.log(`🧪 Testing ${strategies.length} different strategies`);
  console.log('='.repeat(70));
  
  // Test each strategy with a small delay between tests
  for (const strategy of strategies) {
    await optimizer.testStrategy(strategy);
    await setTimeout(1000); // Small delay to avoid rate limiting
  }
  
  // Generate comprehensive report
  optimizer.generateReport();
}

// Main execution
(async () => {
  try {
    await runOptimizationTests();
    process.exit(0);
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
})();