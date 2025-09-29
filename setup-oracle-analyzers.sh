#!/bin/bash

# Setup Oracle Instance with CodeQual V9 Language-Based Analyzers
# Date: September 28, 2025

set -e

# Configuration
SSH_KEY="./keys/oracle/ssh-key-2025-05-08.key"
INSTANCE_IP="129.213.49.128"
USER="opc"

echo "==========================================="
echo "  CodeQual V9 Oracle Instance Setup"
echo "==========================================="
echo ""

# Function to execute commands on remote instance
remote_exec() {
    ssh -i "$SSH_KEY" "$USER@$INSTANCE_IP" "$1"
}

# Function to copy files to remote instance
remote_copy() {
    scp -i "$SSH_KEY" "$1" "$USER@$INSTANCE_IP:$2"
}

echo "📋 Step 1: Checking instance connectivity..."
if remote_exec "echo 'Instance accessible'" > /dev/null 2>&1; then
    echo "✅ Instance is accessible"
else
    echo "❌ Cannot connect to instance. Please check:"
    echo "   - Instance is running"
    echo "   - SSH key permissions (chmod 600 $SSH_KEY)"
    echo "   - Network connectivity"
    exit 1
fi

echo ""
echo "📋 Step 2: Checking Docker status..."
DOCKER_VERSION=$(remote_exec "docker --version 2>/dev/null || echo 'not installed'")
echo "   Docker: $DOCKER_VERSION"

echo ""
echo "📋 Step 3: Creating pull script on instance..."
cat > /tmp/pull-images.sh << 'SCRIPT'
#!/bin/bash

# Language-based analyzer images from DigitalOcean registry
IMAGES=(
  "registry.digitalocean.com/codequal/analyzer:lang-java-v5.1"
  "registry.digitalocean.com/codequal/analyzer:lang-python-v4.3"
  "registry.digitalocean.com/codequal/analyzer:lang-javascript-v4.3"
  "registry.digitalocean.com/codequal/analyzer:lang-typescript-v4.6"
  "registry.digitalocean.com/codequal/analyzer:lang-go-v4.6"
  "registry.digitalocean.com/codequal/analyzer:rust-v3"
  "registry.digitalocean.com/codequal/analyzer:lang-cpp-v4.7"
  "registry.digitalocean.com/codequal/analyzer:lang-ruby-v4.3"
)

echo "📦 Pulling ${#IMAGES[@]} analyzer images..."
echo ""

SUCCESS_COUNT=0
FAILED_COUNT=0

for image in "${IMAGES[@]}"; do
  IMAGE_NAME=$(echo $image | cut -d: -f2)
  echo "🔄 Pulling: $IMAGE_NAME"
  
  if docker pull "$image" 2>/dev/null; then
    echo "✅ Successfully pulled $IMAGE_NAME"
    ((SUCCESS_COUNT++))
  else
    echo "❌ Failed to pull $IMAGE_NAME (authentication may be required)"
    ((FAILED_COUNT++))
  fi
  echo ""
done

echo "=========================================="
echo "Summary: $SUCCESS_COUNT succeeded, $FAILED_COUNT failed"
echo ""

if [ $FAILED_COUNT -gt 0 ]; then
    echo "⚠️  Some images failed to pull. Please ensure you're logged in:"
    echo "   docker login registry.digitalocean.com"
    echo ""
fi

echo "📊 Current analyzer images:"
docker images | grep -E "(REPOSITORY|codequal)" | head -20
SCRIPT

remote_copy /tmp/pull-images.sh /mnt/workspace/pull-images.sh
remote_exec "chmod +x /mnt/workspace/pull-images.sh"
echo "✅ Pull script created at /mnt/workspace/pull-images.sh"

echo ""
echo "📋 Step 4: Copying corrected docker-compose file..."
remote_copy docker-compose-v9-language-based.yml /mnt/workspace/docker-compose-v9-correct.yml
echo "✅ Updated docker-compose file copied"

echo ""
echo "📋 Step 5: Creating language detection script..."
cat > /tmp/detect-and-analyze.sh << 'DETECT_SCRIPT'
#!/bin/bash

# Detect repository language and run appropriate analyzers
REPO_PATH=${1:-/mnt/workspace/repos/main}

if [ ! -d "$REPO_PATH" ]; then
    echo "❌ Repository path not found: $REPO_PATH"
    exit 1
fi

echo "🔍 Detecting primary language in $REPO_PATH..."

# Count files by extension
declare -A FILE_COUNTS
FILE_COUNTS[java]=$(find "$REPO_PATH" -name "*.java" 2>/dev/null | wc -l)
FILE_COUNTS[python]=$(find "$REPO_PATH" -name "*.py" 2>/dev/null | wc -l)
FILE_COUNTS[javascript]=$(find "$REPO_PATH" -name "*.js" -o -name "*.jsx" 2>/dev/null | wc -l)
FILE_COUNTS[typescript]=$(find "$REPO_PATH" -name "*.ts" -o -name "*.tsx" 2>/dev/null | wc -l)
FILE_COUNTS[go]=$(find "$REPO_PATH" -name "*.go" 2>/dev/null | wc -l)
FILE_COUNTS[rust]=$(find "$REPO_PATH" -name "*.rs" 2>/dev/null | wc -l)
FILE_COUNTS[cpp]=$(find "$REPO_PATH" -name "*.cpp" -o -name "*.cc" -o -name "*.cxx" 2>/dev/null | wc -l)
FILE_COUNTS[csharp]=$(find "$REPO_PATH" -name "*.cs" 2>/dev/null | wc -l)
FILE_COUNTS[ruby]=$(find "$REPO_PATH" -name "*.rb" 2>/dev/null | wc -l)
FILE_COUNTS[php]=$(find "$REPO_PATH" -name "*.php" 2>/dev/null | wc -l)

# Find dominant language
MAX_COUNT=0
DOMINANT_LANG=""
for lang in "${!FILE_COUNTS[@]}"; do
    count=${FILE_COUNTS[$lang]}
    echo "   $lang: $count files"
    if [ $count -gt $MAX_COUNT ]; then
        MAX_COUNT=$count
        DOMINANT_LANG=$lang
    fi
done

if [ -z "$DOMINANT_LANG" ] || [ $MAX_COUNT -eq 0 ]; then
    echo "❌ Could not detect repository language"
    exit 1
fi

echo ""
echo "✅ Primary language detected: $DOMINANT_LANG ($MAX_COUNT files)"
echo ""

# Map to analyzer image
case $DOMINANT_LANG in
    java)
        ANALYZER_IMAGE="registry.digitalocean.com/codequal/analyzer:lang-java-v5.1"
        ;;
    python)
        ANALYZER_IMAGE="registry.digitalocean.com/codequal/analyzer:lang-python-v4.3"
        ;;
    javascript|typescript)
        ANALYZER_IMAGE="registry.digitalocean.com/codequal/analyzer:lang-javascript-v4.3"
        ;;
    go)
        ANALYZER_IMAGE="registry.digitalocean.com/codequal/analyzer:lang-go-v4.6"
        ;;
    rust)
        ANALYZER_IMAGE="registry.digitalocean.com/codequal/analyzer:rust-v3"
        ;;
    cpp)
        ANALYZER_IMAGE="registry.digitalocean.com/codequal/analyzer:lang-cpp-v4.7"
        ;;
    csharp)
        ANALYZER_IMAGE="registry.digitalocean.com/codequal/analyzer:lang-csharp-v4.6"
        ;;
    ruby)
        ANALYZER_IMAGE="registry.digitalocean.com/codequal/analyzer:lang-ruby-v4.3"
        ;;
    php)
        ANALYZER_IMAGE="registry.digitalocean.com/codequal/analyzer:lang-php-v4.3"
        ;;
    *)
        echo "❌ No analyzer available for $DOMINANT_LANG"
        exit 1
        ;;
esac

echo "🚀 Starting analysis with: $ANALYZER_IMAGE"
echo "   This image contains all 5 tools:"
echo "   - Security scanning"
echo "   - Dependency analysis"
echo "   - Architecture review"
echo "   - Performance analysis"
echo "   - Code quality checks"
echo ""

# You can now use $ANALYZER_IMAGE to run the analysis
echo "To run analysis:"
echo "docker run --rm -v $REPO_PATH:/workspace/repo:ro -v /mnt/workspace/output:/workspace/output $ANALYZER_IMAGE"
DETECT_SCRIPT

remote_copy /tmp/detect-and-analyze.sh /mnt/workspace/detect-and-analyze.sh
remote_exec "chmod +x /mnt/workspace/detect-and-analyze.sh"
echo "✅ Language detection script created"

echo ""
echo "==========================================="
echo "  Setup Complete! Next Steps:"
echo "==========================================="
echo ""
echo "1️⃣  Login to DigitalOcean Registry:"
echo "   ssh -i $SSH_KEY $USER@$INSTANCE_IP"
echo "   docker login registry.digitalocean.com"
echo "   (Enter your email and API token)"
echo ""
echo "2️⃣  Pull the analyzer images:"
echo "   /mnt/workspace/pull-images.sh"
echo ""
echo "3️⃣  Test with a repository:"
echo "   # Clone a test repo"
echo "   git clone https://github.com/redis/redis /mnt/workspace/repos/main"
echo "   "
echo "   # Detect language and get analysis command"
echo "   /mnt/workspace/detect-and-analyze.sh /mnt/workspace/repos/main"
echo "   "
echo "   # Or run specific analyzer directly"
echo "   docker run --rm \\"
echo "     -v /mnt/workspace/repos/main:/workspace/repo:ro \\"
echo "     -v /mnt/workspace/output:/workspace/output \\"
echo "     registry.digitalocean.com/codequal/analyzer:lang-go-v4.6"
echo ""
echo "📝 Key Points:"
echo "   - Each language image contains ALL 5 analysis tools"
echo "   - For multi-language repos, run multiple language analyzers"
echo "   - Results are saved to /mnt/workspace/output/"
echo "   - Redis is used for caching between runs"
echo ""