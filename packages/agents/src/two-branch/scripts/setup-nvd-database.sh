#!/bin/bash
#
# NVD PostgreSQL Database Setup for Dependency-Check
#
# Purpose: Create PostgreSQL database and user for Dependency-Check NVD caching
# Benefits:
#   - Load CVE database ONCE (208K+ CVEs)
#   - Reuse across all scans (massive performance improvement)
#   - Production-ready solution
#
# Usage: ./setup-nvd-database.sh
#

set -e

echo "========================================"
echo "NVD PostgreSQL Database Setup"
echo "========================================"
echo ""

# Configuration
DB_NAME="nvd"
DB_USER="depcheck_scanner"
DB_PASSWORD="${DEPCHECK_DB_PASSWORD:-}"  # Empty password for local development
POSTGRES_USER="${POSTGRES_USER:-postgres}"

echo "[1/4] Checking PostgreSQL installation..."
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL not installed!"
    echo "   Install with: brew install postgresql@14"
    exit 1
fi

if ! pgrep -x postgres > /dev/null; then
    echo "❌ PostgreSQL not running!"
    echo "   Start with: brew services start postgresql@14"
    exit 1
fi

echo "✅ PostgreSQL is running"
echo ""

echo "[2/4] Creating database '${DB_NAME}'..."
if psql -U "$POSTGRES_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo "⚠️  Database '$DB_NAME' already exists"
else
    psql -U "$POSTGRES_USER" -c "CREATE DATABASE $DB_NAME;" 2>&1
    echo "✅ Database created"
fi
echo ""

echo "[3/4] Creating user '${DB_USER}'..."
if psql -U "$POSTGRES_USER" -t -c "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1; then
    echo "⚠️  User '$DB_USER' already exists"
else
    if [ -z "$DB_PASSWORD" ]; then
        psql -U "$POSTGRES_USER" -c "CREATE USER $DB_USER;" 2>&1
    else
        psql -U "$POSTGRES_USER" -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>&1
    fi
    echo "✅ User created"
fi
echo ""

echo "[4/4] Granting permissions..."
psql -U "$POSTGRES_USER" -d "$DB_NAME" -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>&1
psql -U "$POSTGRES_USER" -d "$DB_NAME" -c "GRANT ALL ON SCHEMA public TO $DB_USER;" 2>&1
echo "✅ Permissions granted"
echo ""

echo "========================================"
echo "✅ SETUP COMPLETE"
echo "========================================"
echo ""
echo "Database Configuration:"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo "  Password: ${DB_PASSWORD:-<empty>}"
echo "  Connection: jdbc:postgresql://127.0.0.1:5432/$DB_NAME"
echo ""
echo "Environment Variables (add to .env):"
echo "  DEPCHECK_DB_URL=jdbc:postgresql://127.0.0.1:5432/nvd"
echo "  DEPCHECK_DB_USER=depcheck_scanner"
echo "  DEPCHECK_DB_PASSWORD=${DB_PASSWORD:-}"
echo "  DEPCHECK_JDBC_DRIVER=/tmp/jdbc-drivers/postgresql-42.7.1.jar"
echo ""
echo "Next Steps:"
echo "  1. Download PostgreSQL JDBC driver if not already present:"
echo "     mkdir -p /tmp/jdbc-drivers"
echo "     curl -L https://jdbc.postgresql.org/download/postgresql-42.7.1.jar -o /tmp/jdbc-drivers/postgresql-42.7.1.jar"
echo ""
echo "  2. Run first Dependency-Check scan to populate database"
echo "     (First run takes ~5-10 minutes to download CVE data)"
echo ""
echo "  3. Subsequent scans will use cached data (< 1 minute)"
echo ""
