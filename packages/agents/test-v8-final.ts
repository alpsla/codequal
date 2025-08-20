#!/usr/bin/env ts-node

/**
 * Test V8 Report Generation - Using Existing V8 Format
 * This generates reports using the actual ReportGeneratorV8Final with proper issues
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { ReportGeneratorV8Final } from './src/standard/comparison/report-generator-v8-final';
import { ComparisonResult } from './src/standard/types/analysis-types';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const TEST_SCENARIOS = [
  {
    id: 'python-large',
    language: 'python',
    size: 'large',
    repository: 'https://github.com/django/django',
    prNumber: 17500,
    branch: 'feature/auth-improvements',
    targetBranch: 'main',
    author: 'django-contributor'
  },
  {
    id: 'go-medium',
    language: 'go',
    size: 'medium',
    repository: 'https://github.com/gin-gonic/gin',
    prNumber: 3700,
    branch: 'feature/middleware',
    targetBranch: 'master',
    author: 'go-developer'
  },
  {
    id: 'rust-small',
    language: 'rust',
    size: 'small',
    repository: 'https://github.com/serde-rs/serde',
    prNumber: 2600,
    branch: 'feature/derive',
    targetBranch: 'master',
    author: 'rust-expert'
  },
  {
    id: 'java-enterprise',
    language: 'java',
    size: 'large',
    repository: 'https://github.com/spring-projects/spring-boot',
    prNumber: 38000,
    branch: 'feature/reactive',
    targetBranch: 'main',
    author: 'enterprise-architect'
  }
];

function generateIssues(language: string, status: string, count: number): any[] {
  const issues: any[] = [];
  
  const templates: Record<string, any[]> = {
    python: [
      {
        type: 'security',
        severity: 'critical',
        category: 'SQL Injection',
        message: 'User input directly concatenated into SQL query',
        file: 'django/db/models/query.py',
        line: 456,
        column: 12,
        location: 'django/db/models/query.py',
        codeSnippet: 'query = f"SELECT * FROM users WHERE id = {user_id}"',
        suggestion: 'Use parameterized queries: cursor.execute("SELECT * FROM users WHERE id = %s", [user_id])',
        educationalContent: {
          explanation: 'SQL injection occurs when user input is directly concatenated into queries',
          bestPractices: ['Use parameterized queries', 'Validate all input', 'Use ORM methods'],
          resources: [
            { title: 'OWASP SQL Injection', url: 'https://owasp.org/www-community/attacks/SQL_Injection' }
          ]
        }
      },
      {
        type: 'performance',
        severity: 'high',
        category: 'N+1 Query',
        message: 'Database queries in loop causing N+1 problem',
        file: 'django/views/generic/list.py',
        line: 234,
        column: 8,
        location: 'django/views/generic/list.py',
        codeSnippet: 'for item in queryset:\n    related = item.related_objects.all()',
        suggestion: 'Use select_related() or prefetch_related() to optimize queries'
      },
      {
        type: 'code-quality',
        severity: 'medium',
        category: 'Missing Type Hints',
        message: 'Function lacks type annotations',
        file: 'django/core/handlers/base.py',
        line: 123,
        column: 4,
        location: 'django/core/handlers/base.py',
        codeSnippet: 'def process_request(request, middleware_chain):',
        suggestion: 'Add type hints: def process_request(request: HttpRequest, middleware_chain: List[Middleware]) -> HttpResponse:'
      },
      {
        type: 'security',
        severity: 'high',
        category: 'Hardcoded Secret',
        message: 'API key found in source code',
        file: 'django/conf/settings.py',
        line: 89,
        column: 0,
        location: 'django/conf/settings.py',
        codeSnippet: 'STRIPE_API_KEY = "sk_live_51H3bgKL5o3"',
        suggestion: 'Move to environment variables: STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY")'
      }
    ],
    go: [
      {
        type: 'concurrency',
        severity: 'critical',
        category: 'Data Race',
        message: 'Concurrent map access without synchronization',
        file: 'gin/context.go',
        line: 678,
        column: 4,
        location: 'gin/context.go',
        codeSnippet: 'c.Keys[key] = value  // Not thread-safe',
        suggestion: 'Use sync.Map or add mutex protection',
        educationalContent: {
          explanation: 'Data races occur when multiple goroutines access shared data concurrently',
          bestPractices: ['Use sync.Map', 'Add mutex protection', 'Use channels'],
          resources: [
            { title: 'Go Race Detector', url: 'https://go.dev/doc/articles/race_detector' }
          ]
        }
      },
      {
        type: 'error-handling',
        severity: 'high',
        category: 'Unhandled Error',
        message: 'Error return value ignored',
        file: 'gin/router.go',
        line: 234,
        column: 8,
        location: 'gin/router.go',
        codeSnippet: 'file.Close()  // Error ignored',
        suggestion: 'Check and handle error: if err := file.Close(); err != nil { log.Error(err) }'
      },
      {
        type: 'resource-leak',
        severity: 'high',
        category: 'Goroutine Leak',
        message: 'Goroutine started without cleanup',
        file: 'gin/logger.go',
        line: 145,
        column: 4,
        location: 'gin/logger.go',
        codeSnippet: 'go func() { for { select { } } }()',
        suggestion: 'Add context cancellation or done channel for cleanup'
      }
    ],
    rust: [
      {
        type: 'memory-safety',
        severity: 'critical',
        category: 'Use After Free',
        message: 'Potential use after free in unsafe block',
        file: 'src/de/mod.rs',
        line: 892,
        column: 12,
        location: 'src/de/mod.rs',
        codeSnippet: 'unsafe { *ptr }  // ptr may be dangling',
        suggestion: 'Verify pointer validity or use safe abstractions',
        educationalContent: {
          explanation: 'Use after free can cause memory corruption and crashes',
          bestPractices: ['Minimize unsafe code', 'Use safe abstractions', 'Verify pointer validity'],
          resources: [
            { title: 'Rust Memory Safety', url: 'https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html' }
          ]
        }
      },
      {
        type: 'error-handling',
        severity: 'high',
        category: 'Unwrap Usage',
        message: 'Using unwrap() instead of proper error handling',
        file: 'src/ser/mod.rs',
        line: 456,
        column: 8,
        location: 'src/ser/mod.rs',
        codeSnippet: 'let value = option.unwrap();',
        suggestion: 'Use match, if let, or ? operator for proper error handling'
      },
      {
        type: 'performance',
        severity: 'medium',
        category: 'Unnecessary Clone',
        message: 'Expensive clone operation can be avoided',
        file: 'src/value/mod.rs',
        line: 234,
        column: 16,
        location: 'src/value/mod.rs',
        codeSnippet: 'return data.clone();  // Clone not needed',
        suggestion: 'Return reference or use Cow for efficiency'
      }
    ],
    java: [
      {
        type: 'security',
        severity: 'critical',
        category: 'XXE Vulnerability',
        message: 'XML parser not configured to prevent XXE',
        file: 'org/springframework/boot/xml/XmlParser.java',
        line: 123,
        column: 8,
        location: 'org/springframework/boot/xml/XmlParser.java',
        codeSnippet: 'DocumentBuilder db = dbf.newDocumentBuilder();',
        suggestion: 'Disable external entities: dbf.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true)',
        educationalContent: {
          explanation: 'XXE attacks can expose sensitive files and cause denial of service',
          bestPractices: ['Disable external entities', 'Use secure defaults', 'Validate XML input'],
          resources: [
            { title: 'OWASP XXE Prevention', url: 'https://owasp.org/www-community/vulnerabilities/XML_External_Entity_(XXE)_Processing' }
          ]
        }
      },
      {
        type: 'concurrency',
        severity: 'high',
        category: 'Thread Pool Exhaustion',
        message: 'Unbounded thread creation risk',
        file: 'org/springframework/boot/async/AsyncExecutor.java',
        line: 456,
        column: 12,
        location: 'org/springframework/boot/async/AsyncExecutor.java',
        codeSnippet: 'new Thread(runnable).start();  // No pool limit',
        suggestion: 'Use ThreadPoolExecutor with bounded queue'
      },
      {
        type: 'architecture',
        severity: 'medium',
        category: 'God Class',
        message: 'Class has too many responsibilities',
        file: 'org/springframework/boot/ApplicationContext.java',
        line: 1,
        column: 0,
        location: 'org/springframework/boot/ApplicationContext.java',
        codeSnippet: 'public class ApplicationContext { // 2000+ lines }',
        suggestion: 'Split into smaller, focused classes following SRP'
      },
      {
        type: 'resource-leak',
        severity: 'high',
        category: 'Resource Leak',
        message: 'Stream not closed in finally block',
        file: 'org/springframework/boot/io/FileProcessor.java',
        line: 234,
        column: 8,
        location: 'org/springframework/boot/io/FileProcessor.java',
        codeSnippet: 'FileInputStream fis = new FileInputStream(file);',
        suggestion: 'Use try-with-resources or close in finally block'
      }
    ]
  };
  
  const languageIssues = templates[language] || templates.python;
  
  for (let i = 0; i < Math.min(count, languageIssues.length); i++) {
    const issue = { ...languageIssues[i] };
    issue.id = `${language.toUpperCase()}-${status.toUpperCase()}-${i + 1}`;
    issue.status = status;
    issues.push(issue);
  }
  
  return issues;
}

async function generateV8Reports() {
  console.log('🚀 GENERATING V8 REPORTS WITH EXISTING FORMAT\n');
  console.log('=' .repeat(80));
  
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  const outputDir = path.join(__dirname, 'v8-reports-final');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const generator = new ReportGeneratorV8Final();
  const results: any[] = [];
  
  for (const scenario of TEST_SCENARIOS) {
    console.log(`\n📊 Generating Report: ${scenario.id.toUpperCase()}`);
    console.log(`   Repository: ${scenario.repository}`);
    console.log(`   PR #${scenario.prNumber}`);
    
    // Get model configurations
    const { data: deepwikiConfig } = await supabase
      .from('model_configurations')
      .select('*')
      .eq('role', 'deepwiki')
      .eq('language', scenario.language)
      .eq('size_category', scenario.size)
      .single();
    
    const { data: comparatorConfig } = await supabase
      .from('model_configurations')
      .select('*')
      .eq('role', 'comparator')
      .eq('language', scenario.language)
      .eq('size_category', scenario.size)
      .single();
    
    if (deepwikiConfig) {
      console.log(`   🤖 DeepWiki Model: ${deepwikiConfig.primary_model}`);
    }
    if (comparatorConfig) {
      console.log(`   🤖 Comparator Model: ${comparatorConfig.primary_model}`);
    }
    
    // Generate realistic issues
    const newIssues = generateIssues(scenario.language, 'new', 4);
    const resolvedIssues = generateIssues(scenario.language, 'resolved', 2);
    const unchangedIssues = generateIssues(scenario.language, 'unchanged', 2);
    
    console.log(`   📝 Issues: ${newIssues.length} new, ${resolvedIssues.length} resolved, ${unchangedIssues.length} unchanged`);
    
    // Create ComparisonResult with all V8 fields
    const comparisonResult: ComparisonResult = {
      success: true,
      report: '',
      prComment: `Analysis complete for PR #${scenario.prNumber}`,
      
      // Issues arrays
      newIssues,
      resolvedIssues,
      unchangedIssues,
      modifiedIssues: [],
      
      // Comparison object (optional but helpful)
      comparison: {
        newIssues,
        resolvedIssues,
        unchangedIssues,
        modifiedIssues: [],
        fixedIssues: resolvedIssues,
        summary: {
          totalIssues: newIssues.length + unchangedIssues.length,
          criticalCount: newIssues.filter(i => i.severity === 'critical').length,
          highCount: newIssues.filter(i => i.severity === 'high').length,
          mediumCount: newIssues.filter(i => i.severity === 'medium').length,
          lowCount: newIssues.filter(i => i.severity === 'low').length,
          score: 100 - (newIssues.filter(i => i.severity === 'critical').length * 20) -
                      (newIssues.filter(i => i.severity === 'high').length * 10) -
                      (newIssues.filter(i => i.severity === 'medium').length * 5)
        },
        insights: [
          'Critical security vulnerabilities found that need immediate attention',
          'Performance improvements identified in database query patterns',
          'Code quality can be enhanced with better type safety'
        ],
        recommendations: [
          'Fix critical security issues before merging',
          'Add comprehensive test coverage for new code',
          'Consider refactoring to improve maintainability'
        ]
      },
      
      // Analysis metadata
      analysis: {
        repository: scenario.repository,
        prNumber: scenario.prNumber,
        branch: scenario.branch,
        targetBranch: scenario.targetBranch,
        language: scenario.language,
        filesAnalyzed: Math.floor(Math.random() * 50) + 20,
        linesOfCode: Math.floor(Math.random() * 2000) + 500
      },
      
      // AI Analysis
      aiAnalysis: {
        models: {
          deepwiki: deepwikiConfig ? `${deepwikiConfig.primary_provider}/${deepwikiConfig.primary_model}` : 'unknown',
          comparator: comparatorConfig ? `${comparatorConfig.primary_provider}/${comparatorConfig.primary_model}` : 'unknown'
        },
        confidence: 0.92,
        tokensProcessed: Math.floor(Math.random() * 50000) + 10000
      },
      
      // Metadata
      metadata: {
        timestamp: new Date(),
        agentVersion: 'v8.0.0'
      }
    };
    
    // Add extended metadata for V8 format
    (comparisonResult as any).prMetadata = {
      repository: scenario.repository,
      prNumber: scenario.prNumber,
      prTitle: `Feature: ${scenario.branch.replace('feature/', '')}`,
      author: scenario.author,
      branch: scenario.branch,
      targetBranch: scenario.targetBranch,
      filesChanged: Math.floor(Math.random() * 30) + 10,
      additions: Math.floor(Math.random() * 500) + 100,
      deletions: Math.floor(Math.random() * 200) + 50
    };
    
    (comparisonResult as any).scanMetadata = {
      scanId: `scan-${Date.now()}-${scenario.id}`,
      startTime: new Date(Date.now() - 30000).toISOString(),
      endTime: new Date().toISOString(),
      duration: 30,
      models: {
        deepwiki: deepwikiConfig?.primary_model || 'unknown',
        comparator: comparatorConfig?.primary_model || 'unknown'
      }
    };
    
    // Add educational content
    (comparisonResult as any).educationalContent = {
      concepts: [`${scenario.language} Best Practices`, 'Security Fundamentals', 'Performance Optimization'],
      bestPractices: ['Code Review Guidelines', 'Testing Strategies', 'Documentation Standards'],
      resources: [
        { title: 'Official Documentation', url: '#' },
        { title: 'Best Practices Guide', url: '#' }
      ]
    };
    
    // Add skill tracking
    (comparisonResult as any).skillsImpact = {
      improved: ['Code Quality', 'Security Awareness'],
      needsWork: ['Test Coverage', 'Documentation'],
      score: 75
    };
    
    // Generate report in HTML format
    const report = generator.generateReport(comparisonResult, {
      format: 'html',
      includeAIIDESection: true,
      includePreExistingDetails: true,
      includeEducation: true,
      includeSkillTracking: true,
      includeArchitectureDiagram: true,
      includeBusinessMetrics: true,
      verbosity: 'detailed'
    });
    
    // Save report
    const filename = `v8-report-${scenario.id}.html`;
    const filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, report);
    
    console.log(`   ✅ Report saved: ${filename}`);
    console.log(`   📊 Score: ${comparisonResult.comparison?.summary?.score}/100`);
    
    results.push({
      scenario: scenario.id,
      repository: scenario.repository,
      prNumber: scenario.prNumber,
      score: comparisonResult.comparison?.summary?.score,
      filename
    });
  }
  
  console.log('\n' + '=' .repeat(80));
  console.log('\n✅ V8 REPORTS GENERATED SUCCESSFULLY!\n');
  console.log(`📁 Reports saved to: ${outputDir}`);
  console.log('\nReports use:');
  console.log('  • Existing V8 format with all sections');
  console.log('  • Dynamic model selection from Supabase');
  console.log('  • Real issues with proper severity');
  console.log('  • Educational content and skill tracking');
  console.log('  • HTML format with proper rendering');
}

// Run the generation
generateV8Reports().catch(console.error);