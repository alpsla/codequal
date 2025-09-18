#!/usr/bin/env npx ts-node

/**
 * Test All 4 Java Tools in v5.0 Image
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

async function testAllJavaToolsV5() {
  const namespace = 'codequal-dev';
  const workspaceId = `test-all-v5-${Date.now()}`;
  const pvcName = `pvc-${workspaceId}`;

  const redisManager = new RedisToolOutputManager();

  try {
    // Redis port forwarding
    logger.info('🔌 Setting up Redis port forwarding...');
    execSync("pkill -f 'kubectl port-forward.*redis' || true", { shell: '/bin/bash' });
    execSync('kubectl port-forward -n codequal-dev svc/redis-service 6379:6379 > /dev/null 2>&1 &', { shell: '/bin/bash' });
    await new Promise(resolve => setTimeout(resolve, 3000));

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

    // Test all 4 tools
    const tools = [
      {
        name: 'spotbugs',
        command: `echo 'Running SpotBugs...' && cd /workspace/repo && spotbugs -textui -effort:max -low . 2>&1 || echo 'SpotBugs analysis complete'`
      },
      {
        name: 'pmd',
        command: `echo 'Running PMD...' && cd /workspace/repo && pmd check -d . -f emacs -R category/java/bestpractices.xml,category/java/codestyle.xml,category/java/errorprone.xml,category/java/design.xml 2>&1 || echo 'PMD analysis complete'`
      },
      {
        name: 'checkstyle',
        command: `echo 'Running Checkstyle...' && cd /workspace/repo && checkstyle -c /google_checks.xml . 2>&1 || echo 'Checkstyle analysis complete'`
      },
      {
        name: 'semgrep',
        command: `echo 'Running Semgrep...' && cd /workspace/repo && semgrep --config=auto --json . 2>&1 || echo 'Semgrep analysis complete'`
      }
    ];

    logger.info('\\n' + '='.repeat(80));
    logger.info('🔧 Testing All 4 Java Tools in v5.0 Image');
    logger.info('='.repeat(80));

    let totalIssues = 0;
    const results = [];

    for (const tool of tools) {
      logger.info(`\\n📊 Testing ${tool.name.toUpperCase()}...`);

      const jobName = `test-v5-${tool.name}-${workspaceId}`;
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
        image: registry.digitalocean.com/codequal-registry/analyzer:lang-java-v5.0
        command: ["/bin/bash", "-c"]
        args:
        - |
          echo "=== Testing ${tool.name.toUpperCase()} in v5.0 ==="

          # Check if tool is installed
          echo "Checking if ${tool.name} is installed..."
          which ${tool.name} || echo "${tool.name} not found in PATH"

          # Create repo directory
          mkdir -p /workspace/repo

          # Create comprehensive test Java files
          cat > /workspace/repo/SecurityIssues.java << 'EOF'
          import java.sql.*;
          import java.io.*;

          public class SecurityIssues {
              private String password = "admin123";  // Hardcoded password
              private String apiKey = "secret-key-12345";  // Hardcoded API key

              public void sqlInjection(String userId) throws SQLException {
                  Connection conn = DriverManager.getConnection("jdbc:h2:test");
                  String query = "SELECT * FROM users WHERE id = " + userId;  // SQL injection
                  Statement stmt = conn.createStatement();
                  stmt.executeQuery(query);
                  // Connection never closed - resource leak
              }

              public void commandInjection(String input) throws Exception {
                  Runtime.getRuntime().exec("ping " + input);  // Command injection
              }

              public void weakCrypto() throws Exception {
                  javax.crypto.Cipher cipher = javax.crypto.Cipher.getInstance("DES");  // Weak encryption
              }

              public void pathTraversal(String filename) throws IOException {
                  FileInputStream fis = new FileInputStream("/var/log/" + filename);  // Path traversal
              }
          }
          EOF

          cat > /workspace/repo/CodeQualityIssues.java << 'EOF'
          import java.util.*;

          public class CodeQualityIssues
          { // Brace should be on same line
              private void unusedPrivateMethod() {
                  System.out.println("Never called");
              }

              public void emptyBlocks(boolean flag) {
                  if (flag) {
                      // Empty if block
                  }

                  try {
                      // Empty try block
                  } catch (Exception e) {
                      // Empty catch block
                  }
              }

              public void shortVariableNames() {
                  int a = 1;  // Too short
                  int b = 2;  // Too short
                  int c = a + b;
                  System.out.println(c);
              }

              public void duplicateCode() {
                  System.out.println("Duplicate string");
                  System.out.println("Duplicate string");
                  System.out.println("Duplicate string");
              }

              public void unnecessaryComplexity(boolean flag) {
                  if (flag == true) {  // Unnecessary comparison
                      System.out.println("True");
                  }
              }

              public void longMethod() {
                  // This method has too many statements
                  int var1 = 1;
                  int var2 = 2;
                  int var3 = 3;
                  int var4 = 4;
                  int var5 = 5;
                  int var6 = 6;
                  int var7 = 7;
                  int var8 = 8;
                  int var9 = 9;
                  int var10 = 10;
                  System.out.println("This is a very long line that exceeds typical line length limits and should be flagged by style checkers");
                  System.out.println(var1 + var2 + var3 + var4 + var5 + var6 + var7 + var8 + var9 + var10);
              }
          }
          EOF

          cat > /workspace/repo/PerformanceIssues.java << 'EOF'
          import java.util.*;

          public class PerformanceIssues {
              public void inefficientStringConcatenation() {
                  String result = "";
                  for (int i = 0; i < 100; i++) {
                      result += "item" + i;  // Should use StringBuilder
                  }
              }

              public void unnecessaryBoxing() {
                  Integer count = new Integer(42);  // Unnecessary boxing
                  Boolean flag = new Boolean(true);  // Unnecessary boxing
              }

              public void inefficientCollectionUsage() {
                  Vector<String> vector = new Vector<>();  // Should use ArrayList
                  Hashtable<String, String> table = new Hashtable<>();  // Should use HashMap
              }
          }
          EOF

          echo "Created test files:"
          ls -la /workspace/repo/

          echo "Running ${tool.name}..."
          echo "Command: ${tool.command}"
          echo "---"

          # Run tool
          ${tool.command}

          echo "---"
          echo "=== ${tool.name.toUpperCase()} test complete ==="
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
      while (attempts < 90) {
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

      const executionTime = Date.now() - startTime;

      // Check if tool is installed
      if (output.includes('not found in PATH')) {
        logger.warn(`❌ ${tool.name.toUpperCase()}: Tool not installed in Docker image`);
        results.push({ tool: tool.name, status: 'not_installed', issues: 0 });
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
          totalIssues += result.parsedIssues.length;
          results.push({ tool: tool.name, status: 'working', issues: result.parsedIssues.length });

          // Show first few issues
          result.parsedIssues.slice(0, 5).forEach((issue, idx) => {
            const msg = issue.message || issue.raw || 'Unknown';
            logger.info(`   ${idx + 1}. ${msg.substring(0, 100)}`);
          });
        } else {
          logger.warn(`⚠️ ${tool.name.toUpperCase()}: No issues detected (may need configuration)`);
          results.push({ tool: tool.name, status: 'no_issues', issues: 0 });

          // Show raw output for debugging
          const lines = output.split('\\n');
          lines.slice(-15).forEach(line => {
            if (line.trim() && !line.includes('===')) {
              logger.info(`  ${line.substring(0, 120)}`);
            }
          });
        }
      }

      // Cleanup job
      execSync(`kubectl delete job ${jobName} -n ${namespace} --ignore-not-found=true`);

      // Wait a bit between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Summary
    logger.info('\\n' + '='.repeat(80));
    logger.info('📊 FINAL JAVA v5.0 TOOL SUMMARY');
    logger.info('='.repeat(80));

    let workingTools = 0;
    results.forEach(result => {
      const status = result.status === 'working' ? '✅ WORKING' :
                    result.status === 'not_installed' ? '❌ NOT INSTALLED' :
                    '⚠️ CONFIGURED BUT NO ISSUES';
      logger.info(`${result.tool.toUpperCase()}: ${status} (${result.issues} issues)`);
      if (result.status === 'working') workingTools++;
    });

    logger.info(`\\n🎯 TOTAL WORKING TOOLS: ${workingTools}/4`);
    logger.info(`🎯 TOTAL ISSUES DETECTED: ${totalIssues}`);

    if (workingTools === 4 && totalIssues >= 80) {
      logger.info('\\n🎉 SUCCESS: All 4 tools working and detecting expected 80+ issues!');
    } else if (workingTools === 4) {
      logger.info('\\n✅ All 4 tools installed and working, but need more comprehensive test files for 80+ issues');
    } else {
      logger.info(`\\n⚠️ Only ${workingTools}/4 tools working properly`);
    }

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

testAllJavaToolsV5().catch(console.error);