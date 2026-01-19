#!/bin/bash

# Pull Analyzer Images from DigitalOcean Container Registry
# These are the actual images available in the registry as of Sep 27, 2025

echo "==========================================
Pulling CodeQual V9 Analyzer Images
=========================================="

# Connect to Oracle instance
SSH_KEY="./keys/oracle/ssh-key-2025-05-08.key"
INSTANCE_IP="129.213.49.128"
USER="opc"

echo "📦 Available images in registry (from your screenshot):"
echo "  - lang-java-v5.1 (523.1 MB)"
echo "  - rust-v3 (364.1 MB)" 
echo "  - lang-cpp-v4.7 (410.87 MB)"
echo "  - lang-typescript-v4.6 (376.98 MB)"
echo "  - lang-perl-v4.6 (234.05 MB)"
echo "  - lang-csharp-v4.6 (362.27 MB)"
echo "  - lang-go-v4.6 (517.88 MB)"
echo "  - lang-javascript-v4.3 (453.4 MB)"
echo "  - lang-python-v4.3 (302.37 MB)"
echo "  - lang-php-v4.3 (230.18 MB)"
echo "  - lang-ruby-v4.3 (238.24 MB)"
echo ""

echo "🔐 First, ensure you're logged in to the registry on the Oracle instance:"
echo "ssh -i $SSH_KEY $USER@$INSTANCE_IP"
echo "docker login registry.digitalocean.com"
echo ""

echo "📥 Then run these commands to pull the main analyzer images:"
echo ""

# Primary language analyzers (most commonly used)
cat << 'EOF'
# Pull primary language analyzers
docker pull iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-java-v5.1
docker pull iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-python-v4.3
docker pull iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-javascript-v4.3
docker pull iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-typescript-v4.6
docker pull iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-go-v4.6

# Pull additional language analyzers if needed
docker pull iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:rust-v3
docker pull iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-cpp-v4.7
docker pull iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-csharp-v4.6
docker pull iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-php-v4.3
docker pull iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-ruby-v4.3

# Verify images were pulled
docker images | grep codequal
EOF

echo ""
echo "💡 Note: Based on the V9 architecture, these language-specific analyzers"
echo "   will be used by the 5 V9 agents (Security, Dependency, Architecture,"
echo "   Performance, Quality) to analyze code in different languages."
echo ""
echo "🚀 To pull all images in one go on the Oracle instance, save this as a script:"

cat << 'SCRIPT'

#!/bin/bash
# Save this as /mnt/workspace/pull-images.sh on the Oracle instance

IMAGES=(
  "iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-java-v5.1"
  "iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-python-v4.3"
  "iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-javascript-v4.3"
  "iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-typescript-v4.6"
  "iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-go-v4.6"
  "iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:rust-v3"
  "iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-cpp-v4.7"
  "iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-csharp-v4.6"
  "iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-php-v4.3"
  "iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-ruby-v4.3"
)

echo "Pulling ${#IMAGES[@]} analyzer images..."

for image in "${IMAGES[@]}"; do
  echo "Pulling: $image"
  docker pull "$image"
  if [ $? -eq 0 ]; then
    echo "✓ Successfully pulled $image"
  else
    echo "✗ Failed to pull $image"
  fi
  echo "---"
done

echo "Done! Checking pulled images:"
docker images | grep codequal

SCRIPT