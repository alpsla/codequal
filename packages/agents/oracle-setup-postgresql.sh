#!/bin/bash
#
# Oracle Cloud - PostgreSQL Setup for Dependency-Check
#

set -e

SSH_KEY="/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key"
ORACLE_IP="129.213.49.128"
ORACLE_USER="opc"

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  Oracle Cloud - PostgreSQL Setup                             ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Step 1: Start PostgreSQL container on Oracle
echo "Step 1: Starting PostgreSQL container on Oracle Cloud..."
ssh -i "$SSH_KEY" "${ORACLE_USER}@${ORACLE_IP}" << 'ENDSSH'
  # Stop and remove existing PostgreSQL container if any
  docker stop depcheck-postgres 2>/dev/null || true
  docker rm depcheck-postgres 2>/dev/null || true

  # Start PostgreSQL 14 container
  docker run -d \
    --name depcheck-postgres \
    --restart unless-stopped \
    -e POSTGRES_DB=nvd \
    -e POSTGRES_USER=nvd_user \
    -e POSTGRES_PASSWORD=nvd_password \
    -p 5432:5432 \
    postgres:14-alpine

  echo "✅ PostgreSQL container started"

  # Wait for PostgreSQL to be ready
  echo "⏳ Waiting for PostgreSQL to be ready..."
  sleep 5

  # Verify it's running
  docker ps | grep depcheck-postgres
ENDSSH

echo "✅ PostgreSQL running on Oracle Cloud"
echo ""

# Step 2: Update .env file on Oracle
echo "Step 2: Updating .env file with PostgreSQL configuration..."
ssh -i "$SSH_KEY" "${ORACLE_USER}@${ORACLE_IP}" << 'ENDSSH'
  cd /home/opc/codequal/packages/agents

  # Backup existing .env
  cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

  # Add or update Dependency-Check PostgreSQL configuration
  if grep -q "ORACLE_DEPCHECK_DB_URL" .env; then
    # Update existing
    sed -i 's|ORACLE_DEPCHECK_DB_URL=.*|ORACLE_DEPCHECK_DB_URL=jdbc:postgresql://localhost:5432/nvd|' .env
  else
    # Add new
    echo "" >> .env
    echo "# Dependency-Check PostgreSQL Database (Oracle Cloud)" >> .env
    echo "ORACLE_DEPCHECK_DB_URL=jdbc:postgresql://localhost:5432/nvd" >> .env
    echo "ORACLE_DEPCHECK_DB_USER=nvd_user" >> .env
    echo "ORACLE_DEPCHECK_DB_PASSWORD=nvd_password" >> .env
  fi

  echo "✅ .env file updated"

  # Show configuration
  echo ""
  echo "PostgreSQL Configuration:"
  grep "ORACLE_DEPCHECK" .env
ENDSSH

echo ""
echo "✅ PostgreSQL setup complete!"
echo ""

# Step 3: Test PostgreSQL connection
echo "Step 3: Testing PostgreSQL connection..."
ssh -i "$SSH_KEY" "${ORACLE_USER}@${ORACLE_IP}" << 'ENDSSH'
  # Test connection
  docker exec depcheck-postgres psql -U nvd_user -d nvd -c "SELECT version();" || {
    echo "❌ PostgreSQL connection test failed"
    exit 1
  }

  echo "✅ PostgreSQL connection test successful"
ENDSSH

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  Setup Complete                                              ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo "  PostgreSQL: Running on Oracle Cloud (port 5432)"
echo "  Database: nvd"
echo "  User: nvd_user"
echo "  Connection: jdbc:postgresql://localhost:5432/nvd"
echo ""
echo "Next: Run V9 E2E test with:"
echo "  ./oracle-run-v9-e2e-complete.sh"
echo ""
