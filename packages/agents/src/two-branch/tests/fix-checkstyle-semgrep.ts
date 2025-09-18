#!/usr/bin/env npx ts-node

/**
 * Fix Checkstyle and Semgrep Detection Issues
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

async function fixCheckstyleAndSemgrep() {
  const namespace = 'codequal-dev';

  logger.info('🔧 Fixing Checkstyle and Semgrep Detection Issues');
  logger.info('='.repeat(80));

  // Test 1: Check if Checkstyle needs source files or compiled classes
  logger.info('\n📋 Test 1: Checkstyle with proper Java file');

  const checkstyleTestYaml = `
apiVersion: batch/v1
kind: Job
metadata:
  name: fix-checkstyle-${Date.now()}
  namespace: ${namespace}
spec:
  ttlSecondsAfterFinished: 300
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: checkstyle
        image: registry.digitalocean.com/codequal-registry/analyzer:lang-java-v5.0
        command: ["/bin/bash", "-c"]
        args:
        - |
          echo '=== Creating test Java files ==='
          mkdir -p /tmp/src

          # Create a file with many style violations
          cat > /tmp/src/BadStyle.java << 'EOF'
          package com.test;
          import java.util.*;
          public class BadStyle
          {
              public static String x="test";
          public void method1(){System.out.println("bad");}
              public void method2(    )   {
                  int a=1;int b=2;
              }
          }
          EOF

          echo '=== Test 1: Default Checkstyle ==='
          cd /tmp/src
          java -jar /opt/checkstyle.jar -c /google_checks.xml BadStyle.java 2>&1 || echo "Exit: $?"

          echo '=== Test 2: Checkstyle with file list ==='
          ls -la *.java > /tmp/files.txt
          java -jar /opt/checkstyle.jar -c /google_checks.xml -f /tmp/files.txt 2>&1 || echo "Exit: $?"

          echo '=== Test 3: Find all Java files ==='
          find /tmp/src -name "*.java" -type f

          echo '=== Test 4: Check Google checks XML ==='
          head -20 /google_checks.xml
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
`;

  const checkstyleJob = `fix-checkstyle-${Date.now()}`;

  try {
    execSync(`echo '${checkstyleTestYaml}' | kubectl apply -f -`);

    // Wait for completion
    await new Promise(resolve => setTimeout(resolve, 10000));

    const logs = execSync(
      `kubectl logs job/${checkstyleJob} -n ${namespace} 2>/dev/null || echo 'Waiting...'`,
      { encoding: 'utf-8' }
    );

    logger.info('Checkstyle Test Output:');
    console.log(logs);

    // Clean up
    execSync(`kubectl delete job ${checkstyleJob} -n ${namespace} --ignore-not-found=true`);
  } catch (error) {
    logger.error('Checkstyle test failed:', error.message);
  }

  // Test 2: Fix Semgrep
  logger.info('\n📋 Test 2: Semgrep with proper configuration');

  const semgrepTestYaml = `
apiVersion: batch/v1
kind: Job
metadata:
  name: fix-semgrep-${Date.now()}
  namespace: ${namespace}
spec:
  ttlSecondsAfterFinished: 300
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: semgrep
        image: registry.digitalocean.com/codequal-registry/analyzer:lang-java-v5.0
        command: ["/bin/bash", "-c"]
        args:
        - |
          echo '=== Creating vulnerable Java files ==='
          mkdir -p /tmp/src

          cat > /tmp/src/SQLInjection.java << 'EOF'
          import java.sql.*;
          public class SQLInjection {
              public void vulnerable(String input) throws SQLException {
                  Connection conn = DriverManager.getConnection("jdbc:h2:mem:test");
                  Statement stmt = conn.createStatement();
                  String query = "SELECT * FROM users WHERE id = " + input;
                  ResultSet rs = stmt.executeQuery(query);
              }
          }
          EOF

          cat > /tmp/src/HardcodedSecret.java << 'EOF'
          public class HardcodedSecret {
              private static final String PASSWORD = "admin123";
              private static final String API_KEY = "sk-1234567890abcdef";

              public void connect() {
                  String password = "hardcoded_password";
                  login("admin", password);
              }

              private void login(String user, String pass) {}
          }
          EOF

          echo '=== Test 1: Semgrep with auto config ==='
          cd /tmp/src
          semgrep --config=auto . --json 2>&1 | python3 -m json.tool | head -100 || echo "Exit: $?"

          echo '=== Test 2: Semgrep with text output ==='
          semgrep --config=auto . 2>&1 | head -50 || echo "Exit: $?"

          echo '=== Test 3: Semgrep with specific Java rule ==='
          semgrep --config=p/security . 2>&1 | head -50 || echo "Exit: $?"

          echo '=== Test 4: Semgrep version and config ==='
          semgrep --version

          echo '=== Test 5: List files for Semgrep ==='
          ls -la /tmp/src/
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
`;

  const semgrepJob = `fix-semgrep-${Date.now()}`;

  try {
    execSync(`echo '${semgrepTestYaml}' | kubectl apply -f -`);

    // Wait longer for Semgrep (it downloads rules)
    logger.info('⏳ Waiting for Semgrep (may download rules)...');
    await new Promise(resolve => setTimeout(resolve, 30000));

    const logs = execSync(
      `kubectl logs job/${semgrepJob} -n ${namespace} 2>/dev/null || echo 'Waiting...'`,
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    );

    logger.info('Semgrep Test Output:');
    console.log(logs.substring(0, 5000)); // Truncate for readability

    // Clean up
    execSync(`kubectl delete job ${semgrepJob} -n ${namespace} --ignore-not-found=true`);
  } catch (error) {
    logger.error('Semgrep test failed:', error.message);
  }

  // Test 3: Try alternative approaches
  logger.info('\n📋 Test 3: Alternative tool configurations');

  const alternativeTestYaml = `
apiVersion: batch/v1
kind: Job
metadata:
  name: alternative-test-${Date.now()}
  namespace: ${namespace}
spec:
  ttlSecondsAfterFinished: 300
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: alternative
        image: registry.digitalocean.com/codequal-registry/analyzer:lang-java-v5.0
        command: ["/bin/bash", "-c"]
        args:
        - |
          echo '=== Testing with real Apache Kafka sample ==='

          # Clone a small portion of Kafka
          git clone --depth 1 --filter=blob:none --sparse https://github.com/apache/kafka.git /tmp/kafka
          cd /tmp/kafka
          git sparse-checkout set clients/src/main/java/org/apache/kafka/clients

          echo '=== Checkstyle on real code ==='
          cd /tmp/kafka/clients/src/main/java/org/apache/kafka/clients
          find . -name "*.java" | head -5 | xargs java -jar /opt/checkstyle.jar -c /google_checks.xml 2>&1 | head -30

          echo '=== Semgrep on real code ==='
          cd /tmp/kafka/clients/src/main/java/org/apache/kafka/clients
          timeout 30 semgrep --config=auto --max-target-bytes=1000000 . 2>&1 | head -50 || echo "Timeout/Exit: $?"
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
`;

  const alternativeJob = `alternative-test-${Date.now()}`;

  try {
    execSync(`echo '${alternativeTestYaml}' | kubectl apply -f -`);

    logger.info('⏳ Testing with real code...');
    await new Promise(resolve => setTimeout(resolve, 45000));

    const logs = execSync(
      `kubectl logs job/${alternativeJob} -n ${namespace} 2>/dev/null || echo 'Waiting...'`,
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    );

    logger.info('Alternative Test Output:');
    console.log(logs.substring(0, 3000));

    // Clean up
    execSync(`kubectl delete job ${alternativeJob} -n ${namespace} --ignore-not-found=true`);
  } catch (error) {
    logger.error('Alternative test failed:', error.message);
  }

  logger.info('\n' + '='.repeat(80));
  logger.info('📊 Analysis Complete');
  logger.info('Check the output above to understand why tools are not detecting issues');
}

// Execute
fixCheckstyleAndSemgrep().catch(console.error);