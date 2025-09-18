#!/usr/bin/env npx ts-node

/**
 * Run Real Java PR Analysis with V9 Analyzer
 * Using Apache Kafka PR #17620 as test case
 */

import * as dotenv from 'dotenv';
import { V9AnalyzerFrameworkEnhanced } from '../analyzers/v9-analyzer-framework-enhanced';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();

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
  console.log(`💰 Using LATEST paid models (not free)`);
  console.log('=' .repeat(60) + '\n');

  // Real Apache Kafka PR
  const prUrl = 'https://github.com/apache/kafka/pull/17620';
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
    console.log('✅ Analyzer initialized with latest models\n');

    // Step 4: Get OpenRouter balance before
    console.log('4️⃣ Checking OpenRouter balance BEFORE analysis...');
    try {
      const balanceResponse = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: {
          'Authorization': `Bearer ${openRouterKey}`
        }
      });
      
      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        console.log(`💰 Current balance: $${(balanceData as any).data?.usage?.balance || 'Unknown'}`);
        console.log(`📊 Total usage: $${(balanceData as any).data?.usage?.total_usage || 'Unknown'}`);
      }
    } catch (e) {
      console.log('⚠️  Could not fetch balance (not critical)');
    }
    console.log();

    // Step 5: Run the analysis
    console.log('5️⃣ Starting PR analysis...');
    console.log('   This will use REAL API calls with LATEST models');
    console.log('   Expected models:');
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
    try {
      const balanceResponse = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: {
          'Authorization': `Bearer ${openRouterKey}`
        }
      });
      
      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        console.log(`💰 New balance: $${(balanceData as any).data?.usage?.balance || 'Unknown'}`);
        console.log(`📊 Total usage: $${(balanceData as any).data?.usage?.total_usage || 'Unknown'}`);
        console.log(`💵 This analysis cost: Check the difference above`);
      }
    } catch (e) {
      console.log('⚠️  Could not fetch balance (not critical)');
    }
    console.log();

    // Step 7: Display summary statistics
    console.log('7️⃣ Analysis Summary:');
    console.log('=' .repeat(60));
    console.log(`Repository: ${result.repository.owner}/${result.repository.name}`);
    console.log(`PR #${result.pullRequest.number}: ${result.pullRequest.title}`);
    console.log(`Author: ${result.pullRequest.author}`);
    console.log(`Files changed: ${result.pullRequest.files_changed}`);
    console.log(`Lines: +${result.pullRequest.additions} -${result.pullRequest.deletions}`);
    console.log();
    console.log('Issues Found:');
    console.log(`  🔴 Critical: ${result.analysis.issues.filter(i => i.severity === 'critical').length}`);
    console.log(`  🟠 High: ${result.analysis.issues.filter(i => i.severity === 'high').length}`);
    console.log(`  🟡 Medium: ${result.analysis.issues.filter(i => i.severity === 'medium').length}`);
    console.log(`  🟢 Low: ${result.analysis.issues.filter(i => i.severity === 'low').length}`);
    console.log(`  📊 Total: ${result.analysis.issues.length}`);
    console.log();
    console.log(`Overall Score: ${result.analysis.score}/100`);
    console.log(`Risk Level: ${result.analysis.risk_level}`);
    console.log();

    // Step 8: Save the report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(
      __dirname, 
      '..', 
      'test-results', 
      'reports',
      `real-java-kafka-pr17620-${timestamp}.md`
    );
    
    // Ensure directory exists
    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    // Generate markdown report
    const V9ReportFormatterFinal = await import('../analyzers/v9-report-formatter-final');
    const formatter = new V9ReportFormatterFinal.V9ReportFormatterFinal();
    const markdownReport = await formatter.generateCompleteReport(result, repoUrl, prNumber);
    
    fs.writeFileSync(reportPath, markdownReport);
    console.log(`8️⃣ Report saved to: ${reportPath}`);
    console.log();

    // Step 9: Show models used
    console.log('9️⃣ Models Used in Analysis:');
    if (result.metadata?.models_used) {
      Object.entries(result.metadata.models_used).forEach(([agent, model]) => {
        console.log(`  ${agent}: ${model}`);
      });
    } else {
      console.log('  (Model tracking not available in metadata)');
    }
    console.log();

    // Step 10: Display sample issues
    console.log('🔍 Sample Issues Found:');
    const sampleIssues = result.analysis.issues.slice(0, 3);
    sampleIssues.forEach((issue, index) => {
      console.log(`\n  Issue ${index + 1}:`);
      console.log(`    Type: ${issue.type}`);
      console.log(`    Severity: ${issue.severity}`);
      console.log(`    File: ${issue.file}`);
      console.log(`    Line: ${issue.line}`);
      console.log(`    Message: ${issue.message.substring(0, 100)}...`);
    });

    console.log('\n' + '=' .repeat(60));
    console.log('✅ REAL JAVA PR ANALYSIS COMPLETE!');
    console.log('=' .repeat(60));
    console.log('\n💡 Next steps:');
    console.log(`   1. Review the full report: ${reportPath}`);
    console.log('   2. Check OpenRouter dashboard for detailed charges');
    console.log('   3. Verify models used were the latest versions');

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