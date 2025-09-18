#!/usr/bin/env npx ts-node

/**
 * Final Test of All 4 Java Tools with Updated Commands and v5.1 Image
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

async function testFinalJavaTools() {
  const namespace = 'codequal-dev';
  const workspaceId = `final-java-test-${Date.now()}`;
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

    // Updated tool commands from kubernetes-repository-manager.ts
    const tools = [
      {
        name: 'spotbugs',
        command: `echo 'Running SpotBugs...' && cd /workspace/repo && find . -name "*.java" -exec javac {} + 2>/dev/null && spotbugs -textui -effort:max -low . 2>&1 || echo 'SpotBugs analysis complete'`
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
    logger.info('🔧 FINAL TEST: All 4 Java Tools with Updated Commands');
    logger.info('='.repeat(80));

    let totalIssues = 0;
    const results = [];

    for (const tool of tools) {
      logger.info(`\\n📊 Testing ${tool.name.toUpperCase()}...`);

      const jobName = `final-${tool.name}-${workspaceId}`;
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
        image: registry.digitalocean.com/codequal-registry/analyzer:lang-java-v5.1
        command: ["/bin/bash", "-c"]
        args:
        - |
          echo "=== Final Test ${tool.name.toUpperCase()} ==="

          # Create repo directory
          mkdir -p /workspace/repo

          # Create comprehensive Java files with many issues
          cat > /workspace/repo/SecurityVulnerabilities.java << 'EOF'
          import java.sql.*;
          import java.io.*;
          import java.util.*;
          import javax.crypto.*;

          public class SecurityVulnerabilities {
              // Hardcoded credentials
              private static final String PASSWORD = "admin123";
              private static String API_KEY = "sk-12345678901234567890";
              private String dbPassword = "password123";

              // SQL Injection vulnerability
              public List<User> getUsers(String userId) throws SQLException {
                  Connection conn = DriverManager.getConnection("jdbc:mysql://localhost/db", "user", PASSWORD);
                  String query = "SELECT * FROM users WHERE id = " + userId;  // Vulnerable to SQL injection
                  Statement stmt = conn.createStatement();
                  ResultSet rs = stmt.executeQuery(query);

                  List<User> users = new ArrayList<>();
                  while(rs.next()) {
                      users.add(new User(rs.getString("name")));
                  }
                  // Connection not closed - resource leak
                  return users;
              }

              // Command injection
              public void executeCommand(String userInput) throws IOException {
                  Runtime.getRuntime().exec("ls " + userInput);  // Command injection
                  ProcessBuilder pb = new ProcessBuilder("cat", "/etc/passwd");  // Sensitive file access
                  pb.start();
              }

              // Weak cryptography
              public String encrypt(String data) throws Exception {
                  Cipher cipher = Cipher.getInstance("DES");  // Weak algorithm
                  SecretKeyFactory factory = SecretKeyFactory.getInstance("DES");
                  return cipher.doFinal(data.getBytes()).toString();
              }

              // Path traversal
              public void readFile(String filename) throws IOException {
                  FileInputStream fis = new FileInputStream("/var/log/" + filename);  // Path traversal
                  BufferedReader br = new BufferedReader(new InputStreamReader(fis));
                  String line;
                  while((line = br.readLine()) != null) {
                      System.out.println(line);
                  }
                  // Streams not closed
              }
          }

          class User {
              private String name;
              public User(String name) { this.name = name; }
              public String getName() { return name; }
          }
          EOF

          cat > /workspace/repo/CodeQualityIssues.java << 'EOF'
          import java.util.*;
          import java.io.*;

          public class CodeQualityIssues
          { // Wrong brace placement
              // Unused imports above
              private static final int MAGIC_NUMBER = 42;
              private String unusedField = "never used";

              // Long method with many issues
              public void problematicMethod(boolean flag, String input, int count, String name) {
                  // Short variable names
                  int a = 1;
                  int b = 2;
                  int c = 3;

                  // Empty blocks
                  if (flag) {
                      // Empty if block
                  }

                  try {
                      // Empty try block
                  } catch (Exception e) {
                      // Empty catch block
                  }

                  // Unnecessary comparisons
                  if (flag == true) {
                      System.out.println("True");
                  }

                  // String concatenation in loop
                  String result = "";
                  for (int i = 0; i < count; i++) {
                      result += "item" + i;  // Inefficient
                  }

                  // Duplicate string literals
                  System.out.println("Duplicate string");
                  System.out.println("Duplicate string");
                  System.out.println("Duplicate string");

                  // Magic numbers
                  int timeout = 5000;
                  int maxRetries = 3;

                  // Unused local variables
                  String unused1 = "never used";
                  int unused2 = 100;

                  // Long line that exceeds style guidelines
                  System.out.println("This is an extremely long line that definitely exceeds the maximum line length recommended by most coding standards and style guides");
              }

              // Unused private method
              private void neverCalled() {
                  System.out.println("This method is never called");
              }

              // Missing final on parameters
              public void parameterIssues(String param1, int param2) {
                  // Parameters should be final
              }

              // Multiple variable declarations
              public void multipleDeclarations() {
                  int x = 1, y = 2, z = 3;  // Should be separate lines
              }

              // TODO comments
              public void todoMethod() {
                  // TODO: Implement this method
                  // FIXME: This needs to be fixed
              }
          }
          EOF

          cat > /workspace/repo/PerformanceIssues.java << 'EOF'
          import java.util.*;

          public class PerformanceIssues {
              // Inefficient collection usage
              private Vector<String> oldVector = new Vector<>();
              private Hashtable<String, String> oldHashtable = new Hashtable<>();

              // Unnecessary boxing
              public void boxingIssues() {
                  Integer count = new Integer(42);  // Should use valueOf
                  Boolean flag = new Boolean(true);  // Should use valueOf
                  Double value = new Double(3.14);  // Should use valueOf
              }

              // String concatenation in loop
              public String buildString(List<String> items) {
                  String result = "";
                  for (String item : items) {
                      result = result + item + ",";  // Should use StringBuilder
                  }
                  return result;
              }

              // Inefficient map iteration
              public void mapIteration(Map<String, String> map) {
                  for (String key : map.keySet()) {
                      String value = map.get(key);  // Should use entrySet()
                      System.out.println(key + "=" + value);
                  }
              }

              // Unnecessary object creation
              public void objectCreation() {
                  String s = new String("literal");  // Should use literal
                  Boolean b = new Boolean(false);
              }
          }
          EOF

          echo "Created comprehensive test files:"
          ls -la /workspace/repo/
          echo ""

          echo "Running ${tool.name} with command:"
          echo "${tool.command}"
          echo "---"

          # Run the exact tool command
          ${tool.command}

          echo "---"
          echo "=== Final ${tool.name.toUpperCase()} test complete ==="
        volumeMounts:
        - name: workspace
          mountPath: /workspace
        resources:
          limits:
            memory: "3Gi"
            cpu: "1500m"
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

        // Show sample issues
        const sampleCount = Math.min(8, result.parsedIssues.length);
        logger.info(`   Sample ${sampleCount} issues:`);
        result.parsedIssues.slice(0, sampleCount).forEach((issue, idx) => {
          const msg = issue.message || issue.raw || 'Unknown';
          logger.info(`   ${idx + 1}. ${msg.substring(0, 100)}`);
        });
      } else {
        logger.warn(`⚠️ ${tool.name.toUpperCase()}: No issues detected`);
        results.push({ tool: tool.name, status: 'no_issues', issues: 0 });

        // Show raw output for debugging
        logger.info(`Raw output (last 20 lines):`);
        const lines = output.split('\\n');
        lines.slice(-20).forEach(line => {
          if (line.trim() && !line.includes('===')) {
            logger.info(`  ${line.substring(0, 120)}`);
          }
        });
      }

      // Cleanup job
      execSync(`kubectl delete job ${jobName} -n ${namespace} --ignore-not-found=true`);

      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Final Summary
    logger.info('\\n' + '='.repeat(80));
    logger.info('🎯 FINAL JAVA ANALYZER SUMMARY (v5.1)');
    logger.info('='.repeat(80));

    let workingTools = 0;
    results.forEach(result => {
      const status = result.status === 'working' ? '✅ WORKING' : '❌ NOT WORKING';
      logger.info(`${result.tool.toUpperCase()}: ${status} - ${result.issues} issues`);
      if (result.status === 'working') workingTools++;
    });

    logger.info(`\\n📊 WORKING TOOLS: ${workingTools}/4`);
    logger.info(`📊 TOTAL ISSUES DETECTED: ${totalIssues}`);

    // Success criteria
    if (workingTools === 4 && totalIssues >= 80) {
      logger.info('\\n🎉 SUCCESS: All 4 Java tools working and detecting 80+ issues!');
      logger.info('The Java analyzer is now ready for production use.');
    } else if (workingTools === 4 && totalIssues >= 50) {
      logger.info('\\n✅ GOOD: All 4 tools working, detecting substantial issues.');
      logger.info('Consider adding more comprehensive test cases for 80+ issues.');
    } else if (workingTools >= 3) {
      logger.info(`\\n⚠️ PARTIAL SUCCESS: ${workingTools}/4 tools working.`);
      logger.info('Most functionality available, some tools may need configuration.');
    } else {
      logger.info(`\\n❌ ISSUES: Only ${workingTools}/4 tools working properly.`);
      logger.info('Significant configuration or installation issues detected.');
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

testFinalJavaTools().catch(console.error);