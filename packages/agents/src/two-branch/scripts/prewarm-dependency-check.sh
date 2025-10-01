#!/bin/bash
#
# Daily Dependency-Check CVE Database Pre-warming
#
# Purpose: Update CVE database before users start analyzing repositories
# Schedule: Run at 2 AM daily via cron
# Duration: ~5 minutes
#
# Cron entry:
# 0 2 * * * /path/to/prewarm-dependency-check.sh >> /var/log/depcheck-prewarm.log 2>&1

set -e

echo "=========================================="
echo "Dependency-Check CVE Database Pre-warming"
echo "Started: $(date)"
echo "=========================================="

# Configuration
DATA_DIR="/var/lib/dependency-check-data"
DOCKER_IMAGE="analyzer:lang-java-v5.3"
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)

# Ensure data directory exists
mkdir -p "$DATA_DIR"

echo "[1/3] Checking Dependency-Check data directory..."
echo "   Data dir: $DATA_DIR"
du -sh "$DATA_DIR" 2>/dev/null || echo "   Empty (first run)"

# Run Dependency-Check update only (no scanning)
echo ""
echo "[2/3] Updating CVE database from NVD..."
echo "   This will take ~5 minutes on first run of the day"

START_TIME=$(date +%s)

docker run --rm \
  -v "$DATA_DIR:/usr/share/dependency-check/data:rw" \
  "$DOCKER_IMAGE" \
  dependency-check \
    --updateonly \
    --nvdApiKey "${NVD_API_KEY:-}" \
    --data /usr/share/dependency-check/data

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "[3/3] Update complete!"
echo "   Duration: ${DURATION}s"
echo "   Data size: $(du -sh $DATA_DIR | cut -f1)"
echo "   Timestamp: $TIMESTAMP"

# Log to tracking file
echo "$TIMESTAMP,$DURATION" >> "$DATA_DIR/update-history.csv"

echo ""
echo "=========================================="
echo "Pre-warming Complete: $(date)"
echo "User analyses today will be fast (<30s)"
echo "=========================================="
