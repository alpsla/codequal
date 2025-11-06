#!/usr/bin/env npx ts-node

/**
 * Quick PMD Test - Direct approach
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

async function quickPMDTest() {
  const namespace = 'codequal-dev';
  const workspaceId = `quick-pmd-${Date.now()}`;

  try {
    logger.info('🔧 Quick PMD Test');

    // Create simple job YAML file
    const jobYaml = `apiVersion: batch/v1
kind: Job
metadata:
  name: quick-pmd-${workspaceId}
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
          echo "=== PMD Quick Test ==="

          echo "1. Check PMD installation:"
          which pmd || echo "PMD not in PATH"

          echo "2. PMD version:"
          pmd --version || echo "Version check failed"

          echo "3. PMD help:"
          pmd --help | head -10 || echo "Help failed"

          echo "4. List PMD bin directory:"
          ls -la /opt/pmd/bin/ || echo "No /opt/pmd/bin"

          echo "5. Check if pmd command exists:"
          ls -la /usr/local/bin/pmd || echo "No pmd in /usr/local/bin"

          echo "6. Find PMD installations:"
          find /opt -name "*pmd*" 2>/dev/null || echo "No PMD found in /opt"

          echo "7. Check PATH:"
          echo "PATH: $PATH"

          echo "8. Create simple test file:"
          cat > /tmp/Test.java << 'EOF'
public class Test {
    private void unused() { }
    public void test() {
        int a = 1;
    }
}
EOF

          echo "9. Try PMD with simple command:"
          cd /tmp && pmd check -d . -f text || echo "PMD check failed"

          echo "=== Test complete ==="
        resources:
          limits:
            memory: "1Gi"
            cpu: "500m"`;

    writeFileSync('/tmp/quick-pmd-job.yaml', jobYaml);

    logger.info('Created job YAML, applying...');
    execSync(`kubectl apply -f /tmp/quick-pmd-job.yaml`);

    // Wait for completion
    const jobName = `quick-pmd-${workspaceId}`;
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
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    );

    logger.info('PMD Test Results:');
    console.log(output);

    // Cleanup
    execSync(`kubectl delete job ${jobName} -n ${namespace} --ignore-not-found=true`);

  } catch (error) {
    logger.error(`❌ Test failed: ${error.message}`);
    console.error(error);
  }
}

quickPMDTest().catch(console.error);