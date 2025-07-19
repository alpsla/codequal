#!/bin/bash

# Direct Database Backup using pg_dump
# No Docker required - uses direct connection

set -e

echo "🔐 Direct Database Backup (No Docker Required)"
echo "============================================="
echo ""

# Load environment variables
source /Users/alpinro/Code\ Prjects/codequal/apps/api/.env

# Database connection details
DB_HOST="$SUPABASE_DB_HOST"
DB_PORT="$SUPABASE_DB_PORT"
DB_NAME="$SUPABASE_DB_NAME"
DB_USER="$SUPABASE_DB_USER"
DB_PASSWORD="$SUPABASE_DB_PASSWORD"

# Backup configuration
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="./database-backups"
BACKUP_FILE="${BACKUP_DIR}/direct_backup_${TIMESTAMP}.sql"

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "📋 Backup Configuration:"
echo "  Host: $DB_HOST"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo "  Backup file: $BACKUP_FILE"
echo ""

# Check if pg_dump is available
if ! command -v pg_dump &> /dev/null; then
    echo "❌ pg_dump not found!"
    echo ""
    echo "Install PostgreSQL client tools:"
    echo "  brew install postgresql"
    echo ""
    exit 1
fi

echo "✅ pg_dump found: $(pg_dump --version | head -1)"
echo ""

# Create the backup
echo "🚀 Starting database backup..."
echo "This may take a few minutes..."
echo ""

# Set password and run pg_dump
export PGPASSWORD="$DB_PASSWORD"

if pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --no-password \
    --verbose \
    -f "$BACKUP_FILE" 2>&1 | grep -v "^pg_dump:"; then
    
    unset PGPASSWORD
    
    echo ""
    echo "✅ Backup completed successfully!"
    echo ""
    
    # Get file size
    FILE_SIZE=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')
    echo "📊 Backup Details:"
    echo "  File: $BACKUP_FILE"
    echo "  Size: $FILE_SIZE"
    echo ""
    
    # Verify backup
    LINE_COUNT=$(wc -l < "$BACKUP_FILE")
    echo "  Lines: $LINE_COUNT"
    echo ""
    
    if [ $LINE_COUNT -lt 100 ]; then
        echo "⚠️  Warning: Backup seems too small. Please verify."
    fi
    
    echo "✨ Backup completed!"
    echo ""
    echo "You can now safely apply the database fixes."
    echo ""
    echo "To restore later, use:"
    echo "  PGPASSWORD='$DB_PASSWORD' psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME < $BACKUP_FILE"
    
else
    unset PGPASSWORD
    echo ""
    echo "❌ Backup failed!"
    echo ""
    echo "Common issues:"
    echo "1. Network connectivity to Supabase"
    echo "2. Database credentials incorrect"
    echo "3. pg_dump version compatibility"
    echo ""
    echo "Try updating PostgreSQL client:"
    echo "  brew upgrade postgresql"
    exit 1
fi