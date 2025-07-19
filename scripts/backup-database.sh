#!/bin/bash

# Supabase Database Backup Script
# Creates a complete backup before applying critical fixes

set -e  # Exit on error

echo "🔐 Supabase Database Backup Tool"
echo "================================"
echo ""

# Get project reference from environment or use the one from .env
PROJECT_REF="ftjhmbbcuqjqmmbaymqb"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="./database-backups"
BACKUP_FILE="${BACKUP_DIR}/supabase_backup_${TIMESTAMP}.sql"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "📋 Backup Configuration:"
echo "  Project: $PROJECT_REF"
echo "  Backup file: $BACKUP_FILE"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found!"
    echo ""
    echo "Please install it using one of these methods:"
    echo ""
    echo "Using npm:"
    echo "  npm install -g supabase"
    echo ""
    echo "Using Homebrew (macOS):"
    echo "  brew install supabase/tap/supabase"
    echo ""
    echo "Using curl (Linux/macOS):"
    echo "  curl -sSfL https://supabase.com/install.sh | sh"
    echo ""
    exit 1
fi

echo "✅ Supabase CLI found: $(supabase --version)"
echo ""

# Check if logged in
echo "🔑 Checking Supabase login status..."
if ! supabase projects list &> /dev/null; then
    echo "⚠️  Not logged in to Supabase"
    echo ""
    echo "Please run: supabase login"
    echo "This will open a browser to authenticate"
    echo ""
    exit 1
fi

echo "✅ Logged in to Supabase"
echo ""

# Create the backup
echo "🚀 Starting database backup..."
echo "This may take a few minutes depending on database size..."
echo ""

# For older Supabase CLI versions, use --linked flag
if supabase db dump --linked -f "$BACKUP_FILE"; then
    echo ""
    echo "✅ Backup completed successfully!"
    echo ""
    
    # Get file size
    FILE_SIZE=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')
    echo "📊 Backup Details:"
    echo "  File: $BACKUP_FILE"
    echo "  Size: $FILE_SIZE"
    echo ""
    
    # Create a restore script
    RESTORE_SCRIPT="${BACKUP_DIR}/restore_${TIMESTAMP}.sh"
    cat > "$RESTORE_SCRIPT" << EOF
#!/bin/bash
# Restore script for backup created on $(date)
# WARNING: This will overwrite your current database!

echo "⚠️  WARNING: This will restore the database to the state from $(date)"
echo "All current data will be lost!"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "\$confirm" != "yes" ]; then
    echo "Restore cancelled"
    exit 1
fi

echo "Restoring database..."
psql "\$DATABASE_URL" < "$BACKUP_FILE"

echo "✅ Database restored successfully"
EOF
    
    chmod +x "$RESTORE_SCRIPT"
    
    echo "💡 Restore script created: $RESTORE_SCRIPT"
    echo ""
    echo "✨ Backup completed! You can now safely apply the database fixes."
    echo ""
    echo "Next steps:"
    echo "1. Go to Supabase Dashboard → SQL Editor"
    echo "2. Copy contents of database-comprehensive-fixes.sql"
    echo "3. Run the fixes"
    echo ""
    echo "If something goes wrong, restore using:"
    echo "  $RESTORE_SCRIPT"
    
else
    echo ""
    echo "❌ Backup failed!"
    echo ""
    echo "Common issues:"
    echo "1. Project reference might be incorrect"
    echo "2. Network connection issues"
    echo "3. Insufficient permissions"
    echo ""
    echo "Try running with debug mode:"
    echo "  supabase db dump --linked -f $BACKUP_FILE --debug"
    echo ""
    echo "Or try the direct command:"
    echo "  supabase db dump --linked -f $BACKUP_FILE"
    exit 1
fi