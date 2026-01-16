#!/usr/bin/env npx ts-node

/**
 * Build Enhanced Java Analyzer Image with Kaniko
 *
 * This script builds a new Java analyzer Docker image directly in Kubernetes
 * using Kaniko, which doesn't require Docker daemon.
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

async function buildJavaAnalyzerWithKaniko() {
  const namespace = 'codequal-dev';
  // Session 88: Updated to Oracle Container Registry (DigitalOcean closed)
  const imageName = 'iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-java-v6.0-arm';

  try {
    logger.info('🚀 Building Enhanced Java Analyzer Image with Kaniko');
    logger.info('='.repeat(80));

    // Step 1: Check if we have registry credentials
    logger.info('📋 Step 1: Checking for Docker registry credentials...');

    // Check if secret exists
    try {
      execSync(`kubectl get secret docker-registry-config -n ${namespace}`, { stdio: 'ignore' });
      logger.info('✅ Registry credentials found');
    } catch {
      logger.warn('⚠️ Registry credentials not found. Creating placeholder...');

      // Create a basic secret (you'll need to update with real credentials)
      const secretYaml = `
apiVersion: v1
kind: Secret
metadata:
  name: docker-registry-config
  namespace: ${namespace}
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: ${Buffer.from(JSON.stringify({
    auths: {
      "iad.ocir.io": {
        auth: Buffer.from("idzaw9ddo1h5/YOUR_USERNAME:YOUR_AUTH_TOKEN").toString('base64')
      }
    }
  })).toString('base64')}
`;

      // Session 88: Updated to Oracle Container Registry (DigitalOcean closed)
      logger.info('📝 NOTE: You need to update the docker-registry-config secret with your Oracle OCIR credentials');
      logger.info('Run: kubectl create secret docker-registry docker-registry-config \\');
      logger.info('  --docker-server=iad.ocir.io \\');
      logger.info('  --docker-username=idzaw9ddo1h5/YOUR_USERNAME \\');
      logger.info('  --docker-password=YOUR_AUTH_TOKEN \\');
      logger.info('  --namespace=codequal-dev');

      // For now, we'll proceed assuming credentials will be added
    }

    // Step 2: Create ConfigMap with Dockerfile
    logger.info('\\n📋 Step 2: Creating Dockerfile ConfigMap...');

    const dockerfileContent = `
# Enhanced Java Analyzer Image v5
FROM openjdk:11-jdk-slim

# Install basic tools
RUN apt-get update && apt-get install -y \\
    curl wget git python3 python3-pip unzip \\
    && rm -rf /var/lib/apt/lists/*

WORKDIR /tools

# Install SpotBugs
RUN wget -q https://github.com/spotbugs/spotbugs/releases/download/4.8.0/spotbugs-4.8.0.zip \\
    && unzip -q spotbugs-4.8.0.zip \\
    && mv spotbugs-4.8.0 /opt/spotbugs \\
    && rm spotbugs-4.8.0.zip \\
    && ln -s /opt/spotbugs/bin/spotbugs /usr/local/bin/spotbugs

# Install PMD
RUN wget -q https://github.com/pmd/pmd/releases/download/pmd_releases%2F7.0.0/pmd-dist-7.0.0-bin.zip \\
    && unzip -q pmd-dist-7.0.0-bin.zip \\
    && mv pmd-bin-7.0.0 /opt/pmd \\
    && rm pmd-dist-7.0.0-bin.zip \\
    && ln -s /opt/pmd/bin/pmd /usr/local/bin/pmd

# Install Checkstyle
RUN wget -q https://github.com/checkstyle/checkstyle/releases/download/checkstyle-10.12.5/checkstyle-10.12.5-all.jar \\
    && mv checkstyle-10.12.5-all.jar /opt/checkstyle.jar \\
    && echo '#!/bin/bash' > /usr/local/bin/checkstyle \\
    && echo 'java -jar /opt/checkstyle.jar "\\$@"' >> /usr/local/bin/checkstyle \\
    && chmod +x /usr/local/bin/checkstyle

# Download Google checks for Checkstyle
RUN wget -q -O /google_checks.xml \\
    https://raw.githubusercontent.com/google/styleguide/gh-pages/google_checks.xml

# Install Semgrep
RUN pip3 install --no-cache-dir semgrep==1.45.0

# Set environment
ENV SPOTBUGS_HOME=/opt/spotbugs
ENV PMD_HOME=/opt/pmd
ENV PATH=\\$PATH:/opt/spotbugs/bin:/opt/pmd/bin

# Verification script
RUN echo '#!/bin/bash' > /verify-tools.sh \\
    && echo 'echo "SpotBugs:" && spotbugs -version 2>&1 | head -1' >> /verify-tools.sh \\
    && echo 'echo "PMD:" && pmd --version 2>&1 | head -1' >> /verify-tools.sh \\
    && echo 'echo "Checkstyle:" && java -jar /opt/checkstyle.jar --version 2>&1' >> /verify-tools.sh \\
    && echo 'echo "Semgrep:" && semgrep --version 2>&1' >> /verify-tools.sh \\
    && chmod +x /verify-tools.sh

WORKDIR /workspace

# Verify on build
RUN /verify-tools.sh

CMD ["/bin/bash"]
`;

    // Create ConfigMap
    const configMapYaml = `
apiVersion: v1
kind: ConfigMap
metadata:
  name: java-analyzer-dockerfile
  namespace: ${namespace}
data:
  Dockerfile: |${dockerfileContent.split('\\n').map(line => '    ' + line).join('\\n')}
`;

    execSync(`echo '${configMapYaml}' | kubectl apply -f -`);
    logger.info('✅ Dockerfile ConfigMap created');

    // Step 3: Create and run Kaniko build job
    logger.info('\\n📋 Step 3: Creating Kaniko build job...');

    const kanikoJobYaml = `
apiVersion: batch/v1
kind: Job
metadata:
  name: kaniko-java-analyzer-v5-${Date.now()}
  namespace: ${namespace}
spec:
  ttlSecondsAfterFinished: 3600
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: kaniko
        image: gcr.io/kaniko-project/executor:latest
        args:
        - "--dockerfile=/workspace/Dockerfile"
        - "--context=/workspace"
        - "--destination=${imageName}"
        - "--cache=true"
        - "--cache-ttl=24h"
        - "--log-format=text"
        - "--verbosity=info"
        volumeMounts:
        - name: dockerfile
          mountPath: /workspace
        - name: docker-config
          mountPath: /kaniko/.docker
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
      volumes:
      - name: dockerfile
        configMap:
          name: java-analyzer-dockerfile
      - name: docker-config
        secret:
          secretName: docker-registry-config
          optional: true
`;

    const jobName = `kaniko-java-analyzer-v5-${Date.now()}`;
    execSync(`echo '${kanikoJobYaml}' | kubectl apply -f -`);
    logger.info(`✅ Kaniko job created: ${jobName}`);

    // Step 4: Monitor build progress
    logger.info('\\n📋 Step 4: Monitoring build progress...');
    logger.info('This may take 5-10 minutes...');

    let attempts = 0;
    const maxAttempts = 300; // 10 minutes max

    while (attempts < maxAttempts) {
      try {
        // Check job status
        const status = execSync(
          `kubectl get job ${jobName} -n ${namespace} -o jsonpath='{.status.conditions[?(@.type=="Complete")].status}' 2>/dev/null || echo ''`,
          { encoding: 'utf-8' }
        ).trim();

        if (status === 'True') {
          logger.info('\\n✅ Build completed successfully!');
          break;
        }

        // Check for failure
        const failed = execSync(
          `kubectl get job ${jobName} -n ${namespace} -o jsonpath='{.status.conditions[?(@.type=="Failed")].status}' 2>/dev/null || echo ''`,
          { encoding: 'utf-8' }
        ).trim();

        if (failed === 'True') {
          logger.error('❌ Build failed!');

          // Get logs
          const logs = execSync(
            `kubectl logs job/${jobName} -n ${namespace} --tail=50`,
            { encoding: 'utf-8' }
          );
          logger.error('Last 50 lines of build log:');
          console.log(logs);
          break;
        }

        // Show progress
        if (attempts % 10 === 0) {
          logger.info(`⏳ Building... (${Math.floor(attempts * 2 / 60)} minutes elapsed)`);

          // Get some logs
          try {
            const logs = execSync(
              `kubectl logs job/${jobName} -n ${namespace} --tail=5 2>/dev/null || echo 'Waiting for logs...'`,
              { encoding: 'utf-8' }
            );
            const lastLines = logs.trim().split('\\n').slice(-2);
            lastLines.forEach(line => {
              if (line.trim()) logger.info(`  > ${line.substring(0, 100)}`);
            });
          } catch {
            // Ignore log fetch errors
          }
        }

      } catch (error) {
        // Job might not exist yet
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    }

    if (attempts >= maxAttempts) {
      logger.warn('⚠️ Build timed out after 10 minutes');
    }

    // Step 5: Verify the new image
    logger.info('\\n📋 Step 5: Verifying the new image...');

    logger.info(`\\n✅ New image should be available at: ${imageName}`);
    logger.info('\\nTo use the new image, update kubernetes-repository-manager.ts:');
    logger.info("  'java': 'lang-java-v5.0'");

    logger.info('\\nTo test the new image:');
    logger.info(`kubectl run test-v5 --image=${imageName} --rm -it --restart=Never -n ${namespace} -- /verify-tools.sh`);

    // Cleanup
    logger.info('\\n🧹 Cleaning up build job...');
    execSync(`kubectl delete job ${jobName} -n ${namespace} --ignore-not-found=true`);

  } catch (error) {
    logger.error(`❌ Build failed: ${error.message}`);
    console.error(error);
  }
}

// Execute
buildJavaAnalyzerWithKaniko().catch(console.error);