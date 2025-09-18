#!/usr/bin/env npx ts-node

/**
 * V9 Complete Report Generation Test
 * 
 * This test demonstrates the full V9 analyzer framework with:
 * - Two-branch analysis (main vs PR)
 * - Complete metadata collection
 * - Full report generation with all 21 required sections
 * - Proper report storage in standardized location
 */

import * as fs from 'fs';
import * as path from 'path';
import { V9ReportFormatterAllSections, CompleteMetadata } from '../analyzers/v9-report-formatter-all-sections';
import { V9_DEFAULT_CONFIG } from '../templates/v9-template-config';
import { 
  Issue, 
  AnalysisResult, 
  ReportOptions,
  IssueSeverity,
  IssueCategory
} from '../analyzers/v9-types';

class V9CompleteReportTest {
  private reportFormatter: V9ReportFormatterAllSections;
  
  constructor() {
    this.reportFormatter = new V9ReportFormatterAllSections();
  }
  
  async runTest(): Promise<void> {
    console.log('🚀 V9 Complete Report Generation Test');
    console.log('=' .repeat(60));
    
    const startTime = new Date();
    
    // Simulate real analysis from Apache Kafka PR #17620
    const analysisResult = this.createMockAnalysisResult();
    const metadata = this.createCompleteMetadata(startTime);
    
    console.log(`\n📊 Generating report for: ${metadata.repository} PR #${metadata.prNumber}`);
    console.log(`📈 Quality Score: ${analysisResult.qualityScore}/100`);
    console.log(`🎯 Decision: ${analysisResult.decision.toUpperCase()}`);
    
    // Generate the complete report
    const report = await this.reportFormatter.generateCompleteReport(
      analysisResult,
      metadata,
      'java',
      {
        format: 'markdown',
        includeCodeSnippets: true,
        includeEducationalResources: true,
        includeBusinessImpact: true,
        includeSkillScore: true,
        groupSimilarIssues: false
      }
    );
    
    // Save to standardized location
    const reportDir = path.join(__dirname, '..', 'test-results', 'reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const reportPath = path.join(
      reportDir,
      `v9-apache-kafka-pr17620-${timestamp}.md`
    );
    
    fs.writeFileSync(reportPath, report);
    
    // Verify all required sections are present
    const requiredSections = V9_DEFAULT_CONFIG.reportSections
      .filter(s => s.required)
      .map(s => s.title);
    
    console.log('\n✅ Verifying Required Sections:');
    let allSectionsPresent = true;
    
    for (const section of requiredSections) {
      const present = report.includes(section);
      console.log(`   ${present ? '✅' : '❌'} ${section}`);
      if (!present) allSectionsPresent = false;
    }
    
    // Report statistics
    console.log('\n📊 Report Statistics:');
    console.log(`   Lines: ${report.split('\n').length}`);
    console.log(`   Characters: ${report.length}`);
    console.log(`   Sections: ${requiredSections.length} required`);
    console.log(`   Issues: ${analysisResult.newIssues.length + analysisResult.existingIssues.length} total`);
    console.log(`   Agents: ${metadata.agentsUsed.length}`);
    console.log(`   Tools: ${metadata.toolsUsed.length}`);
    console.log(`   Cost: $${metadata.totalCost.toFixed(4)}`);
    
    console.log('\n' + '=' .repeat(60));
    console.log(`✅ Report generated successfully!`);
    console.log(`📄 Saved to: ${reportPath}`);
    console.log(`✨ All required sections: ${allSectionsPresent ? 'PRESENT' : 'MISSING SOME'}`);
  }
  
  private createMockAnalysisResult(): AnalysisResult {
    return {
      qualityScore: 72.5,
      grade: 'C',
      decision: 'rejected',
      reason: 'Critical security vulnerabilities detected: SQL injection in query construction and race conditions in concurrent code. These must be fixed before merge.',
      confidence: 0.95,
      
      newIssues: [
        {
          id: 'SEC-001',
          category: 'Security' as IssueCategory,
          severity: 'critical' as IssueSeverity,
          status: 'new' as any,
          title: 'SQL Injection Vulnerability',
          description: 'SQL injection vulnerability: String concatenation used in SQL query construction',
          file: 'core/src/main/java/kafka/controller/QuorumController.java',
          line: 245,
          tool: 'semgrep',
          agent: 'SecurityAnalyzer',
          impact: 'Critical security vulnerability that could allow attackers to manipulate database queries',
          businessImpact: 'Potential data breach and compliance violations',
          codeSnippet: 'String query = "UPDATE leadership SET leader=" + newLeader.leaderId();',
          suggestedFix: 'Use PreparedStatement with parameterized queries instead of string concatenation',
          suggestedCodeSnippet: 'PreparedStatement stmt = conn.prepareStatement("UPDATE leadership SET leader = ?");\nstmt.setInt(1, newLeader.leaderId());',
          inModifiedFile: true
        },
        {
          id: 'PERF-001',
          category: 'Performance' as IssueCategory,
          severity: 'high' as IssueSeverity,
          status: 'new' as any,
          title: 'Race Condition in Leader Election',
          description: 'Race condition detected: Unsynchronized access to shared mutable state',
          file: 'core/src/main/java/kafka/controller/QuorumController.java',
          line: 187,
          tool: 'spotbugs',
          agent: 'PerformanceAnalyzer',
          impact: 'Could lead to data inconsistency and unexpected behavior in concurrent scenarios',
          businessImpact: 'System instability and potential data corruption',
          codeSnippet: 'if (newLeader.epoch() > currentLeader.epoch()) {\n    currentLeader = newLeader;',
          suggestedFix: 'Add proper synchronization using synchronized blocks or concurrent utilities',
          suggestedCodeSnippet: 'synchronized(this) {\n    if (newLeader.epoch() > currentLeader.epoch()) {\n        currentLeader = newLeader;',
          inModifiedFile: true
        },
        {
          id: 'QUAL-001',
          category: 'Quality' as IssueCategory,
          severity: 'medium' as IssueSeverity,
          status: 'new' as any,
          title: 'Potential NullPointerException',
          description: 'Potential NullPointerException: currentLeader accessed without null check',
          file: 'core/src/main/java/kafka/controller/QuorumController.java',
          line: 156,
          tool: 'pmd',
          agent: 'QualityAnalyzer',
          impact: 'Could cause application crashes if currentLeader is null',
          businessImpact: 'Service interruption and poor user experience',
          codeSnippet: 'currentLeader.epoch()',
          suggestedFix: 'Add null check before accessing currentLeader.epoch()',
          suggestedCodeSnippet: 'if (currentLeader != null) { currentLeader.epoch() }',
          inModifiedFile: true
        }
      ],
      
      existingIssues: [
        {
          id: 'DEP-001',
          category: 'Dependency' as IssueCategory,
          severity: 'critical' as IssueSeverity,
          status: 'existing' as any,
          title: 'Vulnerable Jackson Databind',
          description: 'Jackson Databind 2.9.8 has known deserialization vulnerability CVE-2019-12428',
          file: 'build.gradle',
          line: 145,
          tool: 'dependency-check',
          agent: 'DependencyAnalyzer',
          impact: 'Remote code execution vulnerability through unsafe deserialization',
          businessImpact: 'Critical security risk - potential system compromise',
          codeSnippet: 'implementation "com.fasterxml.jackson.core:jackson-databind:2.9.8"',
          suggestedFix: 'Upgrade to Jackson Databind 2.13.0 or later',
          suggestedCodeSnippet: 'implementation "com.fasterxml.jackson.core:jackson-databind:2.13.0"',
          inModifiedFile: false
        },
        {
          id: 'DEP-002',
          category: 'Dependency' as IssueCategory,
          severity: 'critical' as IssueSeverity,
          status: 'existing' as any,
          title: 'Log4j Core Log4Shell Vulnerability',
          description: 'Log4j Core 2.14.1 vulnerable to Log4Shell (CVE-2021-44228)',
          file: 'build.gradle',
          line: 152,
          tool: 'dependency-check',
          agent: 'DependencyAnalyzer',
          impact: 'Remote code execution through JNDI injection',
          businessImpact: 'Critical security risk - complete system compromise possible',
          codeSnippet: 'implementation "org.apache.logging.log4j:log4j-core:2.14.1"',
          suggestedFix: 'Upgrade to Log4j Core 2.20.0 or later',
          suggestedCodeSnippet: 'implementation "org.apache.logging.log4j:log4j-core:2.20.0"',
          inModifiedFile: false
        },
        {
          id: 'ARCH-001',
          category: 'Architecture' as IssueCategory,
          severity: 'medium' as IssueSeverity,
          status: 'existing' as any,
          title: 'Improper Layer Separation',
          description: 'Controller logic mixed with broker responsibilities',
          file: 'core/src/main/scala/kafka/server/BrokerServer.scala',
          line: 89,
          tool: 'architecture-analyzer',
          agent: 'ArchitectureAnalyzer',
          impact: 'Poor maintainability and increased coupling between components',
          businessImpact: 'Increased development and maintenance costs',
          codeSnippet: 'class BrokerServer extends ControllerLogic',
          suggestedFix: 'Separate controller and broker concerns into distinct components',
          suggestedCodeSnippet: 'Refactor into separate Controller and Broker services',
          inModifiedFile: false
        },
        {
          id: 'QUAL-002',
          category: 'Quality' as IssueCategory,
          severity: 'low' as IssueSeverity,
          status: 'existing' as any,
          title: 'Technical Debt Accumulation',
          description: 'Found 234 TODO/FIXME comments indicating technical debt',
          file: 'multiple',
          line: 0,
          tool: 'code-quality',
          agent: 'QualityAnalyzer',
          impact: 'Accumulated technical debt impacting code quality',
          businessImpact: 'Delayed feature delivery and increased bug risk',
          codeSnippet: '// TODO: Fix this later',
          suggestedFix: 'Create tickets to address technical debt items',
          suggestedCodeSnippet: 'Track and prioritize technical debt in issue tracker',
          inModifiedFile: false
        }
      ],
      
      resolvedIssues: [
        {
          id: 'PERF-002',
          category: 'Performance' as IssueCategory,
          severity: 'high' as IssueSeverity,
          status: 'resolved' as any,
          title: 'N+1 Query Pattern Fixed',
          description: 'N+1 query pattern in metadata loading - FIXED',
          file: 'core/src/main/java/kafka/metadata/MetadataLoader.java',
          line: 234,
          tool: 'performance-analyzer',
          agent: 'PerformanceAnalyzer',
          impact: 'Reduced database load and improved performance',
          businessImpact: 'Better system scalability and reduced infrastructure costs',
          codeSnippet: 'for (String id : ids) { loadMetadata(id); }',
          suggestedFix: 'Batch loading implementation resolved this issue',
          suggestedCodeSnippet: 'loadMetadataBatch(ids);',
          inModifiedFile: true
        },
        {
          id: 'SEC-002',
          category: 'Security' as IssueCategory,
          severity: 'high' as IssueSeverity,
          status: 'resolved' as any,
          title: 'Weak Password Hashing Fixed',
          description: 'MD5 used for password hashing - FIXED',
          file: 'core/src/main/java/kafka/security/SecurityManager.java',
          line: 188,
          tool: 'security-analyzer',
          agent: 'SecurityAnalyzer',
          impact: 'Eliminated weak cryptography vulnerability',
          businessImpact: 'Improved security compliance and reduced breach risk',
          codeSnippet: 'MD5.hash(password)',
          suggestedFix: 'Replaced with bcrypt implementation',
          suggestedCodeSnippet: 'BCrypt.hashpw(password, BCrypt.gensalt(12))',
          inModifiedFile: true
        }
      ],
      
      blockingIssues: [],
      backlogIssues: [],
      
      modifiedFiles: [
        'core/src/main/java/kafka/controller/QuorumController.java',
        'core/src/main/java/kafka/metadata/MetadataLoader.java',
        'core/src/main/java/kafka/security/SecurityManager.java',
        'core/src/main/scala/kafka/server/ControllerServer.scala'
      ],
      
      metadata: {
        repository: 'apache/kafka',
        prNumber: 17620,
        branch: 'pr-17620',
        language: 'java',
        totalFiles: 5579,
        modifiedFiles: 4,
        analysisTime: 98000,
        tools: ['semgrep', 'spotbugs', 'dependency-check', 'pmd'],
        timestamp: new Date().toISOString(),
        analyzedAt: new Date().toISOString(),
        analyzer: 'V9AnalyzerFramework',
        repoUrl: 'https://github.com/apache/kafka',
        executionTime: 98000
      },
      
      skillScore: {
        developer: 'urbandan',
        score: 72.5,
        trend: [65, 68, 70, 72.5],
        categories: {
          security: 45,
          performance: 78,
          quality: 85,
          architecture: 90,
          dependency: 40
        },
        recommendations: [
          'Focus on secure coding practices',
          'Review OWASP guidelines for SQL injection prevention',
          'Study concurrent programming patterns'
        ]
      },
      
      educationalResources: [
        {
          type: 'tutorial' as const,
          title: 'Secure Coding in Java',
          description: 'Comprehensive course on secure Java development practices',
          url: 'https://www.coursera.org/learn/secure-coding-java'
        },
        {
          type: 'documentation' as const,
          title: 'OWASP SQL Injection Prevention Cheat Sheet',
          description: 'Best practices for preventing SQL injection attacks',
          url: 'https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html'
        },
        {
          type: 'video' as const,
          title: 'Java Concurrency and Race Conditions',
          description: 'Deep dive into concurrent programming in Java',
          url: 'https://www.youtube.com/watch?v=example'
        }
      ],
      
      businessImpact: {
        summary: 'Critical security vulnerabilities pose immediate risk to production systems',
        immediateRisk: 'SQL injection and race conditions could be exploited immediately',
        futureRisk: 'Technical debt accumulation will slow future development',
        financialImpact: {
          fixCost: '$1,200 (8 hours of developer time)',
          exploitCost: '$50,000+ potential breach costs',
          roi: '41.7x return on fixing vulnerabilities'
        },
        riskMatrix: [
          {
            category: 'Security',
            blockingRisk: 2,
            backlogRisk: 0,
            score: 'Critical'
          },
          {
            category: 'Performance',
            blockingRisk: 1,
            backlogRisk: 0,
            score: 'High'
          },
          {
            category: 'Dependencies',
            blockingRisk: 0,
            backlogRisk: 2,
            score: 'Critical'
          },
          {
            category: 'Quality',
            blockingRisk: 0,
            backlogRisk: 2,
            score: 'Medium'
          },
          {
            category: 'Architecture',
            blockingRisk: 0,
            backlogRisk: 1,
            score: 'Medium'
          }
        ]
      }
    };
  }
  
  private createCompleteMetadata(startTime: Date): CompleteMetadata {
    const endTime = new Date();
    
    return {
      // Repository Information
      repository: 'apache/kafka',
      repoUrl: 'https://github.com/apache/kafka',
      prNumber: 17620,
      prTitle: 'KAFKA-17632: Fix RoundRobinPartitioner for even partition counts',
      branch: 'pr-17620',
      baseBranch: 'trunk',
      
      // Author Information
      prAuthor: 'urbandan',
      prAuthorEmail: 'urbandan@apache.org',
      repoOwner: 'apache',
      organizationName: 'Apache Software Foundation',
      
      // Code Statistics
      totalLinesOfCode: 485000,
      linesAdded: 245,
      linesDeleted: 89,
      linesModified: 156,
      filesModified: 4,
      totalFiles: 5579,
      languageBreakdown: {
        'Java': 420000,
        'Scala': 45000,
        'Python': 12000,
        'Shell': 5000,
        'XML': 3000
      },
      
      // Performance Metrics
      totalDuration: endTime.getTime() - startTime.getTime(),
      cloneTime: 12000,
      analysisTime: 98000,
      reportGenerationTime: 5350,
      
      // Agent Performance
      agentsUsed: [
        {
          agentName: 'SecurityAnalyzer',
          executionTime: 15230,
          issuesFound: 2,
          filesAnalyzed: 5579,  // Full scan for repos < 10,000 files
          tokensUsed: 3450,
          modelUsed: {
            provider: 'openrouter',
            model: 'claude-3-opus',
            temperature: 0.1
          },
          cost: 0.0345,
          status: 'success'
        },
        {
          agentName: 'PerformanceAnalyzer',
          executionTime: 18560,
          issuesFound: 1,
          filesAnalyzed: 5579,
          tokensUsed: 2890,
          modelUsed: {
            provider: 'deepseek',
            model: 'deepseek-chat-v3.1',
            temperature: 0.1
          },
          cost: 0.2674,
          status: 'success'
        },
        {
          agentName: 'QualityAnalyzer',
          executionTime: 19800,
          issuesFound: 2,
          filesAnalyzed: 5579,
          tokensUsed: 1400,
          modelUsed: {
            provider: 'deepseek',
            model: 'deepseek-r1-distill-llama-8b',
            temperature: 0.1
          },
          cost: 0.4601,
          status: 'success'
        },
        {
          agentName: 'DependencyAnalyzer',
          executionTime: 18270,
          issuesFound: 2,
          filesAnalyzed: 5,
          tokensUsed: 1206,
          modelUsed: {
            provider: 'deepseek',
            model: 'deepseek-r1-distill-llama-8b',
            temperature: 0.1
          },
          cost: 0.3963,
          status: 'success'
        },
        {
          agentName: 'ArchitectureAnalyzer',
          executionTime: 12130,
          issuesFound: 1,
          filesAnalyzed: 5579,
          tokensUsed: 1942,
          modelUsed: {
            provider: 'google',
            model: 'gemini-2.5-flash',
            temperature: 0.1
          },
          cost: 0.0019,
          status: 'success'
        },
        {
          agentName: 'EducatorAgent',
          executionTime: 24640,
          issuesFound: 0,
          filesAnalyzed: 5579,
          tokensUsed: 1507,
          modelUsed: {
            provider: 'deepseek',
            model: 'deepseek-r1-distill-llama-8b',
            temperature: 0.2
          },
          cost: 0.4953,
          status: 'success'
        }
      ],
      
      // Tool Performance
      toolsUsed: [
        {
          toolName: 'semgrep',
          executionTime: 8500,
          filesScanned: 245,
          issuesFound: 3,
          exitCode: 0,
          stdout: 'Found 3 security issues',
          stderr: ''
        },
        {
          toolName: 'spotbugs',
          executionTime: 12000,
          filesScanned: 420,
          issuesFound: 2,
          exitCode: 0,
          stdout: 'Found 2 bugs in 420 files',
          stderr: ''
        },
        {
          toolName: 'dependency-check',
          executionTime: 15000,
          filesScanned: 5,
          issuesFound: 2,
          exitCode: 0,
          stdout: 'Found 2 vulnerable dependencies',
          stderr: ''
        },
        {
          toolName: 'pmd',
          executionTime: 9500,
          filesScanned: 312,
          issuesFound: 1,
          exitCode: 0,
          stdout: 'Found 1 code quality issue',
          stderr: ''
        }
      ],
      
      // Cost Analysis
      totalCost: 1.6555,
      costBreakdown: {
        aiModels: 1.6555,
        infrastructure: 0.0001,
        tools: 0.0000
      },
      estimatedMonthlyCost: 248.32,
      
      // Analysis Configuration
      analyzer: 'V9AnalyzerFramework',
      analyzerVersion: '9.0.0',
      smartFileSelection: false,  // Should be false for repos < 10,000 files
      maxFilesAnalyzed: 5579,     // Should analyze ALL files when < 10,000
      
      // Timestamps
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      timestamp: new Date().toISOString()
    };
  }
}

// Run the test
async function main() {
  const test = new V9CompleteReportTest();
  await test.runTest();
}

main().catch(console.error);