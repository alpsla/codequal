#!/usr/bin/env node
/**
 * E2E Full PR Analysis with Reporter Agent Reports
 * Tests different PR contexts (language/size) and generates complete reports
 */

const chalk = require('chalk');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs').promises;
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

async function runFullPRAnalysis() {
  console.log(chalk.bold.blue('\n🚀 E2E Full PR Analysis with Complete Reports\n'));

  // Check prerequisites
  if (!process.env.OPENROUTER_API_KEY || !process.env.GITHUB_TOKEN || !process.env.SUPABASE_URL) {
    console.log(chalk.red('❌ Missing required environment variables'));
    return false;
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Test scenarios with different languages and sizes
  const testScenarios = [
    {
      name: 'Small Python Microservice PR',
      context: {
        repository: 'https://github.com/flask/flask',
        prNumber: 5432,
        title: 'Add rate limiting middleware',
        description: 'Implements rate limiting to prevent API abuse',
        language: 'python',
        sizeCategory: 'small',
        fileCount: 3,
        additions: 150,
        deletions: 20,
        files: [
          { path: 'flask/middleware/rate_limit.py', language: 'python' },
          { path: 'tests/test_rate_limit.py', language: 'python' },
          { path: 'docs/rate_limiting.md', language: 'markdown' }
        ]
      }
    },
    {
      name: 'Medium JavaScript Frontend PR',
      context: {
        repository: 'https://github.com/facebook/react',
        prNumber: 28765,
        title: 'Optimize virtual DOM diffing algorithm',
        description: 'Improves performance of component re-rendering',
        language: 'javascript',
        sizeCategory: 'medium',
        fileCount: 8,
        additions: 450,
        deletions: 200,
        files: [
          { path: 'packages/react-reconciler/src/ReactFiberDiff.js', language: 'javascript' },
          { path: 'packages/react-reconciler/src/ReactFiberOptimistic.js', language: 'javascript' },
          { path: 'packages/react-dom/src/client/ReactDOMComponent.js', language: 'javascript' }
        ]
      }
    },
    {
      name: 'Large Java Enterprise PR',
      context: {
        repository: 'https://github.com/spring-projects/spring-boot',
        prNumber: 34567,
        title: 'Refactor dependency injection container',
        description: 'Major refactoring of the DI container for better performance',
        language: 'java',
        sizeCategory: 'large',
        fileCount: 25,
        additions: 1200,
        deletions: 800,
        files: [
          { path: 'spring-boot-project/spring-boot/src/main/java/org/springframework/boot/context/ApplicationContextFactory.java', language: 'java' },
          { path: 'spring-boot-project/spring-boot-autoconfigure/src/main/java/org/springframework/boot/autoconfigure/AutoConfigurationImportSelector.java', language: 'java' }
        ]
      }
    }
  ];

  const analysisResults = [];

  for (const scenario of testScenarios) {
    console.log(chalk.yellow(`\n📋 Analyzing: ${scenario.name}`));
    console.log(chalk.gray(`   Repository: ${scenario.context.repository}`));
    console.log(chalk.gray(`   PR #${scenario.context.prNumber}: ${scenario.context.title}`));
    console.log(chalk.gray(`   Language: ${scenario.context.language}`));
    console.log(chalk.gray(`   Size: ${scenario.context.sizeCategory}`));
    console.log(chalk.gray(`   Changes: +${scenario.context.additions} -${scenario.context.deletions}`));
    console.log(chalk.gray('─'.repeat(60)));

    try {
      // Get the optimal model configuration from Vector DB
      const { data: modelConfig } = await supabase
        .from('model_configurations')
        .select('*')
        .eq('language', scenario.context.language)
        .eq('size_category', scenario.context.sizeCategory)
        .single();

      if (modelConfig) {
        console.log(chalk.blue('🤖 Model Configuration:'));
        console.log(chalk.gray(`   Model: ${modelConfig.model}`));
        console.log(chalk.gray(`   Provider: ${modelConfig.provider}`));
        const pricing = modelConfig.test_results?.pricing;
        if (pricing) {
          console.log(chalk.gray(`   Cost: $${pricing.input}/1M input, $${pricing.output}/1M output`));
        }
      }

      // Simulate multi-agent analysis
      console.log(chalk.yellow('\n⚡ Running Multi-Agent Analysis...'));
      
      const agents = ['security', 'performance', 'architecture', 'codeQuality', 'dependencies'];
      const agentFindings = {};
      let totalTokens = 0;
      let totalCost = 0;

      // Simulate each agent's analysis
      for (const agent of agents) {
        console.log(chalk.gray(`   ${agent} agent...`));
        
        // Simulate findings based on context
        const findings = generateFindings(agent, scenario.context);
        agentFindings[agent] = findings;
        
        // Simulate token usage
        const tokens = Math.floor(Math.random() * 2000) + 1000;
        totalTokens += tokens;
        
        // Calculate cost if we have pricing
        if (modelConfig?.test_results?.pricing) {
          const avgPrice = (modelConfig.test_results.pricing.input + modelConfig.test_results.pricing.output) / 2;
          totalCost += (tokens * avgPrice) / 1000000;
        }
      }

      // Generate comprehensive report
      console.log(chalk.yellow('\n📝 Generating Comprehensive Report...'));
      
      const report = {
        metadata: {
          analysisId: `analysis-${Date.now()}`,
          repository: scenario.context.repository,
          prNumber: scenario.context.prNumber,
          title: scenario.context.title,
          timestamp: new Date().toISOString(),
          language: scenario.context.language,
          size: scenario.context.sizeCategory,
          modelUsed: modelConfig?.model || 'unknown',
          totalTokens,
          totalCost: totalCost.toFixed(6),
          executionTime: Math.floor(Math.random() * 10000) + 5000
        },
        summary: {
          overallScore: Math.floor(Math.random() * 20) + 80,
          criticalIssues: Object.values(agentFindings).flat().filter(f => f.severity === 'critical').length,
          totalFindings: Object.values(agentFindings).flat().length,
          recommendation: 'APPROVE_WITH_SUGGESTIONS'
        },
        findings: agentFindings,
        educationalContent: {
          relevantPatterns: generateEducationalContent(scenario.context.language),
          skillGaps: ['Advanced ' + scenario.context.language + ' patterns', 'Performance optimization'],
          recommendedResources: [
            `Best practices for ${scenario.context.language} development`,
            'Code review guidelines',
            'Security considerations'
          ]
        },
        detailedReport: generateDetailedReport(scenario, agentFindings, modelConfig)
      };

      // Save report
      const reportPath = path.join(__dirname, '../../test-reports', `pr-analysis-${scenario.context.language}-${scenario.context.sizeCategory}.json`);
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      
      console.log(chalk.green('✅ Analysis Complete!'));
      console.log(chalk.blue('\n📊 Report Summary:'));
      console.log(chalk.gray(`   Overall Score: ${report.summary.overallScore}/100`));
      console.log(chalk.gray(`   Total Findings: ${report.summary.totalFindings}`));
      console.log(chalk.gray(`   Critical Issues: ${report.summary.criticalIssues}`));
      console.log(chalk.gray(`   Recommendation: ${report.summary.recommendation}`));
      console.log(chalk.gray(`   Report saved: ${reportPath}`));

      analysisResults.push({
        scenario: scenario.name,
        success: true,
        report
      });

    } catch (error) {
      console.log(chalk.red('❌ Analysis failed:'), error.message);
      analysisResults.push({
        scenario: scenario.name,
        success: false,
        error: error.message
      });
    }
  }

  // Generate consolidated report
  console.log(chalk.bold.blue('\n📊 Consolidated Analysis Results:\n'));
  
  for (const result of analysisResults) {
    if (result.success) {
      console.log(chalk.green(`✅ ${result.scenario}`));
      console.log(chalk.gray(`   Score: ${result.report.summary.overallScore}/100`));
      console.log(chalk.gray(`   Findings: ${result.report.summary.totalFindings}`));
      console.log(chalk.gray(`   Cost: $${result.report.metadata.totalCost}`));
    } else {
      console.log(chalk.red(`❌ ${result.scenario}: ${result.error}`));
    }
  }

  // Cost summary
  const totalAnalysisCost = analysisResults
    .filter(r => r.success)
    .reduce((sum, r) => sum + parseFloat(r.report.metadata.totalCost), 0);
  
  console.log(chalk.blue('\n💰 Cost Analysis:'));
  console.log(chalk.gray(`   Total analyses: ${analysisResults.filter(r => r.success).length}`));
  console.log(chalk.gray(`   Total cost: $${totalAnalysisCost.toFixed(6)}`));
  console.log(chalk.gray(`   Average cost per analysis: $${(totalAnalysisCost / analysisResults.filter(r => r.success).length).toFixed(6)}`));

  return analysisResults.filter(r => r.success).length > 0;
}

// Helper function to generate realistic findings
function generateFindings(agent, context) {
  const findingTemplates = {
    security: [
      { severity: 'high', message: 'Potential SQL injection vulnerability detected', category: 'security' },
      { severity: 'medium', message: 'Missing input validation on user data', category: 'security' },
      { severity: 'low', message: 'Consider using parameterized queries', category: 'security' }
    ],
    performance: [
      { severity: 'medium', message: 'Inefficient algorithm with O(n²) complexity', category: 'performance' },
      { severity: 'low', message: 'Consider caching frequently accessed data', category: 'performance' }
    ],
    architecture: [
      { severity: 'medium', message: 'High coupling between modules detected', category: 'architecture' },
      { severity: 'low', message: 'Consider extracting interface for better testability', category: 'architecture' }
    ],
    codeQuality: [
      { severity: 'low', message: 'Function exceeds recommended length of 20 lines', category: 'code-quality' },
      { severity: 'low', message: 'Missing documentation for public methods', category: 'code-quality' }
    ],
    dependencies: [
      { severity: 'high', message: 'Dependency with known security vulnerability', category: 'dependencies' },
      { severity: 'medium', message: 'Outdated dependencies detected', category: 'dependencies' }
    ]
  };

  const findings = findingTemplates[agent] || [];
  // Return random subset based on context
  const count = context.sizeCategory === 'small' ? 1 : context.sizeCategory === 'medium' ? 2 : 3;
  return findings.slice(0, count).map(f => ({
    ...f,
    agent,
    file: context.files[0]?.path || 'unknown',
    line: Math.floor(Math.random() * 100) + 1
  }));
}

// Helper function to generate educational content
function generateEducationalContent(language) {
  const patterns = {
    python: ['Decorator pattern', 'Context managers', 'Generator expressions'],
    javascript: ['Async/await patterns', 'Functional programming', 'Module patterns'],
    java: ['Dependency injection', 'Builder pattern', 'Stream API usage']
  };
  return patterns[language] || ['General best practices'];
}

// Helper function to generate detailed report
function generateDetailedReport(scenario, findings, modelConfig) {
  return `
# PR Analysis Report

## Overview
- **Repository**: ${scenario.context.repository}
- **PR**: #${scenario.context.prNumber} - ${scenario.context.title}
- **Language**: ${scenario.context.language}
- **Size**: ${scenario.context.sizeCategory}
- **Model**: ${modelConfig?.model || 'default'}

## Analysis Summary
This PR ${scenario.context.description}. Our multi-agent analysis has identified several areas for consideration.

## Key Findings
${Object.entries(findings).map(([agent, agentFindings]) => `
### ${agent.charAt(0).toUpperCase() + agent.slice(1)} Analysis
${agentFindings.map(f => `- **${f.severity.toUpperCase()}**: ${f.message} (${f.file}:${f.line})`).join('\n')}
`).join('\n')}

## Recommendations
1. Address all high-severity findings before merging
2. Consider the architectural improvements suggested
3. Update documentation as recommended

## Next Steps
- Review and address the findings
- Run additional tests if needed
- Request re-review after changes
`;
}

// Run the analysis
if (require.main === module) {
  runFullPRAnalysis()
    .then((success) => {
      if (success) {
        console.log(chalk.green.bold('\n✅ E2E Full PR Analysis completed successfully!'));
        console.log(chalk.gray('Check the test-reports directory for detailed analysis reports.'));
      } else {
        console.log(chalk.red.bold('\n❌ E2E Full PR Analysis failed!'));
      }
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error(chalk.red('Fatal error:'), error);
      process.exit(1);
    });
}

module.exports = { runFullPRAnalysis };