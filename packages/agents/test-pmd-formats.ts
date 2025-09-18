#!/usr/bin/env npx ts-node

/**
 * Test PMD Output Formats
 */

import { execSync } from 'child_process';
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

async function testPMDFormats() {
  const namespace = 'codequal-dev';
  const workspaceId = `pmd-formats-${Date.now()}`;
  const pvcName = `pvc-${workspaceId}`;

  try {
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

    const jobName = `pmd-formats-${workspaceId}`;
    const jobYaml = `
apiVersion: batch/v1
kind: Job
metadata:
  name: ${jobName}
  namespace: ${namespace}
spec:
  ttlSecondsAfterFinished: 600
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: pmd-formats
        image: registry.digitalocean.com/codequal-registry/analyzer:lang-java-v4.9
        command: ["/bin/bash", "-c"]
        args:
        - |
          echo "=== PMD Output Format Testing ==="

          mkdir -p /workspace

          cat > /workspace/Test.java << 'EOF'
          public class Test {
              private void unused() { }
              public void test() { int a = 1; }
          }
          EOF

          echo "1. Available PMD formats:"
          pmd check --help | grep -A 20 "Valid values:"

          echo ""
          echo "2. Testing different formats:"

          echo ""
          echo "2a. Text format (current):"
          cd /workspace && pmd check -d . -f text -R category/java/bestpractices.xml 2>/dev/null || echo "Text failed"

          echo ""
          echo "2b. CSV format:"
          cd /workspace && pmd check -d . -f csv -R category/java/bestpractices.xml 2>/dev/null || echo "CSV failed"

          echo ""
          echo "2c. JSON format:"
          cd /workspace && pmd check -d . -f json -R category/java/bestpractices.xml 2>/dev/null || echo "JSON failed"

          echo ""
          echo "2d. XML format:"
          cd /workspace && pmd check -d . -f xml -R category/java/bestpractices.xml 2>/dev/null || echo "XML failed"

          echo ""
          echo "2e. EMACS format:"
          cd /workspace && pmd check -d . -f emacs -R category/java/bestpractices.xml 2>/dev/null || echo "EMACS failed"

          echo ""
          echo "=== Format testing complete ==="
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

    logger.info('🔍 Testing PMD output formats...');

    // Wait for completion
    let attempts = 0;
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
      { encoding: 'utf-8', maxBuffer: 20 * 1024 * 1024 }
    );

    logger.info('PMD Format Test Results:');
    console.log(output);

    // Cleanup
    execSync(`kubectl delete job ${jobName} -n ${namespace} --ignore-not-found=true`);
    execSync(`kubectl delete pvc ${pvcName} -n ${namespace} --ignore-not-found=true`);

  } catch (error) {
    logger.error(`❌ Test failed: ${error.message}`);
    console.error(error);
  }
}

testPMDFormats().catch(console.error);