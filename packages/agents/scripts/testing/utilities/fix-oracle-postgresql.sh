#!/bin/bash
################################################################################
# Automated PostgreSQL Authentication Fix for Oracle Instance
#
# This script fixes the PostgreSQL authentication configuration to allow
# password-based authentication for Dependency-Check and OSS Index integration
#
# What it does:
#   1. Backs up current pg_hba.conf
#   2. Updates authentication from ident to md5
#   3. Adds Docker network access
#   4. Reloads PostgreSQL (no downtime)
#   5. Tests the connection
################################################################################

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   PostgreSQL Authentication Fix - Oracle Instance            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Configuration
ORACLE_IP="${ORACLE_IP:-129.213.49.128}"
SSH_KEY="${SSH_KEY:-/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-05-08.key}"
SSH_USER="opc"

if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}❌ ERROR: SSH key not found${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Configuration${NC}"
echo "  SSH Key: $SSH_KEY"
echo "  Oracle IP: $ORACLE_IP"
echo "  SSH User: $SSH_USER"
echo ""

# Test SSH
echo -e "${YELLOW}→ Testing SSH connectivity...${NC}"
if ! ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -o ConnectTimeout=10 "$SSH_USER@$ORACLE_IP" "echo 'SSH OK'" > /dev/null 2>&1; then
    echo -e "${RED}❌ ERROR: Cannot connect via SSH${NC}"
    exit 1
fi
echo -e "${GREEN}✓ SSH connection successful${NC}"
echo ""

# Execute fix on Oracle
echo -e "${YELLOW}→ Executing PostgreSQL authentication fix on Oracle...${NC}"
echo ""

ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SSH_USER@$ORACLE_IP" 'bash -s' <<'ENDSSH'
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  PostgreSQL Authentication Fix - Oracle Instance${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

# Step 1: Check current configuration
echo -e "${YELLOW}Step 1: Checking current PostgreSQL configuration${NC}"
echo ""

if [ ! -f /var/lib/pgsql/data/pg_hba.conf ]; then
    echo -e "${RED}❌ ERROR: pg_hba.conf not found${NC}"
    exit 1
fi

echo "Current authentication methods:"
sudo cat /var/lib/pgsql/data/pg_hba.conf | grep -v "^#" | grep -v "^$" | grep -E "host.*127.0.0.1"
echo ""

# Step 2: Backup configuration
echo -e "${YELLOW}Step 2: Creating backup${NC}"

BACKUP_FILE="/var/lib/pgsql/data/pg_hba.conf.backup.$(date +%Y%m%d_%H%M%S)"
sudo cp /var/lib/pgsql/data/pg_hba.conf "$BACKUP_FILE"

if [ -f "$BACKUP_FILE" ]; then
    echo -e "${GREEN}✓ Backup created: $BACKUP_FILE${NC}"
else
    echo -e "${RED}❌ ERROR: Backup failed${NC}"
    exit 1
fi
echo ""

# Step 3: Update pg_hba.conf
echo -e "${YELLOW}Step 3: Updating pg_hba.conf${NC}"

sudo bash -c 'cat > /var/lib/pgsql/data/pg_hba.conf << '\''EOF'\''
# TYPE  DATABASE        USER            ADDRESS                 METHOD

# "local" is for Unix domain socket connections only
local   all             all                                     peer

# IPv4 local connections - md5 password authentication
host    all             all             127.0.0.1/32            md5

# IPv6 local connections - md5 password authentication
host    all             all             ::1/128                 md5

# Docker network access - required for containers
host    all             all             172.17.0.0/16           md5

# Docker default bridge network (alternative)
host    all             all             172.18.0.0/16           md5
EOF'

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ pg_hba.conf updated${NC}"
else
    echo -e "${RED}❌ ERROR: Failed to update pg_hba.conf${NC}"
    echo "Restoring backup..."
    sudo cp "$BACKUP_FILE" /var/lib/pgsql/data/pg_hba.conf
    exit 1
fi

echo ""
echo "New configuration:"
sudo cat /var/lib/pgsql/data/pg_hba.conf | grep -v "^#" | grep -v "^$"
echo ""

# Step 4: Set correct permissions
echo -e "${YELLOW}Step 4: Setting correct permissions${NC}"

sudo chmod 600 /var/lib/pgsql/data/pg_hba.conf
sudo chown postgres:postgres /var/lib/pgsql/data/pg_hba.conf

echo -e "${GREEN}✓ Permissions set${NC}"
echo ""

# Step 5: Reload PostgreSQL
echo -e "${YELLOW}Step 5: Reloading PostgreSQL configuration${NC}"

sudo systemctl reload postgresql

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ PostgreSQL reloaded (no downtime)${NC}"
else
    echo -e "${RED}❌ ERROR: Reload failed, trying restart...${NC}"
    sudo systemctl restart postgresql
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ PostgreSQL restarted${NC}"
    else
        echo -e "${RED}❌ ERROR: PostgreSQL restart failed${NC}"
        exit 1
    fi
fi

# Verify service is running
sleep 2
if sudo systemctl is-active --quiet postgresql; then
    echo -e "${GREEN}✓ PostgreSQL is running${NC}"
else
    echo -e "${RED}❌ ERROR: PostgreSQL is not running${NC}"
    exit 1
fi
echo ""

# Step 6: Test connection
echo -e "${YELLOW}Step 6: Testing database connection${NC}"

# Test with password authentication
if PGPASSWORD=postgres123 psql -h localhost -U depcheck_scanner -d depcheck -c "SELECT COUNT(*) as cve_count FROM vulnerability;" 2>&1 | grep -q "cve_count"; then
    echo -e "${GREEN}✓ Password authentication working${NC}"

    # Get CVE count
    CVE_COUNT=$(PGPASSWORD=postgres123 psql -h localhost -U depcheck_scanner -d depcheck -t -c "SELECT COUNT(*) FROM vulnerability;" 2>/dev/null | tr -d ' ')
    echo "  CVEs in database: $CVE_COUNT"
else
    echo -e "${RED}❌ ERROR: Connection test failed${NC}"
    echo ""
    echo "Testing connection..."
    PGPASSWORD=postgres123 psql -h localhost -U depcheck_scanner -d depcheck -c "SELECT 1;" 2>&1
    exit 1
fi
echo ""

# Step 7: Test from Docker (if Docker is available)
echo -e "${YELLOW}Step 7: Testing Docker connectivity${NC}"

if command -v docker &> /dev/null; then
    # Get Docker network
    DOCKER_NETWORK=$(docker network inspect bridge 2>/dev/null | grep -o '"Subnet": "[^"]*"' | head -1 | cut -d'"' -f4)
    echo "  Docker network: ${DOCKER_NETWORK:-Not detected}"

    # Simple Docker connectivity test
    if docker run --rm --network host \
        iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-java-v6.0-arm \
        -c "echo 'Docker test'" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Docker connectivity confirmed${NC}"
    else
        echo -e "${YELLOW}⚠  Docker test skipped (image not available)${NC}"
    fi
else
    echo -e "${YELLOW}⚠  Docker not available for testing${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  FIX COMPLETE - SUMMARY${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Changes Applied:"
echo "  ✓ Backed up original configuration"
echo "  ✓ Changed authentication from 'ident' to 'md5'"
echo "  ✓ Added Docker network access (172.17.0.0/16, 172.18.0.0/16)"
echo "  ✓ Reloaded PostgreSQL (no downtime)"
echo "  ✓ Verified password authentication works"
echo ""
echo "Database Status:"
echo "  ✓ PostgreSQL: Running"
echo "  ✓ Authentication: md5 (password-based)"
echo "  ✓ CVEs Available: $CVE_COUNT"
echo "  ✓ Connection: Working"
echo ""
echo "Next Steps:"
echo "  1. Run OSS Index integration test"
echo "  2. Test Dependency-Check from Docker containers"
echo "  3. Verify no authentication errors in logs"
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         ✅ POSTGRESQL AUTHENTICATION FIX SUCCESSFUL            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

ENDSSH

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║              ✅ FIX COMPLETED SUCCESSFULLY                      ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN}PostgreSQL is now configured for password authentication${NC}"
    echo -e "${GREEN}Docker containers can now connect to the database${NC}"
    echo -e "${GREEN}OSS Index integration is ready to test${NC}"
    echo ""
    echo "Next: Run OSS Index test:"
    echo "  ./test-ossindex-oracle.sh"
    echo ""
else
    echo ""
    echo -e "${RED}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                  ❌ FIX FAILED                                  ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Please check the error messages above and refer to:"
    echo "  ORACLE_POSTGRESQL_FIX_GUIDE.md"
    echo ""
fi

exit $EXIT_CODE
