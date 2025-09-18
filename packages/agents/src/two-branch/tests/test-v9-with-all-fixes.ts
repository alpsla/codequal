/**
 * V9 Test with All Fixes Applied
 * Tests the enhanced formatter with:
 * - Fixed category statistics
 * - Phased educational content
 * - Team skills tracking placeholder
 * - Clear performance metrics
 * - No duplicate content
 */

import { createClient } from '@supabase/supabase-js';
import { V9ReportFormatterFinal } from '../analyzers/v9-report-formatter-final';
import {
  AnalysisResult,
  Issue,
  IssueCategory,
  IssueSeverity,
  IssueStatus,
  BusinessImpact,
  SkillScore
} from '../analyzers/v9-types';
import { CompleteMetadata } from '../analyzers/v9-report-formatter-final';
import * as fs from 'fs';
import * as path from 'path';

// Supabase setup with fallback
const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';
const supabase = createClient(supabaseUrl, supabaseKey);

class V9TestWithFixes {
  private formatter: V9ReportFormatterFinal;
  
  constructor() {
    this.formatter = new V9ReportFormatterFinal();
  }
  
  async runTest() {
    console.log('🚀 V9 Test with All Fixes Applied');
    console.log('=' .repeat(60));
    
    // Create test data
    const result = this.createTestResult();
    const metadata = this.createTestMetadata();
    
    // Generate report
    const report = await this.formatter.generateCompleteReport(
      result,
      metadata,
      'java'
    );
    
    // Validate fixes
    this.validateFixes(report);
    
    // Save report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(
      __dirname,
      '../test-results/reports',
      `v9-with-all-fixes-${timestamp}.md`
    );
    
    // Ensure directory exists
    const dir = path.dirname(reportPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, report);
    
    console.log('\n✅ All fixes validated successfully!');
    console.log(`📄 Report saved to: ${reportPath}`);
    
    // Display key statistics
    console.log('\n📊 Report Validation Results:');
    console.log('   ✅ Category percentages calculated correctly');
    console.log('   ✅ Phased educational content included');
    console.log('   ✅ Team skills tracking placeholder added');
    console.log('   ✅ Performance metrics clearly separated');
    console.log('   ✅ No duplicate content after PR comment');
    
    return report;
  }
  
  private createTestResult(): AnalysisResult {
    const newIssues = this.createNewIssues();
    const existingIssues = this.createExistingIssues();
    const resolvedIssues = this.createResolvedIssues();
    
    // Populate blocking and backlog issues
    const blockingIssues = newIssues.filter(i => 
      i.severity === 'critical' || i.severity === 'high'
    );
    const backlogIssues = existingIssues;
    
    return {
      qualityScore: 72.5,
      grade: 'C',
      decision: 'rejected',
      reason: 'Critical security vulnerabilities detected: SQL injection in query construction and race conditions in concurrent code. These must be fixed before merge.',
      confidence: 0.95,
      
      newIssues,
      existingIssues,
      resolvedIssues,
      blockingIssues,
      backlogIssues,
        {
          id: 'SEC-001',
          category: 'Security' as IssueCategory,
          severity: 'critical' as IssueSeverity,
          status: 'new' as IssueStatus,
          title: 'SQL Injection Vulnerability in Query Construction',
          description: 'Direct string concatenation used in SQL query construction allowing potential SQL injection attacks',
          file: 'core/src/main/java/kafka/controller/QuorumController.java',
          line: 245,
          tool: 'semgrep',
          agent: 'SecurityAnalyzer',
          impact: 'Critical security vulnerability that could allow attackers to execute arbitrary SQL commands',
          businessImpact: 'Potential data breach, compliance violations (GDPR, SOC2), and reputational damage',
          codeSnippet: 'String query = "UPDATE leadership SET leader=" + newLeader.leaderId() + " WHERE topic=" + topic;',
          suggestedFix: 'Use PreparedStatement with parameterized queries to prevent SQL injection',
          suggestedCodeSnippet: 'PreparedStatement stmt = conn.prepareStatement("UPDATE leadership SET leader = ? WHERE topic = ?");\\nstmt.setInt(1, newLeader.leaderId());\\nstmt.setString(2, topic);\\nstmt.executeUpdate();',
          inModifiedFile: true
        },
        {
          id: 'PERF-001',
          category: 'Performance' as IssueCategory,
          severity: 'high' as IssueSeverity,
          status: 'new' as IssueStatus,
          title: 'Race Condition in Leader Election Process',
          description: 'Unsynchronized access to shared mutable state during leader election can cause data inconsistency',
          file: 'core/src/main/java/kafka/controller/QuorumController.java',
          line: 187,
          tool: 'spotbugs',
          agent: 'PerformanceAnalyzer',
          impact: 'Could lead to split-brain scenarios, data inconsistency, and cluster instability',
          businessImpact: 'System downtime, data loss, and reduced reliability affecting SLAs',
          codeSnippet: 'if (newLeader.epoch() > currentLeader.epoch()) {\\n    currentLeader = newLeader;\\n    notifyListeners();\\n}',
          suggestedFix: 'Add proper synchronization using ReentrantLock or synchronized blocks',
          suggestedCodeSnippet: 'leaderLock.lock();\\ntry {\\n    if (newLeader.epoch() > currentLeader.epoch()) {\\n        currentLeader = newLeader;\\n        notifyListeners();\\n    }\\n} finally {\\n    leaderLock.unlock();\\n}',
          inModifiedFile: true
        },
        {
          id: 'QUAL-001',
          category: 'Quality' as IssueCategory,
          severity: 'medium' as IssueSeverity,
          status: 'new' as IssueStatus,
          title: 'Missing Null Check for Critical Object',
          description: 'currentLeader object accessed without null check, risking NullPointerException',
          file: 'core/src/main/java/kafka/controller/QuorumController.java',
          line: 156,
          tool: 'pmd',
          agent: 'QualityAnalyzer',
          impact: 'Application crashes and service interruption when currentLeader is null',
          businessImpact: 'Service disruptions affecting user experience and reliability metrics',
          codeSnippet: 'int epoch = currentLeader.epoch();',
          suggestedFix: 'Add defensive null check before accessing currentLeader properties',
          suggestedCodeSnippet: 'if (currentLeader != null) {\\n    int epoch = currentLeader.epoch();\\n    // ... rest of logic\\n} else {\\n    handleNoLeaderScenario();\\n}',
          inModifiedFile: true
        }
      ],
      
      existingIssues: [
        {
          id: 'DEP-001',
          category: 'Dependency' as IssueCategory,
          severity: 'critical' as IssueSeverity,
          status: 'existing' as IssueStatus,
          title: 'Jackson Databind Deserialization Vulnerability (CVE-2019-12428)',
          description: 'Jackson Databind 2.9.8 has known remote code execution vulnerability through unsafe deserialization',
          file: 'build.gradle',
          line: 145,
          tool: 'dependency-check',
          agent: 'DependencyAnalyzer',
          impact: 'Remote code execution allowing complete system compromise',
          businessImpact: 'Critical security risk with potential for complete system takeover and data exfiltration',
          codeSnippet: 'implementation "com.fasterxml.jackson.core:jackson-databind:2.9.8"',
          suggestedFix: 'Upgrade to Jackson Databind 2.15.3 or later which fixes this vulnerability',
          suggestedCodeSnippet: 'implementation "com.fasterxml.jackson.core:jackson-databind:2.15.3"',
          inModifiedFile: false
        },
        {
          id: 'DEP-002',
          category: 'Dependency' as IssueCategory,
          severity: 'critical' as IssueSeverity,
          status: 'existing' as IssueStatus,
          title: 'Log4j Remote Code Execution (Log4Shell - CVE-2021-44228)',
          description: 'Log4j Core 2.14.1 vulnerable to remote code execution via JNDI injection',
          file: 'build.gradle',
          line: 152,
          tool: 'dependency-check',
          agent: 'DependencyAnalyzer',
          impact: 'Unauthenticated remote code execution with minimal complexity',
          businessImpact: 'Highest severity vulnerability allowing complete compromise of affected systems',
          codeSnippet: 'implementation "org.apache.logging.log4j:log4j-core:2.14.1"',
          suggestedFix: 'Immediately upgrade to Log4j Core 2.21.0 or later',
          suggestedCodeSnippet: 'implementation "org.apache.logging.log4j:log4j-core:2.21.0"',
          inModifiedFile: false
        },
        {
          id: 'ARCH-001',
          category: 'Architecture' as IssueCategory,
          severity: 'medium' as IssueSeverity,
          status: 'existing' as IssueStatus,
          title: 'Violation of Single Responsibility Principle',
          description: 'BrokerServer class mixing controller and broker responsibilities violates separation of concerns',
          file: 'core/src/main/scala/kafka/server/BrokerServer.scala',
          line: 89,
          tool: 'architecture-analyzer',
          agent: 'ArchitectureAnalyzer',
          impact: 'Increased complexity, harder testing, and reduced maintainability',
          businessImpact: 'Higher maintenance costs and slower feature development',
          codeSnippet: 'class BrokerServer extends ControllerLogic with NetworkServer {',
          suggestedFix: 'Refactor into separate Controller and Broker services with clear interfaces',
          suggestedCodeSnippet: 'class BrokerServer(controller: Controller) extends NetworkServer {\\n  // Broker-specific logic only\\n}\\n\\nclass Controller extends ControllerLogic {\\n  // Controller-specific logic only\\n}',
          inModifiedFile: false
        },
        {
          id: 'QUAL-002',
          category: 'Quality' as IssueCategory,
          severity: 'low' as IssueSeverity,
          status: 'existing' as IssueStatus,
          title: 'Excessive Technical Debt Comments',
          description: 'Found 234 TODO/FIXME comments indicating significant technical debt accumulation',
          file: 'multiple',
          line: 0,
          tool: 'code-quality',
          agent: 'QualityAnalyzer',
          impact: 'Accumulated technical debt affecting code quality and velocity',
          businessImpact: 'Reduced development velocity and increased bug risk over time',
          codeSnippet: '// TODO: Fix this temporary workaround\\n// FIXME: This is a hack that needs proper implementation',
          suggestedFix: 'Create JIRA tickets for each TODO/FIXME and prioritize in sprint planning',
          suggestedCodeSnippet: '// KAFKA-XXXX: Implement proper error handling\\n// Tracked in backlog for Q2 2025',
          inModifiedFile: false
        }
      ],
      
      resolvedIssues: [
        {
          id: 'PERF-002',
          category: 'Performance' as IssueCategory,
          severity: 'high' as IssueSeverity,
          status: 'resolved' as IssueStatus,
          title: 'N+1 Query Pattern in Metadata Loading',
          description: 'Inefficient database access pattern causing performance degradation - NOW FIXED',
          file: 'core/src/main/java/kafka/metadata/MetadataLoader.java',
          line: 234,
          tool: 'performance-analyzer',
          agent: 'PerformanceAnalyzer',
          impact: 'Resolved: Previously caused 10x slower metadata loading',
          businessImpact: 'Resolved: System is now 10x faster for metadata operations',
          codeSnippet: '// Fixed by batch loading',
          suggestedFix: 'Already fixed in this PR',
          suggestedCodeSnippet: '// Batch loading implemented',
          inModifiedFile: true
        },
        {
          id: 'SEC-002',
          category: 'Security' as IssueCategory,
          severity: 'high' as IssueSeverity,
          status: 'resolved' as IssueStatus,
          title: 'Hardcoded Credentials in Configuration',
          description: 'Credentials were hardcoded in config files - NOW REMOVED',
          file: 'config/server.properties',
          line: 45,
          tool: 'secrets-scanner',
          agent: 'SecurityAnalyzer',
          impact: 'Resolved: Credentials now use environment variables',
          businessImpact: 'Resolved: Security posture significantly improved',
          codeSnippet: '// Removed hardcoded values',
          suggestedFix: 'Already fixed in this PR',
          suggestedCodeSnippet: '// Using env vars now',
          inModifiedFile: true
        }
      ],
      
      businessImpact: {
        summary: 'Critical security vulnerabilities pose immediate risk to production systems',
        immediateRisk: 'HIGH - SQL injection and race conditions could be exploited immediately',
        futureRisk: 'MEDIUM - Technical debt will slow future development',
        financialImpact: {
          fixCost: '$15,000 (100 dev hours)',
          exploitCost: '$500,000+ (potential breach)',
          roi: '33x return on security investment'
        },
        riskMatrix: [
          { category: 'Security', blockingRisk: 95, backlogRisk: 85, score: '95' },
          { category: 'Performance', blockingRisk: 75, backlogRisk: 60, score: '75' },
          { category: 'Quality', blockingRisk: 25, backlogRisk: 45, score: '45' },
          { category: 'Architecture', blockingRisk: 0, backlogRisk: 50, score: '35' },
          { category: 'Dependency', blockingRisk: 85, backlogRisk: 95, score: '85' }
        ]
      },
      
      skillScore: {
        developer: 'urbandan',
        score: 75,
        trend: [68, 72, 75],
        categories: {
          security: 45,
          performance: 75,
          quality: 80,
          architecture: 85,
          dependency: 35
        },
        recommendations: [
          'Take SQL injection prevention training immediately',
          'Review Java concurrency best practices',
          'Set up automated dependency scanning in CI/CD',
          'Attend architecture design patterns workshop'
        ]
      },
      
      // Additional required fields
      blockingIssues: [], // Will be populated from newIssues with critical/high
      backlogIssues: [],  // Will be populated from existing issues
      modifiedFiles: [
        'core/src/main/java/kafka/controller/QuorumController.java',
        'core/src/main/java/kafka/metadata/MetadataLoader.java',
        'config/server.properties',
        'build.gradle'
      ],
      metadata: {
        repository: 'apache/kafka',
        branch: 'pr-17620',
        baseBranch: 'trunk',
        filesAnalyzed: 5579,
        totalFiles: 5579,
        analyzedAt: new Date().toISOString(),
        analyzer: 'V9 Framework',
        repoUrl: 'https://github.com/apache/kafka',
        executionTime: 115350,
        model: {
          provider: 'openrouter',
          models: ['claude-3.5-sonnet', 'deepseek-chat', 'gemini-2.0-flash-exp']
        }
      }
    };
  }
  
  private createTestMetadata(): CompleteMetadata {
    const totalFiles = 5579;
    const shouldFullScan = totalFiles < 10000;
    
    return {
      repository: 'apache/kafka',
      repoUrl: 'https://github.com/apache/kafka',
      prNumber: 17620,
      prTitle: 'KAFKA-17632: Fix RoundRobinPartitioner for even partition counts',
      branch: 'pr-17620',
      baseBranch: 'trunk',
      
      prAuthor: 'urbandan',
      prAuthorEmail: 'urbandan@apache.org',
      repoOwner: 'apache',
      organizationName: 'Apache Software Foundation',
      
      totalLinesOfCode: 485000,
      linesAdded: 245,
      linesDeleted: 89,
      linesModified: 334,
      filesModified: 4,
      totalFiles: totalFiles,
      languageBreakdown: {
        'Java': 65,
        'Scala': 20,
        'Python': 10,
        'Shell': 5
      },
      
      // Fixed performance metrics - clear and not confusing
      totalDuration: 115350, // Total time for everything
      cloneTime: 12000,      // 12 seconds
      analysisTime: 98000,   // 98 seconds
      reportGenerationTime: 5350, // 5.35 seconds
      
      agentsUsed: [
        {
          agentName: 'SecurityAnalyzer',
          executionTime: 25000,
          issuesFound: 1,
          filesAnalyzed: 1500,
          tokensUsed: 45000,
          modelUsed: {
            provider: 'openrouter',
            model: 'anthropic/claude-3.5-sonnet',
            temperature: 0.1
          },
          cost: 0.135,
          status: 'completed'
        },
        {
          agentName: 'PerformanceAnalyzer',
          executionTime: 18000,
          issuesFound: 1,
          filesAnalyzed: 1200,
          tokensUsed: 32000,
          modelUsed: {
            provider: 'openrouter',
            model: 'deepseek/deepseek-chat',
            temperature: 0.1
          },
          cost: 0.0064,
          status: 'completed'
        },
        {
          agentName: 'QualityAnalyzer',
          executionTime: 22000,
          issuesFound: 2,
          filesAnalyzed: 1879,
          tokensUsed: 28000,
          modelUsed: {
            provider: 'openrouter',
            model: 'google/gemini-2.0-flash-exp',
            temperature: 0.1
          },
          cost: 0.0028,
          status: 'completed'
        },
        {
          agentName: 'DependencyAnalyzer',
          executionTime: 8000,
          issuesFound: 2,
          filesAnalyzed: 50,
          tokensUsed: 15000,
          modelUsed: {
            provider: 'openrouter',
            model: 'meta-llama/llama-3.1-8b-instruct',
            temperature: 0.1
          },
          cost: 0.003,
          status: 'completed'
        },
        {
          agentName: 'ArchitectureAnalyzer',
          executionTime: 25000,
          issuesFound: 1,
          filesAnalyzed: 950,
          tokensUsed: 38000,
          modelUsed: {
            provider: 'openrouter',
            model: 'anthropic/claude-3-haiku',
            temperature: 0.1
          },
          cost: 0.0095,
          status: 'completed'
        }
      ],
      
      toolsUsed: [
        {
          toolName: 'semgrep',
          executionTime: 12000,
          filesScanned: 1500,
          issuesFound: 1,
          exitCode: 0,
          stdout: 'Found 1 security issue',
          stderr: ''
        },
        {
          toolName: 'spotbugs',
          executionTime: 8000,
          filesScanned: 1200,
          issuesFound: 1,
          exitCode: 0,
          stdout: 'Found 1 bug',
          stderr: ''
        },
        {
          toolName: 'pmd',
          executionTime: 15000,
          filesScanned: 1879,
          issuesFound: 2,
          exitCode: 0,
          stdout: 'Found 2 code quality issues',
          stderr: ''
        },
        {
          toolName: 'dependency-check',
          executionTime: 5000,
          filesScanned: 50,
          issuesFound: 2,
          exitCode: 0,
          stdout: 'Found 2 vulnerable dependencies',
          stderr: ''
        }
      ],
      
      totalCost: 0.1567,
      costBreakdown: {
        aiModels: 0.1567,
        infrastructure: 0.0001,
        tools: 0.0000
      },
      estimatedMonthlyCost: 78.35,
      
      analyzer: 'V9 Framework',
      analyzerVersion: '9.0.0',
      smartFileSelection: !shouldFullScan,
      maxFilesAnalyzed: shouldFullScan ? totalFiles : 500,
      
      startTime: new Date(Date.now() - 115350).toISOString(),
      endTime: new Date().toISOString(),
      timestamp: new Date().toISOString()
    };
  }
  
  private validateFixes(report: string): void {
    const issues: string[] = [];
    
    // Check 1: Category percentages should not be 0%
    if (report.includes('| Security | 1 | 0.0% |') || 
        report.includes('| Performance | 1 | 0.0% |')) {
      issues.push('❌ Category percentages still showing 0%');
    }
    
    // Check 2: Should have summary totals
    if (!report.includes('Total Critical Issues:') || 
        !report.includes('Total High Issues:')) {
      issues.push('❌ Missing summary totals for severity counts');
    }
    
    // Check 3: Phased educational plan
    if (!report.includes('Phase 1: Critical & High Priority Training') ||
        !report.includes('Phase 2: Medium & Low Priority Training')) {
      issues.push('❌ Missing phased educational plan');
    }
    
    // Check 4: Team skills tracking placeholder
    if (!report.includes('Team Skills Tracking') ||
        !report.includes('Team Analytics')) {
      issues.push('❌ Missing team skills tracking placeholder');
    }
    
    // Check 5: Performance metrics clarity
    if (!report.includes('Phase | Duration | Percentage') ||
        report.includes('Total duraiton - 0.3 sec')) {
      issues.push('❌ Performance metrics still confusing');
    }
    
    // Check 6: No duplicate content after PR comment
    const prCommentIndex = report.indexOf('## PR Comment Template');
    const footerIndex = report.indexOf('---\\n\\n*Generated by');
    if (prCommentIndex > 0 && footerIndex > 0) {
      const afterPRComment = report.substring(prCommentIndex, footerIndex);
      if (afterPRComment.includes('## Executive Summary') ||
          afterPRComment.includes('## Quality Score')) {
        issues.push('❌ Duplicate content found after PR comment');
      }
    }
    
    if (issues.length > 0) {
      console.error('\\n⚠️ Validation Issues Found:');
      issues.forEach(issue => console.error(issue));
      throw new Error('Report validation failed');
    }
  }
}

// Run the test
const test = new V9TestWithFixes();
test.runTest().catch(console.error);