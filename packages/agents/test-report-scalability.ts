/**
 * Test V7 Enhanced Report Generator with Different PR Sizes and Languages
 * Tests:
 * - Small PR (5-10 issues) - JavaScript
 * - Medium PR (20-30 issues) - Python
 * - Large PR (50+ issues) - Java
 * - Multi-language PR - TypeScript + Go
 * - Performance metrics for each scenario
 */

import { ComparisonAgent } from './src/standard/comparison/comparison-agent';
import * as fs from 'fs';
import * as path from 'path';

interface TestScenario {
  name: string;
  language: string;
  issueCount: number;
  prSize: 'small' | 'medium' | 'large' | 'xlarge';
  generateIssues: () => any[];
}

class ReportScalabilityTester {
  private scenarios: TestScenario[] = [];
  private results: any[] = [];

  constructor() {
    this.setupScenarios();
  }

  private setupScenarios() {
    // Small PR - JavaScript (5-10 issues)
    this.scenarios.push({
      name: 'Small JavaScript PR',
      language: 'javascript',
      issueCount: 8,
      prSize: 'small',
      generateIssues: () => this.generateJavaScriptIssues(8)
    });

    // Medium PR - Python (20-30 issues)
    this.scenarios.push({
      name: 'Medium Python PR',
      language: 'python',
      issueCount: 25,
      prSize: 'medium',
      generateIssues: () => this.generatePythonIssues(25)
    });

    // Large PR - Java (50+ issues)
    this.scenarios.push({
      name: 'Large Java PR',
      language: 'java',
      issueCount: 55,
      prSize: 'large',
      generateIssues: () => this.generateJavaIssues(55)
    });

    // Extra Large PR - Multi-language (TypeScript + Go) (100+ issues)
    this.scenarios.push({
      name: 'XLarge Multi-language PR (TypeScript + Go)',
      language: 'multi',
      issueCount: 120,
      prSize: 'xlarge',
      generateIssues: () => this.generateMultiLanguageIssues(120)
    });
  }

  private generateJavaScriptIssues(count: number): any[] {
    const issues = [];
    const severities = ['critical', 'high', 'medium', 'low'];
    const categories = ['security', 'performance', 'code-quality'];
    
    const jsIssueTemplates = [
      {
        title: 'Prototype Pollution Vulnerability',
        description: 'Object prototype can be polluted through user input',
        category: 'security',
        severity: 'critical',
        file: 'src/utils/merger.js'
      },
      {
        title: 'Unhandled Promise Rejection',
        description: 'Promise rejection not properly handled in async function',
        category: 'code-quality',
        severity: 'high',
        file: 'src/api/client.js'
      },
      {
        title: 'Event Listener Memory Leak',
        description: 'Event listeners not removed on component unmount',
        category: 'performance',
        severity: 'high',
        file: 'src/components/Dashboard.js'
      },
      {
        title: 'Use of eval() Function',
        description: 'Direct use of eval() poses security risk',
        category: 'security',
        severity: 'critical',
        file: 'src/parser/dynamic.js'
      },
      {
        title: 'Missing null checks',
        description: 'Potential null pointer access without validation',
        category: 'code-quality',
        severity: 'medium',
        file: 'src/handlers/data.js'
      }
    ];

    for (let i = 0; i < count; i++) {
      const template = jsIssueTemplates[i % jsIssueTemplates.length];
      issues.push({
        id: `js-issue-${i + 1}`,
        title: `${template.title} #${i + 1}`,
        message: template.description,
        description: `${template.description} in JavaScript code`,
        severity: template.severity,
        category: template.category,
        location: { 
          file: template.file, 
          line: Math.floor(Math.random() * 500) + 1 
        },
        codeSnippet: this.getJavaScriptCodeSnippet(template.category),
        suggestedFix: this.getJavaScriptFix(template.category),
        impact: `${template.severity === 'critical' ? 'Critical' : 'High'} - ${template.description}`
      });
    }
    
    return issues;
  }

  private generatePythonIssues(count: number): any[] {
    const issues = [];
    
    const pythonIssueTemplates = [
      {
        title: 'SQL Injection in Raw Query',
        description: 'Using string formatting in SQL queries instead of parameterized queries',
        category: 'security',
        severity: 'critical',
        file: 'app/database/queries.py'
      },
      {
        title: 'Hardcoded Secret Key',
        description: 'Secret key hardcoded in source code',
        category: 'security',
        severity: 'critical',
        file: 'config/settings.py'
      },
      {
        title: 'Missing Type Hints',
        description: 'Function lacks type hints for parameters and return value',
        category: 'code-quality',
        severity: 'low',
        file: 'app/utils/helpers.py'
      },
      {
        title: 'Inefficient List Comprehension',
        description: 'Nested list comprehension causing O(n²) complexity',
        category: 'performance',
        severity: 'medium',
        file: 'app/processors/data.py'
      },
      {
        title: 'Broad Exception Handling',
        description: 'Catching all exceptions with bare except clause',
        category: 'code-quality',
        severity: 'medium',
        file: 'app/handlers/error.py'
      },
      {
        title: 'Resource Not Closed',
        description: 'File handle not properly closed after use',
        category: 'performance',
        severity: 'high',
        file: 'app/io/file_manager.py'
      }
    ];

    for (let i = 0; i < count; i++) {
      const template = pythonIssueTemplates[i % pythonIssueTemplates.length];
      issues.push({
        id: `py-issue-${i + 1}`,
        title: `${template.title} #${i + 1}`,
        message: template.description,
        description: `${template.description} in Python code`,
        severity: template.severity,
        category: template.category,
        location: { 
          file: template.file, 
          line: Math.floor(Math.random() * 1000) + 1 
        },
        codeSnippet: this.getPythonCodeSnippet(template.category),
        suggestedFix: this.getPythonFix(template.category),
        impact: `${template.severity === 'critical' ? 'Critical security vulnerability' : 'Code quality issue'}`
      });
    }
    
    return issues;
  }

  private generateJavaIssues(count: number): any[] {
    const issues = [];
    
    const javaIssueTemplates = [
      {
        title: 'Null Pointer Dereference',
        description: 'Potential NullPointerException without null check',
        category: 'code-quality',
        severity: 'high',
        file: 'src/main/java/com/app/service/UserService.java'
      },
      {
        title: 'Thread Safety Issue',
        description: 'Non-synchronized access to shared mutable state',
        category: 'architecture',
        severity: 'critical',
        file: 'src/main/java/com/app/cache/DataCache.java'
      },
      {
        title: 'Resource Leak',
        description: 'Stream not closed in finally block',
        category: 'performance',
        severity: 'high',
        file: 'src/main/java/com/app/io/FileProcessor.java'
      },
      {
        title: 'Inefficient String Concatenation',
        description: 'Using + operator in loop instead of StringBuilder',
        category: 'performance',
        severity: 'medium',
        file: 'src/main/java/com/app/util/StringUtils.java'
      },
      {
        title: 'Missing @Override Annotation',
        description: 'Override method lacks @Override annotation',
        category: 'code-quality',
        severity: 'low',
        file: 'src/main/java/com/app/model/Entity.java'
      },
      {
        title: 'Deserialization Vulnerability',
        description: 'Unsafe deserialization of untrusted data',
        category: 'security',
        severity: 'critical',
        file: 'src/main/java/com/app/api/DataController.java'
      }
    ];

    for (let i = 0; i < count; i++) {
      const template = javaIssueTemplates[i % javaIssueTemplates.length];
      issues.push({
        id: `java-issue-${i + 1}`,
        title: `${template.title} #${i + 1}`,
        message: template.description,
        description: `${template.description} in Java code`,
        severity: template.severity,
        category: template.category,
        location: { 
          file: template.file, 
          line: Math.floor(Math.random() * 2000) + 1 
        },
        codeSnippet: this.getJavaCodeSnippet(template.category),
        suggestedFix: this.getJavaFix(template.category),
        impact: this.getImpactDescription(template.severity, template.category)
      });
    }
    
    return issues;
  }

  private generateMultiLanguageIssues(count: number): any[] {
    const issues = [];
    const halfCount = Math.floor(count / 2);
    
    // TypeScript issues
    const tsIssueTemplates = [
      {
        title: 'Type Any Used',
        description: 'Using any type defeats TypeScript type safety',
        category: 'code-quality',
        severity: 'medium',
        file: 'src/components/UserForm.tsx'
      },
      {
        title: 'Missing Return Type',
        description: 'Function lacks explicit return type annotation',
        category: 'code-quality',
        severity: 'low',
        file: 'src/utils/validators.ts'
      },
      {
        title: 'Unsafe Type Assertion',
        description: 'Using as keyword for type assertion without validation',
        category: 'code-quality',
        severity: 'medium',
        file: 'src/services/api.ts'
      }
    ];

    // Go issues
    const goIssueTemplates = [
      {
        title: 'Goroutine Leak',
        description: 'Goroutine not properly terminated causing memory leak',
        category: 'performance',
        severity: 'high',
        file: 'internal/worker/processor.go'
      },
      {
        title: 'Race Condition',
        description: 'Concurrent map access without synchronization',
        category: 'architecture',
        severity: 'critical',
        file: 'internal/cache/memory.go'
      },
      {
        title: 'Error Not Checked',
        description: 'Function error return value ignored',
        category: 'code-quality',
        severity: 'high',
        file: 'pkg/database/connection.go'
      },
      {
        title: 'Inefficient Slice Growth',
        description: 'Slice repeatedly appended without preallocation',
        category: 'performance',
        severity: 'medium',
        file: 'internal/parser/data.go'
      }
    ];

    // Generate TypeScript issues
    for (let i = 0; i < halfCount; i++) {
      const template = tsIssueTemplates[i % tsIssueTemplates.length];
      issues.push({
        id: `ts-issue-${i + 1}`,
        title: `${template.title} #${i + 1}`,
        message: template.description,
        description: `${template.description} in TypeScript code`,
        severity: template.severity,
        category: template.category,
        location: { 
          file: template.file, 
          line: Math.floor(Math.random() * 800) + 1 
        },
        codeSnippet: `const userData: any = fetchUser();`,
        suggestedFix: `Define proper interface: interface UserData { ... }`,
        impact: 'Type safety compromised'
      });
    }

    // Generate Go issues
    for (let i = 0; i < count - halfCount; i++) {
      const template = goIssueTemplates[i % goIssueTemplates.length];
      issues.push({
        id: `go-issue-${i + 1}`,
        title: `${template.title} #${i + 1}`,
        message: template.description,
        description: `${template.description} in Go code`,
        severity: template.severity,
        category: template.category,
        location: { 
          file: template.file, 
          line: Math.floor(Math.random() * 1500) + 1 
        },
        codeSnippet: this.getGoCodeSnippet(template.category),
        suggestedFix: this.getGoFix(template.category),
        impact: this.getImpactDescription(template.severity, template.category)
      });
    }
    
    return issues;
  }

  private getJavaScriptCodeSnippet(category: string): string {
    const snippets: { [key: string]: string } = {
      'security': `const query = "SELECT * FROM users WHERE id = " + userId;`,
      'performance': `for (let i = 0; i < items.length; i++) { document.querySelector('#list').innerHTML += items[i]; }`,
      'code-quality': `function processData(data) { return eval(data.expression); }`
    };
    return snippets[category] || `// Code snippet for ${category}`;
  }

  private getJavaScriptFix(category: string): string {
    const fixes: { [key: string]: string } = {
      'security': 'Use parameterized queries or prepared statements',
      'performance': 'Batch DOM updates or use DocumentFragment',
      'code-quality': 'Parse expression safely without eval()'
    };
    return fixes[category] || `Fix ${category} issue`;
  }

  private getPythonCodeSnippet(category: string): string {
    const snippets: { [key: string]: string } = {
      'security': `query = f"SELECT * FROM users WHERE id = {user_id}"`,
      'performance': `result = [x for x in range(1000) for y in range(1000) if x*y > 500]`,
      'code-quality': `try:\n    process_data()\nexcept:\n    pass`
    };
    return snippets[category] || `# Code snippet for ${category}`;
  }

  private getPythonFix(category: string): string {
    const fixes: { [key: string]: string } = {
      'security': 'Use parameterized queries: cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))',
      'performance': 'Optimize with generator expression or numpy operations',
      'code-quality': 'Catch specific exceptions and handle appropriately'
    };
    return fixes[category] || `Fix ${category} issue`;
  }

  private getJavaCodeSnippet(category: string): string {
    const snippets: { [key: string]: string } = {
      'security': `ObjectInputStream ois = new ObjectInputStream(request.getInputStream());\nObject obj = ois.readObject();`,
      'performance': `String result = "";\nfor(String s : list) { result += s; }`,
      'code-quality': `public void process(String data) {\n    data.length(); // No null check\n}`,
      'architecture': `class Cache {\n    private Map<String, Object> map = new HashMap<>();\n    public void put(String key, Object value) { map.put(key, value); }\n}`
    };
    return snippets[category] || `// Java code for ${category}`;
  }

  private getJavaFix(category: string): string {
    const fixes: { [key: string]: string } = {
      'security': 'Implement safe deserialization with allow-list of classes',
      'performance': 'Use StringBuilder for string concatenation in loops',
      'code-quality': 'Add null check: if (data != null) { ... }',
      'architecture': 'Use ConcurrentHashMap or synchronize access'
    };
    return fixes[category] || `Fix ${category} issue`;
  }

  private getGoCodeSnippet(category: string): string {
    const snippets: { [key: string]: string } = {
      'performance': `go func() {\n    for {\n        // No exit condition\n        process()\n    }\n}()`,
      'architecture': `var cache = make(map[string]interface{})\n// Accessed from multiple goroutines without mutex`,
      'code-quality': `file, _ := os.Open("data.txt")\ndefer file.Close()`
    };
    return snippets[category] || `// Go code for ${category}`;
  }

  private getGoFix(category: string): string {
    const fixes: { [key: string]: string } = {
      'performance': 'Add context cancellation or done channel',
      'architecture': 'Use sync.Map or protect with sync.RWMutex',
      'code-quality': 'Check error: file, err := os.Open(...); if err != nil { ... }'
    };
    return fixes[category] || `Fix ${category} issue`;
  }

  private getImpactDescription(severity: string, category: string): string {
    const impacts: { [key: string]: { [key: string]: string } } = {
      'critical': {
        'security': 'Critical - Can lead to complete system compromise',
        'architecture': 'Critical - Can cause data corruption or system crashes',
        'performance': 'Critical - Can cause system outages'
      },
      'high': {
        'security': 'High - Significant security vulnerability',
        'architecture': 'High - Can cause race conditions and data inconsistency',
        'performance': 'High - Significant performance degradation',
        'code-quality': 'High - Can cause runtime errors'
      },
      'medium': {
        'security': 'Medium - Potential security issue',
        'architecture': 'Medium - Design issue that may cause problems',
        'performance': 'Medium - Noticeable performance impact',
        'code-quality': 'Medium - Code maintainability issue'
      },
      'low': {
        'code-quality': 'Low - Code style or convention issue',
        'performance': 'Low - Minor performance improvement possible'
      }
    };
    
    return impacts[severity]?.[category] || `${severity} severity ${category} issue`;
  }

  async runTests() {
    console.log('🚀 Starting Report Scalability Tests');
    console.log('=' .repeat(70));
    
    for (const scenario of this.scenarios) {
      console.log(`\n📊 Testing: ${scenario.name}`);
      console.log('-'.repeat(50));
      
      const startTime = Date.now();
      const startMemory = process.memoryUsage().heapUsed / 1024 / 1024;
      
      try {
        // Generate issues for this scenario
        const mainIssues = scenario.generateIssues().slice(0, Math.floor(scenario.issueCount * 0.4));
        const featureIssues = scenario.generateIssues();
        
        // Create mock analysis data
        const mockMainAnalysis = {
          issues: mainIssues,
          scores: { 
            overall: 75 - (scenario.issueCount / 10), 
            security: 70, 
            performance: 75, 
            maintainability: 72, 
            testing: 68 
          },
          recommendations: [],
          metadata: { language: scenario.language }
        };
        
        const mockFeatureAnalysis = {
          issues: featureIssues,
          scores: { 
            overall: 70 - (scenario.issueCount / 10), 
            security: 65, 
            performance: 70, 
            maintainability: 68, 
            testing: 65 
          },
          recommendations: [],
          metadata: { language: scenario.language }
        };
        
        // Create comparison agent and generate report
        const agent = new ComparisonAgent();
        
        // Initialize agent
        await agent.initialize({
          language: scenario.language === 'multi' ? 'typescript' : scenario.language as any,
          complexity: 'high',
          performance: 'optimized'
        });
        
        // Analyze with comparison
        const comparisonResult = await agent.analyze({
          mainBranchAnalysis: mockMainAnalysis,
          featureBranchAnalysis: mockFeatureAnalysis,
          prMetadata: {
            number: scenario.issueCount,
            title: `${scenario.name} - Performance Test PR`,
            description: `Testing with ${scenario.issueCount} issues in ${scenario.language}`,
            author: 'performance-tester',
            created_at: new Date().toISOString(),
            repository_url: `https://github.com/test/${scenario.language}-project`,
            linesAdded: scenario.issueCount * 50,
            linesRemoved: scenario.issueCount * 10
          },
          generateReport: true
        });
        
        const endTime = Date.now();
        const endMemory = process.memoryUsage().heapUsed / 1024 / 1024;
        
        // Calculate metrics
        const executionTime = endTime - startTime;
        const memoryUsed = endMemory - startMemory;
        const reportSize = comparisonResult.report ? comparisonResult.report.length / 1024 : 0;
        
        // Save report
        const reportPath = path.join(__dirname, `scalability-test-${scenario.prSize}-${scenario.language}.html`);
        if (comparisonResult.report) {
          fs.writeFileSync(reportPath, comparisonResult.report);
        }
        
        // Check for quality issues
        const qualityChecks = this.performQualityChecks(comparisonResult.report || '');
        
        // Store results
        const result = {
          scenario: scenario.name,
          language: scenario.language,
          issueCount: scenario.issueCount,
          newIssues: comparisonResult.newIssues.length,
          resolvedIssues: comparisonResult.resolvedIssues.length,
          unchangedIssues: comparisonResult.unchangedIssues.length,
          executionTime: `${executionTime}ms`,
          memoryUsed: `${memoryUsed.toFixed(2)}MB`,
          reportSize: `${reportSize.toFixed(1)}KB`,
          qualityChecks,
          reportPath
        };
        
        this.results.push(result);
        
        // Display results
        console.log(`   Language: ${scenario.language}`);
        console.log(`   Issues: ${scenario.issueCount}`);
        console.log(`   New/Resolved/Unchanged: ${result.newIssues}/${result.resolvedIssues}/${result.unchangedIssues}`);
        console.log(`   Execution Time: ${result.executionTime}`);
        console.log(`   Memory Used: ${result.memoryUsed}`);
        console.log(`   Report Size: ${result.reportSize}`);
        console.log(`   Quality Checks:`);
        Object.entries(qualityChecks).forEach(([check, passed]) => {
          console.log(`     ${passed ? '✅' : '❌'} ${check}`);
        });
        
      } catch (error) {
        console.error(`   ❌ Error in scenario: ${error.message}`);
        this.results.push({
          scenario: scenario.name,
          error: error.message
        });
      }
    }
    
    // Display summary
    this.displaySummary();
  }
  
  private performQualityChecks(report: string): { [key: string]: boolean } {
    return {
      'No undefined values': !report.includes('undefined'),
      'Has skill score': report.includes('Your Code Quality Score'),
      'Has educational links': report.includes('Required Learning') || report.includes('Recommended'),
      'Has architecture diagram': report.includes('Frontend') && report.includes('Backend'),
      'Has business impact': report.includes('Revenue Loss') || report.includes('User Impact'),
      'Has PR comment': report.includes('PR Comment for GitHub'),
      'Has severity ordering': report.includes('CRITICAL') || report.includes('HIGH') || report.includes('MEDIUM'),
      'Has code snippets': report.includes('Problematic Code:'),
      'Has fix suggestions': report.includes('Suggested Fix:'),
      'Has scoring footnotes': report.includes('Scoring System Explained:')
    };
  }
  
  private displaySummary() {
    console.log('\n' + '='.repeat(70));
    console.log('📈 PERFORMANCE SUMMARY');
    console.log('='.repeat(70));
    
    // Calculate averages by PR size
    const sizeGroups: { [key: string]: any[] } = {};
    this.results.forEach(r => {
      if (!r.error) {
        const size = this.scenarios.find(s => s.name === r.scenario)?.prSize || 'unknown';
        if (!sizeGroups[size]) sizeGroups[size] = [];
        sizeGroups[size].push(r);
      }
    });
    
    console.log('\n📊 Performance by PR Size:');
    Object.entries(sizeGroups).forEach(([size, results]) => {
      const avgTime = results.reduce((sum, r) => sum + parseInt(r.executionTime), 0) / results.length;
      const avgMemory = results.reduce((sum, r) => sum + parseFloat(r.memoryUsed), 0) / results.length;
      const avgSize = results.reduce((sum, r) => sum + parseFloat(r.reportSize), 0) / results.length;
      
      console.log(`\n   ${size.toUpperCase()} PRs:`);
      console.log(`     Avg Execution Time: ${avgTime.toFixed(0)}ms`);
      console.log(`     Avg Memory Used: ${avgMemory.toFixed(2)}MB`);
      console.log(`     Avg Report Size: ${avgSize.toFixed(1)}KB`);
    });
    
    // Quality consistency check
    console.log('\n✅ Quality Consistency:');
    const allQualityChecks = this.results
      .filter(r => !r.error && r.qualityChecks)
      .map(r => r.qualityChecks);
    
    if (allQualityChecks.length > 0) {
      const qualityKeys = Object.keys(allQualityChecks[0]);
      qualityKeys.forEach(key => {
        const passRate = allQualityChecks.filter(qc => qc[key]).length / allQualityChecks.length * 100;
        console.log(`   ${key}: ${passRate.toFixed(0)}% pass rate`);
      });
    }
    
    // Performance scaling analysis
    console.log('\n📈 Scaling Analysis:');
    const sortedByIssueCount = this.results
      .filter(r => !r.error)
      .sort((a, b) => a.issueCount - b.issueCount);
    
    if (sortedByIssueCount.length > 1) {
      const smallest = sortedByIssueCount[0];
      const largest = sortedByIssueCount[sortedByIssueCount.length - 1];
      
      const timeScaling = parseInt(largest.executionTime) / parseInt(smallest.executionTime);
      const memoryScaling = parseFloat(largest.memoryUsed) / parseFloat(smallest.memoryUsed);
      const sizeScaling = parseFloat(largest.reportSize) / parseFloat(smallest.reportSize);
      const issueScaling = largest.issueCount / smallest.issueCount;
      
      console.log(`   Issue Count Scaling: ${smallest.issueCount} → ${largest.issueCount} (${issueScaling.toFixed(1)}x)`);
      console.log(`   Time Scaling: ${timeScaling.toFixed(2)}x (${timeScaling < issueScaling ? '✅ Sub-linear' : '⚠️ Linear or worse'})`);
      console.log(`   Memory Scaling: ${memoryScaling.toFixed(2)}x (${memoryScaling < issueScaling ? '✅ Sub-linear' : '⚠️ Linear or worse'})`);
      console.log(`   Report Size Scaling: ${sizeScaling.toFixed(2)}x (Expected: ~linear)`);
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ Scalability test completed successfully!');
  }
}

// Run the tests
async function main() {
  const tester = new ReportScalabilityTester();
  await tester.runTests();
}

main().catch(console.error);