/**
 * Test Type A/B Fix Distinction in Real Reports
 * 
 * This test integrates the Type A/B distinction into actual report generation
 * using real PR data to ensure developers get clear guidance.
 */

import { ReportGeneratorV8Final } from './src/standard/comparison/report-generator-v8-final';

// Create enhanced report generator with Type A/B distinction
class ReportGeneratorWithTypeAB extends ReportGeneratorV8Final {
  /**
   * Analyze if a fix changes the function signature
   */
  private analyzeFixType(originalCode: string, fixedCode: string): {
    fixType: 'A' | 'B';
    signatureChanged: boolean;
    breakingChange: boolean;
    adjustmentNotes?: string;
  } {
    // Extract function signatures
    const extractSignature = (code: string): string | null => {
      const patterns = [
        /function\s+(\w+)\s*\(([^)]*)\)/,
        /const\s+(\w+)\s*=\s*\(([^)]*)\)/,
        /(\w+)\s*\(([^)]*)\)\s*[{:]/,
        /async\s+function\s+(\w+)\s*\(([^)]*)\)/,
        /async\s+(\w+)\s*\(([^)]*)\)/
      ];
      
      for (const pattern of patterns) {
        const match = code.match(pattern);
        if (match) return `${match[1]}(${match[2]})`;
      }
      return null;
    };
    
    const originalSig = extractSignature(originalCode);
    const fixedSig = extractSignature(fixedCode);
    
    if (!originalSig || !fixedSig) {
      return { 
        fixType: 'A',
        signatureChanged: false,
        breakingChange: false
      };
    }
    
    const signatureChanged = originalSig !== fixedSig;
    
    // Check async changes
    const originalAsync = /async\s+/.test(originalCode);
    const fixedAsync = /async\s+/.test(fixedCode);
    
    // Count parameters
    const originalParams = (originalCode.match(/\(([^)]*)\)/) || ['', ''])[1]
      .split(',').filter(p => p.trim()).length;
    const fixedParams = (fixedCode.match(/\(([^)]*)\)/) || ['', ''])[1]
      .split(',').filter(p => p.trim()).length;
    
    const breakingChange = signatureChanged || (originalAsync !== fixedAsync) || (originalParams !== fixedParams);
    
    let adjustmentNotes: string | undefined;
    if (originalParams !== fixedParams) {
      if (fixedParams > originalParams) {
        adjustmentNotes = `Add ${fixedParams - originalParams} new parameter(s) to all function calls`;
      } else {
        adjustmentNotes = `Remove ${originalParams - fixedParams} parameter(s) from all function calls`;
      }
    }
    if (originalAsync !== fixedAsync) {
      if (fixedAsync && !originalAsync) {
        adjustmentNotes = (adjustmentNotes ? adjustmentNotes + '. ' : '') + 
                         'Function is now async - add await to all calls';
      }
    }
    
    return {
      fixType: breakingChange ? 'B' : 'A',
      signatureChanged,
      breakingChange,
      adjustmentNotes
    };
  }

  /**
   * Override fix formatting to include Type A/B distinction
   */
  protected formatFixSuggestion(issue: any, fixSuggestion: any, file: string): string {
    let content = '\n🔧 **Fix Suggestion:**\n';
    
    // Analyze fix type if we have both original and fixed code
    let fixTypeInfo: any = { fixType: 'A' };
    if (issue.codeSnippet && fixSuggestion.fixedCode) {
      fixTypeInfo = this.analyzeFixType(issue.codeSnippet, fixSuggestion.fixedCode);
    }
    
    // Add confidence and time
    const confidence = fixSuggestion.confidence || 'medium';
    const baseTime = fixTypeInfo.fixType === 'A' ? 10 : 30;
    const estimatedTime = fixSuggestion.estimatedMinutes || baseTime;
    
    const confidenceEmoji = { high: '🟢', medium: '🟡', low: '🔴' };
    content += `${confidenceEmoji[confidence as keyof typeof confidenceEmoji] || '🟡'} **Confidence:** ${confidence} | `;
    content += `⏱️ **Estimated Time:** ${estimatedTime} minutes\n\n`;
    
    // Type A or B section with clear distinction
    if (fixTypeInfo.fixType === 'A') {
      content += '### 🟢 Type A Fix - Direct Copy-Paste\n';
      content += '*This fix maintains the same function signature. You can directly replace the code.*\n\n';
      content += '**What to do:** Simply replace the existing code with the fixed version below.\n\n';
      content += '**Fixed Code (copy-paste ready):**\n';
    } else {
      content += '### 🟡 Type B Fix - Requires Adjustments\n';
      content += '*This fix changes the function signature or behavior. Update all callers accordingly.*\n\n';
      
      if (fixTypeInfo.adjustmentNotes) {
        content += `⚠️ **Required Adjustments:** ${fixTypeInfo.adjustmentNotes}\n\n`;
      }
      
      if (fixTypeInfo.breakingChange) {
        content += '❗ **Breaking Change:** This fix will break existing code that calls this function.\n\n';
      }
      
      content += '**What to do:**\n';
      content += '1. Apply the fixed code below\n';
      content += '2. Find all places where this function is called\n';
      content += '3. Update each call site according to the adjustments noted above\n';
      content += '4. Test all affected code paths\n\n';
      content += '**Fixed Code (adjust callers after applying):**\n';
    }
    
    // Show the fixed code
    const language = this.getLanguageFromFile(file);
    content += '```' + language + '\n';
    content += fixSuggestion.fixedCode + '\n';
    content += '```\n';
    
    // Show diff for Type B fixes
    if (fixTypeInfo.fixType === 'B' && issue.codeSnippet) {
      content += '\n<details>\n<summary>📊 View Signature Changes</summary>\n\n';
      content += '```diff\n';
      const originalSig = issue.codeSnippet.split('\n')[0];
      const fixedSig = fixSuggestion.fixedCode.split('\n')[0];
      content += `- ${originalSig}\n`;
      content += `+ ${fixedSig}\n`;
      content += '```\n</details>\n';
    }
    
    return content;
  }

  private getLanguageFromFile(file: string): string {
    const ext = file.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'py': 'python',
      'java': 'java',
      'go': 'go'
    };
    return langMap[ext || ''] || 'text';
  }
}

// Test with mock data showing both Type A and Type B fixes
async function demonstrateTypeABInReports() {
  console.log('📊 Testing Type A/B Fix Distinction in Reports\n');
  console.log('='.repeat(60));
  
  const generator = new ReportGeneratorWithTypeAB();
  
  // Mock analysis result with various fix types
  const mockResult = {
    summary: {
      prTitle: 'Add retry logic for HTTP client',
      totalIssues: 4,
      criticalCount: 2,
      highCount: 1,
      mediumCount: 1,
      lowCount: 0,
      securityIssues: 1,
      performanceIssues: 1,
      newIssues: 2,
      fixedIssues: 1,
      unchangedIssues: 1
    },
    newIssues: [
      {
        issue: {
          title: 'Missing null check in request handler',
          severity: 'high',
          category: 'bug',
          location: { file: 'src/handler.js', line: 45 },
          codeSnippet: `function handleRequest(req, options) {
  return req.headers[options.headerKey];
}`,
          description: 'Accessing property without null check'
        },
        fixSuggestion: {
          fixedCode: `function handleRequest(req, options) {
  if (!req || !options) return null;
  return req.headers[options.headerKey];
}`,
          confidence: 'high',
          estimatedMinutes: 5
        }
      },
      {
        issue: {
          title: 'SQL Injection vulnerability',
          severity: 'critical',
          category: 'security',
          location: { file: 'src/database.js', line: 102 },
          codeSnippet: `function getUser(userId) {
  return db.query("SELECT * FROM users WHERE id = " + userId);
}`,
          description: 'Direct string concatenation in SQL query'
        },
        fixSuggestion: {
          fixedCode: `function getUser(userId, connection) {
  return connection.query("SELECT * FROM users WHERE id = ?", [userId]);
}`,
          confidence: 'high',
          estimatedMinutes: 20
        }
      }
    ],
    unchangedIssues: [],
    fixedIssues: []
  };
  
  // Generate the report section with fixes
  console.log('\n📝 Report Output with Type A/B Distinction:\n');
  console.log('-'.repeat(60));
  
  for (const item of mockResult.newIssues) {
    console.log(`\n### ${item.issue.title}`);
    console.log(`**Severity:** ${item.issue.severity} | **Category:** ${item.issue.category}`);
    console.log(`**Location:** ${item.issue.location.file}:${item.issue.location.line}`);
    
    const fixContent = generator['formatFixSuggestion'](
      item.issue,
      item.fixSuggestion,
      item.issue.location.file
    );
    console.log(fixContent);
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('✅ Type A/B Distinction Benefits in Reports:\n');
  console.log('1. **Clear Expectations**: Developers immediately know if they can copy-paste');
  console.log('2. **Breaking Change Warnings**: Type B fixes warn about signature changes');
  console.log('3. **Migration Guidance**: Type B includes steps for updating callers');
  console.log('4. **Time Estimates**: Type B has higher estimates accounting for updates');
  console.log('5. **Safety First**: Prevents breaking production by blindly applying fixes');
}

// Run the demonstration
demonstrateTypeABInReports().catch(console.error);