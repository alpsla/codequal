#!/usr/bin/env node

/**
 * V9 CLOUD REAL TOOLS TEST - Simplified for debugging
 */

require('dotenv').config();
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function testSingleTool(tool) {
  console.log(`\n🔧 Testing ${tool}...`);

  const jobName = `test-${tool}-${Date.now()}`;

  // Use simple test commands for now
  let image, command;

  switch(tool) {
    case 'semgrep':
      image = 'semgrep/semgrep:latest';
      command = 'semgrep --config=auto /workspace --max-target-bytes=10000000 --json || true';
      break;
    case 'simple-java-check':
      image = 'openjdk:11-slim';
      command = 'find /workspace -name \\\"*.java\\\" -type f | head -20';
      break;
    default:
      image = 'busybox';
      command = 'echo \\\"Test successful\\\" && ls -la /workspace | head -20';
  }

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
      - name: test
        image: ${image}
        command: ["sh", "-c", "${command}"]
        volumeMounts:
        - name: workspace
          mountPath: /workspace
      volumes:
      - name: workspace
        persistentVolumeClaim:
          claimName: codequal-workspace
      restartPolicy: Never
  backoffLimit: 0
  activeDeadlineSeconds: 120
`;

  try {
    // Create job
    await execPromise(`echo '${jobYaml}' | kubectl apply -f -`);
    console.log(`   Job created: ${jobName}`);

    // Wait for completion
    let attempts = 0;
    while (attempts < 30) {
      const { stdout } = await execPromise(
        `kubectl get job ${jobName} -n codequal-dev -o jsonpath='{.status.succeeded}'`
      );

      if (stdout === '1') {
        // Get logs
        const { stdout: logs } = await execPromise(
          `kubectl logs job/${jobName} -n codequal-dev`
        );

        console.log(`   ✅ ${tool} completed!`);
        console.log(`   Output preview:`);
        console.log(logs.substring(0, 500));

        // Cleanup
        await execPromise(`kubectl delete job ${jobName} -n codequal-dev`);
        return { success: true, output: logs };
      }

      // Check for failure
      const { stdout: failed } = await execPromise(
        `kubectl get job ${jobName} -n codequal-dev -o jsonpath='{.status.failed}'`
      );

      if (failed === '1') {
        const { stdout: logs } = await execPromise(
          `kubectl logs job/${jobName} -n codequal-dev || echo "No logs available"`
        );
        console.log(`   ❌ ${tool} failed`);
        console.log(`   Error: ${logs.substring(0, 500)}`);

        // Cleanup
        await execPromise(`kubectl delete job ${jobName} -n codequal-dev`);
        return { success: false, error: logs };
      }

      attempts++;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Timeout - get status
    const { stdout: podStatus } = await execPromise(
      `kubectl get pods -n codequal-dev -l job-name=${jobName} -o jsonpath='{.items[0].status.phase}'`
    );

    console.log(`   ⏱️ ${tool} timed out. Pod status: ${podStatus}`);

    // Cleanup
    await execPromise(`kubectl delete job ${jobName} -n codequal-dev`);
    return { success: false, error: 'Timeout' };

  } catch (error) {
    console.error(`   💥 Error testing ${tool}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 V9 Cloud Real Tools Test');
  console.log('Testing tools with real Kafka repository...\n');

  // Test basic connectivity first
  await testSingleTool('simple-java-check');

  // Test real tool
  await testSingleTool('semgrep');
}

if (require.main === module) {
  main().catch(console.error);
}