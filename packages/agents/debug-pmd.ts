#!/usr/bin/env npx ts-node

/**
 * Debug PMD to find working configuration
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

async function debugPMD() {
  const namespace = 'codequal-dev';
  const workspaceId = `debug-pmd-${Date.now()}`;
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

    const jobName = `debug-pmd-${workspaceId}`;
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
      - name: debug-pmd
        image: registry.digitalocean.com/codequal-registry/analyzer:lang-java-v4.9
        command: ["/bin/bash", "-c"]
        args:
        - |
          echo "=== PMD Debug Session ==="

          echo "1. PMD Version and Info:"
          pmd --version || echo "Version failed"
          echo ""

          echo "2. PMD Help:"
          pmd --help | head -20 || echo "Help failed"
          echo ""

          echo "3. PMD Check Help:"
          pmd check --help | head -30 || echo "Check help failed"
          echo ""

          echo "4. List PMD installation:"
          ls -la /opt/pmd/ || echo "No /opt/pmd"
          ls -la /opt/pmd/lib/ | head -10 || echo "No lib dir"
          echo ""

          echo "5. Create comprehensive test file:"
          cat > /workspace/TestPMD.java << 'EOF'
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

          echo "6. Test file created:"
          cat /workspace/TestPMD.java
          echo ""

          echo "7. Try PMD with different configurations:"

          echo "7a. Basic PMD (no ruleset):"
          cd /workspace && pmd check -d . -f text 2>&1 || echo "Basic PMD failed"
          echo ""

          echo "7b. PMD with best practices:"
          cd /workspace && pmd check -d . -f text -R category/java/bestpractices.xml 2>&1 || echo "Best practices failed"
          echo ""

          echo "7c. PMD with codestyle:"
          cd /workspace && pmd check -d . -f text -R category/java/codestyle.xml 2>&1 || echo "Codestyle failed"
          echo ""

          echo "7d. PMD with errorprone:"
          cd /workspace && pmd check -d . -f text -R category/java/errorprone.xml 2>&1 || echo "Errorprone failed"
          echo ""

          echo "7e. PMD with performance:"
          cd /workspace && pmd check -d . -f text -R category/java/performance.xml 2>&1 || echo "Performance failed"
          echo ""

          echo "7f. PMD with design:"
          cd /workspace && pmd check -d . -f text -R category/java/design.xml 2>&1 || echo "Design failed"
          echo ""

          echo "7g. PMD with multiple categories:"
          cd /workspace && pmd check -d . -f text -R category/java/bestpractices.xml,category/java/codestyle.xml,category/java/errorprone.xml 2>&1 || echo "Multiple categories failed"
          echo ""

          echo "7h. List available rulesets:"
          find /opt/pmd -name "*.xml" | head -20 || echo "No XML files found"
          echo ""

          echo "=== PMD Debug Complete ==="
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

    logger.info('🔍 Running PMD debug session...');

    // Wait for completion with longer timeout
    let attempts = 0;
    while (attempts < 120) { // 4 minutes
      const status = execSync(
        `kubectl get job ${jobName} -n ${namespace} -o jsonpath='{.status.conditions[?(@.type=="Complete")].status}' 2>/dev/null || echo ''`,
        { encoding: 'utf-8' }
      ).trim();

      if (status === 'True') break;

      if (attempts % 15 === 0) {
        logger.info(`Waiting for PMD debug to complete... (${attempts * 2}s)`);
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    }

    // Get output
    const output = execSync(
      `kubectl logs job/${jobName} -n ${namespace}`,
      { encoding: 'utf-8', maxBuffer: 20 * 1024 * 1024 }
    );

    logger.info('PMD Debug Results:');
    console.log(output);

    // Cleanup
    execSync(`kubectl delete job ${jobName} -n ${namespace} --ignore-not-found=true`);
    execSync(`kubectl delete pvc ${pvcName} -n ${namespace} --ignore-not-found=true`);

  } catch (error) {
    logger.error(`❌ Debug failed: ${error.message}`);
    console.error(error);
  }
}

debugPMD().catch(console.error);