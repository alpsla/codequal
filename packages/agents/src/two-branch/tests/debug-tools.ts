#!/usr/bin/env npx ts-node

/**
 * Debug Checkstyle and Semgrep
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

async function debugTools() {
  const namespace = 'codequal-dev';

  logger.info('🔍 Debugging Checkstyle and Semgrep');

  // Test Checkstyle
  logger.info('\n📋 Testing Checkstyle...');
  const checkstyleJobYaml = `
apiVersion: batch/v1
kind: Job
metadata:
  name: debug-checkstyle-${Date.now()}
  namespace: ${namespace}
spec:
  ttlSecondsAfterFinished: 300
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: checkstyle
        image: registry.digitalocean.com/codequal-registry/analyzer:lang-java-v5.0
        command:
        - sh
        - -c
        - |
          echo '=== Creating test file ==='
          cat > /tmp/Test.java << 'EOF'
          import java.util.*;
          public class Test{
          public void method(){int x=1;int y=2;System.out.println(x+y);}
          }
          EOF

          echo '=== Running Checkstyle ==='
          cd /tmp
          java -jar /opt/checkstyle.jar -c /google_checks.xml Test.java 2>&1 || echo "Exit code: $?"

          echo '=== Trying with simplified config ==='
          echo '<?xml version="1.0"?>' > /tmp/simple.xml
          echo '<!DOCTYPE module PUBLIC "-//Checkstyle//DTD Checkstyle Configuration 1.3//EN" "https://checkstyle.org/dtds/configuration_1_3.dtd">' >> /tmp/simple.xml
          echo '<module name="Checker">' >> /tmp/simple.xml
          echo '  <property name="fileExtensions" value="java"/>' >> /tmp/simple.xml
          echo '  <module name="TreeWalker">' >> /tmp/simple.xml
          echo '    <module name="LineLength"><property name="max" value="80"/></module>' >> /tmp/simple.xml
          echo '  </module>' >> /tmp/simple.xml
          echo '</module>' >> /tmp/simple.xml

          java -jar /opt/checkstyle.jar -c /tmp/simple.xml Test.java 2>&1 || echo "Exit code: $?"
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
`;

  const checkstyleJob = `debug-checkstyle-${Date.now()}`;
  execSync(`echo '${checkstyleJobYaml}' | kubectl apply -f -`);

  await new Promise(resolve => setTimeout(resolve, 10000));

  const checkstyleLogs = execSync(
    `kubectl logs job/${checkstyleJob} -n ${namespace} 2>/dev/null || echo 'Waiting...'`,
    { encoding: 'utf-8' }
  );

  logger.info('Checkstyle output:');
  console.log(checkstyleLogs);

  // Test Semgrep
  logger.info('\n📋 Testing Semgrep...');
  const semgrepJobYaml = `
apiVersion: batch/v1
kind: Job
metadata:
  name: debug-semgrep-${Date.now()}
  namespace: ${namespace}
spec:
  ttlSecondsAfterFinished: 300
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: semgrep
        image: registry.digitalocean.com/codequal-registry/analyzer:lang-java-v5.0
        command:
        - sh
        - -c
        - |
          echo '=== Creating test file ==='
          mkdir -p /tmp/test
          cat > /tmp/test/Vulnerable.java << 'EOF'
          import java.sql.*;
          public class Vulnerable {
              public void sqlInjection(String input) throws SQLException {
                  Connection conn = DriverManager.getConnection("jdbc:h2:test");
                  String query = "SELECT * FROM users WHERE id = " + input;
                  Statement stmt = conn.createStatement();
                  ResultSet rs = stmt.executeQuery(query);
              }
          }
          EOF

          echo '=== Running Semgrep ==='
          cd /tmp/test
          semgrep --config=auto --json . 2>&1 || echo "Exit code: $?"

          echo '=== Trying with text output ==='
          semgrep --config=auto . 2>&1 || echo "Exit code: $?"

          echo '=== Trying with specific Java rules ==='
          semgrep --config=java.lang.security.audit.sqli.jdbc-sql-injection . 2>&1 || echo "Exit code: $?"
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
`;

  const semgrepJob = `debug-semgrep-${Date.now()}`;
  execSync(`echo '${semgrepJobYaml}' | kubectl apply -f -`);

  await new Promise(resolve => setTimeout(resolve, 15000));

  const semgrepLogs = execSync(
    `kubectl logs job/${semgrepJob} -n ${namespace} 2>/dev/null || echo 'Waiting...'`,
    { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
  );

  logger.info('Semgrep output:');
  console.log(semgrepLogs.substring(0, 5000)); // Truncate for readability

  // Cleanup
  execSync(`kubectl delete job ${checkstyleJob} -n ${namespace} --ignore-not-found=true`);
  execSync(`kubectl delete job ${semgrepJob} -n ${namespace} --ignore-not-found=true`);
}

debugTools().catch(console.error);