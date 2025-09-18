#!/usr/bin/env npx ts-node

/**
 * Test PMD with Different Ruleset Configurations
 *
 * The current PMD command is detecting 0 issues. This script tests different
 * PMD configurations to find what works in the v4.9 image.
 */

import { execSync } from 'child_process';
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

async function testPMDConfigurations() {
  const namespace = 'codequal-dev';
  const workspaceId = `pmd-test-${Date.now()}`;
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

    // Test different PMD configurations
    const pmdConfigurations = [
      {
        name: 'basic-check',
        command: 'cd /workspace && pmd check -d . -f text 2>&1',
        description: 'Basic PMD check without ruleset'
      },
      {
        name: 'quickstart-ruleset',
        command: 'cd /workspace && pmd check -d . -f text -R rulesets/java/quickstart.xml 2>&1',
        description: 'PMD with quickstart ruleset'
      },
      {
        name: 'default-java',
        command: 'cd /workspace && pmd check -d . -f text -R category/java/bestpractices.xml 2>&1',
        description: 'PMD with best practices category'
      },
      {
        name: 'multiple-categories',
        command: 'cd /workspace && pmd check -d . -f text -R category/java/bestpractices.xml,category/java/codestyle.xml,category/java/errorprone.xml 2>&1',
        description: 'PMD with multiple rule categories'
      },
      {
        name: 'all-java',
        command: 'cd /workspace && pmd check -d . -f text -R rulesets/java/all.xml 2>&1',
        description: 'PMD with all Java rules'
      },
      {
        name: 'list-available-rulesets',
        command: 'cd /workspace && pmd check -R 2>&1 | head -50',
        description: 'List available PMD rulesets'
      },
      {
        name: 'version-check',
        command: 'pmd --version 2>&1',
        description: 'Check PMD version'
      },
      {
        name: 'help-check',
        command: 'pmd check --help 2>&1 | head -30',
        description: 'Check PMD help options'
      }
    ];

    const testJavaCode = `public class TestPMD {
    private void unusedMethod() {
        System.out.println("Never called");
    }
    public void emptyIfStatement(boolean flag) {
        if (flag) {
            // Empty if block
        }
    }
    public void shortVariableName() {
        int a = 1;
        int b = 2;
        System.out.println(a + b);
    }
    public void longLine() {
        System.out.println("This is a very long line that exceeds the typical line length recommendation and should be flagged by PMD");
    }
    public String duplicatedString() {
        String s1 = "duplicated";
        String s2 = "duplicated";
        return s1 + s2;
    }
    public void unnecessaryConditional() {
        boolean flag = true;
        if (flag == true) {
            System.out.println("True");
        }
    }
}`;

    logger.info('\n' + '='.repeat(80));
    logger.info('🔧 Testing PMD Configurations');
    logger.info('='.repeat(80));

    for (const config of pmdConfigurations) {
      logger.info(`\n📊 Testing: ${config.description}`);

      const jobName = `pmd-test-${config.name}-${workspaceId}`;
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
      - name: pmd-test
        image: registry.digitalocean.com/codequal-registry/analyzer:lang-java-v4.9
        command: ["/bin/bash", "-c"]
        args:
        - |
          echo "=== Testing PMD Configuration: ${config.name} ==="

          # Check PMD installation
          echo "Checking PMD installation..."
          which pmd || echo "PMD not found in PATH"

          # Create test file for most tests
          if [[ "${config.name}" != "version-check" && "${config.name}" != "help-check" && "${config.name}" != "list-available-rulesets" ]]; then
            cat > /workspace/TestPMD.java << 'EOF'
${testJavaCode}
EOF
            echo "Test file created."
            ls -la /workspace/TestPMD.java
          fi

          echo "Running command: ${config.command}"
          echo "---"

          # Run PMD command
          ${config.command} || true

          echo "---"
          echo "=== PMD test ${config.name} complete ==="
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
      while (attempts < 30) {
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

      logger.info(`Results for ${config.name}:`);
      const lines = output.split('\n');
      lines.forEach(line => {
        if (line.trim()) {
          logger.info(`  ${line}`);
        }
      });

      // Cleanup job
      execSync(`kubectl delete job ${jobName} -n ${namespace} --ignore-not-found=true`);

      // Wait a bit between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Cleanup
    logger.info('\n🧹 Cleaning up PVC...');
    execSync(`kubectl delete pvc ${pvcName} -n ${namespace} --ignore-not-found=true`);

  } catch (error) {
    logger.error(`❌ Test failed: ${error.message}`);
    console.error(error);
  }
}

// Execute
testPMDConfigurations().catch(console.error);