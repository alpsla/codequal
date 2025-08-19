/**
 * Simplified Scalability Test for V7 Report Generator
 * Directly tests report generation with various issue counts
 */

import { ReportGeneratorV7HTMLEnhanced } from './src/standard/comparison/report-generator-v7-html-enhanced';
import * as fs from 'fs';
import * as path from 'path';

interface TestCase {
  name: string;
  issueCount: number;
  language: string;
}

async function runSimplifiedScalabilityTest() {
  console.log('🚀 Running Simplified Scalability Test for V7 Report Generator');
  console.log('=' .repeat(70));
  
  const testCases: TestCase[] = [
    { name: 'Small JS PR', issueCount: 5, language: 'javascript' },
    { name: 'Medium Python PR', issueCount: 25, language: 'python' },
    { name: 'Large Java PR', issueCount: 50, language: 'java' },
    { name: 'XLarge TypeScript PR', issueCount: 100, language: 'typescript' },
    { name: 'Massive Go PR', issueCount: 200, language: 'go' }
  ];
  
  const results: any[] = [];
  const reportGenerator = new ReportGeneratorV7HTMLEnhanced();
  
  for (const testCase of testCases) {
    console.log(`\n📊 Testing: ${testCase.name} (${testCase.issueCount} issues)`);
    console.log('-'.repeat(50));
    
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed / 1024 / 1024;
    
    try {
      // Generate mock issues
      const issues = generateMockIssues(testCase.issueCount, testCase.language);
      
      // Split into new, resolved, and unchanged
      const newIssues = issues.slice(0, Math.floor(issues.length * 0.5));
      const resolvedIssues = issues.slice(0, Math.floor(issues.length * 0.2));
      const unchangedIssues = issues.slice(0, Math.floor(issues.length * 0.3));
      
      // Create comparison result with PR metadata embedded
      const comparison = {
        newIssues,
        resolvedIssues,
        unchangedIssues,
        overallDecision: testCase.issueCount > 50 ? 'reject' : 'approve',
        report: '',
        prMetadata: {
          number: testCase.issueCount,
          title: `${testCase.name} - Scalability Test`,
          description: `Testing with ${testCase.issueCount} issues`,
          author: 'test-user',
          created_at: new Date().toISOString(),
          repository_url: `https://github.com/test/${testCase.language}-repo`,
          linesAdded: testCase.issueCount * 100,
          linesRemoved: testCase.issueCount * 20
        },
        educationalContent: {
          resources: [],
          concepts: [],
          bestPractices: []
        },
        metadata: {
          analysisDate: new Date().toISOString(),
          scanDuration: Math.random() * 30 + 10,
          toolsUsed: ['DeepWiki', 'ESLint', 'Security Scanner'],
          confidence: 94,
          models: {
            primary: 'google/gemini-2.5-pro',
            fallback: 'anthropic/claude-opus-4.1'
          }
        }
      };
      
      // Generate report
      const report = await reportGenerator.generateReport(comparison as any);
      
      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed / 1024 / 1024;
      
      // Calculate metrics
      const executionTime = endTime - startTime;
      const memoryUsed = endMemory - startMemory;
      const reportSize = report.length / 1024;
      
      // Quality checks
      const qualityChecks = {
        'No undefined': !report.includes('undefined'),
        'Has score': report.includes('Your Code Quality Score'),
        'Has education': report.includes('Educational'),
        'Has snippets': report.includes('Problematic Code') || report.includes('code-block'),
        'Varied links': countUniqueEducationalLinks(report) > 3
      };
      
      // Save report
      const filename = `scalability-${testCase.language}-${testCase.issueCount}.html`;
      fs.writeFileSync(path.join(__dirname, filename), report);
      
      results.push({
        name: testCase.name,
        issues: testCase.issueCount,
        executionTime: `${executionTime}ms`,
        memoryUsed: `${memoryUsed.toFixed(2)}MB`,
        reportSize: `${reportSize.toFixed(1)}KB`,
        qualityPassed: Object.values(qualityChecks).every(v => v),
        qualityDetails: qualityChecks
      });
      
      console.log(`   ✅ Execution Time: ${executionTime}ms`);
      console.log(`   ✅ Memory Used: ${memoryUsed.toFixed(2)}MB`);
      console.log(`   ✅ Report Size: ${reportSize.toFixed(1)}KB`);
      console.log(`   ✅ Quality: ${Object.values(qualityChecks).every(v => v) ? 'PASSED' : 'FAILED'}`);
      
    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}`);
      results.push({
        name: testCase.name,
        issues: testCase.issueCount,
        error: error.message
      });
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📈 SCALABILITY TEST SUMMARY');
  console.log('='.repeat(70));
  
  // Performance scaling
  const validResults = results.filter(r => !r.error);
  if (validResults.length > 1) {
    const first = validResults[0];
    const last = validResults[validResults.length - 1];
    
    const timeScale = parseInt(last.executionTime) / parseInt(first.executionTime);
    const memScale = parseFloat(last.memoryUsed) / parseFloat(first.memoryUsed);
    const sizeScale = parseFloat(last.reportSize) / parseFloat(first.reportSize);
    const issueScale = last.issues / first.issues;
    
    console.log('\n📊 Scaling Metrics:');
    console.log(`   Issue scaling: ${first.issues} → ${last.issues} (${issueScale}x)`);
    console.log(`   Time scaling: ${timeScale.toFixed(2)}x ${timeScale < issueScale ? '✅ Sub-linear' : '⚠️ Linear+'}`);
    console.log(`   Memory scaling: ${memScale.toFixed(2)}x ${memScale < issueScale ? '✅ Sub-linear' : '⚠️ Linear+'}`);
    console.log(`   Size scaling: ${sizeScale.toFixed(2)}x (Expected ~linear)`);
  }
  
  // Quality consistency
  console.log('\n✅ Quality Consistency:');
  const allPassed = validResults.every(r => r.qualityPassed);
  console.log(`   All quality checks: ${allPassed ? '✅ PASSED' : '❌ FAILED'}`);
  
  // Performance table
  console.log('\n📋 Detailed Results:');
  console.table(results.map(r => ({
    Name: r.name,
    Issues: r.issues,
    Time: r.executionTime || 'ERROR',
    Memory: r.memoryUsed || 'ERROR',
    Size: r.reportSize || 'ERROR',
    Quality: r.qualityPassed ? '✅' : r.error ? '❌' : '⚠️'
  })));
}

function generateMockIssues(count: number, language: string): any[] {
  const severities = ['critical', 'high', 'medium', 'low'];
  const categories = ['security', 'performance', 'code-quality', 'architecture', 'dependencies'];
  
  const issues = [];
  for (let i = 0; i < count; i++) {
    const severity = severities[i % severities.length];
    const category = categories[i % categories.length];
    
    issues.push({
      id: `${language}-issue-${i + 1}`,
      title: getIssueTitle(category, language, i),
      message: getIssueMessage(category, language),
      description: `${getIssueMessage(category, language)} in ${language} code`,
      severity,
      category,
      location: {
        file: getFilePath(language, category, i),
        line: Math.floor(Math.random() * 1000) + 1
      },
      codeSnippet: getCodeSnippet(language, category),
      suggestedFix: getSuggestedFix(category),
      impact: getImpact(severity, category)
    });
  }
  
  return issues;
}

function getIssueTitle(category: string, language: string, index: number): string {
  const titles: { [key: string]: string[] } = {
    security: ['SQL Injection', 'XSS Vulnerability', 'API Key Exposed', 'Weak Password', 'Missing Auth'],
    performance: ['Memory Leak', 'N+1 Query', 'Blocking I/O', 'Inefficient Loop', 'Cache Miss'],
    'code-quality': ['Dead Code', 'Complex Function', 'Missing Types', 'Poor Naming', 'Duplicate Code'],
    architecture: ['Tight Coupling', 'Race Condition', 'Poor Structure', 'Missing Pattern', 'Bad Design'],
    dependencies: ['Vulnerable Package', 'Outdated Library', 'Missing Peer Dep', 'Version Conflict', 'Large Bundle']
  };
  
  const categoryTitles = titles[category] || ['Generic Issue'];
  return `${categoryTitles[index % categoryTitles.length]} #${index + 1}`;
}

function getIssueMessage(category: string, language: string): string {
  const messages: { [key: string]: string } = {
    security: 'Security vulnerability detected that could compromise system',
    performance: 'Performance issue that could impact system responsiveness',
    'code-quality': 'Code quality issue affecting maintainability',
    architecture: 'Architectural issue that could cause problems at scale',
    dependencies: 'Dependency issue that needs attention'
  };
  return messages[category] || 'Issue detected in code';
}

function getFilePath(language: string, category: string, index: number): string {
  const paths: { [key: string]: string[] } = {
    javascript: ['src/index.js', 'src/api/client.js', 'src/utils/helpers.js', 'src/components/App.js'],
    python: ['app/main.py', 'app/models.py', 'app/views.py', 'app/utils.py'],
    java: ['src/main/java/App.java', 'src/main/java/Service.java', 'src/main/java/Controller.java'],
    typescript: ['src/index.ts', 'src/types.ts', 'src/components/App.tsx', 'src/api/client.ts'],
    go: ['main.go', 'handler/api.go', 'service/worker.go', 'pkg/utils.go']
  };
  
  const langPaths = paths[language] || ['src/file.ext'];
  return langPaths[index % langPaths.length];
}

function getCodeSnippet(language: string, category: string): string {
  const snippets: { [lang: string]: { [cat: string]: string } } = {
    javascript: {
      security: `const query = "SELECT * FROM users WHERE id = " + userId;`,
      performance: `for (let i = 0; i < items.length; i++) {\n  document.getElementById('list').innerHTML += items[i];\n}`,
      'code-quality': `function processData(d) { return eval(d); }`,
      architecture: `class UserService {\n  constructor() { this.db = new Database(); }\n}`,
      dependencies: `const oldLib = require('deprecated-lib@0.1.0');`
    },
    typescript: {
      security: `const query: string = \`SELECT * FROM users WHERE id = \${userId}\`;`,
      performance: `items.forEach(item => {\n  document.querySelector('#list')!.innerHTML += item;\n});`,
      'code-quality': `function processData(data: any): any { return data; }`,
      architecture: `export class Service {\n  private db = new Database(); // Tight coupling\n}`,
      dependencies: `import * as moment from 'moment'; // Large deprecated library`
    },
    python: {
      security: `query = f"SELECT * FROM users WHERE id = {user_id}"`,
      performance: `result = [x for x in range(10000) for y in range(10000) if x*y > 500]`,
      'code-quality': `def process(data):\n    try:\n        return eval(data)\n    except:\n        pass`,
      architecture: `class UserService:\n    def __init__(self):\n        self.db = Database()  # Direct instantiation`,
      dependencies: `import deprecated_module  # Known vulnerabilities`
    },
    java: {
      security: `String query = "SELECT * FROM users WHERE id = " + userId;`,
      performance: `String result = "";\nfor(String s : list) { result += s; }`,
      'code-quality': `public void process(String data) {\n  data.length(); // No null check\n}`,
      architecture: `public class Service {\n  private Database db = new Database(); // Tight coupling\n}`,
      dependencies: `import com.vulnerable.OldLibrary; // CVE-2021-12345`
    },
    go: {
      security: `query := fmt.Sprintf("SELECT * FROM users WHERE id = %s", userID)`,
      performance: `var result string\nfor _, s := range items {\n  result = result + s // Inefficient concatenation\n}`,
      'code-quality': `func process(data string) {\n  file, _ := os.Open(data) // Error ignored\n  defer file.Close()\n}`,
      architecture: `type Service struct {\n  db *Database // No interface, concrete dependency\n}`,
      dependencies: `import "github.com/old/vulnerable-lib/v1" // Outdated version`
    }
  };
  
  return snippets[language]?.[category] || 
         snippets['javascript']?.[category] || 
         `// Sample ${category} issue in ${language}`;
}

function getSuggestedFix(category: string): string {
  const fixes: { [key: string]: string } = {
    security: 'Use parameterized queries or prepared statements',
    performance: 'Optimize algorithm or use caching',
    'code-quality': 'Refactor to improve readability and maintainability',
    architecture: 'Apply appropriate design pattern',
    dependencies: 'Update or replace problematic dependency'
  };
  return fixes[category] || 'Apply best practices';
}

function getImpact(severity: string, category: string): string {
  if (severity === 'critical') {
    return 'Critical - Immediate action required, can cause system failure';
  } else if (severity === 'high') {
    return 'High - Significant issue that should be addressed soon';
  } else if (severity === 'medium') {
    return 'Medium - Should be fixed in next iteration';
  }
  return 'Low - Minor issue, fix when convenient';
}

function countUniqueEducationalLinks(report: string): number {
  const linkRegex = /href="([^"]+)"/g;
  const links = new Set<string>();
  let match;
  
  while ((match = linkRegex.exec(report)) !== null) {
    if (match[1].includes('owasp') || match[1].includes('web.dev') || 
        match[1].includes('martinfowler') || match[1].includes('developer')) {
      links.add(match[1]);
    }
  }
  
  return links.size;
}

// Run the test
runSimplifiedScalabilityTest().catch(console.error);