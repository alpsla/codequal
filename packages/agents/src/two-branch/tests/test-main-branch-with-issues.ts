#!/usr/bin/env npx ts-node

/**
 * Test Main Branch with Existing Issues
 *
 * This test creates a realistic scenario where:
 * 1. Main branch has existing issues (2 issues)
 * 2. PR branch adds new issues (3 more issues) and fixes 1 existing issue
 * 3. Results in proper two-branch comparison
 */

import { execSync } from 'child_process';
import { RedisToolOutputManager } from '../utils/redis-tool-output-manager';
import winston from 'winston';

// Configure logger
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

async function testMainBranchWithIssues() {
  const namespace = 'codequal-dev';
  const workspaceId = `test-main-${Date.now()}`;
  const mainPvcName = `main-pvc-${workspaceId}`;
  const prPvcName = `pr-pvc-${workspaceId}`;

  const redisManager = new RedisToolOutputManager();

  try {
    // Redis connects automatically in constructor
    logger.info('🔗 Initializing Redis Tool Output Manager...');

    // Start Redis port forwarding
    logger.info('🔌 Setting up Redis port forwarding...');
    execSync("pkill -f 'kubectl port-forward.*redis' || true", { shell: '/bin/bash' });
    execSync('kubectl port-forward -n codequal-dev svc/redis-service 6379:6379 > /dev/null 2>&1 &', { shell: '/bin/bash' });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 1: Create MAIN branch with existing issues
    logger.info('\\n' + '='.repeat(80));
    logger.info('📦 STEP 1: Creating MAIN branch with existing issues');
    logger.info('='.repeat(80));

    // Create PVC for main branch
    const mainPvcYaml = `
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: ${mainPvcName}
  namespace: ${namespace}
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
  storageClassName: do-block-storage
`;
    execSync(`echo '${mainPvcYaml}' | kubectl apply -f -`);

    // Create main branch job with existing issues
    const mainJobName = `main-analysis-${workspaceId}`;
    const mainJobYaml = `
apiVersion: batch/v1
kind: Job
metadata:
  name: ${mainJobName}
  namespace: ${namespace}
spec:
  ttlSecondsAfterFinished: 300
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: create-main-issues
        image: registry.digitalocean.com/codequal-registry/analyzer:lang-java-v4.9
        command: ["/bin/bash", "-c"]
        args:
        - |
          echo '=== Creating MAIN branch with existing issues ==='

          mkdir -p /workspace/src
          cd /workspace/src

          # Create a class with EXISTING issues that should be in main branch
          cat > DatabaseManager.java << 'EOF'
          import java.sql.*;

          public class DatabaseManager {
              private Connection connection;

              // EXISTING ISSUE 1: Unclosed connection
              public void connectToDatabase() throws SQLException {
                  connection = DriverManager.getConnection("jdbc:h2:test");
                  // Connection never closed - resource leak
              }

              // EXISTING ISSUE 2: Empty catch block
              public void processData(String data) {
                  try {
                      Integer.parseInt(data);
                  } catch (NumberFormatException e) {
                      // Empty catch block - swallowing exception
                  }
              }
          }
          EOF

          echo '=== Compiling Main Branch Java files ==='
          javac *.java || true

          echo '=== Running SpotBugs on MAIN branch ==='
          spotbugs -textui -effort:max -low . 2>&1

          echo '=== Main Branch Analysis Complete ==='
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
          claimName: ${mainPvcName}
`;

    execSync(`echo '${mainJobYaml}' | kubectl apply -f -`);

    // Wait for main branch analysis
    logger.info('⏳ Analyzing main branch...');
    let attempts = 0;
    while (attempts < 60) {
      const status = execSync(
        `kubectl get job ${mainJobName} -n ${namespace} -o jsonpath='{.status.conditions[?(@.type=="Complete")].status}'`,
        { encoding: 'utf-8' }
      ).trim();

      if (status === 'True') break;
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    }

    // Get main branch output
    const mainOutput = execSync(
      `kubectl logs job/${mainJobName} -n ${namespace}`,
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    );

    // Store main branch results in Redis
    const mainSpotbugsStart = mainOutput.indexOf('=== Running SpotBugs');
    const mainSpotbugsEnd = mainOutput.indexOf('=== Main Branch Analysis Complete ===');
    const mainSpotbugsOutput = mainOutput.substring(mainSpotbugsStart, mainSpotbugsEnd);

    await redisManager.storeToolOutput(
      workspaceId,
      'main',
      'spotbugs',
      mainSpotbugsOutput,
      5000,
      true
    );

    // Step 2: Create PR branch with new issues
    logger.info('\\n' + '='.repeat(80));
    logger.info('📦 STEP 2: Creating PR branch with new and fixed issues');
    logger.info('='.repeat(80));

    // Create PVC for PR branch
    const prPvcYaml = `
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: ${prPvcName}
  namespace: ${namespace}
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
  storageClassName: do-block-storage
`;
    execSync(`echo '${prPvcYaml}' | kubectl apply -f -`);

    // Create PR branch job
    const prJobName = `pr-analysis-${workspaceId}`;
    logger.info(`Creating PR job: ${prJobName}`);
    const prJobYaml = `
apiVersion: batch/v1
kind: Job
metadata:
  name: ${prJobName}
  namespace: ${namespace}
spec:
  ttlSecondsAfterFinished: 300
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: create-pr-issues
        image: registry.digitalocean.com/codequal-registry/analyzer:lang-java-v4.9
        command: ["/bin/bash", "-c"]
        args:
        - |
          echo '=== Creating PR branch with new issues and fixes ==='

          mkdir -p /workspace/src
          cd /workspace/src

          # Copy main branch file but FIX one issue
          cat > DatabaseManager.java << 'EOF'
          import java.sql.*;

          public class DatabaseManager {
              private Connection connection;

              // FIXED: Now properly closing connection
              public void connectToDatabase() throws SQLException {
                  try (Connection conn = DriverManager.getConnection("jdbc:h2:test")) {
                      this.connection = conn;
                      // Connection auto-closed with try-with-resources
                  }
              }

              // EXISTING ISSUE 2: Still has empty catch block
              public void processData(String data) {
                  try {
                      Integer.parseInt(data);
                  } catch (NumberFormatException e) {
                      // Empty catch block - swallowing exception
                  }
              }
          }
          EOF

          # Add NEW file with NEW issues
          cat > SecurityIssue.java << 'EOF'
          import java.sql.*;

          public class SecurityIssue {
              private String password = "admin123"; // NEW ISSUE 1: Hardcoded password

              public void sqlInjection(String userId) {
                  String query = "SELECT * FROM users WHERE id = " + userId; // NEW ISSUE 2: SQL injection
              }

              public void nullPointer() {
                  String s = null;
                  System.out.println(s.length()); // NEW ISSUE 3: Null pointer dereference
              }

              public void resourceLeak() throws Exception {
                  Connection conn = DriverManager.getConnection("jdbc:h2:test"); // NEW ISSUE 4: Resource leak
              }
          }
          EOF

          echo '=== Compiling PR Branch Java files ==='
          javac *.java || true

          echo '=== Running SpotBugs on PR branch ==='
          spotbugs -textui -effort:max -low . 2>&1

          echo '=== PR Branch Analysis Complete ==='
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
          claimName: ${prPvcName}
`;

    // Apply the PR job
    execSync(`echo '${prJobYaml}' | kubectl apply -f -`);
    logger.info(`✅ PR job created: ${prJobName}`);

    // Wait for PR branch analysis
    logger.info('⏳ Analyzing PR branch...');
    attempts = 0;
    while (attempts < 60) {
      const status = execSync(
        `kubectl get job ${prJobName} -n ${namespace} -o jsonpath='{.status.conditions[?(@.type=="Complete")].status}'`,
        { encoding: 'utf-8' }
      ).trim();

      if (status === 'True') break;
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    }

    // Get PR branch output
    const prOutput = execSync(
      `kubectl logs job/${prJobName} -n ${namespace}`,
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    );

    // Store PR branch results in Redis
    const prSpotbugsStart = prOutput.indexOf('=== Running SpotBugs');
    const prSpotbugsEnd = prOutput.indexOf('=== PR Branch Analysis Complete ===');
    const prSpotbugsOutput = prOutput.substring(prSpotbugsStart, prSpotbugsEnd);

    await redisManager.storeToolOutput(
      workspaceId,
      'pr',
      'spotbugs',
      prSpotbugsOutput,
      5000,
      true
    );

    // Step 3: Compare results
    logger.info('\\n' + '='.repeat(80));
    logger.info('📊 STEP 3: Two-Branch Comparison Results');
    logger.info('='.repeat(80));

    const mainResult = await redisManager.getToolOutput(workspaceId, 'main', 'spotbugs');
    const prResult = await redisManager.getToolOutput(workspaceId, 'pr', 'spotbugs');

    logger.info('\\n📈 MAIN Branch Analysis:');
    if (mainResult && mainResult.parsedIssues) {
      logger.info(`  Issues found: ${mainResult.parsedIssues.length}`);
      mainResult.parsedIssues.forEach((issue, idx) => {
        logger.info(`    ${idx + 1}. [${issue.severity}] ${issue.message || issue.raw}`);
      });
    } else {
      logger.warn('  No issues found (this is the problem!)');
    }

    logger.info('\\n📈 PR Branch Analysis:');
    if (prResult && prResult.parsedIssues) {
      logger.info(`  Issues found: ${prResult.parsedIssues.length}`);
      prResult.parsedIssues.forEach((issue, idx) => {
        logger.info(`    ${idx + 1}. [${issue.severity}] ${issue.message || issue.raw}`);
      });
    } else {
      logger.warn('  No issues found');
    }

    // Compare issues
    if (mainResult && prResult) {
      const mainIssues = mainResult.parsedIssues || [];
      const prIssues = prResult.parsedIssues || [];

      logger.info('\\n🔄 Issue Comparison:');
      logger.info(`  Main branch: ${mainIssues.length} issues`);
      logger.info(`  PR branch: ${prIssues.length} issues`);
      logger.info(`  Delta: ${prIssues.length - mainIssues.length} issues`);

      if (mainIssues.length > 0) {
        logger.info('\\n✅ SUCCESS: Main branch has existing issues!');
        logger.info('  This enables proper two-branch comparison');
      } else {
        logger.error('\\n❌ PROBLEM: Main branch has 0 issues');
        logger.error('  This breaks two-branch comparison');
      }
    }

    // Cleanup
    logger.info('\\n🧹 Cleaning up...');
    execSync(`kubectl delete job ${mainJobName} -n ${namespace} --ignore-not-found=true`);
    execSync(`kubectl delete job ${prJobName} -n ${namespace} --ignore-not-found=true`);
    execSync(`kubectl delete pvc ${mainPvcName} -n ${namespace} --ignore-not-found=true`);
    execSync(`kubectl delete pvc ${prPvcName} -n ${namespace} --ignore-not-found=true`);

    // Kill port-forward
    execSync("pkill -f 'kubectl port-forward.*redis' || true", { shell: '/bin/bash' });

    // Summary
    logger.info('\\n' + '='.repeat(80));
    logger.info('🎯 TEST COMPLETE - Two-Branch Comparison Analysis');
    logger.info('='.repeat(80));

    logger.info('\\nExpected Results:');
    logger.info('  Main branch: 2 existing issues');
    logger.info('  PR branch: 5 issues (1 fixed, 4 new)');
    logger.info('  New issues: 4');
    logger.info('  Resolved issues: 1');
    logger.info('  Persistent issues: 1');

    logger.info('\\nActual Results:');
    logger.info(`  Main branch: ${mainResult?.parsedIssues?.length || 0} issues`);
    logger.info(`  PR branch: ${prResult?.parsedIssues?.length || 0} issues`);

  } catch (error) {
    logger.error(`❌ Test failed: ${error.message}`);
    console.error(error);

    // Cleanup on error
    execSync("pkill -f 'kubectl port-forward.*redis' || true", { shell: '/bin/bash' });
  } finally {
    // Redis connection handled internally
  }
}

// Execute
testMainBranchWithIssues().catch(console.error);