#!/bin/bash

# Oracle Container Registry details
OCIR_REGISTRY="iad.ocir.io/idzaw9ddo1h5/codequal-analyzers"
DO_REGISTRY="registry.digitalocean.com/codequal-registry"

# ARM analyzer images (optimal for Oracle ARM instances)
ARM_ANALYZERS=(
    "analyzer:lang-java-v5.1-arm"
    "analyzer:lang-python-v4.3-arm"
    "analyzer:lang-javascript-v4.2-arm"
    "analyzer:lang-typescript-v4.2-arm"
    "analyzer:lang-go-v3.8-arm"
    "analyzer:lang-ruby-v3.5-arm"
    "analyzer:lang-php-v3.4-arm"
    "analyzer:lang-csharp-v3.2-arm"
)

# x86 analyzer images (fallback - will run under emulation)
X86_ANALYZERS=(
    "analyzer:lang-cpp-v4.7"
    "analyzer:lang-perl-v4.6"
    "analyzer:rust-v8"
)

echo "🚀 Starting COMPLETE migration from DigitalOcean to Oracle Container Registry..."
echo "Source: $DO_REGISTRY"
echo "Target: $OCIR_REGISTRY"
echo ""
echo "📋 Migration Plan:"
echo "  • 8 ARM images (native performance)"
echo "  • 3 x86 images (emulated, but functional)"
echo "  • Total: 11 analyzer images"
echo ""

# Function to migrate a single image
migrate_image() {
    local image_tag=$1
    local architecture=$2
    local source_image="$DO_REGISTRY/$image_tag"
    local target_image="$OCIR_REGISTRY/$image_tag"
    
    echo "📦 Migrating $image_tag ($architecture)..."
    
    # Pull from DigitalOcean
    echo "  ⬇️  Pulling from DigitalOcean..."
    if docker pull "$source_image"; then
        echo "  ✅ Pull successful"
    else
        echo "  ❌ Pull failed - skipping $image_tag"
        return 1
    fi
    
    # Tag for OCIR
    echo "  🏷️  Tagging for OCIR..."
    docker tag "$source_image" "$target_image"
    
    # Push to OCIR
    echo "  ⬆️  Pushing to OCIR..."
    if docker push "$target_image"; then
        echo "  ✅ Push successful"
    else
        echo "  ❌ Push failed for $image_tag"
        return 1
    fi
    
    echo "  ✅ Migration complete for $image_tag"
    echo ""
}

# Migrate ARM analyzer images first (priority)
echo "🔧 Phase 1: Migrating ARM analyzers (optimal performance)..."
arm_success=0
arm_failed=0

for analyzer in "${ARM_ANALYZERS[@]}"; do
    if migrate_image "$analyzer" "ARM64"; then
        ((arm_success++))
    else
        ((arm_failed++))
    fi
done

echo "📊 ARM Migration Results: ✅ $arm_success successful, ❌ $arm_failed failed"
echo ""

# Migrate x86 analyzer images (fallback)
echo "🔧 Phase 2: Migrating x86 analyzers (emulated fallback)..."
x86_success=0
x86_failed=0

for analyzer in "${X86_ANALYZERS[@]}"; do
    if migrate_image "$analyzer" "x86_64"; then
        ((x86_success++))
    else
        ((x86_failed++))
    fi
done

echo "📊 x86 Migration Results: ✅ $x86_success successful, ❌ $x86_failed failed"
echo ""

# Final summary
total_success=$((arm_success + x86_success))
total_failed=$((arm_failed + x86_failed))
total_images=$((total_success + total_failed))

echo "🎯 FINAL MIGRATION SUMMARY:"
echo "  ✅ ARM analyzers: $arm_success/8"
echo "  ✅ x86 analyzers: $x86_success/3"
echo "  ✅ Total successful: $total_success/$total_images"
echo "  ❌ Total failed: $total_failed"

if [ $total_failed -eq 0 ]; then
    echo ""
    echo "🎉 MIGRATION COMPLETE! All analyzer images successfully moved to OCIR!"
    echo ""
    echo "💰 COST SAVINGS ACHIEVED:"
    echo "  • DigitalOcean registry: Can be deleted"
    echo "  • Oracle Container Registry: Free tier (up to 500 GB)"
    echo ""
    echo "🔧 NEXT STEPS:"
    echo "1. Update CodeQual configuration:"
    echo "   ANALYZER_REGISTRY=$OCIR_REGISTRY"
    echo ""
    echo "2. Test with Oracle ARM instance:"
    echo "   npx ts-node test-oracle-arm-analyzer.ts"
    echo ""
    echo "3. If test successful, delete DigitalOcean registry"
else
    echo ""
    echo "⚠️  Some migrations failed. Please check the output above."
    echo "You may need to retry failed images or investigate authentication."
fi

echo ""
echo "🔍 Verifying migrated images in OCIR:"
echo "Repository: $OCIR_REGISTRY"
docker images --filter=reference="$OCIR_REGISTRY/*" --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}"

echo ""
echo "📋 Architecture breakdown:"
echo "  🚀 ARM (native on Oracle): Java, Python, JS, TS, Go, Ruby, PHP, C#"
echo "  🔄 x86 (emulated): C++, Perl, Rust"