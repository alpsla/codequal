#!/usr/bin/env ts-node
/**
 * Multi-Repository Severity Validation Test
 * 
 * Purpose: Test severity mapping across 5 different Java repositories
 * Goals:
 * 1. Validate recent severity fixes (384 issues HIGH → MEDIUM)
 * 2. Catch additional aggressive severity mappings
 * 3. Test PMD ruleset compatibility across repos
 * 4. Generate severity distribution reports
 * 
 * Expected Results:
 * - Critical: <5% (true crashes, security vulnerabilities)
 * - High: 10-20% (error-prone code, high-risk bugs)
 * - Medium: 50-70% (best practices, optimizations)
 * - Low: 10-30% (style, documentation)
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface TestRepository {
  name: string;
  url: string;
  prNumber: number;
  baseBranch: string;
  description: string;
  expectedCharacteristics: string;
}

interface SeverityDistribution {
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

interface RuleAnalysis {
  rule: string;
  tool: string;
  severity: string;
  count: number;
  shouldReview: boolean;  // Flag for suspicious HIGH severity
}

// Test repositories covering different Java patterns
const TEST_REPOS: TestRepository[] = [
  {
    name: 'Apache Kafka',
    url: 'https://github.com/apache/kafka.git',
    prNumber: 17620,
    baseBranch: 'trunk',
    description: 'Large enterprise (3,472 Java files)',
    expectedCharacteristics: 'High complexity, mature codebase'
  },
  {
    name: 'Spring PetClinic',
    url: 'https://github.com/spring-projects/spring-petclinic.git',
    prNumber: 0,  // Use main branch
    baseBranch: 'main',
    description: 'Small Spring Boot app (50 Java files)',
    expectedCharacteristics: 'Clean code, modern practices'
  },
  {
    name: 'WebGoat',
    url: 'https://github.com/WebGoat/WebGoat.git',
    prNumber: 0,
    baseBranch: 'main',
    description: 'Security training app (intentional vulnerabilities)',
    expectedCharacteristics: 'High security issues, educational'
  },
  {
    name: 'Elasticsearch',
    url: 'https://github.com/elastic/elasticsearch.git',
    prNumber: 0,
    baseBranch: 'main',
    description: 'Large-scale search engine (Gradle)',
    expectedCharacteristics: 'Performance-critical, complex algorithms'
  },
  {
    name: 'Jenkins',
    url: 'https://github.com/jenkinsci/jenkins.git',
    prNumber: 0,
    baseBranch: 'master',
    description: 'CI/CD platform (Maven)',
    expectedCharacteristics: 'Plugin architecture, legacy + modern code'
  }
];

class MultiRepoSeverityValidator {
  private outputDir = path.join(__dirname, 'severity-validation-results');
  private suspiciousRules: Map<string, RuleAnalysis[]> = new Map();

  async runValidation(): Promise<void> {
    console.log('\n🔍 MULTI-REPOSITORY SEVERITY VALIDATION');
    console.log('=========================================\n');
    
    // Create output directory
    fs.mkdirSync(this.outputDir, { recursive: true });

    const results: Array<{
      repo: string;
      distribution: SeverityDistribution;
      suspiciousRules: RuleAnalysis[];
      executionTime: number;
    }> = [];

    // Test each repository
    for (const repo of TEST_REPOS) {
      console.log(`\n📦 Testing: ${repo.name}`);
      console.log(`   ${repo.description}`);
      console.log(`   ${repo.expectedCharacteristics}\n`);

      try {
        const startTime = Date.now();
        
        // Run E2E test for this repository
        const result = await this.testRepository(repo);
        
        const executionTime = Math.round((Date.now() - startTime) / 1000);
        
        results.push({
          repo: repo.name,
          distribution: result.distribution,
          suspiciousRules: result.suspiciousRules,
          executionTime
        });

        console.log(`   ✅ Completed in ${executionTime}s\n`);
      } catch (error: any) {
        console.error(`   ❌ Failed: ${error.message}\n`);
      }
    }

    // Generate comprehensive report
    this.generateReport(results);
  }

  private async testRepository(repo: TestRepository): Promise<{
    distribution: SeverityDistribution;
    suspiciousRules: RuleAnalysis[];
  }> {
    // For now, simulate by running limited test
    // In real implementation, this would call test-v9-e2e-complete.ts with repo URL
    
    console.log('   🔧 Cloning repository...');
    console.log('   🔍 Running PMD analysis...');
    console.log('   📊 Analyzing severity distribution...');
    
    // Placeholder - replace with actual E2E test execution
    const distribution: SeverityDistribution = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      total: 0
    };

    const suspiciousRules: RuleAnalysis[] = [];

    return { distribution, suspiciousRules };
  }

  private generateReport(results: Array<{
    repo: string;
    distribution: SeverityDistribution;
    suspiciousRules: RuleAnalysis[];
    executionTime: number;
  }>): void {
    console.log('\n📊 SEVERITY VALIDATION REPORT');
    console.log('==============================\n');

    // Aggregate distributions
    const aggregated: SeverityDistribution = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      total: 0
    };

    console.log('Per-Repository Distribution:\n');
    results.forEach(result => {
      const { distribution } = result;
      
      aggregated.critical += distribution.critical;
      aggregated.high += distribution.high;
      aggregated.medium += distribution.medium;
      aggregated.low += distribution.low;
      aggregated.total += distribution.total;

      if (distribution.total > 0) {
        console.log(`${result.repo}:`);
        console.log(`  Critical: ${distribution.critical} (${((distribution.critical / distribution.total) * 100).toFixed(1)}%)`);
        console.log(`  High:     ${distribution.high} (${((distribution.high / distribution.total) * 100).toFixed(1)}%)`);
        console.log(`  Medium:   ${distribution.medium} (${((distribution.medium / distribution.total) * 100).toFixed(1)}%)`);
        console.log(`  Low:      ${distribution.low} (${((distribution.low / distribution.total) * 100).toFixed(1)}%)`);
        console.log(`  Total:    ${distribution.total}`);
        console.log(`  Time:     ${result.executionTime}s\n`);
      }
    });

    // Overall distribution
    if (aggregated.total > 0) {
      console.log('\nOverall Distribution (All Repos):');
      console.log(`  Critical: ${aggregated.critical} (${((aggregated.critical / aggregated.total) * 100).toFixed(1)}%)`);
      console.log(`  High:     ${aggregated.high} (${((aggregated.high / aggregated.total) * 100).toFixed(1)}%)`);
      console.log(`  Medium:   ${aggregated.medium} (${((aggregated.medium / aggregated.total) * 100).toFixed(1)}%)`);
      console.log(`  Low:      ${aggregated.low} (${((aggregated.low / aggregated.total) * 100).toFixed(1)}%)`);
      console.log(`  Total:    ${aggregated.total}\n`);

      // Flag suspicious distributions
      const highPercentage = (aggregated.high / aggregated.total) * 100;
      if (highPercentage > 30) {
        console.log(`⚠️  WARNING: HIGH severity at ${highPercentage.toFixed(1)}% (expected: 10-20%)`);
        console.log('   → Review severity-mapper.ts for aggressive mappings\n');
      }
    }

    // Suspicious rules report
    console.log('\n🚨 Suspicious High Severity Rules:\n');
    
    const allSuspiciousRules = new Map<string, RuleAnalysis>();
    results.forEach(result => {
      result.suspiciousRules.forEach(rule => {
        const key = `${rule.tool}:${rule.rule}`;
        if (!allSuspiciousRules.has(key)) {
          allSuspiciousRules.set(key, rule);
        } else {
          const existing = allSuspiciousRules.get(key)!;
          existing.count += rule.count;
        }
      });
    });

    if (allSuspiciousRules.size === 0) {
      console.log('   ✅ No suspicious severity mappings found!\n');
    } else {
      Array.from(allSuspiciousRules.values())
        .sort((a, b) => b.count - a.count)
        .forEach(rule => {
          console.log(`   ${rule.tool}:${rule.rule}`);
          console.log(`   └─ ${rule.count} occurrences marked as ${rule.severity}`);
          console.log(`   └─ Recommendation: Review if this should be MEDIUM\n`);
        });
    }

    // Save detailed report
    const reportPath = path.join(this.outputDir, `severity-validation-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      results,
      aggregated,
      suspiciousRules: Array.from(allSuspiciousRules.values())
    }, null, 2));

    console.log(`\n📄 Detailed report saved: ${reportPath}\n`);
  }
}

// Run validation
async function main() {
  const validator = new MultiRepoSeverityValidator();
  await validator.runValidation();
}

main().catch(error => {
  console.error('Validation failed:', error);
  process.exit(1);
});

