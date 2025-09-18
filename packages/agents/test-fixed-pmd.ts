#!/usr/bin/env npx ts-node

/**
 * Test Fixed PMD Command
 */

import { execSync } from 'child_process';
import { RedisToolOutputManager } from './src/two-branch/utils/redis-tool-output-manager';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}] ${message}`;
    })
  ),
  transports: [new winston.transports.Console()]
});

async function testFixedPMD() {
  const namespace = 'codequal-dev';
  const workspaceId = `test-fixed-pmd-${Date.now()}`;
  const pvcName = `pvc-${workspaceId}`;

  const redisManager = new RedisToolOutputManager();

  try {
    // Redis port forwarding
    logger.info('🔌 Setting up Redis port forwarding...');
    execSync("pkill -f 'kubectl port-forward.*redis' || true", { shell: '/bin/bash' });
    execSync('kubectl port-forward -n codequal-dev svc/redis-service 6379:6379 > /dev/null 2>&1 &', { shell: '/bin/bash' });
    await new Promise(resolve => setTimeout(resolve, 2000));

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

    logger.info('🔧 Testing Fixed PMD Command');

    const jobName = `test-fixed-pmd-${workspaceId}`;

    // The exact command from kubernetes-repository-manager.ts
    const pmdCommand = `echo 'Running PMD...' && cd /workspace/repo && pmd check -d . -f text -R category/java/bestpractices.xml,category/java/codestyle.xml,category/java/errorprone.xml,category/java/design.xml 2>&1 || echo 'PMD analysis complete'`;

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
      - name: pmd-test
        image: registry.digitalocean.com/codequal-registry/analyzer:lang-java-v4.9
        command: ["/bin/bash", "-c"]
        args:
        - |
          echo "=== Testing Fixed PMD Command ==="

          # Create repo directory structure
          mkdir -p /workspace/repo

          # Create test Java files with various issues
          cat > /workspace/repo/TestPMD.java << 'EOF'
          public class TestPMD {
              private void unusedPrivateMethod() {
                  System.out.println("This method is never called");
              }

              public void emptyIfBlock(boolean condition) {
                  if (condition) {
                      // This block is empty - should be flagged
                  }
              }

              public void shortVariableNames() {
                  int a = 1;  // Variable name too short
                  int b = 2;  // Variable name too short
                  int c = a + b;
                  System.out.println(c);
              }

              public void unnecessaryConditional(boolean flag) {
                  if (flag == true) {  // Unnecessary comparison with true
                      System.out.println("True");
                  }
              }

              public void duplicateStringLiterals() {
                  String message = "Hello World";
                  System.out.println("Hello World");  // Duplicate string literal
                  System.out.println("Hello World");  // Duplicate string literal
              }

              public void longMethodName() {
                  // This line exceeds the typical line length limit that PMD should catch
                  System.out.println("This is a very long line that exceeds the standard 120 character limit and should be flagged by PMD line length rules");
              }
          }
          EOF

          cat > /workspace/repo/AnotherClass.java << 'EOF'
          public class AnotherClass {
              private String password = "admin123";  // Hardcoded password

              public void methodWithLotsOfIssues() {
                  int a = 1;
                  int b = 2;
                  int c = 3;
                  System.out.println("Test");
                  System.out.println("Test");
                  System.out.println("Test");
              }
          }
          EOF

          echo "Created test files:"
          ls -la /workspace/repo/

          echo "Running the exact PMD command from kubernetes-repository-manager.ts:"
          echo "${pmdCommand}"
          echo "---"

          # Run the exact command
          ${pmdCommand}

          echo "---"
          echo "=== PMD Test Complete ==="
        volumeMounts:
        - name: workspace
          mountPath: /workspace
        resources:
          limits:
            memory: "2Gi"
            cpu: "1000m"
      volumes:
      - name: workspace
        persistentVolumeClaim:
          claimName: ${pvcName}
`;

    execSync(`echo '${jobYaml}' | kubectl apply -f -`);

    // Wait for completion
    let attempts = 0;
    const startTime = Date.now();
    while (attempts < 60) {
      const status = execSync(
        `kubectl get job ${jobName} -n ${namespace} -o jsonpath='{.status.conditions[?(@.type=="Complete")].status}' 2>/dev/null || echo ''`,
        { encoding: 'utf-8' }
      ).trim();

      if (status === 'True') break;
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    }

    // Get output
    const output = execSync(
      `kubectl logs job/${jobName} -n ${namespace}`,
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    );

    const executionTime = Date.now() - startTime;

    logger.info('✅ Fixed PMD Test Results:');
    console.log(output);

    // Store in Redis for parsing
    await redisManager.storeToolOutput(
      workspaceId,
      'test',
      'pmd',
      output,
      executionTime,
      true
    );

    // Get parsed results
    const result = await redisManager.getToolOutput(workspaceId, 'test', 'pmd');

    if (result && result.parsedIssues && result.parsedIssues.length > 0) {
      logger.info(`\n🎉 PMD FIX SUCCESSFUL: Found ${result.parsedIssues.length} issues`);
      logger.info('📊 First 10 issues:');
      result.parsedIssues.slice(0, 10).forEach((issue, idx) => {
        const msg = issue.message || issue.raw || 'Unknown';
        logger.info(`   ${idx + 1}. ${msg.substring(0, 120)}`);
      });
    } else {
      logger.warn(`⚠️ PMD: Still no issues detected`);
    }

    // Cleanup
    execSync(`kubectl delete job ${jobName} -n ${namespace} --ignore-not-found=true`);
    execSync(`kubectl delete pvc ${pvcName} -n ${namespace} --ignore-not-found=true`);
    execSync("pkill -f 'kubectl port-forward.*redis' || true", { shell: '/bin/bash' });

  } catch (error) {
    logger.error(`❌ Test failed: ${error.message}`);
    console.error(error);
    execSync("pkill -f 'kubectl port-forward.*redis' || true", { shell: '/bin/bash' });
  }
}

testFixedPMD().catch(console.error);