#!/usr/bin/env npx ts-node

/**
 * Debug Individual Tools in v5.0 Image
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

async function debugV5Tools() {
  const namespace = 'codequal-dev';
  const workspaceId = `debug-v5-${Date.now()}`;
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

    const jobName = `debug-v5-tools-${workspaceId}`;
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
      - name: debug-tools
        image: registry.digitalocean.com/codequal-registry/analyzer:lang-java-v5.0
        command: ["/bin/bash", "-c"]
        args:
        - |
          echo "=== Java v5.0 Tools Debug Session ==="

          echo "1. Tool Version Checks:"
          echo "SpotBugs version:"
          spotbugs -version || echo "SpotBugs version failed"
          echo ""

          echo "PMD version:"
          pmd --version || echo "PMD version failed"
          echo ""

          echo "Checkstyle version:"
          checkstyle --version || echo "Checkstyle version failed"
          echo ""

          echo "Semgrep version:"
          semgrep --version || echo "Semgrep version failed"
          echo ""

          echo "2. Create test directory and files:"
          mkdir -p /workspace/repo
          cd /workspace/repo

          # Simple Java file with obvious issues
          cat > TestIssues.java << 'EOF'
          import java.sql.*;
          public class TestIssues {
              private String password = "admin123";
              private void unused() { }
              public void test() {
                  int a = 1;
                  String query = "SELECT * FROM users WHERE id = " + a;
                  System.out.println(query);
              }
          }
          EOF

          echo "Created test file:"
          cat TestIssues.java
          echo ""

          echo "3. Test SpotBugs (needs compiled classes):"
          echo "Compiling Java file..."
          javac TestIssues.java && echo "Compilation successful" || echo "Compilation failed"
          ls -la *.class 2>/dev/null || echo "No class files found"
          echo "Running SpotBugs on classes:"
          spotbugs -textui -effort:max -low . 2>&1 || echo "SpotBugs failed"
          echo ""

          echo "4. Test PMD:"
          pmd check -d . -f emacs -R category/java/bestpractices.xml 2>&1 || echo "PMD failed"
          echo ""

          echo "5. Test Checkstyle:"
          echo "Checking checkstyle config:"
          ls -la /google_checks.xml
          echo "Running checkstyle:"
          checkstyle -c /google_checks.xml TestIssues.java 2>&1 || echo "Checkstyle failed"
          echo ""

          echo "6. Test Semgrep:"
          echo "Running semgrep with auto config:"
          semgrep --config=auto --text TestIssues.java 2>&1 || echo "Semgrep failed"
          echo ""

          echo "Running semgrep with JSON output:"
          semgrep --config=auto --json TestIssues.java 2>&1 || echo "Semgrep JSON failed"
          echo ""

          echo "=== Debug session complete ==="
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

    logger.info('🔍 Running debug session...');

    // Wait for completion with longer timeout
    let attempts = 0;
    while (attempts < 120) {
      const status = execSync(
        `kubectl get job ${jobName} -n ${namespace} -o jsonpath='{.status.conditions[?(@.type=="Complete")].status}' 2>/dev/null || echo ''`,
        { encoding: 'utf-8' }
      ).trim();

      if (status === 'True') break;

      if (attempts % 15 === 0) {
        logger.info(`Waiting for debug session to complete... (${attempts * 2}s)`);
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    }

    // Get output
    const output = execSync(
      `kubectl logs job/${jobName} -n ${namespace}`,
      { encoding: 'utf-8', maxBuffer: 20 * 1024 * 1024 }
    );

    logger.info('Debug Results:');
    console.log(output);

    // Cleanup
    execSync(`kubectl delete job ${jobName} -n ${namespace} --ignore-not-found=true`);
    execSync(`kubectl delete pvc ${pvcName} -n ${namespace} --ignore-not-found=true`);

  } catch (error) {
    logger.error(`❌ Debug failed: ${error.message}`);
    console.error(error);
  }
}

debugV5Tools().catch(console.error);