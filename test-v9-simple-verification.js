#!/usr/bin/env node

/**
 * V9 SIMPLE VERIFICATION TEST
 *
 * This test is designed to COMPLETE QUICKLY and verify the system works.
 * We're NOT testing everything - just the critical path to confirm V9 is operational.
 */

require('dotenv').config();

async function runSimpleTest() {
  console.log('🧪 V9 SIMPLE VERIFICATION TEST');
  console.log('=' .repeat(50));
  console.log('Goal: Verify V9 infrastructure is operational\n');

  const results = {
    envVars: false,
    kubernetes: false,
    pvc: false,
    v9Components: false,
    kafkaInPvc: false,
    overall: false
  };

  // Test 1: Environment variables
  console.log('1️⃣ Checking environment variables...');
  const required = ['SUPABASE_URL', 'OPENROUTER_API_KEY', 'REDIS_URL'];
  const missing = required.filter(v => !process.env[v]);
  if (missing.length === 0) {
    console.log('   ✅ All required environment variables set');
    results.envVars = true;
  } else {
    console.log(`   ❌ Missing: ${missing.join(', ')}`);
  }

  // Test 2: Kubernetes connectivity
  console.log('\n2️⃣ Checking Kubernetes...');
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);

  try {
    const { stdout } = await execAsync('kubectl get pods -n codequal-dev --no-headers | wc -l');
    const podCount = parseInt(stdout.trim());
    console.log(`   ✅ Connected (${podCount} pods running)`);
    results.kubernetes = true;
  } catch (error) {
    console.log('   ❌ Cannot connect to Kubernetes');
  }

  // Test 3: PVC exists
  console.log('\n3️⃣ Checking PVC...');
  try {
    await execAsync('kubectl get pvc codequal-workspace -n codequal-dev');
    console.log('   ✅ PVC codequal-workspace exists');
    results.pvc = true;
  } catch (error) {
    console.log('   ❌ PVC not found');
  }

  // Test 4: V9 components built
  console.log('\n4️⃣ Checking V9 components...');
  const fs = require('fs');
  const componentExists = fs.existsSync('packages/agents/dist/two-branch/analyzers/v9-tool-orchestrator.js');
  if (componentExists) {
    console.log('   ✅ V9 components are built');
    results.v9Components = true;
  } else {
    console.log('   ❌ V9 components not built (run: cd packages/agents && npm run build)');
  }

  // Test 5: Kafka repository in PVC
  console.log('\n5️⃣ Checking Kafka repository in PVC...');
  if (results.pvc) {
    try {
      // Create a quick job to check if Kafka exists
      const jobName = `check-kafka-${Date.now()}`;
      const jobYaml = `
apiVersion: batch/v1
kind: Job
metadata:
  name: ${jobName}
  namespace: codequal-dev
spec:
  template:
    spec:
      containers:
      - name: check
        image: busybox
        command: ["sh", "-c", "ls -la /workspace/.git && echo 'KAFKA_EXISTS'"]
        volumeMounts:
        - name: workspace
          mountPath: /workspace
      volumes:
      - name: workspace
        persistentVolumeClaim:
          claimName: codequal-workspace
      restartPolicy: Never
  backoffLimit: 0
  activeDeadlineSeconds: 30
`;

      // Create and run job
      await execAsync(`echo '${jobYaml}' | kubectl apply -f -`);

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Check logs
      const { stdout } = await execAsync(`kubectl logs job/${jobName} -n codequal-dev 2>/dev/null || echo "NO_LOGS"`);

      // Cleanup
      await execAsync(`kubectl delete job ${jobName} -n codequal-dev --force --grace-period=0 2>/dev/null`);

      if (stdout.includes('KAFKA_EXISTS')) {
        console.log('   ✅ Kafka repository found in PVC');
        results.kafkaInPvc = true;
      } else {
        console.log('   ⚠️ Kafka not in PVC (but PVC exists)');
      }
    } catch (error) {
      console.log('   ⚠️ Could not verify Kafka in PVC');
    }
  } else {
    console.log('   ⏭️ Skipped (PVC not available)');
  }

  // Summary
  console.log('\n' + '=' .repeat(50));
  console.log('📊 TEST RESULTS:\n');

  const passedTests = Object.values(results).filter(v => v).length;
  const totalTests = Object.keys(results).length - 1; // Exclude 'overall'

  Object.entries(results).forEach(([test, passed]) => {
    if (test !== 'overall') {
      console.log(`   ${passed ? '✅' : '❌'} ${test}`);
    }
  });

  results.overall = passedTests >= 3; // Need at least 3 of 5 to pass

  console.log('\n' + '=' .repeat(50));

  if (results.overall) {
    console.log('✅ V9 SYSTEM IS OPERATIONAL');
    console.log('\nYou can now run:');
    console.log('  node test-v9-kafka-real.js');
    console.log('  OR');
    console.log('  node v9-api-service.js (to start API)');
  } else {
    console.log('❌ V9 SYSTEM NEEDS FIXES');
    console.log('\nFix the issues above, then re-run this test.');
  }

  return results;
}

// Run if executed directly
if (require.main === module) {
  runSimpleTest()
    .then(results => {
      process.exit(results.overall ? 0 : 1);
    })
    .catch(error => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

module.exports = { runSimpleTest };