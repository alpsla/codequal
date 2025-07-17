import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function monitorEmbeddingHealth() {
  console.log('🏥 Embedding System Health Check\n');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('=' .repeat(60) + '\n');

  const healthChecks = {
    tables: { passed: 0, total: 0 },
    embeddings: { passed: 0, total: 0 },
    operations: { passed: 0, total: 0 }
  };

  // 1. Check database tables
  console.log('1. DATABASE TABLES CHECK\n');
  
  const requiredTables = [
    'analysis_reports',
    'pr_analyses',
    'vector_operation_logs',
    'embedding_configurations'
  ];

  for (const table of requiredTables) {
    healthChecks.tables.total++;
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (!error) {
        console.log(`✅ ${table}: OK (${count || 0} records)`);
        healthChecks.tables.passed++;
      } else {
        console.log(`❌ ${table}: ERROR - ${error.message}`);
      }
    } catch (error) {
      console.log(`❌ ${table}: FAILED - ${error}`);
    }
  }

  // 2. Check embedding configurations
  console.log('\n\n2. EMBEDDING CONFIGURATIONS\n');
  
  try {
    const { data: configs, error } = await supabase
      .from('embedding_configurations')
      .select('*')
      .eq('is_active', true);

    if (!error && configs) {
      healthChecks.embeddings.total = configs.length;
      console.log(`Active configurations: ${configs.length}\n`);
      
      configs.forEach(config => {
        console.log(`📊 ${config.model_key}`);
        console.log(`   Provider: ${config.provider}`);
        console.log(`   Model: ${config.model_name}`);
        console.log(`   Dimensions: ${config.dimensions}`);
        console.log(`   Cost: $${config.cost_per_million}/M tokens`);
        console.log(`   Type: ${config.embedding_type}\n`);
        healthChecks.embeddings.passed++;
      });
    } else {
      console.log('❌ Failed to fetch configurations');
    }
  } catch (error) {
    console.log(`❌ Configuration check failed: ${error}`);
  }

  // 3. Check recent operations
  console.log('\n3. RECENT OPERATIONS (Last 24 hours)\n');
  
  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: operations, error } = await supabase
      .from('vector_operation_logs')
      .select('operation, success, created_at')
      .gte('created_at', yesterday);

    if (!error && operations) {
      const stats: Record<string, { success: number; failed: number }> = {};
      
      operations.forEach(op => {
        if (!stats[op.operation]) {
          stats[op.operation] = { success: 0, failed: 0 };
        }
        if (op.success) {
          stats[op.operation].success++;
        } else {
          stats[op.operation].failed++;
        }
      });

      console.log(`Total operations: ${operations.length}\n`);
      
      Object.entries(stats).forEach(([operation, counts]) => {
        const total = counts.success + counts.failed;
        const successRate = total > 0 ? (counts.success / total * 100).toFixed(1) : '0';
        
        healthChecks.operations.total++;
        if (parseFloat(successRate) >= 90) {
          healthChecks.operations.passed++;
        }
        
        const status = parseFloat(successRate) >= 90 ? '✅' : '⚠️';
        console.log(`${status} ${operation}`);
        console.log(`   Success: ${counts.success}, Failed: ${counts.failed}`);
        console.log(`   Success Rate: ${successRate}%\n`);
      });
    } else {
      console.log('❌ Failed to fetch operations');
    }
  } catch (error) {
    console.log(`❌ Operations check failed: ${error}`);
  }

  // 4. Check dimension adaptations
  console.log('\n4. DIMENSION ADAPTATIONS (Last 24 hours)\n');
  
  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: adaptations, error } = await supabase
      .from('vector_operation_logs')
      .select('metadata')
      .gte('created_at', yesterday)
      .not('metadata->originalDimension', 'is', null);

    if (!error && adaptations) {
      const dimensionMap = new Map<string, number>();
      
      adaptations.forEach(log => {
        const meta = log.metadata;
        if (meta?.originalDimension && meta?.adaptedDimension) {
          const key = `${meta.originalDimension} → ${meta.adaptedDimension}`;
          dimensionMap.set(key, (dimensionMap.get(key) || 0) + 1);
        }
      });

      if (dimensionMap.size > 0) {
        console.log('Dimension adaptations performed:');
        dimensionMap.forEach((count, conversion) => {
          console.log(`   ${conversion}: ${count} times`);
        });
      } else {
        console.log('No dimension adaptations needed (all embeddings matched target dimension)');
      }
    }
  } catch (error) {
    console.log(`❌ Adaptation check failed: ${error}`);
  }

  // 5. Error analysis
  console.log('\n\n5. ERROR ANALYSIS (Last 24 hours)\n');
  
  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: errors, error } = await supabase
      .from('vector_operation_logs')
      .select('operation, error_message, created_at')
      .eq('success', false)
      .gte('created_at', yesterday)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && errors) {
      if (errors.length === 0) {
        console.log('✅ No errors in the last 24 hours!');
      } else {
        console.log(`Found ${errors.length} recent errors:\n`);
        errors.forEach(err => {
          console.log(`❌ ${new Date(err.created_at).toLocaleString()}`);
          console.log(`   Operation: ${err.operation}`);
          console.log(`   Error: ${err.error_message || 'No error message'}\n`);
        });
      }
    }
  } catch (error) {
    console.log(`❌ Error analysis failed: ${error}`);
  }

  // Overall health score
  console.log('\n' + '=' .repeat(60));
  console.log('\n🏥 OVERALL HEALTH SCORE\n');
  
  const overallScore = {
    tables: (healthChecks.tables.passed / healthChecks.tables.total * 100) || 0,
    embeddings: (healthChecks.embeddings.passed / healthChecks.embeddings.total * 100) || 0,
    operations: (healthChecks.operations.passed / healthChecks.operations.total * 100) || 0
  };
  
  const avgScore = (overallScore.tables + overallScore.embeddings + overallScore.operations) / 3;
  
  console.log(`Database Tables: ${overallScore.tables.toFixed(0)}%`);
  console.log(`Embedding Configs: ${overallScore.embeddings.toFixed(0)}%`);
  console.log(`Operations Health: ${overallScore.operations.toFixed(0)}%`);
  console.log(`\nOverall System Health: ${avgScore.toFixed(0)}%`);
  
  if (avgScore >= 90) {
    console.log('\n✅ System is healthy!');
  } else if (avgScore >= 70) {
    console.log('\n⚠️  System needs attention');
  } else {
    console.log('\n❌ System has critical issues');
  }

  console.log('\n' + '=' .repeat(60));
}

// Run the monitor
monitorEmbeddingHealth().catch(console.error);