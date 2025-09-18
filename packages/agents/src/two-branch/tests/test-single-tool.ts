#!/usr/bin/env npx ts-node

/**
 * Single Tool Investigation
 *
 * Run just SpotBugs on a small sample to see actual output
 */

import { execSync } from 'child_process';
import { logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

const namespace = 'codequal-dev';

async function testSingleTool() {
  logger.info('🔍 Investigating single tool output: SpotBugs');

  try {
    // Step 1: Create a small test PVC with sample Java code
    logger.info('📁 Creating test workspace...');

    const pvcName = `test-spotbugs-${Date.now()}`;
    const jobName = `spotbugs-test-${Date.now()}`;

    // Create PVC
    const pvcYaml = `
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: ${pvcName}
  namespace: ${namespace}
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
  storageClassName: do-block-storage
`;

    execSync(`echo '${pvcYaml}' | kubectl apply -f -`);
    logger.info(`✅ PVC created: ${pvcName}`);

    // Step 2: Create a job that runs SpotBugs and captures output
    const jobYaml = `
apiVersion: batch/v1
kind: Job
metadata:
  name: ${jobName}
  namespace: ${namespace}
spec:
  ttlSecondsAfterFinished: 300
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: spotbugs-test
        image: registry.digitalocean.com/codequal-registry/analyzer:lang-java-v4.9
        command:
        - /bin/bash
        - -c
        - |
          echo '=== Environment Check ==='
          echo "Current directory: $(pwd)"
          echo "Java version:"
          java -version 2>&1
          echo "SpotBugs location:"
          which spotbugs || echo "SpotBugs not in PATH"
          ls -la /usr/local/bin/spot* 2>/dev/null || echo "No spotbugs in /usr/local/bin"

          echo '=== Creating Sample Java File ==='
          mkdir -p /workspace/test
          cat > /workspace/test/BadCode.java << 'EOF'
          public class BadCode {
              private String password = "hardcoded";  // Security issue

              public void nullPointerRisk() {
                  String s = null;
                  System.out.println(s.length());  // NPE risk
              }

              public void infiniteLoop() {
                  while(true) {  // Infinite loop
                      System.out.println("Forever");
                  }
              }
          }
          EOF

          echo "Sample Java file created:"
          cat /workspace/test/BadCode.java

          echo '=== Compiling Java File ==='
          cd /workspace/test
          javac BadCode.java || echo "Compilation failed (expected for bad code)"
          ls -la

          echo '=== Running SpotBugs ==='
          # Try different SpotBugs commands
          echo "Attempt 1: Direct spotbugs command"
          spotbugs -textui /workspace/test 2>&1 || echo "Direct command failed"

          echo "Attempt 2: Using find command"
          find / -name "spotbugs*" -type f 2>/dev/null | head -5

          echo "Attempt 3: Check for fb (FindBugs) command"
          which fb || echo "fb not found"

          echo "Attempt 4: Check jar files"
          ls -la /usr/share/spotbugs/*.jar 2>/dev/null || echo "No SpotBugs jars in /usr/share"
          ls -la /opt/spotbugs/*.jar 2>/dev/null || echo "No SpotBugs jars in /opt"

          echo '=== Creating Simple Analysis ==='
          echo "ANALYSIS_RESULT: No real SpotBugs output available"
          echo "Tools might not be properly installed in image"

          echo '=== Test Complete ==='
        volumeMounts:
        - name: workspace
          mountPath: /workspace
        resources:
          limits:
            memory: "1Gi"
            cpu: "500m"
      volumes:
      - name: workspace
        persistentVolumeClaim:
          claimName: ${pvcName}
`;

    execSync(`echo '${jobYaml}' | kubectl apply -f -`);
    logger.info(`✅ Job created: ${jobName}`);

    // Step 3: Wait for job completion
    logger.info('⏳ Waiting for job to complete...');
    let attempts = 0;
    const maxAttempts = 60; // 2 minutes

    while (attempts < maxAttempts) {
      const status = execSync(
        `kubectl get job ${jobName} -n ${namespace} -o jsonpath='{.status.conditions[?(@.type=="Complete")].status}'`,
        { encoding: 'utf-8' }
      ).trim();

      if (status === 'True') {
        logger.info('✅ Job completed successfully');
        break;
      }

      const failed = execSync(
        `kubectl get job ${jobName} -n ${namespace} -o jsonpath='{.status.conditions[?(@.type=="Failed")].status}'`,
        { encoding: 'utf-8' }
      ).trim();

      if (failed === 'True') {
        logger.error('❌ Job failed');
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;

      if (attempts % 10 === 0) {
        logger.info(`Still waiting... (${attempts * 2}s elapsed)`);
      }
    }

    // Step 4: Get logs
    logger.info('📋 Fetching job logs...');
    const logs = execSync(
      `kubectl logs job/${jobName} -n ${namespace}`,
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    );

    logger.info('='.repeat(80));
    logger.info('JOB OUTPUT:');
    logger.info('='.repeat(80));
    console.log(logs);
    logger.info('='.repeat(80));

    // Save logs
    const logFile = `spotbugs-investigation-${Date.now()}.log`;
    fs.writeFileSync(logFile, logs);
    logger.info(`📄 Logs saved to: ${logFile}`);

    // Step 5: Cleanup
    logger.info('🧹 Cleaning up resources...');
    execSync(`kubectl delete job ${jobName} -n ${namespace} --ignore-not-found=true`);
    execSync(`kubectl delete pvc ${pvcName} -n ${namespace} --ignore-not-found=true`);
    logger.info('✅ Cleanup complete');

    // Analyze findings
    logger.info('\n📊 ANALYSIS:');
    if (logs.includes('SpotBugs not in PATH')) {
      logger.warn('⚠️ SpotBugs might not be properly installed');
    }
    if (logs.includes('No SpotBugs jars')) {
      logger.warn('⚠️ SpotBugs JAR files not found');
    }
    if (logs.includes('ANALYSIS_RESULT')) {
      logger.info('📝 Analysis completed but no real SpotBugs output');
    }

  } catch (error) {
    logger.error(`❌ Investigation failed: ${error.message}`);
    console.error(error);
  }
}

// Execute
testSingleTool().catch(console.error);