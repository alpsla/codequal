#!/usr/bin/env npx ts-node

/**
 * Build Enhanced Java Analyzer Image v5 with Kaniko - Simplified
 * Embeds Google checks XML to avoid network issues
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

async function buildSimplifiedJavaAnalyzer() {
  const namespace = 'codequal-dev';
  const imageName = 'registry.digitalocean.com/codequal-registry/analyzer:lang-java-v5.0';

  try {
    logger.info('🚀 Building Simplified Java Analyzer Image v5 with Kaniko');
    logger.info('='.repeat(80));

    // Simplified Google checks content (minimal working version)
    const googleChecksContent = `<?xml version="1.0"?>
<!DOCTYPE module PUBLIC
          "-//Checkstyle//DTD Checkstyle Configuration 1.3//EN"
          "https://checkstyle.org/dtds/configuration_1_3.dtd">

<module name="Checker">
  <property name="charset" value="UTF-8"/>
  <property name="severity" value="warning"/>
  <property name="fileExtensions" value="java"/>

  <module name="TreeWalker">
    <module name="OuterTypeFilename"/>
    <module name="IllegalTokenText"/>
    <module name="AvoidEscapedUnicodeCharacters"/>
    <module name="LineLength">
      <property name="max" value="120"/>
      <property name="ignorePattern" value="^package.*|^import.*|a href|href|http://|https://|ftp://"/>
    </module>
    <module name="AvoidStarImport"/>
    <module name="OneTopLevelClass"/>
    <module name="NoLineWrap"/>
    <module name="EmptyBlock"/>
    <module name="NeedBraces"/>
    <module name="LeftCurly"/>
    <module name="RightCurly"/>
    <module name="WhitespaceAround"/>
    <module name="OneStatementPerLine"/>
    <module name="MultipleVariableDeclarations"/>
    <module name="ArrayTypeStyle"/>
    <module name="MissingSwitchDefault"/>
    <module name="FallThrough"/>
    <module name="UpperEll"/>
    <module name="ModifierOrder"/>
    <module name="EmptyLineSeparator">
      <property name="allowNoEmptyLineBetweenFields" value="true"/>
    </module>
    <module name="SeparatorWrap">
      <property name="tokens" value="DOT"/>
      <property name="option" value="nl"/>
    </module>
    <module name="SeparatorWrap">
      <property name="tokens" value="COMMA"/>
      <property name="option" value="EOL"/>
    </module>
    <module name="PackageName">
      <property name="format" value="^[a-z]+(\\.[a-z][a-z0-9]*)*$"/>
    </module>
    <module name="TypeName"/>
    <module name="MemberName"/>
    <module name="ParameterName"/>
    <module name="LocalVariableName"/>
    <module name="ClassTypeParameterName"/>
    <module name="MethodTypeParameterName"/>
    <module name="InterfaceTypeParameterName"/>
    <module name="NoFinalizer"/>
    <module name="OverloadMethodsDeclarationOrder"/>
    <module name="VariableDeclarationUsageDistance"/>
    <module name="MethodParamPad"/>
    <module name="OperatorWrap">
      <property name="option" value="NL"/>
    </module>
    <module name="NonEmptyAtclauseDescription"/>
    <module name="AtclauseOrder"/>
    <module name="JavadocMethod">
      <property name="allowMissingParamTags" value="true"/>
      <property name="allowMissingReturnTag" value="true"/>
    </module>
    <module name="JavadocParagraph"/>
    <module name="MethodName"/>
    <module name="SingleLineJavadoc"/>
    <module name="EmptyCatchBlock"/>
    <module name="CommentsIndentation"/>
  </module>
</module>`;

    // Step 1: Create ConfigMap with Dockerfile and embedded Google checks
    logger.info('📋 Step 1: Creating ConfigMap with Dockerfile and configurations...');

    const dockerfileContent = `
FROM openjdk:11-jdk-slim

# Install basic tools
RUN apt-get update && apt-get install -y \\
    curl wget git python3 python3-pip unzip \\
    && rm -rf /var/lib/apt/lists/*

WORKDIR /tools

# Install SpotBugs (already working)
RUN wget -q https://github.com/spotbugs/spotbugs/releases/download/4.8.0/spotbugs-4.8.0.zip \\
    && unzip -q spotbugs-4.8.0.zip \\
    && mv spotbugs-4.8.0 /opt/spotbugs \\
    && rm spotbugs-4.8.0.zip \\
    && ln -s /opt/spotbugs/bin/spotbugs /usr/local/bin/spotbugs

# Install PMD (already installed, just need correct command)
RUN wget -q https://github.com/pmd/pmd/releases/download/pmd_releases%2F7.0.0/pmd-dist-7.0.0-bin.zip \\
    && unzip -q pmd-dist-7.0.0-bin.zip \\
    && mv pmd-bin-7.0.0 /opt/pmd \\
    && rm pmd-dist-7.0.0-bin.zip \\
    && ln -s /opt/pmd/bin/pmd /usr/local/bin/pmd

# Install Checkstyle
RUN wget -q https://github.com/checkstyle/checkstyle/releases/download/checkstyle-10.12.5/checkstyle-10.12.5-all.jar \\
    && mv checkstyle-10.12.5-all.jar /opt/checkstyle.jar \\
    && echo '#!/bin/bash' > /usr/local/bin/checkstyle \\
    && echo 'java -jar /opt/checkstyle.jar "\$@"' >> /usr/local/bin/checkstyle \\
    && chmod +x /usr/local/bin/checkstyle

# Create Google checks XML directly (avoid network download)
RUN cat > /google_checks.xml << 'ENDOFFILE'
${googleChecksContent}
ENDOFFILE

# Install Semgrep
RUN pip3 install --no-cache-dir semgrep==1.45.0

# Set environment
ENV SPOTBUGS_HOME=/opt/spotbugs
ENV PMD_HOME=/opt/pmd
ENV PATH=\$PATH:/opt/spotbugs/bin:/opt/pmd/bin

# Verification script
RUN echo '#!/bin/bash' > /verify-tools.sh \\
    && echo 'echo "=== Tool Verification ==="' >> /verify-tools.sh \\
    && echo 'echo -n "SpotBugs: " && spotbugs -version 2>&1 | head -1' >> /verify-tools.sh \\
    && echo 'echo -n "PMD: " && pmd --version 2>&1 | head -1' >> /verify-tools.sh \\
    && echo 'echo -n "Checkstyle: " && java -jar /opt/checkstyle.jar --version 2>&1' >> /verify-tools.sh \\
    && echo 'echo -n "Semgrep: " && semgrep --version 2>&1' >> /verify-tools.sh \\
    && echo 'echo -n "Google checks: " && [ -f /google_checks.xml ] && echo "Found" || echo "Missing"' >> /verify-tools.sh \\
    && chmod +x /verify-tools.sh

WORKDIR /workspace

# Verify on build
RUN /verify-tools.sh

CMD ["/bin/bash"]`;

    // Create ConfigMap
    const configMapYaml = `
apiVersion: v1
kind: ConfigMap
metadata:
  name: dockerfile-java-v5-simplified
  namespace: ${namespace}
data:
  Dockerfile: |${dockerfileContent.split('\n').map(line => '    ' + line).join('\n')}`;

    execSync(`echo '${configMapYaml}' | kubectl apply -f -`);
    logger.info('✅ Dockerfile ConfigMap created');

    // Step 2: Create and run Kaniko build job
    logger.info('\n📋 Step 2: Creating Kaniko build job...');

    const jobName = `kaniko-java-v5-simple-${Date.now()}`;
    const kanikoJobYaml = `
apiVersion: batch/v1
kind: Job
metadata:
  name: ${jobName}
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
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
      volumes:
      - name: dockerfile
        configMap:
          name: dockerfile-java-v5-simplified
      - name: docker-config
        secret:
          secretName: kaniko-secret
          items:
          - key: .dockerconfigjson
            path: config.json`;

    execSync(`echo '${kanikoJobYaml}' | kubectl apply -f -`);
    logger.info(`✅ Kaniko job created: ${jobName}`);

    // Step 3: Monitor build progress
    logger.info('\n📋 Step 3: Monitoring build progress...');
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
          logger.info('\n✅ Build completed successfully!');
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

        // Show progress every 10 seconds
        if (attempts % 5 === 0) {
          logger.info(`⏳ Building... (${Math.floor(attempts * 2 / 60)} minutes elapsed)`);

          // Get some logs
          try {
            const logs = execSync(
              `kubectl logs job/${jobName} -n ${namespace} --tail=2 2>/dev/null || echo 'Waiting for logs...'`,
              { encoding: 'utf-8' }
            );
            const lastLine = logs.trim().split('\n').pop();
            if (lastLine && lastLine !== 'Waiting for logs...') {
              logger.info(`  > ${lastLine.substring(0, 100)}`);
            }
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

    // Step 4: Verify the new image
    logger.info('\n📋 Step 4: Verifying the new image...');

    logger.info(`\n✅ New image should be available at: ${imageName}`);
    logger.info('\nTo use the new image, update kubernetes-repository-manager.ts:');
    logger.info("  'java': 'lang-java-v5.0'");

    logger.info('\nTo test the new image:');
    logger.info(`kubectl run test-v5 --image=${imageName} --rm -it --restart=Never -n ${namespace} -- /verify-tools.sh`);

    // Cleanup
    logger.info('\n🧹 Note: Job will auto-cleanup after 1 hour');

  } catch (error) {
    logger.error(`❌ Build failed: ${error.message}`);
    console.error(error);
  }
}

// Execute
buildSimplifiedJavaAnalyzer().catch(console.error);