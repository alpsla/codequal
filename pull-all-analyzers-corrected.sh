#!/bin/bash

# Pull ALL CodeQual Analyzer Images
# CORRECTED with proper registry name: codequal-registry

echo "=========================================="
echo "  Pulling CodeQual V9 Analyzer Images"
echo "=========================================="
echo ""
echo "Registry: registry.digitalocean.com/codequal-registry"
echo ""

# Language-based analyzer images with CORRECT registry path
IMAGES=(
  "registry.digitalocean.com/codequal-registry/analyzer:lang-java-v5.1"
  "registry.digitalocean.com/codequal-registry/analyzer:lang-python-v4.3"
  "registry.digitalocean.com/codequal-registry/analyzer:lang-javascript-v4.3"
  "registry.digitalocean.com/codequal-registry/analyzer:lang-typescript-v4.6"
  "registry.digitalocean.com/codequal-registry/analyzer:lang-go-v4.6"
  "registry.digitalocean.com/codequal-registry/analyzer:rust-v8"
  "registry.digitalocean.com/codequal-registry/analyzer:lang-cpp-v4.7"
  "registry.digitalocean.com/codequal-registry/analyzer:lang-csharp-v4.6"
  "registry.digitalocean.com/codequal-registry/analyzer:lang-php-v4.3"
  "registry.digitalocean.com/codequal-registry/analyzer:lang-perl-v4.6"
)

echo "📦 Pulling ${#IMAGES[@]} analyzer images..."
echo ""

SUCCESS_COUNT=0
FAILED_COUNT=0
SKIPPED_COUNT=0

for image in "${IMAGES[@]}"; do
  IMAGE_NAME=$(echo $image | cut -d: -f2)
  
  # Check if image already exists
  if docker images | grep -q "$IMAGE_NAME"; then
    echo "⏭️  Skipping $IMAGE_NAME (already exists)"
    ((SKIPPED_COUNT++))
  else
    echo "🔄 Pulling: $IMAGE_NAME"
    
    if docker pull "$image"; then
      echo "✅ Successfully pulled $IMAGE_NAME"
      ((SUCCESS_COUNT++))
    else
      echo "❌ Failed to pull $IMAGE_NAME"
      ((FAILED_COUNT++))
    fi
  fi
  echo ""
done

echo "=========================================="
echo "Summary:"
echo "  ✅ Pulled: $SUCCESS_COUNT"
echo "  ⏭️  Skipped: $SKIPPED_COUNT"  
echo "  ❌ Failed: $FAILED_COUNT"
echo "=========================================="
echo ""

echo "📊 Current analyzer images:"
docker images | grep -E "(REPOSITORY|codequal-registry)" | head -20