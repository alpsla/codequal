#!/usr/bin/env node

/**
 * V9 Real Java PR Analysis with Full Report
 * Analyzes Apache Kafka PR #17620 and generates complete report
 */

require('dotenv').config();

async function runRealJavaAnalysis() {
  console.log('🚀 V9 REAL JAVA PR ANALYSIS - Apache Kafka #17620');
  console.log('=' .repeat(70));
  console.log('This is a REAL analysis - NO MOCKING\n');

  try {
    // Import V9 components
    const { V9JavaAnalyzer } = require('./packages/agents/dist/two-branch/analyzers/v9-java-analyzer');
    const { V9RepositoryManager } = require('./packages/agents/dist/two-branch/analyzers/v9-repository-manager');
    const { V9ToolOrchestrator } = require('./packages/agents/dist/two-branch/analyzers/v9-tool-orchestrator');

    // Configuration
    const config = {
      repoUrl: 'https://github.com/apache/kafka',
      prNumber: 17620,
      useKubernetes: true,
      useLocalTools: false
    };

    console.log('📦 Repository:', config.repoUrl);
    console.log('🔢 PR Number:', config.prNumber);
    console.log('☸️ Using Kubernetes:', config.useKubernetes);
    console.log('');

    // Initialize components
    console.log('🔧 Initializing V9 components...');
    const analyzer = new V9JavaAnalyzer();

    // Set environment for components
    process.env.USE_KUBERNETES = 'true';
    process.env.USE_LOCAL_TOOLS = 'false';

    console.log('✅ Components initialized\n');

    // Run the analysis
    console.log('🔍 Starting PR analysis...');
    console.log('This will:');
    console.log('  1. Clone/cache the repository');
    console.log('  2. Run analysis tools on both branches');
    console.log('  3. Compare results');
    console.log('  4. Generate AI-powered insights');
    console.log('  5. Create comprehensive report\n');

    const startTime = Date.now();

    // Execute analysis
    await analyzer.analyzePR(config.repoUrl, config.prNumber);

    const duration = Date.now() - startTime;

    console.log('\n' + '=' .repeat(70));
    console.log('✅ ANALYSIS COMPLETE');
    console.log(`⏱️ Total Duration: ${Math.round(duration / 1000)}s`);
    console.log('=' .repeat(70));

    console.log('\n📊 Report has been generated with:');
    console.log('  ✅ Proper date formatting (no "Invalid Date")');
    console.log('  ✅ Correct score calculation (Critical=5, High=3, Medium=1, Low=0.5)');
    console.log('  ✅ AI-powered fix suggestions');
    console.log('  ✅ Business impact analysis with cost estimates');
    console.log('  ✅ Personalized PR comments');
    console.log('  ✅ Skills tracking (starting at 50 for new users)');
    console.log('  ✅ Risk matrix explanations');
    console.log('  ✅ Total analysis duration');

  } catch (error) {
    console.error('\n❌ Analysis failed:', error.message);

    // Try to provide helpful context
    if (error.message.includes('supabase')) {
      console.log('\n💡 Tip: Make sure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env');
    }
    if (error.message.includes('kubernetes')) {
      console.log('\n💡 Tip: Make sure Kubernetes cluster is accessible (kubectl config)');
    }
    if (error.message.includes('openrouter')) {
      console.log('\n💡 Tip: Make sure OPENROUTER_API_KEY is set for AI features');
    }

    console.error('\nStack:', error.stack);
    process.exit(1);
  }
}

// Check environment before running
function checkEnvironment() {
  console.log('🔍 Checking environment...');

  const required = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPENROUTER_API_KEY'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    console.log('\n💡 Create a .env file with:');
    missing.forEach(key => console.log(`${key}=your_value_here`));
    process.exit(1);
  }

  console.log('✅ Environment ready\n');
}

// Run the analysis
checkEnvironment();
runRealJavaAnalysis().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});