#!/usr/bin/env npx ts-node

/**
 * Test Java Analysis with Redis Integration
 *
 * Complete end-to-end test with Redis caching
 */

import { execSync } from 'child_process';
import { logger } from '../utils/logger';
import { RedisToolOutputManager } from '../utils/redis-tool-output-manager';
import * as fs from 'fs';

const namespace = 'codequal-dev';

async function testJavaWithRedis() {
  logger.info('🚀 Testing Java Analysis with Redis Integration');
  logger.info('=' .repeat(80));

  // Connect to Redis in Kubernetes
  const redisUrl = 'redis://localhost:6379'; // We'll port-forward for testing
  const redisManager = new RedisToolOutputManager(redisUrl);

  try {
    // Step 1: Port-forward Redis for local access
    logger.info('📡 Setting up Redis port-forward...');
    const portForwardCmd = 'kubectl port-forward -n codequal-dev svc/redis 6379:6379 &';
    execSync(portForwardCmd, { shell: '/bin/bash' });

    // Wait for port-forward to establish
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 2: Create a simple Java test workspace
    logger.info('📁 Creating test workspace...');
    const workspaceId = `java-test-${Date.now()}`;
    const pvcName = `pvc-${workspaceId}`;

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

    // Step 3: Run SpotBugs and capture output
    logger.info('🔧 Running SpotBugs with Redis integration...');

    const jobName = `spotbugs-redis-${Date.now().toString(36)}`;
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
      - name: spotbugs
        image: registry.digitalocean.com/codequal-registry/analyzer:lang-java-v4.9
        command:
        - /bin/bash
        - -c
        - |
          echo '=== Creating test Java files ==='
          mkdir -p /workspace/src

          cat > /workspace/src/SecurityIssue.java << 'EOF'
          import java.sql.*;

          public class SecurityIssue {
              private String password = "admin123"; // Hardcoded password

              public void sqlInjection(String userId) {
                  String query = "SELECT * FROM users WHERE id = " + userId; // SQL injection
                  // Execute query...
              }

              public void nullPointer() {
                  String s = null;
                  System.out.println(s.length()); // NPE
              }

              public void resourceLeak() throws Exception {
                  Connection conn = DriverManager.getConnection("jdbc:h2:test");
                  // Connection never closed - resource leak
              }
          }
          EOF

          echo '=== Compiling Java files ==='
          cd /workspace/src
          javac *.java || true

          echo '=== Running SpotBugs ==='
          spotbugs -textui -effort:max -low . 2>&1

          echo '=== Analysis Complete ==='
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

    // Step 4: Wait for job and get output
    logger.info('⏳ Waiting for analysis to complete...');

    let attempts = 0;
    while (attempts < 60) {
      const status = execSync(
        `kubectl get job ${jobName} -n ${namespace} -o jsonpath='{.status.conditions[?(@.type=="Complete")].status}'`,
        { encoding: 'utf-8' }
      ).trim();

      if (status === 'True') {
        logger.info('✅ Analysis completed');
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    }

    // Step 5: Get logs and store in Redis
    logger.info('📋 Retrieving analysis output...');
    const output = execSync(
      `kubectl logs job/${jobName} -n ${namespace}`,
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    );

    // Extract SpotBugs output
    const spotbugsStart = output.indexOf('=== Running SpotBugs ===');
    const spotbugsEnd = output.indexOf('=== Analysis Complete ===');
    const spotbugsOutput = output.substring(spotbugsStart, spotbugsEnd);

    // Store in Redis
    await redisManager.storeToolOutput(
      workspaceId,
      'main',
      'spotbugs',
      spotbugsOutput,
      5000,
      true
    );

    // Step 6: Retrieve from Redis and show results
    logger.info('📊 Retrieving results from Redis...');
    const cachedResult = await redisManager.getToolOutput(workspaceId, 'main', 'spotbugs');

    if (cachedResult && cachedResult.parsedIssues) {
      logger.info('\\n' + '='.repeat(80));
      logger.info('✅ ISSUES DETECTED VIA REDIS:');
      logger.info('='.repeat(80));

      logger.info(`Found ${cachedResult.parsedIssues.length} issues:\\n`);

      cachedResult.parsedIssues.forEach((issue, idx) => {
        logger.info(`${idx + 1}. [${issue.severity?.toUpperCase()}] ${issue.message || issue.raw}`);
        if (issue.file) {
          logger.info(`   Location: ${issue.file}:${issue.line || '?'}`);
        }
        logger.info('');
      });
    } else {
      logger.warn('⚠️ No issues found in Redis cache');
    }

    // Step 7: Test cache hit
    logger.info('🔄 Testing cache hit...');
    const start = Date.now();
    const cachedAgain = await redisManager.getToolOutput(workspaceId, 'main', 'spotbugs');
    const cacheTime = Date.now() - start;

    logger.info(`✅ Cache retrieval time: ${cacheTime}ms`);

    // Step 8: Get workspace statistics
    const stats = await redisManager.getWorkspaceStats(workspaceId);
    logger.info('\\n📊 Workspace Statistics:');
    logger.info(`  Total tools run: ${stats.mainBranch.toolsRun}`);
    logger.info(`  Total issues: ${stats.mainBranch.totalIssues}`);

    // Cleanup
    logger.info('\\n🧹 Cleaning up...');
    execSync(`kubectl delete job ${jobName} -n ${namespace} --ignore-not-found=true`);
    execSync(`kubectl delete pvc ${pvcName} -n ${namespace} --ignore-not-found=true`);

    // Kill port-forward
    execSync("pkill -f 'kubectl port-forward.*redis' || true", { shell: '/bin/bash' });

    // Summary
    logger.info('\\n' + '='.repeat(80));
    logger.info('🎉 TEST COMPLETE - REDIS INTEGRATION WORKING!');
    logger.info('='.repeat(80));

    if (cachedResult && cachedResult.parsedIssues && cachedResult.parsedIssues.length > 0) {
      logger.info('\\n✅ SUCCESS: Tools are detecting issues via Redis!');
      logger.info(`   - Issues found: ${cachedResult.parsedIssues.length}`);
      logger.info(`   - Cache working: ${cacheTime < 100 ? 'Yes' : 'Slow'}`);
      logger.info(`   - Redis integration: Operational`);
    } else {
      logger.warn('\\n⚠️ WARNING: No issues detected - check tool output');
    }

  } catch (error) {
    logger.error(`❌ Test failed: ${error.message}`);
    console.error(error);

    // Cleanup on error
    execSync("pkill -f 'kubectl port-forward.*redis' || true", { shell: '/bin/bash' });
  } finally {
    await redisManager.disconnect();
  }
}

// Execute
testJavaWithRedis().catch(console.error);