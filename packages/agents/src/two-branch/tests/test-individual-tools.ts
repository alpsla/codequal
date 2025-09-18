#!/usr/bin/env npx ts-node

/**
 * Test Each Tool Individually with Small Test Files
 *
 * Tests SpotBugs, PMD, Checkstyle, and Semgrep separately to verify each works
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

async function testIndividualTools() {
  const namespace = 'codequal-dev';
  const workspaceId = `individual-tools-${Date.now()}`;
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

    // Test each tool separately
    const tools = [
      {
        name: 'spotbugs',
        testCode: `
          public class TestSpotBugs {
              public void nullPointer() {
                  String s = null;
                  System.out.println(s.length()); // NPE
              }

              public void resourceLeak() throws Exception {
                  java.sql.Connection conn = java.sql.DriverManager.getConnection("jdbc:h2:test");
                  // Never closed
              }
          }`,
        command: 'cd /workspace && javac TestSpotBugs.java && spotbugs -textui -effort:max -low . 2>&1'
      },
      {
        name: 'pmd',
        testCode: `
          public class TestPMD {
              private void unusedMethod() { // Unused private method
                  System.out.println("Never called");
              }

              public void emptyIfStatement(boolean flag) {
                  if (flag) {
                      // Empty
                  }
              }

              public void shortVariableName() {
                  int a = 1; // Too short
                  int b = 2;
                  System.out.println(a + b);
              }
          }`,
        command: 'cd /workspace && pmd check -d . -f text -R rulesets/java/quickstart.xml 2>&1 || true'
      },
      {
        name: 'checkstyle',
        testCode: `
          import java.util.*;

          public class TestCheckstyle
          { // Brace should be on same line
              public static String myConstant = "test"; // Should be final

              // Missing Javadoc
              public void veryLongMethodNameThatExceedsRecommendedLineLengthAndMakesCodeHardToRead() {
                  System.out.println("This is a very long line that exceeds the recommended maximum line length");
              }

              public void multipleStatements() { int a = 1; int b = 2; } // Multiple statements
          }`,
        command: 'cd /workspace && checkstyle -c /google_checks.xml TestCheckstyle.java 2>&1 || true'
      },
      {
        name: 'semgrep',
        testCode: `
          import java.sql.*;

          public class TestSemgrep {
              private String password = "admin123"; // Hardcoded password

              public void sqlInjection(String userId) throws SQLException {
                  Connection conn = DriverManager.getConnection("jdbc:h2:test");
                  String query = "SELECT * FROM users WHERE id = " + userId; // SQL injection
                  Statement stmt = conn.createStatement();
                  stmt.executeQuery(query);
              }

              public void commandInjection(String input) throws Exception {
                  Runtime.getRuntime().exec("ping " + input); // Command injection
              }
          }`,
        command: 'cd /workspace && semgrep --config=auto --text TestSemgrep.java 2>&1 || true'
      }
    ];

    logger.info('\\n' + '='.repeat(80));
    logger.info('🔧 Testing Each Tool Individually');
    logger.info('='.repeat(80));

    for (const tool of tools) {
      logger.info(`\\n📊 Testing ${tool.name.toUpperCase()}...`);

      const jobName = `test-${tool.name}-${workspaceId}`;
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
      - name: ${tool.name}
        image: registry.digitalocean.com/codequal-registry/analyzer:lang-java-v4.9
        command: ["/bin/bash", "-c"]
        args:
        - |
          echo "=== Testing ${tool.name.toUpperCase()} ==="

          # Check if tool is installed
          echo "Checking if ${tool.name} is installed..."
          which ${tool.name} || echo "${tool.name} not found in PATH"

          # Create test file
          cat > /workspace/${tool.name === 'checkstyle' ? 'TestCheckstyle' : tool.name === 'pmd' ? 'TestPMD' : tool.name === 'semgrep' ? 'TestSemgrep' : 'TestSpotBugs'}.java << 'EOF'
          ${tool.testCode}
          EOF

          echo "Test file created. Running ${tool.name}..."

          # Run tool
          ${tool.command}

          echo "=== ${tool.name.toUpperCase()} test complete ==="
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

      // Check if tool is installed
      if (output.includes('not found in PATH')) {
        logger.warn(`❌ ${tool.name.toUpperCase()}: Tool not installed in Docker image`);
      } else {
        // Store in Redis
        await redisManager.storeToolOutput(
          workspaceId,
          'test',
          tool.name,
          output,
          executionTime,
          true
        );

        // Get parsed results
        const result = await redisManager.getToolOutput(workspaceId, 'test', tool.name);

        if (result && result.parsedIssues && result.parsedIssues.length > 0) {
          logger.info(`✅ ${tool.name.toUpperCase()}: WORKING - Found ${result.parsedIssues.length} issues`);
          result.parsedIssues.forEach((issue, idx) => {
            const msg = issue.message || issue.raw || 'Unknown';
            logger.info(`   ${idx + 1}. ${msg.substring(0, 100)}`);
          });
        } else {
          logger.warn(`⚠️ ${tool.name.toUpperCase()}: No issues detected (tool may not be working properly)`);

          // Show raw output for debugging
          logger.info(`Raw output:`);
          const lines = output.split('\\n');
          lines.slice(-20).forEach(line => {
            if (line.trim()) logger.info(`  ${line.substring(0, 120)}`);
          });
        }
      }

      // Cleanup job
      execSync(`kubectl delete job ${jobName} -n ${namespace} --ignore-not-found=true`);
    }

    // Summary
    logger.info('\\n' + '='.repeat(80));
    logger.info('📊 TOOL AVAILABILITY SUMMARY');
    logger.info('='.repeat(80));

    logger.info('\\nBased on tests:');
    logger.info('✅ SpotBugs: Expected to work (found issues in previous tests)');
    logger.info('❓ PMD: Status unknown');
    logger.info('❓ Checkstyle: Status unknown');
    logger.info('❓ Semgrep: Status unknown');

    // Cleanup
    logger.info('\\n🧹 Cleaning up...');
    execSync(`kubectl delete pvc ${pvcName} -n ${namespace} --ignore-not-found=true`);
    execSync("pkill -f 'kubectl port-forward.*redis' || true", { shell: '/bin/bash' });

  } catch (error) {
    logger.error(`❌ Test failed: ${error.message}`);
    console.error(error);
    execSync("pkill -f 'kubectl port-forward.*redis' || true", { shell: '/bin/bash' });
  }
}

// Execute
testIndividualTools().catch(console.error);