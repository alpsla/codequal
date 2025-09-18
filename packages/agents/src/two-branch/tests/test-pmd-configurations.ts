#!/usr/bin/env npx ts-node

/**
 * Test PMD with different configurations to find working setup
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

async function testPMDConfigurations() {
  const namespace = 'codequal-dev';
  const repoUrl = 'https://github.com/apache/kafka';
  const prNumber = '17620';

  // Different PMD command configurations to test
  const pmdConfigs = [
    {
      name: 'basic-single-ruleset',
      command: `pmd check -d /workspace/repo -R category/java/bestpractices.xml -f text 2>&1 || true`
    },
    {
      name: 'basic-with-format',
      command: `pmd check -d /workspace/repo -R category/java/errorprone.xml -f text --no-cache 2>&1 || true`
    },
    {
      name: 'find-java-files-first',
      command: `cd /workspace/repo && find . -name "*.java" | head -10 && pmd check -d . -R category/java/bestpractices.xml -f text 2>&1 || true`
    },
    {
      name: 'specific-directory',
      command: `cd /workspace/repo && pmd check -d ./clients/src/main/java -R category/java/bestpractices.xml -f text 2>&1 || true`
    },
    {
      name: 'with-file-list',
      command: `cd /workspace/repo && find . -name "*.java" -type f > /tmp/files.txt && pmd check --file-list /tmp/files.txt -R category/java/bestpractices.xml -f text 2>&1 || true`
    },
    {
      name: 'check-pmd-version',
      command: `pmd --version && ls -la /opt/pmd/lib/pmd-java-*.jar 2>&1 || true`
    }
  ];

  logger.info('🔍 Testing PMD configurations with Apache Kafka PR #17620');
  logger.info('='.repeat(80));

  for (const config of pmdConfigs) {
    logger.info(`\n📋 Testing: ${config.name}`);
    logger.info(`Command: ${config.command}`);

    const jobName = `pmd-test-${config.name}-${Date.now()}`;
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
      initContainers:
      - name: clone-repo
        image: alpine/git:latest
        command:
        - sh
        - -c
        - |
          git clone --depth 1 ${repoUrl} /workspace/repo
          cd /workspace/repo
          git fetch origin pull/${prNumber}/head:pr-${prNumber}
          git checkout pr-${prNumber}
        volumeMounts:
        - name: workspace
          mountPath: /workspace
      containers:
      - name: pmd-test
        image: registry.digitalocean.com/codequal-registry/analyzer:lang-java-v4.9
        command:
        - sh
        - -c
        - |
          ${config.command}
        volumeMounts:
        - name: workspace
          mountPath: /workspace
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
      volumes:
      - name: workspace
        emptyDir: {}
`;

    try {
      // Apply the job
      execSync(`echo '${jobYaml}' | kubectl apply -f -`);
      logger.info(`✅ Job created: ${jobName}`);

      // Wait for completion (max 60 seconds)
      let attempts = 0;
      const maxAttempts = 30;
      let completed = false;

      while (attempts < maxAttempts && !completed) {
        await new Promise(resolve => setTimeout(resolve, 2000));

        try {
          const status = execSync(
            `kubectl get job ${jobName} -n ${namespace} -o jsonpath='{.status.conditions[?(@.type=="Complete")].status}' 2>/dev/null || echo ''`,
            { encoding: 'utf-8' }
          ).trim();

          const failed = execSync(
            `kubectl get job ${jobName} -n ${namespace} -o jsonpath='{.status.conditions[?(@.type=="Failed")].status}' 2>/dev/null || echo ''`,
            { encoding: 'utf-8' }
          ).trim();

          if (status === 'True' || failed === 'True') {
            completed = true;
          }
        } catch {
          // Job might not exist yet
        }

        attempts++;
      }

      // Get logs
      const logs = execSync(
        `kubectl logs job/${jobName} -n ${namespace} -c pmd-test --tail=100`,
        { encoding: 'utf-8' }
      );

      logger.info('📝 Output:');
      const lines = logs.trim().split('\n').slice(0, 20);
      lines.forEach(line => {
        if (line.trim()) logger.info(`  ${line}`);
      });

      // Count issues found
      const issueMatches = logs.match(/\.java:\d+:/g) || [];
      logger.info(`✅ Issues found: ${issueMatches.length}`);

      // Clean up
      execSync(`kubectl delete job ${jobName} -n ${namespace} --ignore-not-found=true`);

      if (issueMatches.length > 0) {
        logger.info(`🎉 SUCCESS! Configuration "${config.name}" found ${issueMatches.length} issues!`);
        logger.info('Working command:');
        logger.info(config.command);
        return config;
      }

    } catch (error) {
      logger.error(`❌ Error testing ${config.name}: ${error.message}`);
      // Clean up on error
      try {
        execSync(`kubectl delete job ${jobName} -n ${namespace} --ignore-not-found=true`);
      } catch {}
    }
  }

  logger.info('\n❌ No PMD configuration found issues. Need to investigate further.');
  return null;
}

// Execute
testPMDConfigurations().then(result => {
  if (result) {
    logger.info('\n✅ Found working PMD configuration!');
    logger.info('Update kubernetes-repository-manager.ts with:');
    logger.info(result.command);
  }
}).catch(console.error);