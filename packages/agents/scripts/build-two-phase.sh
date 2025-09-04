#!/bin/bash

# CodeQual Two-Phase Build Script
# Builds images for both development (85 tools) and production (50 tools)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🚀 CodeQual Two-Phase Build System"
echo "===================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Function to build image
build_image() {
    local dockerfile=$1
    local tag=$2
    local context=${3:-$PROJECT_ROOT}
    
    echo -e "${YELLOW}Building $tag...${NC}"
    
    if docker build -f "$dockerfile" -t "$tag" "$context"; then
        echo -e "${GREEN}✅ Successfully built $tag${NC}"
        return 0
    else
        echo -e "${RED}❌ Failed to build $tag${NC}"
        return 1
    fi
}

# Function to check available memory
check_memory() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        TOTAL_MEM=$(( $(sysctl -n hw.memsize) / 1024 / 1024 / 1024 ))
    else
        # Linux
        TOTAL_MEM=$(( $(grep MemTotal /proc/meminfo | awk '{print $2}') / 1024 / 1024 ))
    fi
    
    echo "System memory: ${TOTAL_MEM}GB"
    
    if [ $TOTAL_MEM -lt 8 ]; then
        echo -e "${YELLOW}⚠️  Warning: Less than 8GB RAM available. Build may be slow.${NC}"
    fi
}

# Parse command line arguments
BUILD_MODE=${1:-both}  # dev, prod, or both
LANGUAGES=${2:-core}   # core, all, or specific language

echo "Build Configuration:"
echo "  Mode: $BUILD_MODE"
echo "  Languages: $LANGUAGES"
echo ""

check_memory
echo ""

# Change to project root
cd "$PROJECT_ROOT"

# ============================================
# PHASE 1: Development Images (85 tools)
# ============================================
if [[ "$BUILD_MODE" == "dev" ]] || [[ "$BUILD_MODE" == "both" ]]; then
    echo "📦 PHASE 1: Building Development Images (85 tools)"
    echo "=================================================="
    
    if [[ "$LANGUAGES" == "all" ]] || [[ "$LANGUAGES" == "core" ]]; then
        # Build Tier 1 languages first (most used)
        build_image "docker/Dockerfile.python-ml" "codequal/python:dev"
        build_image "docker/Dockerfile.javascript-node" "codequal/javascript:dev"
        build_image "docker/Dockerfile.java-enterprise" "codequal/java:dev"
    fi
    
    if [[ "$LANGUAGES" == "all" ]]; then
        # Build Tier 2 languages
        if [ -f "docker/Dockerfile.rust" ]; then
            build_image "docker/Dockerfile.rust" "codequal/rust:dev"
        else
            echo -e "${YELLOW}Skipping Rust (Dockerfile not found)${NC}"
        fi
        
        if [ -f "docker/Dockerfile.go" ]; then
            build_image "docker/Dockerfile.go" "codequal/go:dev"
        else
            echo -e "${YELLOW}Skipping Go (Dockerfile not found)${NC}"
        fi
        
        # Build Tier 3 languages
        if [ -f "docker/Dockerfile.ruby" ]; then
            build_image "docker/Dockerfile.ruby" "codequal/ruby:dev"
        else
            echo -e "${YELLOW}Skipping Ruby (Dockerfile not found)${NC}"
        fi
        
        if [ -f "docker/Dockerfile.php" ]; then
            build_image "docker/Dockerfile.php" "codequal/php:dev"
        else
            echo -e "${YELLOW}Skipping PHP (Dockerfile not found)${NC}"
        fi
        
        if [ -f "docker/Dockerfile.cpp" ]; then
            build_image "docker/Dockerfile.cpp" "codequal/cpp:dev"
        else
            echo -e "${YELLOW}Skipping C++ (Dockerfile not found)${NC}"
        fi
    fi
    
    echo ""
    echo -e "${GREEN}✅ Phase 1 build complete${NC}"
    echo ""
fi

# ============================================
# PHASE 2: Production Images (50 tools)
# ============================================
if [[ "$BUILD_MODE" == "prod" ]] || [[ "$BUILD_MODE" == "both" ]]; then
    echo "📦 PHASE 2: Building Production Images (50 tools)"
    echo "================================================="
    
    # Build core production image (25 tools)
    build_image "docker/Dockerfile.production-core" "codequal/production:core"
    
    # Build extended production image (25 tools) if exists
    if [ -f "docker/Dockerfile.production-extended" ]; then
        build_image "docker/Dockerfile.production-extended" "codequal/production:extended"
    else
        echo -e "${YELLOW}Extended production image not yet created${NC}"
    fi
    
    echo ""
    echo -e "${GREEN}✅ Phase 2 build complete${NC}"
    echo ""
fi

# ============================================
# Summary
# ============================================
echo "📊 Build Summary"
echo "================"

echo "Development images:"
docker images | grep "codequal.*dev" || echo "  None built"

echo ""
echo "Production images:"
docker images | grep "codequal.*production" || echo "  None built"

echo ""
echo "🎯 Next Steps:"
echo "-------------"

if [[ "$BUILD_MODE" == "dev" ]] || [[ "$BUILD_MODE" == "both" ]]; then
    echo "1. Start development environment:"
    echo "   docker-compose -f docker-compose.full.yml up -d"
    echo ""
fi

if [[ "$BUILD_MODE" == "prod" ]] || [[ "$BUILD_MODE" == "both" ]]; then
    echo "2. Push production images to registry:"
    echo "   docker tag codequal/production:core <your-registry>/codequal/production:core"
    echo "   docker push <your-registry>/codequal/production:core"
    echo ""
    echo "3. Deploy to Kubernetes:"
    echo "   kubectl apply -f k8s/production-pods.yaml"
    echo ""
fi

echo "4. Test the system:"
echo "   npm run test:two-phase"
echo ""

# ============================================
# Optional: Run quick verification
# ============================================
read -p "Run quick verification test? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Running verification..."
    
    # Test Python dev image if built
    if docker images | grep -q "codequal/python.*dev"; then
        echo "Testing Python image..."
        docker run --rm codequal/python:dev python3.11 -c "import bandit, pylint; print('✅ Python tools OK')"
    fi
    
    # Test production core if built
    if docker images | grep -q "codequal/production.*core"; then
        echo "Testing Production Core image..."
        docker run --rm codequal/production:core /tools/health.sh
    fi
    
    echo -e "${GREEN}✅ Verification complete${NC}"
fi

echo ""
echo "🎉 Build process complete!"