/**
 * Report Validation Test
 * 
 * Validates that generated reports contain all expected data fields
 * before running the full E2E PR analysis flow test
 */

import { config } from 'dotenv';
import { createLogger } from '@codequal/core/utils';

// Load environment variables
config({ path: '../../.env' });

const logger = createLogger('ReportValidation');

// Expected report structure based on codebase analysis
interface ExpectedReportStructure {
  // Core fields
  id: string;
  repositoryUrl: string;
  prNumber: number;
  timestamp: string;
  
  // Overview section
  overview: {
    executiveSummary?: string;
    analysisScore?: number;
    riskLevel?: string;
    totalFindings?: number;
    totalRecommendations?: number;
    learningPathAvailable?: boolean;
    estimatedRemediationTime?: string;
  };
  
  // PR Details
  prDetails?: {
    number: number;
    additions: number;
    deletions: number;
    changedFiles: number;
  };
  
  // Issues by severity
  prIssues?: {
    critical: any[];
    high: any[];
    medium: any[];
    low: any[];
  };
  
  repositoryIssues?: {
    critical: any[];
    high: any[];
    medium: any[];
    low: any[];
  };
  
  // Decision
  decision?: {
    status: 'APPROVED' | 'BLOCKED';
    reason: string;
    confidence: number;
  };
  
  // Educational content
  educational?: {
    modules: Array<{
      title: string;
      content: string;
      resources?: any[];
      difficulty?: string;
      estimatedTime?: string;
    }>;
  };
  
  // Metrics
  metrics?: {
    security?: { score: number; findings: number };
    codeQuality?: { score: number; findings: number };
    performance?: { score: number; findings: number };
    architecture?: { score: number; findings: number };
    dependencies?: { score: number; findings: number };
  };
  
  // Metadata
  metadata?: {
    analysisMode?: string;
    agentsUsed?: string[];
    toolsExecuted?: string[];
    processingTime?: number;
    modelVersions?: Record<string, string>;
    reportVersion?: string;
  };
  
  // DeepWiki data
  deepwiki?: {
    changes?: any[];
    score?: number;
    summary?: string;
  };
  
  // Overall score
  overallScore?: number;
}

class ReportValidator {
  private missingFields: string[] = [];
  private warnings: string[] = [];
  
  /**
   * Validate report structure
   */
  validateReport(report: any): boolean {
    logger.info('🔍 Validating report structure...');
    
    // Reset tracking
    this.missingFields = [];
    this.warnings = [];
    
    // Core fields (required)
    this.checkRequired(report, 'id', 'string');
    this.checkRequired(report, 'repositoryUrl', 'string');
    this.checkRequired(report, 'prNumber', 'number');
    this.checkRequired(report, 'timestamp', 'string');
    
    // Overview section
    if (report.overview) {
      this.checkOptional(report.overview, 'analysisScore', 'number');
      this.checkOptional(report.overview, 'riskLevel', 'string');
      this.checkOptional(report.overview, 'totalFindings', 'number');
    } else {
      this.warnings.push('Missing overview section');
    }
    
    // PR Details
    if (report.prDetails) {
      this.checkOptional(report.prDetails, 'additions', 'number');
      this.checkOptional(report.prDetails, 'deletions', 'number');
      this.checkOptional(report.prDetails, 'changedFiles', 'number');
    }
    
    // Issues
    this.validateIssues(report.prIssues, 'prIssues');
    this.validateIssues(report.repositoryIssues, 'repositoryIssues');
    
    // Decision
    if (report.decision) {
      this.checkOptional(report.decision, 'status', 'string');
      this.checkOptional(report.decision, 'reason', 'string');
      this.checkOptional(report.decision, 'confidence', 'number');
    }
    
    // Educational content
    if (report.educational?.modules) {
      logger.info(`Found ${report.educational.modules.length} educational modules`);
    }
    
    // Metrics
    if (report.metrics) {
      const agentTypes = ['security', 'codeQuality', 'performance', 'architecture', 'dependencies'];
      agentTypes.forEach(agent => {
        if (report.metrics[agent]) {
          this.checkOptional(report.metrics[agent], 'score', 'number');
          this.checkOptional(report.metrics[agent], 'findings', 'number');
        }
      });
    }
    
    // Overall score
    this.checkOptional(report, 'overallScore', 'number');
    
    // Display results
    this.displayValidationResults();
    
    return this.missingFields.length === 0;
  }
  
  /**
   * Check required field
   */
  private checkRequired(obj: any, field: string, expectedType: string): void {
    if (!(field in obj)) {
      this.missingFields.push(field);
    } else if (typeof obj[field] !== expectedType) {
      this.missingFields.push(`${field} (wrong type: expected ${expectedType}, got ${typeof obj[field]})`);
    }
  }
  
  /**
   * Check optional field
   */
  private checkOptional(obj: any, field: string, expectedType: string): void {
    if (field in obj && typeof obj[field] !== expectedType) {
      this.warnings.push(`${field} has wrong type: expected ${expectedType}, got ${typeof obj[field]}`);
    }
  }
  
  /**
   * Validate issues structure
   */
  private validateIssues(issues: any, fieldName: string): void {
    if (!issues) {
      this.warnings.push(`Missing ${fieldName} section`);
      return;
    }
    
    const severities = ['critical', 'high', 'medium', 'low'];
    severities.forEach(severity => {
      if (!(severity in issues)) {
        this.warnings.push(`${fieldName}.${severity} missing`);
      } else if (!Array.isArray(issues[severity])) {
        this.warnings.push(`${fieldName}.${severity} is not an array`);
      }
    });
  }
  
  /**
   * Display validation results
   */
  private displayValidationResults(): void {
    console.log('\n📊 Report Validation Results');
    console.log('============================');
    
    if (this.missingFields.length === 0) {
      console.log('✅ All required fields present');
    } else {
      console.log('❌ Missing required fields:');
      this.missingFields.forEach(field => {
        console.log(`   - ${field}`);
      });
    }
    
    if (this.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.warnings.forEach(warning => {
        console.log(`   - ${warning}`);
      });
    }
    
    console.log('\n📋 Report Structure Summary:');
    console.log('- Core fields: id, repositoryUrl, prNumber, timestamp');
    console.log('- Overview: analysisScore, riskLevel, totalFindings');
    console.log('- Issues: Categorized by severity (critical/high/medium/low)');
    console.log('- Decision: status (APPROVED/BLOCKED), reason, confidence');
    console.log('- Educational: Learning modules and resources');
    console.log('- Metrics: Scores by agent type');
    console.log('- DeepWiki: Repository scan results');
  }
  
  /**
   * Generate sample report for testing
   */
  generateSampleReport(): any {
    return {
      id: 'report_test_123',
      repositoryUrl: 'https://github.com/test/repo',
      prNumber: 123,
      timestamp: new Date().toISOString(),
      
      overview: {
        analysisScore: 85,
        riskLevel: 'medium',
        totalFindings: 15,
        totalRecommendations: 10,
        learningPathAvailable: true,
        estimatedRemediationTime: '2-3 hours'
      },
      
      prDetails: {
        number: 123,
        additions: 250,
        deletions: 50,
        changedFiles: 10
      },
      
      prIssues: {
        critical: [],
        high: [
          {
            type: 'security',
            message: 'Potential SQL injection vulnerability',
            file: 'src/db/queries.ts',
            line: 45
          }
        ],
        medium: [],
        low: []
      },
      
      repositoryIssues: {
        critical: [],
        high: [],
        medium: [
          {
            type: 'code_quality',
            message: 'Function complexity too high',
            file: 'src/utils/parser.ts',
            line: 123
          }
        ],
        low: []
      },
      
      decision: {
        status: 'APPROVED',
        reason: 'No critical issues found, high issues have mitigation',
        confidence: 0.85
      },
      
      educational: {
        modules: [
          {
            title: 'SQL Injection Prevention',
            content: 'Learn about parameterized queries...',
            difficulty: 'intermediate',
            estimatedTime: '30 minutes'
          }
        ]
      },
      
      metrics: {
        security: { score: 85, findings: 1 },
        codeQuality: { score: 92, findings: 3 },
        performance: { score: 88, findings: 2 },
        architecture: { score: 90, findings: 0 },
        dependencies: { score: 75, findings: 5 }
      },
      
      metadata: {
        analysisMode: 'comprehensive',
        agentsUsed: ['security', 'codeQuality', 'performance'],
        toolsExecuted: ['eslint', 'sonarjs', 'bundlephobia'],
        processingTime: 45000,
        modelVersions: {
          security: 'claude-3.5-sonnet',
          codeQuality: 'gpt-4-turbo'
        },
        reportVersion: '2.0'
      },
      
      deepwiki: {
        score: 85,
        summary: 'Repository scan completed successfully',
        changes: [
          { additions: 100, deletions: 20 }
        ]
      },
      
      overallScore: 85
    };
  }
}

/**
 * Test runner
 */
async function main() {
  const validator = new ReportValidator();
  
  logger.info('🧪 Testing report validation with sample data...');
  
  // Test with sample report
  const sampleReport = validator.generateSampleReport();
  const isValid = validator.validateReport(sampleReport);
  
  if (isValid) {
    logger.info('✅ Sample report validation passed');
  } else {
    logger.error('❌ Sample report validation failed');
  }
  
  // Display expected structure for reference
  console.log('\n📄 Expected Report Fields for E2E Testing:');
  console.log('=========================================');
  console.log('1. Core identification (id, repo, PR number)');
  console.log('2. Analysis scores and risk assessment');
  console.log('3. Issues categorized by severity and location');
  console.log('4. PR decision with confidence level');
  console.log('5. Educational content and recommendations');
  console.log('6. Per-agent metrics and findings');
  console.log('7. DeepWiki scan results');
  console.log('8. Processing metadata');
  console.log('\nThese fields will be validated in the PR analysis E2E test.');
}

if (require.main === module) {
  main();
}

export { ReportValidator, ExpectedReportStructure };