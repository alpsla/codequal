#!/bin/bash

# Oracle Cloud TypeScript V9 Test Runner for PR #69
# Runs test-v9-typescript-lite-e2e.ts on Oracle Cloud

set -e

# Configuration
ORACLE_IP="129.213.49.128"
ORACLE_USER="opc"
SSH_KEY="/Users/alpinro/CodePrjects/codequal/keys/oracle/ssh-key-2025-10-07.key"
REMOTE_DIR="/home/opc/codequal/packages/agents"

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  TypeScript V9 Test - Oracle Cloud Execution (PR #69)        ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "Oracle Cloud: $ORACLE_IP"
echo "Remote Directory: $REMOTE_DIR"
echo ""

# Files to upload
FILES_TO_UPLOAD=(
  ".env"
  "package.json"
  "tsconfig.json"
)

# Step 1: Upload test files
echo "📤 Step 1: Uploading test files to Oracle Cloud..."
echo ""

for file in "${FILES_TO_UPLOAD[@]}"; do
  echo "   Uploading $file..."
  scp -i "$SSH_KEY" -o StrictHostKeyChecking=no \
    "packages/agents/$file" \
    "${ORACLE_USER}@${ORACLE_IP}:${REMOTE_DIR}/" 2>&1 | grep -v "Permanently added" || true
done

# Upload test file to correct directory structure
echo "   Uploading test-v9-typescript-lite-e2e.ts to tests/integration/..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "${ORACLE_USER}@${ORACLE_IP}" \
  "mkdir -p ${REMOTE_DIR}/tests/integration" 2>&1 | grep -v "Permanently added" || true

scp -i "$SSH_KEY" -o StrictHostKeyChecking=no \
  packages/agents/tests/integration/test-v9-typescript-lite-e2e.ts \
  "${ORACLE_USER}@${ORACLE_IP}:${REMOTE_DIR}/tests/integration/" 2>&1 | grep -v "Permanently added" || true

# Upload entire src directory (critical for test to run)
echo "   Uploading src/ directory..."
rsync -avz --update -e "ssh -i \"$SSH_KEY\" -o StrictHostKeyChecking=no" \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'dist' \
  packages/agents/src/ \
  "${ORACLE_USER}@${ORACLE_IP}:${REMOTE_DIR}/src/" 2>&1 | grep -v "sending incremental" || true

echo ""
echo "✅ Upload complete"
echo ""

# Step 2: Run test on Oracle Cloud
echo "🚀 Step 2: Running TypeScript V9 Test on Oracle Cloud..."
echo ""

ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "${ORACLE_USER}@${ORACLE_IP}" << 'ENDSSH'
  set -e

  cd /home/opc/codequal/packages/agents

  echo "📋 Environment check:"
  echo "   Node version: $(node --version)"
  echo "   NPM version: $(npm --version)"
  echo "   TypeScript: $(npx tsc --version)"
  echo ""

  echo "🔧 Checking Oracle infrastructure..."

  # Check PostgreSQL
  if PGPASSWORD=postgres123 psql -h 129.213.49.128 -p 5432 -U nvd_user -d nvd -c "SELECT 1" > /dev/null 2>&1; then
    echo "   ✅ PostgreSQL connected (nvd database)"
  else
    echo "   ⚠️  PostgreSQL not accessible"
  fi

  # Check Redis
  if redis-cli -h 10.116.0.7 -p 6379 ping > /dev/null 2>&1; then
    echo "   ✅ Redis connected"
  else
    echo "   ⚠️  Redis not accessible"
  fi

  # Check Docker
  if docker ps > /dev/null 2>&1; then
    echo "   ✅ Docker running"
  else
    echo "   ⚠️  Docker not accessible"
  fi

  echo ""
  echo "🧪 Starting TypeScript V9 Test for PR #69..."
  echo "   Expected runtime: 5-10 minutes"
  echo "   Timeout: 30 minutes"
  echo ""

  # Export database credentials for test to use
  export POSTGRES_HOST="129.213.49.128"
  export POSTGRES_PORT="5432"
  export POSTGRES_USER="nvd_user"
  export POSTGRES_DB="nvd"
  export POSTGRES_PASSWORD="postgres123"
  export DATABASE_URL="postgresql://nvd_user:postgres123@129.213.49.128:5432/nvd"
  
  export REDIS_HOST="10.116.0.7"
  export REDIS_PORT="6379"
  export REDIS_URL="redis://10.116.0.7:6379"
  
  echo "   ✅ Database environment variables configured"
  echo ""

  # Compile TypeScript first to avoid ESM/CommonJS loader conflicts
  echo "   🔨 Compiling TypeScript..."
  
  # Compile src directory
  npx tsc --project tsconfig.json --outDir ./dist 2>&1
  
  SRC_COMPILE_EXIT=$?
  if [ $SRC_COMPILE_EXIT -ne 0 ]; then
    echo ""
    echo "❌ Source TypeScript compilation failed with exit code: $SRC_COMPILE_EXIT"
    exit $SRC_COMPILE_EXIT
  fi
  
  # Compile test file separately (tsconfig excludes tests/)
  echo "   🔨 Compiling test file..."
  npx tsc tests/integration/test-v9-typescript-lite-e2e.ts \
    --outDir ./dist \
    --module commonjs \
    --target ES2020 \
    --esModuleInterop \
    --skipLibCheck \
    --resolveJsonModule \
    --moduleResolution node 2>&1
  
  TEST_COMPILE_EXIT=$?
  if [ $TEST_COMPILE_EXIT -ne 0 ]; then
    echo ""
    echo "❌ Test TypeScript compilation failed with exit code: $TEST_COMPILE_EXIT"
    exit $TEST_COMPILE_EXIT
  fi
  
  # Verify compiled file exists
  if [ ! -f "./dist/tests/integration/test-v9-typescript-lite-e2e.js" ]; then
    echo ""
    echo "❌ Compiled test file not found: ./dist/tests/integration/test-v9-typescript-lite-e2e.js"
    echo "   Checking dist directory structure..."
    find ./dist -name "*.js" -type f | head -20
    exit 1
  fi
  
  echo "   ✅ TypeScript compilation successful"
  echo ""
  
  echo "   🚀 Running compiled test..."
  timeout 1800 node ./dist/tests/integration/test-v9-typescript-lite-e2e.js 2>&1 || {
    EXIT_CODE=$?
    if [ $EXIT_CODE -eq 124 ]; then
      echo ""
      echo "❌ Test timed out after 30 minutes"
      exit 1
    else
      echo ""
      echo "❌ Test failed with exit code: $EXIT_CODE"
      exit $EXIT_CODE
    fi
  }

  echo ""
  echo "✅ Test completed successfully!"
  echo ""

  # List generated reports
  echo "📄 TypeScript V9 Reports Generated:"
  find test-outputs -name "v9-typescript-lite-*.md" -type f -exec ls -lh {} \; 2>/dev/null || echo "   No reports found"

ENDSSH

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo ""
  echo "════════════════════════════════════════════════════════════════"
  echo "✅ Oracle Cloud TypeScript V9 Test - SUCCESS"
  echo ""
  echo "📥 Downloading reports from Oracle Cloud..."
  
  # Download all TypeScript V9 reports
  scp -i "$SSH_KEY" -o StrictHostKeyChecking=no \
    "${ORACLE_USER}@${ORACLE_IP}:${REMOTE_DIR}/test-outputs/v9-typescript-lite-*.md" \
    /tmp/v9-typescript-reports/ 2>&1 | grep -v "Permanently added" || {
      echo "   ⚠️  No reports to download or download failed"
    }
  
  if [ -d "/tmp/v9-typescript-reports" ]; then
    echo "   ✅ Reports downloaded to /tmp/v9-typescript-reports/"
  fi
  echo "════════════════════════════════════════════════════════════════"
else
  echo ""
  echo "════════════════════════════════════════════════════════════════"
  echo "❌ Oracle Cloud TypeScript V9 Test - FAILED"
  echo "════════════════════════════════════════════════════════════════"
fi

exit $EXIT_CODE
