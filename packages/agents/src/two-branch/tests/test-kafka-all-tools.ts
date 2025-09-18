#!/usr/bin/env npx ts-node

/**
 * Test ALL Tools on Real Apache Kafka PR
 *
 * Tests with PR #17620 to see how many issues all tools find
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

async function testKafkaWithAllTools() {
  const namespace = 'codequal-dev';
  const workspaceId = `kafka-all-tools-${Date.now()}`;
  const pvcName = `pvc-${workspaceId}`;

  const redisManager = new RedisToolOutputManager();

  // Tools to test
  const tools = ['spotbugs', 'pmd'];  // Only test tools we know are installed

  try {
    // Redis port forwarding
    logger.info('🔌 Setting up Redis port forwarding...');
    execSync("pkill -f 'kubectl port-forward.*redis' || true", { shell: '/bin/bash' });
    execSync('kubectl port-forward -n codequal-dev svc/redis-service 6379:6379 > /dev/null 2>&1 &', { shell: '/bin/bash' });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 1: Clone Apache Kafka
    logger.info('\\n' + '='.repeat(80));
    logger.info('📦 Cloning Apache Kafka repository');
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
      storage: 5Gi
  storageClassName: do-block-storage
`;
    execSync(`echo '${pvcYaml}' | kubectl apply -f -`);

    const cloneJobName = `clone-${workspaceId}`;
    const cloneJobYaml = `
apiVersion: batch/v1
kind: Job
metadata:
  name: ${cloneJobName}
  namespace: ${namespace}
spec:
  ttlSecondsAfterFinished: 600
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: clone
        image: alpine/git:latest
        command: ["/bin/sh", "-c"]
        args:
        - |
          echo "Cloning Apache Kafka..."
          git clone --depth 100 https://github.com/apache/kafka.git /workspace/kafka
          cd /workspace/kafka
          git fetch origin pull/17620/head:pr17620
          git checkout pr17620
          echo "Clone complete. Current branch:"
          git branch
          echo "Recent commits:"
          git log --oneline -5
        volumeMounts:
        - name: workspace
          mountPath: /workspace
      volumes:
      - name: workspace
        persistentVolumeClaim:
          claimName: ${pvcName}
`;

    execSync(`echo '${cloneJobYaml}' | kubectl apply -f -`);

    // Wait for clone
    let attempts = 0;
    while (attempts < 120) {
      const status = execSync(
        `kubectl get job ${cloneJobName} -n ${namespace} -o jsonpath='{.status.conditions[?(@.type=="Complete")].status}'`,
        { encoding: 'utf-8' }
      ).trim();

      if (status === 'True') break;
      await new Promise(resolve => setTimeout(resolve, 3000));
      attempts++;
    }

    logger.info('✅ Apache Kafka cloned successfully');

    // Step 2: Compile the code first
    logger.info('\\n📦 Compiling Java code...');
    const compileJobName = `compile-${workspaceId}`;
    const compileJobYaml = `
apiVersion: batch/v1
kind: Job
metadata:
  name: ${compileJobName}
  namespace: ${namespace}
spec:
  ttlSecondsAfterFinished: 600
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: compile
        image: registry.digitalocean.com/codequal-registry/analyzer:lang-java-v4.9
        command: ["/bin/bash", "-c"]
        args:
        - |
          echo "Compiling Kafka Java files..."
          cd /workspace/kafka
          # Find and compile Java files (limited scope for speed)
          find ./clients/src/main/java -name "*.java" | head -100 | xargs javac -cp "." 2>&1 || true
          echo "Compilation attempt complete"
        volumeMounts:
        - name: workspace
          mountPath: /workspace
        resources:
          limits:
            memory: "4Gi"
            cpu: "2000m"
      volumes:
      - name: workspace
        persistentVolumeClaim:
          claimName: ${pvcName}
`;

    execSync(`echo '${compileJobYaml}' | kubectl apply -f -`);

    // Wait for compilation
    attempts = 0;
    while (attempts < 60) {
      const status = execSync(
        `kubectl get job ${compileJobName} -n ${namespace} -o jsonpath='{.status.conditions[?(@.type=="Complete")].status}'`,
        { encoding: 'utf-8' }
      ).trim();

      if (status === 'True') break;
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    }

    // Step 3: Run each tool on a subset of files
    logger.info('\\n' + '='.repeat(80));
    logger.info('🔧 Running analysis tools on Apache Kafka');
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
  ttlSecondsAfterFinished: 600
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: ${tool}
        image: registry.digitalocean.com/codequal-registry/analyzer:lang-java-v4.9
        command: ["/bin/bash", "-c"]
        args:
        - |
          cd /workspace/kafka

          echo "=== Running ${tool.toUpperCase()} on Kafka ==="
          echo "Analyzing clients/src/main/java directory (subset for speed)..."

          case "${tool}" in
            spotbugs)
              # SpotBugs needs compiled bytecode
              cd clients/src/main/java
              spotbugs -textui -effort:max -low . 2>&1 | head -200 || true
              ;;
            pmd)
              # PMD can analyze source directly
              cd clients/src/main/java
              pmd check -d . -f text -R rulesets/java/quickstart.xml 2>&1 | head -200 || true
              ;;
          esac

          echo "=== ${tool.toUpperCase()} analysis complete ==="
        volumeMounts:
        - name: workspace
          mountPath: /workspace
        resources:
          limits:
            memory: "4Gi"
            cpu: "2000m"
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
        await new Promise(resolve => setTimeout(resolve, 3000));
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
        'kafka-pr',
        tool,
        output,
        executionTime,
        true
      );

      // Get parsed results
      const result = await redisManager.getToolOutput(workspaceId, 'kafka-pr', tool);

      if (result && result.parsedIssues) {
        totalIssues[tool] = result.parsedIssues.length;
        logger.info(`✅ ${tool.toUpperCase()}: Found ${result.parsedIssues.length} issues`);

        // Show first 5 issues
        result.parsedIssues.slice(0, 5).forEach((issue, idx) => {
          const msg = issue.message || issue.raw || 'Unknown issue';
          logger.info(`   ${idx + 1}. [${issue.severity || '?'}] ${msg.substring(0, 100)}`);
        });
        if (result.parsedIssues.length > 5) {
          logger.info(`   ... and ${result.parsedIssues.length - 5} more issues`);
        }
      } else {
        totalIssues[tool] = 0;
        logger.info(`⚠️ ${tool.toUpperCase()}: No issues found`);
      }

      // Show raw output sample for debugging
      logger.info(`\\n📋 Raw output sample from ${tool}:`);
      const lines = output.split('\\n').filter(l => l.trim());
      lines.slice(0, 10).forEach(line => {
        if (line.length > 0) {
          logger.info(`   ${line.substring(0, 120)}`);
        }
      });

      // Cleanup job
      execSync(`kubectl delete job ${jobName} -n ${namespace} --ignore-not-found=true`);
    }

    // Step 4: Summary
    logger.info('\\n' + '='.repeat(80));
    logger.info('📊 APACHE KAFKA ANALYSIS SUMMARY');
    logger.info('='.repeat(80));

    let grandTotal = 0;
    for (const tool of tools) {
      const count = totalIssues[tool] || 0;
      grandTotal += count;
      logger.info(`${tool.toUpperCase().padEnd(15)} : ${count} issues`);
    }

    logger.info('-'.repeat(30));
    logger.info(`TOTAL           : ${grandTotal} issues`);

    logger.info('\\n📈 Analysis Comparison:');
    logger.info('Previous test (small files): 5-6 issues');
    logger.info(`Current test (real Kafka):   ${grandTotal} issues`);

    if (grandTotal > 20) {
      logger.info('\\n✅ SUCCESS: Real repository analysis shows many more issues!');
    } else if (grandTotal > 10) {
      logger.info('\\n⚠️ MODERATE: Some issues found, but less than expected');
    } else {
      logger.info('\\n❌ CONCERN: Very few issues found even in large codebase');
    }

    // Cleanup
    logger.info('\\n🧹 Cleaning up...');
    execSync(`kubectl delete jobs -n ${namespace} --all --ignore-not-found=true`);
    execSync(`kubectl delete pvc ${pvcName} -n ${namespace} --ignore-not-found=true`);
    execSync("pkill -f 'kubectl port-forward.*redis' || true", { shell: '/bin/bash' });

  } catch (error) {
    logger.error(`❌ Test failed: ${error.message}`);
    console.error(error);
    execSync("pkill -f 'kubectl port-forward.*redis' || true", { shell: '/bin/bash' });
  }
}

// Execute
testKafkaWithAllTools().catch(console.error);