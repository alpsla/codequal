#!/bin/bash

# Build ARM Analyzer Images Directly on Oracle Instance
# This script runs on the Oracle ARM instance to build native ARM images

SSH_KEY="./keys/oracle/ssh-key-2025-05-08.key"
INSTANCE_IP="129.213.49.128"
USER="opc"

echo "================================================"
echo "  Building ARM Analyzers on Oracle Instance"
echo "================================================"
echo ""

# Copy the build script to Oracle instance
echo "📦 Copying build files to Oracle instance..."
scp -i "$SSH_KEY" build-arm-analyzers.sh "$USER@$INSTANCE_IP:/mnt/workspace/"

# Execute the build on the Oracle instance
ssh -i "$SSH_KEY" "$USER@$INSTANCE_IP" << 'REMOTE_BUILD'
set -e

cd /mnt/workspace

# Make script executable
chmod +x build-arm-analyzers.sh

# For now, let's build just the Java analyzer as a test
# We'll build it directly without the complex script

echo "================================================"
echo "  Building Java Analyzer for ARM (Direct)"
echo "================================================"

BUILD_DIR="/mnt/workspace/build-arm"
REGISTRY="registry.digitalocean.com/codequal-registry"

# Clean and create build directory
rm -rf $BUILD_DIR
mkdir -p $BUILD_DIR

# Create Dockerfile for Java
cat > $BUILD_DIR/Dockerfile.java << 'DOCKERFILE'
FROM eclipse-temurin:17-jdk-jammy

# Install build tools and dependencies
RUN apt-get update && apt-get install -y \
    maven \
    gradle \
    git \
    curl \
    wget \
    unzip \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install SpotBugs
RUN wget -q https://github.com/spotbugs/spotbugs/releases/download/4.7.3/spotbugs-4.7.3.tgz \
    && tar -xzf spotbugs-4.7.3.tgz -C /opt \
    && ln -s /opt/spotbugs-4.7.3/bin/spotbugs /usr/local/bin/spotbugs \
    && rm spotbugs-4.7.3.tgz

# Install PMD
RUN wget -q https://github.com/pmd/pmd/releases/download/pmd_releases%2F6.55.0/pmd-bin-6.55.0.zip \
    && unzip -q pmd-bin-6.55.0.zip -d /opt \
    && ln -s /opt/pmd-bin-6.55.0/bin/run.sh /usr/local/bin/pmd \
    && rm pmd-bin-6.55.0.zip

# Install Checkstyle
RUN wget -q https://github.com/checkstyle/checkstyle/releases/download/checkstyle-10.12.0/checkstyle-10.12.0-all.jar \
    && mv checkstyle-10.12.0-all.jar /opt/checkstyle.jar \
    && echo '#!/bin/bash' > /usr/local/bin/checkstyle \
    && echo 'java -jar /opt/checkstyle.jar "$@"' >> /usr/local/bin/checkstyle \
    && chmod +x /usr/local/bin/checkstyle

# Install OWASP Dependency Check (smaller version)
RUN cd /opt && \
    curl -L https://github.com/jeremylong/DependencyCheck/releases/download/v8.4.0/dependency-check-8.4.0-release.zip -o dependency-check.zip && \
    unzip -q dependency-check.zip && \
    rm dependency-check.zip && \
    chmod +x /opt/dependency-check/bin/dependency-check.sh && \
    ln -s /opt/dependency-check/bin/dependency-check.sh /usr/local/bin/dependency-check

# Install Semgrep
RUN pip3 install --no-cache-dir semgrep

# Create analyzer script
RUN cat > /analyze.sh << 'SCRIPT'
#!/bin/bash
REPO_PATH=${1:-/workspace/repo}
OUTPUT_PATH=${2:-/workspace/output}

echo "Java Analyzer v5.1 (ARM)"
echo "========================"
echo "Repository: $REPO_PATH"
echo "Output: $OUTPUT_PATH"

cd "$REPO_PATH" || exit 1
mkdir -p "$OUTPUT_PATH"

# Run each tool and capture output
echo "Running SpotBugs..."
spotbugs -textui -effort:max -low . > "$OUTPUT_PATH/spotbugs.txt" 2>&1 || true

echo "Running PMD..."
pmd check -d . -R rulesets/java/quickstart.xml -f text > "$OUTPUT_PATH/pmd.txt" 2>&1 || true

echo "Running Checkstyle..."
find . -name "*.java" | xargs checkstyle -c /google_checks.xml > "$OUTPUT_PATH/checkstyle.txt" 2>&1 || true

echo "Running Semgrep..."
semgrep --config=auto --json . > "$OUTPUT_PATH/semgrep.json" 2>&1 || true

echo "Analysis complete!"
ls -la "$OUTPUT_PATH"
SCRIPT

RUN chmod +x /analyze.sh

WORKDIR /workspace
ENTRYPOINT ["/analyze.sh"]
DOCKERFILE

echo "📋 Dockerfile created. Building image..."

# Build the image
docker build -t "$REGISTRY/analyzer:lang-java-v5.1-arm" -f $BUILD_DIR/Dockerfile.java $BUILD_DIR

if [ $? -eq 0 ]; then
    echo "✅ Successfully built Java analyzer for ARM!"
    echo ""
    echo "Testing the image..."
    
    # Test with the existing test repo
    if [ -d /mnt/workspace/repos/test/gs-rest-service ]; then
        echo "Running test analysis..."
        docker run --rm \
            -v /mnt/workspace/repos/test/gs-rest-service:/workspace/repo:ro \
            -v /mnt/workspace/output/test-arm:/workspace/output \
            "$REGISTRY/analyzer:lang-java-v5.1-arm"
        
        echo ""
        echo "Test results:"
        ls -la /mnt/workspace/output/test-arm/
    fi
else
    echo "❌ Build failed!"
    exit 1
fi

echo ""
echo "📊 Image info:"
docker images | grep java-v5.1-arm

REMOTE_BUILD

echo ""
echo "================================================"
echo "  Build Complete!"
echo "================================================"
echo ""
echo "To push the image to registry:"
echo "ssh -i $SSH_KEY $USER@$INSTANCE_IP 'docker push registry.digitalocean.com/codequal-registry/analyzer:lang-java-v5.1-arm'"