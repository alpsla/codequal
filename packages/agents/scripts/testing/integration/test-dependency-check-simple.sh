#!/bin/bash

# Simple Dependency-Check Test Script
# Tests Dependency-Check with NVD API key on Spring PetClinic

set -e

NVD_API_KEY="1daf9d02-c365-499f-a834-ca9c1d3ae3c5"
ORACLE_KEY="/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-05-08.key"
ORACLE_HOST="opc@129.213.49.128"

echo "=== Dependency-Check Test (Spring PetClinic) ==="
echo ""
echo "Step 1: Running Dependency-Check scan..."
echo "Note: First run will download ~3GB CVE database (takes 10-15 minutes)"
echo ""

# Run Dependency-Check on Spring PetClinic
ssh -i "$ORACLE_KEY" "$ORACLE_HOST" << 'ENDSSH'
cd /tmp/petclinic

# Create results directory
mkdir -p dependency-check-results

# Run Dependency-Check with NVD API key
docker run --rm \
  -v /tmp/petclinic:/workspace:ro \
  -v /tmp/dependency-check-data:/data \
  -e NVD_API_KEY=1daf9d02-c365-499f-a834-ca9c1d3ae3c5 \
  --entrypoint=/bin/bash \
  registry.digitalocean.com/codequal-registry/analyzer:lang-java-v5.1-arm \
  -c "dependency-check \
    --project PetClinic \
    --scan /workspace \
    --format JSON \
    --format HTML \
    --out /workspace/dependency-check-results \
    --nvdApiKey $NVD_API_KEY \
    --data /data \
    --failOnCVSS 0 \
    2>&1 | tee /workspace/dependency-check.log"

echo ""
echo "=== Scan Complete ==="
echo ""
echo "Results:"
ls -lh /tmp/petclinic/dependency-check-results/
echo ""

# Show summary from JSON (if jq is available)
if command -v jq &> /dev/null; then
  echo "Vulnerability Summary:"
  jq '.dependencies[] | select(.vulnerabilities) | {fileName, vulnerabilityCount: (.vulnerabilities | length)}' \
    /tmp/petclinic/dependency-check-results/dependency-check-report.json 2>/dev/null || echo "No vulnerabilities found or jq parse error"
else
  echo "Install jq to see JSON summary"
fi

ENDSSH

echo ""
echo "=== Test Complete ==="
echo ""
echo "To view HTML report:"
echo "  scp -i '$ORACLE_KEY' '$ORACLE_HOST:/tmp/petclinic/dependency-check-results/dependency-check-report.html' ."
echo "  open dependency-check-report.html"
