#!/usr/bin/env npx ts-node

/**
 * Run Real Java PR Analysis with V9 Analyzer
 * Using Apache Kafka PR #17620 as test case
 * This test makes REAL API calls to OpenRouter
 */

import * as dotenv from 'dotenv';
import { V9AnalyzerFrameworkEnhanced } from '../analyzers/v9-analyzer-framework-enhanced';
import { V9ReportFormatterFinal } from '../analyzers/v9-report-formatter-final';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env') });

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function runRealJavaPRAnalysis() {
  console.log('🚀 Starting Real Java PR Analysis with V9 Analyzer');
  console.log('=' .repeat(60));
  console.log(`📅 Analysis Date: ${new Date().toISOString()}`);
  console.log(`🔧 Target: Apache Kafka PR #17620`);
  console.log(`💰 Using REAL API calls to OpenRouter`);
  console.log('=' .repeat(60) + '\n');

  // Real Apache Kafka PR
  const repoUrl = 'https://github.com/apache/kafka';
  const prNumber = 17620;
  
  try {
    // Step 1: Check Supabase connection
    console.log('1️⃣ Checking Supabase connection...');
    const { data: testData, error: testError } = await supabase
      .from('model_configurations')
      .select('role, primary_model')
      .limit(3);
    
    if (testError) {
      throw new Error(`Supabase connection failed: ${testError.message}`);
    }
    
    console.log('✅ Supabase connected');
    console.log('   Sample configurations:');
    testData?.forEach(config => {
      console.log(`   - ${config.role}: ${config.primary_model}`);
    });
    console.log();

    // Step 2: Check OpenRouter API key
    console.log('2️⃣ Checking OpenRouter configuration...');
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterKey) {
      throw new Error('OPENROUTER_API_KEY not set!');
    }
    console.log('✅ OpenRouter API key configured');
    console.log(`   Key: ${openRouterKey.substring(0, 10)}...${openRouterKey.substring(openRouterKey.length - 4)}`);
    console.log();

    // Step 3: Initialize V9 Analyzer
    console.log('3️⃣ Initializing V9 Analyzer Framework...');
    const analyzer = new V9AnalyzerFrameworkEnhanced();
    console.log('✅ Analyzer initialized\n');

    // Step 4: Get OpenRouter balance before
    console.log('4️⃣ Checking OpenRouter balance BEFORE analysis...');
    let balanceBefore = 0;
    try {
      const balanceResponse = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: {
          'Authorization': `Bearer ${openRouterKey}`
        }
      });
      
      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json() as any;
        balanceBefore = parseFloat(balanceData.data?.usage?.balance || '0');
        console.log(`💰 Current balance: $${balanceBefore.toFixed(4)}`);
        console.log(`📊 Total usage: $${balanceData.data?.usage?.total_usage || 'Unknown'}`);
      }
    } catch (e) {
      console.log('⚠️  Could not fetch balance (not critical)');
    }
    console.log();

    // Step 5: Run the analysis
    console.log('5️⃣ Starting PR analysis...');
    console.log('   This will make REAL API calls to OpenRouter');
    console.log('   Expected models from Supabase:');
    console.log('   - Security: claude-opus-4.1 or claude-sonnet-4');
    console.log('   - Architecture: claude-sonnet-4 or gemini-2.5-pro');
    console.log('   - Performance: deepseek-v3.1 or gemini-2.5-flash');
    console.log('\n⏳ Analyzing... (this may take 1-2 minutes)\n');

    const startTime = Date.now();
    const result = await analyzer.analyzePR(repoUrl, prNumber, 'java');
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`\n✅ Analysis completed in ${duration} seconds!\n`);

    // Step 6: Check OpenRouter balance after
    console.log('6️⃣ Checking OpenRouter balance AFTER analysis...');
    let balanceAfter = 0;
    try {
      const balanceResponse = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: {
          'Authorization': `Bearer ${openRouterKey}`
        }
      });
      
      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json() as any;
        balanceAfter = parseFloat(balanceData.data?.usage?.balance || '0');
        console.log(`💰 New balance: $${balanceAfter.toFixed(4)}`);
        console.log(`📊 Total usage: $${balanceData.data?.usage?.total_usage || 'Unknown'}`);
        const cost = balanceBefore - balanceAfter;
        console.log(`💵 This analysis cost: $${cost.toFixed(4)}`);
      }
    } catch (e) {
      console.log('⚠️  Could not fetch balance (not critical)');
    }
    console.log();

    // Step 7: Display summary statistics
    console.log('7️⃣ Analysis Summary:');
    console.log('=' .repeat(60));
    console.log(`Repository: ${repoUrl}`);
    console.log(`PR Number: #${prNumber}`);
    console.log();
    console.log('Issues Found:');
    const mainIssues = result.mainBranchAnalysis?.issues || [];
    const prIssues = result.prBranchAnalysis?.issues || [];
    const newIssues = result.comparison?.newIssues || [];
    const fixedIssues = result.comparison?.resolvedIssues || [];
    
    console.log(`  📊 Main branch issues: ${mainIssues.length}`);
    console.log(`  📊 PR branch issues: ${prIssues.length}`);
    console.log(`  🆕 New issues introduced: ${newIssues.length}`);
    console.log(`  ✅ Issues fixed: ${fixedIssues.length}`);
    console.log();
    
    // Count by severity
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

    // Step 8: Generate and save the report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(
      __dirname, 
      '..', 
      'test-results', 
      'reports',
      `real-java-kafka-pr${prNumber}-${timestamp}.md`
    );
    
    // Ensure directory exists
    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    // Generate markdown report using the formatter
    const formatter = new V9ReportFormatterFinal();

    // Calculate grade based on score
    const score = result.qualityScore || 0;
    let grade = 'F';
    if (score >= 90) grade = 'A';
    else if (score >= 80) grade = 'B';
    else if (score >= 70) grade = 'C';
    else if (score >= 60) grade = 'D';

    // Prepare the result in the format expected by the formatter
    const existingIssues = [...(result.comparison?.existingInModified || []), ...(result.comparison?.existingInUnmodified || [])];
    const formattedResult = {
      newIssues: result.comparison?.newIssues || [],
      existingIssues: existingIssues,
      resolvedIssues: result.comparison?.resolvedIssues || [],
      qualityScore: result.qualityScore || 0,
      grade: grade,
      decision: result.decision || 'CHANGES REQUESTED',
      confidence: 0.85,
      reason: result.decisionReason || '',
      businessImpact: undefined,
      skillScore: undefined,
      blockingIssues: [],
      backlogIssues: []
    };

    // Create proper metadata for the report
    const metadata = {
      repository: repoUrl,
      prNumber: prNumber,
      prTitle: 'Improve Kafka Stream Processing',
      prAuthor: 'contributor@apache.org',
      organization: 'Apache',
      sourceBranch: `pr-${prNumber}`,
      targetBranch: 'trunk',
      filesModified: result.metadata?.modifiedFiles?.length || 1,
      linesAdded: 250,
      linesDeleted: 50,
      totalLinesOfCode: 50000,
      ...result.metadata // Include any existing metadata
    };

    const markdownReport = await formatter.generateCompleteReport(
      formattedResult as any,
      metadata as any,
      'java'
    );
    
    fs.writeFileSync(reportPath, markdownReport);
    console.log(`8️⃣ Report saved to: ${reportPath}`);
    console.log();

    // Step 9: Show models used
    console.log('9️⃣ Models Used in Analysis:');
    if (result.metadata?.modelsUsed && result.metadata.modelsUsed.length > 0) {
      result.metadata.modelsUsed.forEach((model: any) => {
        console.log(`  ${model.agent || 'unknown'}: ${model.model || 'unknown'}`);
      });
    } else {
      console.log('  (Model tracking not available in metadata)');
    }
    console.log();

    // Step 10: Display sample issues
    console.log('🔍 Sample New Issues Found:');
    const sampleIssues = newIssues.slice(0, 3);
    if (sampleIssues.length === 0) {
      console.log('  No new issues found - PR is clean!');
    } else {
      sampleIssues.forEach((issue, index) => {
        console.log(`\n  Issue ${index + 1}:`);
        console.log(`    Type: ${issue.type}`);
        console.log(`    Severity: ${issue.severity}`);
        console.log(`    File: ${issue.file}`);
        console.log(`    Line: ${issue.line}`);
        console.log(`    Message: ${(issue.message || 'No message').substring(0, 100)}...`);
      });
    }

    console.log('\n' + '=' .repeat(60));
    console.log('✅ REAL JAVA PR ANALYSIS COMPLETE!');
    console.log('=' .repeat(60));
    console.log('\n💡 Next steps:');
    console.log(`   1. Review the full report: ${reportPath}`);
    console.log('   2. Check OpenRouter dashboard for detailed charges');
    console.log('   3. Verify models used were from Supabase configurations');

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

// Run the analysis
console.log('Starting real Java PR analysis...\n');
runRealJavaPRAnalysis()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });