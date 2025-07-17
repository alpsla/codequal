import { ResultOrchestrator } from '../services/result-orchestrator';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testAnalysisWithEmbeddings() {
  console.log('🔍 Testing Analysis Flow with New Embedding System\n');

  // Create a test user
  const testUser = {
    id: 'test-embedding-user-' + Date.now(),
    email: 'test@example.com'
  };

  // Test repository and PR
  const testRepo = 'https://github.com/facebook/react';
  const testPR = 1;

  console.log('Test Configuration:');
  console.log(`Repository: ${testRepo}`);
  console.log(`PR Number: ${testPR}`);
  console.log(`User ID: ${testUser.id}\n`);

  try {
    // Initialize orchestrator
    console.log('1. Initializing ResultOrchestrator...');
    const orchestrator = new ResultOrchestrator(testUser);
    console.log('✅ Orchestrator initialized\n');

    // Start analysis
    console.log('2. Starting PR analysis...');
    const analysisPromise = orchestrator.analyzePR({
      repositoryUrl: testRepo,
      prNumber: testPR,
      analysisMode: 'fast', // Use fast mode for testing
      authenticatedUser: testUser,
      githubToken: process.env.GITHUB_TOKEN
    });

    // Monitor progress
    console.log('3. Monitoring analysis progress...\n');
    
    let lastProgress = 0;
    const progressInterval = setInterval(async () => {
      try {
        // Check vector operation logs for this analysis
        const { data: recentOps } = await supabase
          .from('vector_operation_logs')
          .select('*')
          .gte('created_at', new Date(Date.now() - 60000).toISOString()) // Last minute
          .order('created_at', { ascending: false })
          .limit(5);

        if (recentOps && recentOps.length > 0) {
          const embedOps = recentOps.filter(op => 
            op.operation.includes('embedding') || op.operation.includes('adapted')
          );
          
          if (embedOps.length > 0) {
            console.log(`📊 Recent embedding operations:`);
            embedOps.forEach(op => {
              const meta = op.metadata || {};
              console.log(`   - ${op.operation}: ${op.success ? '✅' : '❌'}`);
              if (meta.originalDimension && meta.adaptedDimension) {
                console.log(`     Dimensions: ${meta.originalDimension} → ${meta.adaptedDimension}`);
              }
            });
            console.log('');
          }
        }
      } catch (error) {
        // Ignore errors in monitoring
      }
    }, 5000);

    // Wait for analysis to complete
    console.log('4. Waiting for analysis to complete...\n');
    const result = await analysisPromise;
    clearInterval(progressInterval);

    console.log('✅ Analysis completed!\n');

    // Check if analysis was stored in the new tables
    console.log('5. Checking analysis storage...\n');
    
    // Check analysis_reports table
    const { data: reportData } = await supabase
      .from('analysis_reports')
      .select('*')
      .eq('analysis_id', result.analysisId)
      .single();

    if (reportData) {
      console.log('✅ Analysis report stored successfully');
      console.log(`   Report ID: ${reportData.id}`);
      console.log(`   Status: ${reportData.status}`);
      console.log(`   Vector IDs: ${reportData.vector_ids?.length || 0} embeddings stored\n`);
    } else {
      console.log('⚠️  Analysis report not found in database\n');
    }

    // Check pr_analyses table
    const { data: prAnalysis } = await supabase
      .from('pr_analyses')
      .select('*')
      .eq('analysis_id', result.analysisId)
      .single();

    if (prAnalysis) {
      console.log('✅ PR analysis record found');
      console.log(`   Status: ${prAnalysis.status}`);
      console.log(`   Progress: ${prAnalysis.progress}%`);
      console.log(`   Completed at: ${prAnalysis.completed_at || 'Not completed'}\n`);
    }

    // Check vector operation statistics
    console.log('6. Vector operation statistics:\n');
    
    const { data: stats } = await supabase
      .from('vector_operation_logs')
      .select('operation, success, metadata')
      .gte('created_at', new Date(Date.now() - 300000).toISOString()) // Last 5 minutes
      .order('created_at', { ascending: false });

    if (stats) {
      const embedStats = stats.filter(s => s.operation.includes('embedding'));
      const adaptStats = embedStats.filter(s => 
        s.metadata?.originalDimension !== s.metadata?.adaptedDimension
      );

      console.log(`Total embedding operations: ${embedStats.length}`);
      console.log(`Successful: ${embedStats.filter(s => s.success).length}`);
      console.log(`Failed: ${embedStats.filter(s => !s.success).length}`);
      console.log(`Required adaptation: ${adaptStats.length}`);
      
      // Show dimension distribution
      const dimensions = new Map<number, number>();
      embedStats.forEach(s => {
        const dim = s.metadata?.originalDimension;
        if (dim) {
          dimensions.set(dim, (dimensions.get(dim) || 0) + 1);
        }
      });
      
      if (dimensions.size > 0) {
        console.log('\nDimension distribution:');
        dimensions.forEach((count, dim) => {
          console.log(`   ${dim} dimensions: ${count} embeddings`);
        });
      }
    }

    // Summary
    console.log('\n\n📋 Analysis Summary:');
    console.log(`Analysis ID: ${result.analysisId}`);
    console.log(`Repository: ${result.repository?.name || 'Unknown'}`);
    console.log(`PR: #${result.pr?.number || 'Unknown'}`);
    console.log(`Total findings: ${result.analysis?.totalFindings || 0}`);
    console.log(`Processing time: ${result.analysis?.processingTime || 'Unknown'}`);
    
    if (result.report?.recommendations) {
      console.log(`\nTop recommendations:`);
      result.report.recommendations.slice(0, 3).forEach((rec: string, i: number) => {
        console.log(`   ${i + 1}. ${rec}`);
      });
    }

  } catch (error) {
    console.error('\n❌ Analysis failed:', error);
    
    // Check for embedding-related errors in logs
    const { data: errorLogs } = await supabase
      .from('vector_operation_logs')
      .select('*')
      .eq('success', false)
      .gte('created_at', new Date(Date.now() - 300000).toISOString())
      .order('created_at', { ascending: false })
      .limit(5);

    if (errorLogs && errorLogs.length > 0) {
      console.log('\nRecent embedding errors:');
      errorLogs.forEach(log => {
        console.log(`   - ${log.operation}: ${log.error_message || 'Unknown error'}`);
      });
    }
  }

  console.log('\n✅ Test complete!');
}

// Run the test
testAnalysisWithEmbeddings().catch(console.error);