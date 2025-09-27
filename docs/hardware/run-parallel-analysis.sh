#!/bin/bash

# Run CodeQual analyzers in parallel with CPU pinning
# Optimized for A1.Flex 4 OCPU, 24GB RAM

REPO_PATH="/mnt/workspace/repos/repo"
OUTPUT_BASE="/mnt/workspace/output"
REGISTRY="registry.digitalocean.com/codequal"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}Starting parallel analysis with CPU pinning...${NC}"
echo "Repository: $REPO_PATH"
echo "Output: $OUTPUT_BASE"
echo ""

# Clean up any existing containers
docker rm -f analyzer-java analyzer-security analyzer-python analyzer-js 2>/dev/null

# Start time
START_TIME=$(date +%s)

# Core 0 - Java Analysis
echo -e "${YELLOW}Core 0: Starting Java analyzer...${NC}"
docker run -d --name analyzer-java \
  --cpuset-cpus="0" \
  --memory="5g" \
  -v "$REPO_PATH:/workspace/repo:ro" \
  -v "$OUTPUT_BASE/java:/workspace/output" \
  $REGISTRY/analyzer:lang-java-v5.1 \
  /analyze.sh /workspace/repo /workspace/output

# Core 1 - Security Analysis
echo -e "${YELLOW}Core 1: Starting Security analyzer...${NC}"
docker run -d --name analyzer-security \
  --cpuset-cpus="1" \
  --memory="5g" \
  -v "$REPO_PATH:/workspace/repo:ro" \
  -v "$OUTPUT_BASE/security:/workspace/output" \
  $REGISTRY/analyzer:security-v4.2 \
  /analyze.sh /workspace/repo /workspace/output

# Core 2 - Python Analysis
echo -e "${YELLOW}Core 2: Starting Python analyzer...${NC}"
docker run -d --name analyzer-python \
  --cpuset-cpus="2" \
  --memory="5g" \
  -v "$REPO_PATH:/workspace/repo:ro" \
  -v "$OUTPUT_BASE/python:/workspace/output" \
  $REGISTRY/analyzer:lang-python-v4.3 \
  /analyze.sh /workspace/repo /workspace/output

# Core 3 - JavaScript/TypeScript Analysis
echo -e "${YELLOW}Core 3: Starting JavaScript analyzer...${NC}"
docker run -d --name analyzer-js \
  --cpuset-cpus="3" \
  --memory="5g" \
  -v "$REPO_PATH:/workspace/repo:ro" \
  -v "$OUTPUT_BASE/js:/workspace/output" \
  $REGISTRY/analyzer:lang-javascript-v4.3 \
  /analyze.sh /workspace/repo /workspace/output

echo ""
echo -e "${GREEN}All analyzers started!${NC}"
echo ""

# Monitor progress
echo "Monitoring analyzer performance..."
echo "Press Ctrl+C to stop monitoring (containers will continue running)"
echo ""

# Function to check container status
check_status() {
    RUNNING=$(docker ps --filter "name=analyzer-" --format "{{.Names}}" | wc -l)
    COMPLETED=$(docker ps -a --filter "name=analyzer-" --filter "status=exited" --format "{{.Names}}" | wc -l)

    echo -e "${GREEN}Running: $RUNNING | Completed: $COMPLETED${NC}"

    if [ "$RUNNING" -eq 0 ]; then
        END_TIME=$(date +%s)
        DURATION=$((END_TIME - START_TIME))
        echo ""
        echo -e "${GREEN}=== Analysis Complete ===${NC}"
        echo "Total time: ${DURATION} seconds"
        echo ""
        echo "Results saved in:"
        ls -la $OUTPUT_BASE/
        return 0
    fi
    return 1
}

# Monitor loop
while true; do
    clear
    echo "=== CodeQual Parallel Analysis Status ==="
    echo ""

    # Show container stats
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.PIDs}}" \
        analyzer-java analyzer-security analyzer-python analyzer-js 2>/dev/null || true

    echo ""

    # Check if all completed
    if check_status; then
        break
    fi

    sleep 5
done

# Collect results
echo "Collecting analysis results..."
find $OUTPUT_BASE -name "*.json" -o -name "*.xml" -o -name "*.sarif" | head -20

echo ""
echo -e "${GREEN}Analysis pipeline complete!${NC}"