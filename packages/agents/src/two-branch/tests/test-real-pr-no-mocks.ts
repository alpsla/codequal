#!/usr/bin/env npx ts-node

/**
 * Real PR Analysis Test - No Mocking
 * This test performs actual PR analysis using the V9 Analyzer Framework
 * with real GitHub data and actual AI model calls
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { V9AnalyzerFrameworkEnhanced } from '../analyzers/v9-analyzer-framework-enhanced';
import { V9ReportFormatterFinal } from '../analyzers/v9-report-formatter-final';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env') });

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Test configurations for different languages
const TEST_CASES = {
  java: {
    repoUrl: 'https://github.com/apache/kafka',
    prNumber: 17620,
    description: 'Apache Kafka - Java PR'
  },
  python: {
    repoUrl: 'https://github.com/psf/requests',
    prNumber: 6500,
    description: 'Python Requests Library'
  },
  javascript: {
    repoUrl: 'https://github.com/facebook/react',
    prNumber: 28000,
    description: 'React - JavaScript PR'
  },
  go: {
    repoUrl: 'https://github.com/kubernetes/kubernetes',
    prNumber: 120000,
    description: 'Kubernetes - Go PR'
  },
  rust: {
    repoUrl: 'https://github.com/rust-lang/rust',
    prNumber: 118000,
    description: 'Rust Language'
  }
};

async function runRealPRAnalysis(language: string = 'java') {
  const testCase = TEST_CASES[language as keyof typeof TEST_CASES];

  if (!testCase) {
    console.error(`❌ No test case configured for language: ${language}`);
    console.error(`   Available: ${Object.keys(TEST_CASES).join(', ')}`);
    process.exit(1);
  }

  console.log('🚀 Starting Real PR Analysis (No Mocks)');
  console.log('=' .repeat(60));
  console.log(`📅 Analysis Date: ${new Date().toISOString()}`);
  console.log(`🔧 Target: ${testCase.description}`);
  console.log(`📦 Repository: ${testCase.repoUrl}`);
  console.log(`🔢 PR Number: #${testCase.prNumber}`);
  console.log(`💰 Using REAL API calls to OpenRouter`);
  console.log('=' .repeat(60) + '\n');

  try {
    // Step 1: Verify environment
    console.log('1️⃣ Verifying environment configuration...');

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase configuration in .env');
    }

    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error('Missing OpenRouter API key in .env');
    }

    console.log('✅ Environment configured correctly\n');

    // Step 2: Check Supabase models
    console.log('2️⃣ Checking Supabase model configurations...');
    const { data: models, error: modelsError } = await supabase
      .from('model_configurations')
      .select('role, primary_model, language, repo_size')
      .eq('language', language)
      .limit(5);

    if (modelsError) {
      console.warn('⚠️  Could not fetch model configurations:', modelsError.message);
    } else if (models && models.length > 0) {
      console.log('   Available models:');
      models.forEach(m => {
        console.log(`   - ${m.role}: ${m.primary_model} (${m.language}/${m.repo_size})`);
      });
    } else {
      console.log('   No models configured for this language yet');
    }
    console.log();

    // Step 3: Initialize analyzer
    console.log('3️⃣ Initializing V9 Analyzer Framework...');
    const analyzer = new V9AnalyzerFrameworkEnhanced();
    console.log('✅ Analyzer initialized\n');

    // Step 4: Check OpenRouter balance
    console.log('4️⃣ Checking OpenRouter balance...');
    let balanceBefore = 0;
    try {
      const balanceResponse = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`
        }
      });

      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json() as any;
        balanceBefore = parseFloat(balanceData.data?.usage?.balance || '0');
        console.log(`💰 Current balance: $${balanceBefore.toFixed(4)}`);
      }
    } catch (e) {
      console.log('⚠️  Could not fetch balance');
    }
    console.log();

    // Step 5: Run the REAL analysis
    console.log('5️⃣ Starting PR analysis with real data...');
    console.log('   This will:');
    console.log('   - Clone the actual repository');
    console.log('   - Fetch real PR data from GitHub');
    console.log('   - Analyze actual code changes');
    console.log('   - Use AI models from Supabase config');
    console.log('\n⏳ Analyzing... (this may take 2-3 minutes)\n');

    const startTime = Date.now();

    // Run the actual V9 analysis - this does real two-branch analysis
    const result = await analyzer.analyzePR(
      testCase.repoUrl,
      testCase.prNumber,
      language
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✅ Analysis completed in ${duration} seconds!\n`);

    // Step 6: Check cost
    console.log('6️⃣ Checking analysis cost...');
    let balanceAfter = balanceBefore;
    try {
      const balanceResponse = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`
        }
      });

      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json() as any;
        balanceAfter = parseFloat(balanceData.data?.usage?.balance || '0');
        const cost = balanceBefore - balanceAfter;
        console.log(`💰 New balance: $${balanceAfter.toFixed(4)}`);
        console.log(`💵 Analysis cost: $${cost.toFixed(4)}`);
      }
    } catch (e) {
      console.log('⚠️  Could not fetch final balance');
    }
    console.log();

    // Step 7: Display real results
    console.log('7️⃣ Analysis Results (Real Data):');
    console.log('=' .repeat(60));

    // These are REAL results from the actual analysis
    const mainIssues = result.mainBranchAnalysis?.issues || [];
    const prIssues = result.prBranchAnalysis?.issues || [];
    const newIssues = result.comparison?.newIssues || [];
    const resolvedIssues = result.comparison?.resolvedIssues || [];
    const existingInModified = result.comparison?.existingInModified || [];
    const existingInUnmodified = result.comparison?.existingInUnmodified || [];

    console.log('Branch Analysis:');
    console.log(`  📊 Main branch issues: ${mainIssues.length}`);
    console.log(`  📊 PR branch issues: ${prIssues.length}`);
    console.log();

    console.log('Issue Comparison:');
    console.log(`  🆕 New issues introduced: ${newIssues.length}`);
    console.log(`  ✅ Issues resolved: ${resolvedIssues.length}`);
    console.log(`  📌 Existing in modified files: ${existingInModified.length}`);
    console.log(`  📋 Existing in unmodified files: ${existingInUnmodified.length}`);
    console.log();

    // Show severity breakdown of new issues
    if (newIssues.length > 0) {
      const severityCounts: Record<string, number> = {};
      newIssues.forEach(issue => {
        const severity = issue.severity || 'unknown';
        severityCounts[severity] = (severityCounts[severity] || 0) + 1;
      });

      console.log('New Issues by Severity:');
      console.log(`  🔴 Critical: ${severityCounts.critical || 0}`);
      console.log(`  🟠 High: ${severityCounts.high || 0}`);
      console.log(`  🟡 Medium: ${severityCounts.medium || 0}`);
      console.log(`  🟢 Low: ${severityCounts.low || 0}`);
      console.log();
    }

    console.log('Quality Metrics:');
    console.log(`  📈 Quality Score: ${result.qualityScore || 0}/100`);
    console.log(`  🎯 Decision: ${result.decision}`);
    console.log(`  📝 Reason: ${result.decisionReason}`);
    console.log();

    // Step 8: Generate the report
    console.log('8️⃣ Generating comprehensive report...');

    const formatter = new V9ReportFormatterFinal();

    // Calculate grade based on score
    const score = result.qualityScore || 0;
    let grade = 'F';
    if (score >= 90) grade = 'A';
    else if (score >= 80) grade = 'B';
    else if (score >= 70) grade = 'C';
    else if (score >= 60) grade = 'D';

    // Prepare the result for the formatter - using REAL data
    const existingIssues = [...existingInModified, ...existingInUnmodified];
    const formattedResult = {
      newIssues: newIssues,
      existingIssues: existingIssues,
      resolvedIssues: resolvedIssues,
      qualityScore: score,
      grade: grade,
      decision: result.decision === 'APPROVED' ? 'approved' : 'rejected',
      confidence: 0.95, // High confidence for real analysis
      reason: result.decisionReason || '',
      blockingIssues: newIssues.filter(i => i.severity === 'critical' || i.severity === 'high'),
      backlogIssues: newIssues.filter(i => i.severity === 'medium' || i.severity === 'low'),
      modifiedFiles: result.metadata?.modifiedFiles || [],
      businessImpact: undefined,
      skillScore: undefined,
      metadata: result.metadata
    };

    const markdownReport = await formatter.generateCompleteReport(
      formattedResult as any,
      result.metadata as any,
      language
    );

    // Save the report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(
      __dirname,
      '..',
      'test-results',
      'reports',
      `real-${language}-pr${testCase.prNumber}-${timestamp}.md`
    );

    // Ensure directory exists
    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, markdownReport);
    console.log(`✅ Report saved to: ${reportPath}\n`);

    // Step 9: Show sample of real issues found
    if (newIssues.length > 0) {
      console.log('9️⃣ Sample of Real Issues Found:');
      console.log('=' .repeat(60));

      const sampleIssues = newIssues.slice(0, 3);
      sampleIssues.forEach((issue, index) => {
        console.log(`\nIssue ${index + 1}:`);
        console.log(`  Type: ${issue.type || 'unknown'}`);
        console.log(`  Severity: ${issue.severity || 'unknown'}`);
        console.log(`  Category: ${issue.category || 'unknown'}`);
        console.log(`  File: ${issue.file || 'unknown'}`);
        console.log(`  Line: ${issue.line || 'unknown'}`);
        console.log(`  Message: ${(issue.message || issue.description || 'No description').substring(0, 100)}...`);
      });
    } else {
      console.log('9️⃣ No new issues found - PR is clean!');
    }

    console.log('\n' + '=' .repeat(60));
    console.log('✅ REAL PR ANALYSIS COMPLETE!');
    console.log('=' .repeat(60));

    console.log('\n📊 Summary:');
    console.log(`   - Repository: ${testCase.repoUrl}`);
    console.log(`   - PR #${testCase.prNumber}`);
    console.log(`   - Language: ${language}`);
    console.log(`   - Analysis time: ${duration}s`);
    console.log(`   - Cost: $${(balanceBefore - balanceAfter).toFixed(4)}`);
    console.log(`   - Report: ${reportPath}`);

    return result;

  } catch (error) {
    console.error('\n❌ Analysis failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Get language from command line or default to java
const language = process.argv[2] || 'java';

console.log(`Starting real PR analysis for ${language}...\n`);

runRealPRAnalysis(language)
  .then(() => {
    console.log('\n✅ Test completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });