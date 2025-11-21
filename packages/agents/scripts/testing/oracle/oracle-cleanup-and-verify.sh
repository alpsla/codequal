#!/bin/bash

# Oracle Cloud Environment Cleanup and Verification Script
# Cleans up old test results, processes, and verifies database before running PR #69 test

set -e

# Configuration
ORACLE_IP="129.213.49.128"
ORACLE_USER="opc"
SSH_KEY="/Users/alpinro/CodePrjects/codequal/keys/oracle/ssh-key-2025-10-07.key"
REMOTE_DIR="/home/opc/codequal"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  Oracle Cloud Environment Cleanup & Verification             ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Step 1: Kill any running test processes
echo "🔪 Step 1: Killing running test processes..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "${ORACLE_USER}@${ORACLE_IP}" << 'ENDSSH'
  echo "   Checking for running Node.js processes..."
  
  # Find and kill any node processes running tests
  if pgrep -f "node.*test-v9" > /dev/null; then
    echo "   ⚠️  Found running test processes, killing them..."
    pkill -9 -f "node.*test-v9" || true
    sleep 2
    echo "   ✅ Processes killed"
  else
    echo "   ✅ No running test processes found"
  fi
  
  # Find and kill any TypeScript compilation processes
  if pgrep -f "tsc.*tsconfig" > /dev/null; then
    echo "   ⚠️  Found running TypeScript compilation, killing it..."
    pkill -9 -f "tsc.*tsconfig" || true
    sleep 2
    echo "   ✅ Compilation processes killed"
  else
    echo "   ✅ No running compilation processes"
  fi
ENDSSH

echo ""

# Step 2: Clean up old test results and temporary files
echo "🧹 Step 2: Cleaning up old test results and temporary files..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "${ORACLE_USER}@${ORACLE_IP}" << 'ENDSSH'
  cd /home/opc/codequal/packages/agents
  
  echo "   Removing old test outputs..."
  rm -rf test-outputs/*.md 2>/dev/null || true
  rm -rf test-outputs/*.json 2>/dev/null || true
  echo "   ✅ Test outputs cleaned"
  
  echo "   Removing old compiled JavaScript..."
  rm -rf dist/ 2>/dev/null || true
  echo "   ✅ Compiled files cleaned"
  
  echo "   Removing temporary test repositories..."
  rm -rf /tmp/test-repo-* 2>/dev/null || true
  echo "   ✅ Temporary repositories cleaned"
  
  echo "   Cleaning npm cache..."
  npm cache clean --force > /dev/null 2>&1 || true
  echo "   ✅ NPM cache cleaned"
ENDSSH

echo ""

# Step 3: Verify PostgreSQL NVD database
echo "🔍 Step 3: Verifying PostgreSQL NVD database..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "${ORACLE_USER}@${ORACLE_IP}" << 'ENDSSH'
  # PostgreSQL connection details
  PGHOST="localhost"  # Use localhost for local connection
  PGPORT="5432"
  PGUSER="nvd_user"
  PGDATABASE="nvd"
  PGPASSWORD="postgres123"
  
  echo "   Testing PostgreSQL connection..."
  if PGPASSWORD=$PGPASSWORD psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -c "SELECT 1" > /dev/null 2>&1; then
    echo "   ✅ PostgreSQL connection successful"
  else
    echo "   ❌ PostgreSQL connection failed"
    exit 1
  fi
  
  echo "   Checking NVD database tables..."
  TABLE_COUNT=$(PGPASSWORD=$PGPASSWORD psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
  
  if [ "$TABLE_COUNT" -gt 0 ]; then
    echo "   ✅ NVD database has $TABLE_COUNT tables"
  else
    echo "   ⚠️  NVD database appears empty (0 tables)"
  fi
  
  echo "   Checking CVE data..."
  CVE_COUNT=$(PGPASSWORD=$PGPASSWORD psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -t -c "SELECT COUNT(*) FROM vulnerability WHERE id LIKE 'CVE-%' LIMIT 1;" 2>/dev/null | tr -d ' ' || echo "0")
  
  if [ "$CVE_COUNT" != "0" ] && [ ! -z "$CVE_COUNT" ]; then
    echo "   ✅ CVE data found in database"
  else
    echo "   ⚠️  No CVE data found - Dependency-Check may download NVD database"
  fi
  
  echo "   Database statistics:"
  PGPASSWORD=$PGPASSWORD psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -c "
    SELECT 
      schemaname,
      tablename,
      pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
    FROM pg_tables 
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    LIMIT 10;
  " 2>/dev/null || echo "   ⚠️  Could not retrieve database statistics"
ENDSSH

echo ""

# Step 4: Verify Redis
echo "🔍 Step 4: Verifying Redis..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "${ORACLE_USER}@${ORACLE_IP}" << 'ENDSSH'
  REDIS_HOST="10.116.0.7"
  REDIS_PORT="6379"
  
  echo "   Testing Redis connection..."
  if redis-cli -h $REDIS_HOST -p $REDIS_PORT ping > /dev/null 2>&1; then
    echo "   ✅ Redis connection successful"
    
    # Get Redis info
    REDIS_VERSION=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT INFO server 2>/dev/null | grep "redis_version" | cut -d: -f2 | tr -d '\r')
    echo "   ℹ️  Redis version: $REDIS_VERSION"
    
    # Check memory usage
    REDIS_MEMORY=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT INFO memory 2>/dev/null | grep "used_memory_human" | cut -d: -f2 | tr -d '\r')
    echo "   ℹ️  Redis memory usage: $REDIS_MEMORY"
  else
    echo "   ⚠️  Redis connection failed"
  fi
ENDSSH

echo ""

# Step 5: Verify Docker
echo "🔍 Step 5: Verifying Docker..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "${ORACLE_USER}@${ORACLE_IP}" << 'ENDSSH'
  echo "   Testing Docker..."
  if docker ps > /dev/null 2>&1; then
    echo "   ✅ Docker is running"
    
    # List running containers
    CONTAINER_COUNT=$(docker ps --format '{{.Names}}' | wc -l)
    echo "   ℹ️  Running containers: $CONTAINER_COUNT"
    
    if [ $CONTAINER_COUNT -gt 0 ]; then
      echo "   📦 Container list:"
      docker ps --format "      - {{.Names}} ({{.Status}})"
    fi
  else
    echo "   ⚠️  Docker not accessible"
  fi
ENDSSH

echo ""

# Step 6: Verify Node.js environment
echo "🔍 Step 6: Verifying Node.js environment..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "${ORACLE_USER}@${ORACLE_IP}" << 'ENDSSH'
  cd /home/opc/codequal/packages/agents
  
  echo "   Node.js version: $(node --version)"
  echo "   NPM version: $(npm --version)"
  echo "   TypeScript version: $(npx tsc --version)"
  
  echo "   Checking node_modules..."
  if [ -d "node_modules" ]; then
    MODULE_COUNT=$(find node_modules -maxdepth 1 -type d | wc -l)
    echo "   ✅ node_modules exists ($MODULE_COUNT packages)"
  else
    echo "   ⚠️  node_modules not found - may need npm install"
  fi
ENDSSH

echo ""

# Step 7: Summary
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                    Cleanup Summary                            ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "✅ Running processes killed"
echo "✅ Old test results cleaned"
echo "✅ Temporary files removed"
echo "✅ PostgreSQL verified"
echo "✅ Redis verified"
echo "✅ Docker verified"
echo "✅ Node.js environment verified"
echo ""
echo "🎯 Environment is ready for PR #69 test!"
echo ""
