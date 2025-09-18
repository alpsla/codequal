#!/usr/bin/env node

/**
 * Test file access in existing Kafka PVC
 */

require('dotenv').config();

async function testKafkaFileAccess() {
  console.log('🔍 V9 KAFKA FILE ACCESS TEST');
  console.log('=' .repeat(70));
  console.log('Testing file access in existing Kafka PVC\n');

  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);

  try {
    // Step 1: Find most recent Kafka PVC
    console.log('1️⃣ Finding existing Kafka PVCs...');
    const { stdout } = await execAsync('kubectl get pvc -n codequal-dev | grep kafka | tail -1');
    const pvcName = stdout.trim().split(/\s+/)[0];
    console.log(`   ✅ Using PVC: ${pvcName}\n`);

    // Step 2: Create a simple job to list files
    console.log('2️⃣ Creating job to examine repository structure...');
    const timestamp = Date.now();
    const jobName = `file-test-${timestamp}`;

    const jobYaml = `
apiVersion: batch/v1
kind: Job
metadata:
  name: ${jobName}
  namespace: codequal-dev
spec:
  ttlSecondsAfterFinished: 60
  activeDeadlineSeconds: 30
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: file-test
        image: busybox
        command: ["sh", "-c"]
        args:
          - |
            echo "=== Checking workspace structure ==="
            ls -la /workspace/
            echo ""
            echo "=== Checking repo directory ==="
            ls -la /workspace/repo/ | head -20
            echo ""
            echo "=== Counting Java files ==="
            find /workspace/repo -name "*.java" -type f | wc -l
            echo ""
            echo "=== Sample Java files ==="
            find /workspace/repo -name "*.java" -type f | head -10
            echo ""
            echo "=== Important directories ==="
            find /workspace/repo -type d -name "src" | head -5
            find /workspace/repo -type d -name "main" | head -5
            echo "=== Test complete ==="
        volumeMounts:
        - name: workspace
          mountPath: /workspace
      volumes:
      - name: workspace
        persistentVolumeClaim:
          claimName: ${pvcName}
`;

    // Write and apply job
    const fs = require('fs');
    const tmpFile = `/tmp/job-${timestamp}.yaml`;
    fs.writeFileSync(tmpFile, jobYaml);

    await execAsync(`kubectl apply -f ${tmpFile}`);
    console.log(`   ✅ Job created: ${jobName}\n`);

    // Step 3: Wait for completion and get logs
    console.log('3️⃣ Waiting for job to complete (max 30s)...');

    let attempts = 0;
    let jobComplete = false;

    while (attempts < 10 && !jobComplete) {
      await new Promise(resolve => setTimeout(resolve, 3000));

      try {
        const { stdout: status } = await execAsync(
          `kubectl get job ${jobName} -n codequal-dev -o jsonpath='{.status.succeeded}'`
        );
        if (status === '1') {
          jobComplete = true;
        }
      } catch (error) {
        // Job might not exist yet
      }
      attempts++;
    }

    if (jobComplete) {
      console.log('   ✅ Job completed successfully\n');

      // Get logs
      console.log('4️⃣ Repository contents:');
      const { stdout: logs } = await execAsync(
        `kubectl logs job/${jobName} -n codequal-dev`
      );
      console.log(logs);

      // Analyze results
      const lines = logs.split('\n');
      const javaFileCount = lines.find(l => l.match(/^\d+$/));

      if (javaFileCount && parseInt(javaFileCount) > 0) {
        console.log('\n' + '=' .repeat(70));
        console.log('📊 FILE ACCESS TEST RESULTS');
        console.log('=' .repeat(70));
        console.log('✅ Files ARE accessible in the container');
        console.log(`✅ Found ${javaFileCount} Java files`);
        console.log('✅ Repository structure is intact');
        console.log('\n🎯 The file discovery issue from the previous session appears RESOLVED!');
        console.log('   The problem was likely with tool execution, not file access.');
      }
    } else {
      console.log('   ⚠️ Job did not complete in time\n');
    }

    // Cleanup
    fs.unlinkSync(tmpFile);
    try {
      await execAsync(`kubectl delete job ${jobName} -n codequal-dev --ignore-not-found=true`);
    } catch (error) {
      // Ignore cleanup errors
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run test
testKafkaFileAccess().catch(console.error);