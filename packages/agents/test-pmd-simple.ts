#!/usr/bin/env npx ts-node

/**
 * Simple PMD Test with File-based Java Code
 */

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
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

async function testPMD() {
  const namespace = 'codequal-dev';
  const workspaceId = `pmd-simple-${Date.now()}`;
  const pvcName = `pvc-${workspaceId}`;

  try {
    // Create test Java file
    const testJavaCode = `public class TestPMD {
    private void unusedMethod() {
        System.out.println("Never called");
    }
    public void emptyIfStatement(boolean flag) {
        if (flag) {
        }
    }
    public void shortVariableName() {
        int a = 1;
        int b = 2;
        System.out.println(a + b);
    }
}`;

    writeFileSync('/tmp/TestPMD.java', testJavaCode);

    // Create PVC
    const pvcYaml = `apiVersion: v1
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
  storageClassName: do-block-storage`;

    execSync(`echo '${pvcYaml}' | kubectl apply -f -`);

    // Test PMD configurations
    const configurations = [
      'pmd --version',
      'which pmd',
      'ls -la /opt/pmd/bin/ || echo "PMD not in /opt/pmd"',
      'pmd check --help | head -20',
      'pmd check -d /workspace -f text -R rulesets/java/quickstart.xml',
      'pmd check -d /workspace -f text -R category/java/bestpractices.xml'
    ];

    for (let i = 0; i < configurations.length; i++) {
      const cmd = configurations[i];
      const jobName = `pmd-test-${i}-${workspaceId}`;

      logger.info(`\n📊 Testing: ${cmd}`);

      const jobYaml = `apiVersion: batch/v1
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
          echo "=== Testing PMD Command ==="
          cp /tmp/TestPMD.java /workspace/ || echo "Failed to copy test file"
          echo "Test file contents:"
          cat /workspace/TestPMD.java || echo "No test file found"
          echo "Running: ${cmd}"
          ${cmd} || echo "Command failed"
          echo "=== Test complete ==="
        volumeMounts:
        - name: workspace
          mountPath: /workspace
        - name: test-file
          mountPath: /tmp
        resources:
          limits:
            memory: "1Gi"
            cpu: "500m"
      volumes:
      - name: workspace
        persistentVolumeClaim:
          claimName: ${pvcName}
      - name: test-file
        configMap:
          name: test-java-file-${workspaceId}`;

      // Create ConfigMap for test file
      const configMapYaml = `apiVersion: v1
kind: ConfigMap
metadata:
  name: test-java-file-${workspaceId}
  namespace: ${namespace}
data:
  TestPMD.java: |
    ${testJavaCode}`;

      execSync(`echo '${configMapYaml}' | kubectl apply -f -`);
      execSync(`echo '${jobYaml}' | kubectl apply -f -`);

      // Wait for completion
      let attempts = 0;
      while (attempts < 30) {
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

      logger.info(`Results:`);
      const lines = output.split('\n');
      lines.forEach(line => {
        if (line.trim()) {
          logger.info(`  ${line}`);
        }
      });

      // Cleanup
      execSync(`kubectl delete job ${jobName} -n ${namespace} --ignore-not-found=true`);
      execSync(`kubectl delete configmap test-java-file-${workspaceId} -n ${namespace} --ignore-not-found=true`);

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Cleanup
    execSync(`kubectl delete pvc ${pvcName} -n ${namespace} --ignore-not-found=true`);

  } catch (error) {
    logger.error(`❌ Test failed: ${error.message}`);
    console.error(error);
  }
}

testPMD().catch(console.error);