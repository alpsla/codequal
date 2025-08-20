#!/usr/bin/env ts-node

/**
 * Integration Test for DeepWiki Response Transformer
 * 
 * This test verifies the complete transformation pipeline:
 * 1. DeepWiki API returns malformed/incomplete data
 * 2. Transformer enhances the response intelligently
 * 3. V8 Report Generator processes the enhanced data
 * 4. Final report contains all expected sections
 * 
 * Usage:
 *   npm run build
 *   npx ts-node test-transformer-integration.ts
 */

import { DeepWikiResponseTransformer, TransformationOptions } from './src/standard/services/deepwiki-response-transformer';
import { DeepWikiApiWrapper } from './src/standard/services/deepwiki-api-wrapper';
import { EnhancedReportGenerator } from './src/standard/services/report-generator-factory';
import { DeepWikiAnalysisResponse } from './src/standard/services/deepwiki-api-wrapper';
import * as fs from 'fs';
import * as path from 'path';

interface TestScenario {
  name: string;
  description: string;
  inputResponse: DeepWikiAnalysisResponse | null;
  transformOptions: TransformationOptions;
  expectedOutcome: {
    hasIssues: boolean;
    hasValidLocations: boolean;
    hasCodeSnippets: boolean;
    hasRecommendations: boolean;
    scoreRange: [number, number];
  };
}

const TEST_SCENARIOS: TestScenario[] = [
  {
    name: 'Null Response',
    description: 'DeepWiki returns null/empty response',
    inputResponse: null,
    transformOptions: {
      repositoryUrl: 'https://github.com/facebook/react',
      branch: 'main',
      useHybridMode: true
    },
    expectedOutcome: {
      hasIssues: true,
      hasValidLocations: true,
      hasCodeSnippets: true,
      hasRecommendations: true,
      scoreRange: [0, 100]
    }
  },
  {
    name: 'Malformed Response',
    description: 'DeepWiki returns response with unknown locations and missing data',
    inputResponse: {
      issues: [
        {
          id: 'malformed-1',
          severity: 'high' as const,
          category: 'security',
          title: '',
          description: 'Some security issue',
          location: {
            file: 'unknown',
            line: 0
          }
        },
        null as any,
        {
          id: 'malformed-2',
          severity: 'medium' as const,
          category: '',
          title: 'Performance issue',
          description: '',
          location: {
            file: '',
            line: 0
          }
        }
      ],
      scores: {
        overall: 24, // Incorrectly low score
        security: 10,
        performance: 30,
        maintainability: 40
      },
      metadata: {
        timestamp: new Date().toISOString(),
        tool_version: 'malformed',
        duration_ms: 1000,
        files_analyzed: 0
      }
    },
    transformOptions: {
      repositoryUrl: 'https://github.com/sindresorhus/ky',
      branch: 'feature/retry-mechanism',
      prId: '500',
      useHybridMode: true,
      forceEnhancement: true
    },
    expectedOutcome: {
      hasIssues: true,
      hasValidLocations: true,
      hasCodeSnippets: true,
      hasRecommendations: true,
      scoreRange: [40, 90]
    }
  },
  {
    name: 'Partial Response',
    description: 'DeepWiki returns partial response with some missing fields',
    inputResponse: {
      issues: [
        {
          id: 'partial-1',
          severity: 'critical' as const,
          category: 'security',
          title: 'Hardcoded API Keys',
          description: 'API keys found in source code',
          location: {
            file: 'src/config.ts',
            line: 15,
            column: 8
          }
        }
      ],
      scores: {
        overall: 60,
        security: 40,
        performance: 70,
        maintainability: 65
      },
      metadata: {
        timestamp: new Date().toISOString(),
        tool_version: 'deepwiki-1.0.0',
        duration_ms: 5000,
        files_analyzed: 50
      }
    },
    transformOptions: {
      repositoryUrl: 'https://github.com/microsoft/typescript',
      branch: 'main',
      useHybridMode: false,
      forceEnhancement: true
    },
    expectedOutcome: {
      hasIssues: true,
      hasValidLocations: true,
      hasCodeSnippets: true,
      hasRecommendations: true,
      scoreRange: [50, 80]
    }
  }
];

class TransformerIntegrationTest {
  private transformer: DeepWikiResponseTransformer;
  private apiWrapper: DeepWikiApiWrapper;
  private reportGenerator: EnhancedReportGenerator;
  private outputDir: string;

  constructor() {
    this.transformer = new DeepWikiResponseTransformer();
    this.apiWrapper = new DeepWikiApiWrapper();
    this.reportGenerator = new EnhancedReportGenerator();
    this.outputDir = path.join(__dirname, 'transformer-test-reports');
    
    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting DeepWiki Response Transformer Integration Tests\n');
    console.log('=' .repeat(80));

    let passedTests = 0;
    const totalTests = TEST_SCENARIOS.length;

    for (let i = 0; i < TEST_SCENARIOS.length; i++) {
      const scenario = TEST_SCENARIOS[i];
      console.log(`\n📋 Test ${i + 1}/${totalTests}: ${scenario.name}`);
      console.log(`📝 ${scenario.description}`);
      console.log('-' .repeat(60));

      try {
        const success = await this.runScenario(scenario, i + 1);
        if (success) {
          console.log(`✅ Test ${i + 1} PASSED`);
          passedTests++;
        } else {
          console.log(`❌ Test ${i + 1} FAILED`);
        }
      } catch (error) {
        console.error(`💥 Test ${i + 1} ERROR:`, error);
      }
    }

    console.log('\n' + '=' .repeat(80));
    console.log(`📊 Test Results: ${passedTests}/${totalTests} passed`);
    
    if (passedTests === totalTests) {
      console.log('🎉 All tests passed! Transformer integration is working correctly.');
    } else {
      console.log('⚠️ Some tests failed. Please review the output above.');
    }

    console.log(`📁 Test reports saved to: ${this.outputDir}`);
  }

  private async runScenario(scenario: TestScenario, testNumber: number): Promise<boolean> {
    try {
      // Step 1: Transform the input response
      console.log('🔄 Step 1: Transforming response...');
      const transformedResponse = await this.transformer.transform(
        scenario.inputResponse,
        scenario.transformOptions
      );

      // Step 2: Validate transformation
      console.log('✅ Step 2: Validating transformation...');
      const transformationValid = this.validateTransformation(transformedResponse, scenario.expectedOutcome);
      
      if (!transformationValid) {
        console.log('❌ Transformation validation failed');
        return false;
      }

      // Step 3: Generate comparison data for report
      console.log('📊 Step 3: Preparing report data...');
      const comparisonData = this.generateComparisonData(transformedResponse, scenario);

      // Step 4: Generate V8 report
      console.log('📄 Step 4: Generating V8 report...');
      const report = this.reportGenerator.generateReport(comparisonData, {
        format: 'html',
        includeEducation: true,
        includeArchitectureDiagram: true,
        includeSkillTracking: true,
        includeBusinessMetrics: true,
        includeAIIDESection: true
      });

      // Step 5: Validate report content
      console.log('🔍 Step 5: Validating report content...');
      const reportValid = this.validateReport(report, scenario);
      
      if (!reportValid) {
        console.log('❌ Report validation failed');
        return false;
      }

      // Step 6: Save report
      const filename = `test-${testNumber}-${scenario.name.toLowerCase().replace(/\s+/g, '-')}.html`;
      const filepath = path.join(this.outputDir, filename);
      fs.writeFileSync(filepath, report);
      console.log(`💾 Report saved: ${filename}`);

      console.log('🎯 All validations passed for this scenario');
      return true;

    } catch (error) {
      console.error('💥 Scenario execution failed:', error);
      return false;
    }
  }

  private validateTransformation(
    response: DeepWikiAnalysisResponse,
    expected: TestScenario['expectedOutcome']
  ): boolean {
    let valid = true;

    // Check issues exist
    if (expected.hasIssues && (!response.issues || response.issues.length === 0)) {
      console.log('❌ Expected issues but none found');
      valid = false;
    }

    // Check valid locations
    if (expected.hasValidLocations && response.issues) {
      const invalidLocations = response.issues.filter(issue => 
        !issue.location?.file || 
        issue.location.file === 'unknown' || 
        !issue.location.line || 
        issue.location.line === 0
      );
      
      if (invalidLocations.length > 0) {
        console.log(`❌ Found ${invalidLocations.length} issues with invalid locations`);
        valid = false;
      }
    }

    // Check code snippets
    if (expected.hasCodeSnippets && response.issues) {
      const withoutSnippets = response.issues.filter(issue => 
        !(issue as any).codeSnippet
      );
      
      if (withoutSnippets.length > response.issues.length * 0.5) {
        console.log(`❌ Too many issues without code snippets (${withoutSnippets.length}/${response.issues.length})`);
        valid = false;
      }
    }

    // Check recommendations
    if (expected.hasRecommendations && response.issues) {
      const withoutRecs = response.issues.filter(issue => 
        !issue.recommendation && !(issue as any).suggestion
      );
      
      if (withoutRecs.length > response.issues.length * 0.5) {
        console.log(`❌ Too many issues without recommendations (${withoutRecs.length}/${response.issues.length})`);
        valid = false;
      }
    }

    // Check score range
    const [minScore, maxScore] = expected.scoreRange;
    if (response.scores.overall < minScore || response.scores.overall > maxScore) {
      console.log(`❌ Overall score ${response.scores.overall} outside expected range [${minScore}, ${maxScore}]`);
      valid = false;
    }

    if (valid) {
      console.log('✅ Transformation validation passed');
      console.log(`   - Issues: ${response.issues?.length || 0}`);
      console.log(`   - Valid locations: ${response.issues?.filter(i => i.location?.file && i.location?.file !== 'unknown').length || 0}`);
      console.log(`   - Overall score: ${response.scores.overall}`);
    }

    return valid;
  }

  private generateComparisonData(response: DeepWikiAnalysisResponse, scenario: TestScenario): any {
    // Convert to comparison format expected by V8 generator
    const issues = response.issues || [];
    
    return {
      success: true,
      newIssues: issues.slice(0, Math.ceil(issues.length * 0.6)), // 60% new
      resolvedIssues: this.generateResolvedIssues(2), // Generate 2 resolved issues
      unchangedIssues: issues.slice(Math.ceil(issues.length * 0.6)), // 40% unchanged
      summary: {
        totalIssues: issues.length,
        criticalIssues: issues.filter(i => i.severity === 'critical').length,
        highIssues: issues.filter(i => i.severity === 'high').length,
        mediumIssues: issues.filter(i => i.severity === 'medium').length,
        lowIssues: issues.filter(i => i.severity === 'low').length,
        resolvedIssues: 2,
        overallScore: response.scores.overall
      },
      duration: response.metadata.duration_ms / 1000,
      scanDuration: `${(response.metadata.duration_ms / 1000).toFixed(1)}s`,
      modelUsed: response.metadata.model_used || 'transformer-enhanced',
      prMetadata: {
        number: scenario.transformOptions.prId ? parseInt(scenario.transformOptions.prId) : 123,
        title: this.generatePRTitle(scenario),
        author: 'test-user',
        branch: scenario.transformOptions.branch || 'main',
        targetBranch: 'main',
        filesChanged: response.metadata.files_analyzed || 10,
        additions: Math.floor(Math.random() * 500) + 100,
        deletions: Math.floor(Math.random() * 200) + 50,
        testCoverage: Math.floor(Math.random() * 30) + 70
      },
      dependencies: this.generateDependencies(),
      testCoverage: {
        overall: Math.floor(Math.random() * 30) + 70,
        byCategory: {
          unit: Math.floor(Math.random() * 20) + 80,
          integration: Math.floor(Math.random() * 30) + 60,
          e2e: Math.floor(Math.random() * 40) + 40
        }
      },
      education: this.generateEducationalContent(issues),
      skillTracking: this.generateSkillTracking(issues)
    };
  }

  private generateResolvedIssues(count: number): any[] {
    const resolvedIssues = [];
    for (let i = 0; i < count; i++) {
      resolvedIssues.push({
        id: `resolved-${i + 1}`,
        severity: Math.random() > 0.5 ? 'medium' : 'low',
        category: 'code-quality',
        message: `Resolved issue ${i + 1}`,
        description: `This issue was fixed in the current PR`,
        location: {
          file: `src/resolved-${i + 1}.ts`,
          line: Math.floor(Math.random() * 100) + 1
        }
      });
    }
    return resolvedIssues;
  }

  private generatePRTitle(scenario: TestScenario): string {
    const titles = [
      'Feature: Add intelligent response transformation',
      'Fix: Resolve DeepWiki parser issues',
      'Improvement: Enhance error handling',
      'Security: Address vulnerabilities',
      'Performance: Optimize data processing'
    ];
    return titles[Math.floor(Math.random() * titles.length)];
  }

  private generateDependencies(): any[] {
    return [
      { name: 'typescript', version: '^5.5.4', isOutdated: true, latest: '^5.6.0' },
      { name: 'express', version: '4.17.1', isOutdated: false },
      { name: 'axios', version: '0.27.2', isOutdated: false },
      { name: 'lodash', version: '4.17.20', isOutdated: true, latest: '4.17.21' }
    ];
  }

  private generateEducationalContent(issues: any[]): any {
    const categories = [...new Set(issues.map(i => i.category))];
    
    return {
      courses: [
        {
          title: 'Advanced TypeScript Security',
          provider: 'Pluralsight',
          url: 'https://pluralsight.com/typescript-security',
          duration: '3 hours',
          rating: 4.8,
          relevance: 0.9,
          level: 'intermediate'
        },
        {
          title: 'Performance Optimization in Node.js',
          provider: 'Udemy',
          url: 'https://udemy.com/nodejs-performance',
          duration: '5 hours',
          rating: 4.6,
          relevance: 0.85,
          level: 'advanced'
        }
      ],
      articles: [
        {
          title: 'Security Best Practices for JavaScript',
          author: 'Security Expert',
          url: 'https://example.com/security-practices',
          readTime: '10 min',
          source: 'Dev.to',
          relevance: 0.9
        },
        {
          title: 'Code Quality Metrics That Matter',
          author: 'Clean Code Advocate',
          url: 'https://example.com/code-quality',
          readTime: '8 min',
          source: 'Medium',
          relevance: 0.8
        }
      ],
      videos: [
        {
          title: 'Modern JavaScript Security Patterns',
          channel: 'TechTalks',
          url: 'https://youtube.com/watch?v=security',
          duration: '25 min',
          views: 150000,
          relevance: 0.85
        }
      ],
      estimatedLearningTime: 8 * 60 // 8 hours in minutes
    };
  }

  private generateSkillTracking(issues: any[]): any {
    return {
      userId: 'test-user',
      overallScore: 75,
      categoryScores: {
        security: 70,
        performance: 80,
        codeQuality: 75,
        architecture: 78,
        dependencies: 72
      },
      level: {
        current: 'Intermediate',
        progress: 65
      },
      improvements: [
        'Security vulnerability detection improved by 15%',
        'Performance optimization skills advancing'
      ]
    };
  }

  private validateReport(report: string, scenario: TestScenario): boolean {
    let valid = true;

    // Check basic HTML structure
    if (!report.includes('<html>') || !report.includes('</html>')) {
      console.log('❌ Report is not valid HTML');
      valid = false;
    }

    // Check for V8 generator indicators
    if (!report.includes('V8') && !report.includes('Enhanced')) {
      console.log('❌ Report does not appear to be generated by V8');
      valid = false;
    }

    // Check for issue content
    if (scenario.expectedOutcome.hasIssues && !report.includes('Issues')) {
      console.log('❌ Report missing issues section');
      valid = false;
    }

    // Check for educational content
    if (report.includes('Educational') || report.includes('Learning') || report.includes('Courses')) {
      console.log('✅ Educational content found in report');
    } else {
      console.log('⚠️ Educational content not found in report');
    }

    // Check for skill tracking
    if (report.includes('Skill') || report.includes('Progress')) {
      console.log('✅ Skill tracking content found in report');
    } else {
      console.log('⚠️ Skill tracking content not found in report');
    }

    // Check that no "unknown" locations are present
    if (report.includes('unknown:0') || report.includes('file: unknown')) {
      console.log('❌ Report contains unknown file locations - transformation failed');
      valid = false;
    }

    // Check for code snippets
    if (scenario.expectedOutcome.hasCodeSnippets && !report.includes('```')) {
      console.log('❌ Report missing code snippets');
      valid = false;
    }

    if (valid) {
      console.log('✅ Report validation passed');
    }

    return valid;
  }
}

// Run the tests
async function main() {
  const tester = new TransformerIntegrationTest();
  await tester.runAllTests();
}

main().catch(console.error);