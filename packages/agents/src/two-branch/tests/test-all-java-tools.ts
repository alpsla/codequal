#!/usr/bin/env npx ts-node

/**
 * Test ALL Java Analysis Tools
 *
 * Runs SpotBugs, PMD, Checkstyle, and Semgrep to get comprehensive issue detection
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

async function testAllJavaTools() {
  const namespace = 'codequal-dev';
  const workspaceId = `test-all-tools-${Date.now()}`;
  const pvcName = `pvc-${workspaceId}`;

  const redisManager = new RedisToolOutputManager();

  // Tools to test
  const tools = ['spotbugs', 'pmd', 'checkstyle', 'semgrep'];

  try {
    // Redis port forwarding
    logger.info('🔌 Setting up Redis port forwarding...');
    execSync("pkill -f 'kubectl port-forward.*redis' || true", { shell: '/bin/bash' });
    execSync('kubectl port-forward -n codequal-dev svc/redis-service 6379:6379 > /dev/null 2>&1 &', { shell: '/bin/bash' });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 1: Create PVC
    logger.info('\\n' + '='.repeat(80));
    logger.info('📦 Creating workspace with problematic Java code');
    logger.info('='.repeat(80));

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

    // Step 2: Create Java files with various issues
    const setupJobName = `setup-${workspaceId}`;
    const setupJobYaml = `
apiVersion: batch/v1
kind: Job
metadata:
  name: ${setupJobName}
  namespace: ${namespace}
spec:
  ttlSecondsAfterFinished: 300
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: setup
        image: registry.digitalocean.com/codequal-registry/analyzer:lang-java-v5.1
        command: ["/bin/bash", "-c"]
        args:
        - |
          echo '=== Creating Java files with various issues ==='
          mkdir -p /workspace/src/main/java/com/example
          cd /workspace/src/main/java/com/example

          # File 1: Security and bug issues
          cat > SecurityIssues.java << 'EOF'
          package com.example;
          import java.sql.*;
          import java.util.*;
          import java.io.*;

          public class SecurityIssues {
              private String password = "admin123"; // Hardcoded password
              private static final String API_KEY = "sk-1234567890abcdef"; // Exposed API key

              // SQL Injection vulnerability
              public void sqlInjection(String userId) throws SQLException {
                  Connection conn = DriverManager.getConnection("jdbc:h2:test");
                  String query = "SELECT * FROM users WHERE id = " + userId;
                  Statement stmt = conn.createStatement();
                  ResultSet rs = stmt.executeQuery(query);
                  // Connection never closed
              }

              // Null pointer dereference
              public void nullPointer() {
                  String s = null;
                  System.out.println(s.length());
              }

              // Path traversal vulnerability
              public void pathTraversal(String filename) throws IOException {
                  File file = new File("/var/data/" + filename);
                  FileInputStream fis = new FileInputStream(file);
                  // Stream never closed
              }

              // Command injection
              public void commandInjection(String userInput) throws IOException {
                  Runtime.getRuntime().exec("ping " + userInput);
              }

              // Weak random number generator
              public int weakRandom() {
                  Random r = new Random();
                  return r.nextInt();
              }

              // Empty catch block
              public void emptyCatch(String num) {
                  try {
                      Integer.parseInt(num);
                  } catch (NumberFormatException e) {
                      // Empty - swallowing exception
                  }
              }
          }
          EOF

          # File 2: Code quality issues
          cat > CodeQualityIssues.java << 'EOF'
          package com.example;
          import java.util.*;

          public class CodeQualityIssues {
              // Dead code
              private void unusedMethod() {
                  System.out.println("Never called");
              }

              // Overly complex method (high cyclomatic complexity)
              public String complexMethod(int a, int b, int c, int d, int e) {
                  if (a > 0) {
                      if (b > 0) {
                          if (c > 0) {
                              if (d > 0) {
                                  if (e > 0) {
                                      return "All positive";
                                  } else {
                                      return "E negative";
                                  }
                              } else {
                                  return "D negative";
                              }
                          } else {
                              return "C negative";
                          }
                      } else {
                          return "B negative";
                      }
                  } else {
                      return "A negative";
                  }
              }

              // Magic numbers
              public double calculatePrice(double base) {
                  return base * 1.08 * 0.95 + 2.50;
              }

              // Duplicate code
              public void method1() {
                  System.out.println("Start");
                  System.out.println("Processing");
                  System.out.println("End");
              }

              public void method2() {
                  System.out.println("Start");
                  System.out.println("Processing");
                  System.out.println("End");
              }

              // Naming issues
              public void a(int x, int y) {
                  int z = x + y;
                  System.out.println(z);
              }

              // God class - too many responsibilities
              private Connection dbConn;
              private FileWriter logWriter;
              private Socket networkSocket;
              private Thread workerThread;
              private Map<String, Object> cache;
              private List<String> queue;

              // Long parameter list
              public void tooManyParams(String a, String b, String c, String d,
                                       String e, String f, String g, String h) {
                  // Bad practice
              }
          }
          EOF

          # File 3: Performance issues
          cat > PerformanceIssues.java << 'EOF'
          package com.example;
          import java.util.*;

          public class PerformanceIssues {
              // String concatenation in loop
              public String badStringConcat(List<String> items) {
                  String result = "";
                  for (String item : items) {
                      result += item; // Should use StringBuilder
                  }
                  return result;
              }

              // Inefficient collection usage
              public boolean inefficientSearch(List<String> list, String item) {
                  for (int i = 0; i < list.size(); i++) {
                      if (list.get(i).equals(item)) {
                          return true;
                      }
                  }
                  return false; // Should use Set
              }

              // Resource leak in loop
              public void resourceLeakInLoop(List<String> files) throws Exception {
                  for (String file : files) {
                      FileInputStream fis = new FileInputStream(file);
                      // Stream never closed
                  }
              }

              // Synchronization issues
              private int counter = 0;

              public void unsafeIncrement() {
                  counter++; // Not thread-safe
              }

              // Infinite loop risk
              public void riskyLoop(int n) {
                  while (n != 0) {
                      n = n - 2; // Infinite if n is odd
                  }
              }
          }
          EOF

          # File 4: Style violations
          cat > StyleViolations.java << 'EOF'
          package com.example;
          import java.util.*;
          import java.io.*;
          import java.net.*;
          import java.sql.*;
          import javax.swing.*;  // Unused import

          // Missing class javadoc
          public class StyleViolations
          {  // Brace on wrong line
              // Non-final static variable
              public static String config = "dev";

              // Missing visibility modifier
              int defaultField;

              // Constants not all caps
              public static final String myConstant = "value";

              // Line too long
              public void veryLongMethodNameThatExceedsRecommendedLineLengthAndMakesCodeHardToReadAndMaintainInTheLongRun() {
                  System.out.println("This is a very long line that exceeds the recommended maximum line length and makes the code harder to read and maintain");
              }

              // Missing @Override annotation
              public String toString() {
                  return "StyleViolations";
              }

              // Tab character usage
          	public void tabMethod() {
          		System.out.println("Uses tabs");
          	}

              // Multiple statements on one line
              public void multipleStatements() { int a = 1; int b = 2; System.out.println(a + b); }

              // Missing braces
              public void missingBraces(boolean flag)
                  if (flag)
                      System.out.println("No braces");
          }
          EOF

          echo '=== Compiling Java files ==='
          cd /workspace/src
          find . -name "*.java" -exec javac {} \\; 2>&1 || true

          echo '=== Setup complete ==='
        volumeMounts:
        - name: workspace
          mountPath: /workspace
      volumes:
      - name: workspace
        persistentVolumeClaim:
          claimName: ${pvcName}
`;

    execSync(`echo '${setupJobYaml}' | kubectl apply -f -`);

    // Wait for setup
    let attempts = 0;
    while (attempts < 60) {
      const status = execSync(
        `kubectl get job ${setupJobName} -n ${namespace} -o jsonpath='{.status.conditions[?(@.type=="Complete")].status}'`,
        { encoding: 'utf-8' }
      ).trim();

      if (status === 'True') break;
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    }

    logger.info('✅ Java files created with various issues');

    // Step 3: Run each tool
    logger.info('\\n' + '='.repeat(80));
    logger.info('🔧 Running all analysis tools');
    logger.info('='.repeat(80));

    const totalIssues: Record<string, number> = {};

    for (const tool of tools) {
      logger.info(`\\n📊 Running ${tool.toUpperCase()}...`);

      const jobName = `${tool}-${workspaceId}`;
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
      - name: ${tool}
        image: registry.digitalocean.com/codequal-registry/analyzer:lang-java-v5.1
        command: ["/bin/bash", "-c"]
        args:
        - |
          cd /workspace/src

          echo "=== Running ${tool.toUpperCase()} ==="

          case "${tool}" in
            spotbugs)
              spotbugs -textui -effort:max -low . 2>&1 || true
              ;;
            pmd)
              pmd check -d . -R category/java/bestpractices.xml -f text 2>&1 || true
              ;;
            checkstyle)
              checkstyle -c /google_checks.xml . 2>&1 || true
              ;;
            semgrep)
              semgrep --config=auto . 2>&1 || true
              ;;
          esac

          echo "=== ${tool.toUpperCase()} complete ==="
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
      attempts = 0;
      const startTime = Date.now();
      while (attempts < 120) {
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

      // Store in Redis
      await redisManager.storeToolOutput(
        workspaceId,
        'analysis',
        tool,
        output,
        executionTime,
        true
      );

      // Get parsed results
      const result = await redisManager.getToolOutput(workspaceId, 'analysis', tool);

      if (result && result.parsedIssues) {
        totalIssues[tool] = result.parsedIssues.length;
        logger.info(`✅ ${tool.toUpperCase()}: Found ${result.parsedIssues.length} issues`);

        // Show first 3 issues as examples
        result.parsedIssues.slice(0, 3).forEach((issue, idx) => {
          logger.info(`   ${idx + 1}. [${issue.severity || 'unknown'}] ${issue.message || issue.raw?.substring(0, 80)}`);
        });
        if (result.parsedIssues.length > 3) {
          logger.info(`   ... and ${result.parsedIssues.length - 3} more issues`);
        }
      } else {
        totalIssues[tool] = 0;
        logger.info(`⚠️ ${tool.toUpperCase()}: No issues found or parsing failed`);
      }

      // Cleanup job
      execSync(`kubectl delete job ${jobName} -n ${namespace} --ignore-not-found=true`);
    }

    // Step 4: Summary
    logger.info('\\n' + '='.repeat(80));
    logger.info('📊 COMPREHENSIVE ANALYSIS SUMMARY');
    logger.info('='.repeat(80));

    let grandTotal = 0;
    for (const tool of tools) {
      const count = totalIssues[tool] || 0;
      grandTotal += count;
      logger.info(`${tool.toUpperCase().padEnd(15)} : ${count} issues`);
    }

    logger.info('-'.repeat(30));
    logger.info(`TOTAL           : ${grandTotal} issues`);

    logger.info('\\n📈 Analysis Insights:');
    if (grandTotal > 50) {
      logger.info('✅ Comprehensive detection: Multiple tools finding many issues');
    } else if (grandTotal > 20) {
      logger.info('⚠️ Moderate detection: Some tools may need configuration');
    } else {
      logger.info('❌ Low detection: Tools may not be configured properly');
    }

    // Cleanup
    logger.info('\\n🧹 Cleaning up...');
    execSync(`kubectl delete pvc ${pvcName} -n ${namespace} --ignore-not-found=true`);
    execSync(`kubectl delete job ${setupJobName} -n ${namespace} --ignore-not-found=true`);
    execSync("pkill -f 'kubectl port-forward.*redis' || true", { shell: '/bin/bash' });

  } catch (error) {
    logger.error(`❌ Test failed: ${error.message}`);
    console.error(error);
    execSync("pkill -f 'kubectl port-forward.*redis' || true", { shell: '/bin/bash' });
  }
}

// Execute
testAllJavaTools().catch(console.error);