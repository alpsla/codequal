#!/bin/bash

# Deploy Analysis Reports Migration Script
# This script deploys the analysis_reports table for storing standardized reports

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== CodeQual Analysis Reports Migration Deployment ===${NC}"
echo ""

# Check if required environment variables are set
if [ -z "$SUPABASE_DB_URL" ]; then
    echo -e "${RED}Error: SUPABASE_DB_URL environment variable is not set${NC}"
    echo "Please set it with: export SUPABASE_DB_URL='postgresql://...'"
    exit 1
fi

# Path to migration file
MIGRATION_FILE="./packages/database/migrations/20250615_analysis_reports.sql"

# Check if migration file exists
if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}Error: Migration file not found at $MIGRATION_FILE${NC}"
    exit 1
fi

echo -e "${YELLOW}Deploying migration: Analysis Reports Table${NC}"
echo "This will create:"
echo "  - analysis_reports table for storing standardized reports"
echo "  - Risk level enum type"
echo "  - Indexes for performance"
echo "  - Row Level Security policies"
echo "  - Helper functions and views"
echo ""

# Ask for confirmation
read -p "Do you want to continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Migration cancelled${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}Applying migration...${NC}"

# Run the migration
if psql "$SUPABASE_DB_URL" -f "$MIGRATION_FILE"; then
    echo -e "${GREEN}✓ Migration applied successfully!${NC}"
    echo ""
    
    # Verify the migration
    echo -e "${YELLOW}Verifying migration...${NC}"
    
    # Check if table exists
    TABLE_CHECK=$(psql "$SUPABASE_DB_URL" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'analysis_reports');" | tr -d '[:space:]')
    
    if [ "$TABLE_CHECK" = "t" ]; then
        echo -e "${GREEN}✓ analysis_reports table created successfully${NC}"
        
        # Count columns
        COLUMN_COUNT=$(psql "$SUPABASE_DB_URL" -t -c "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'analysis_reports';" | tr -d '[:space:]')
        echo -e "${GREEN}✓ Table has $COLUMN_COUNT columns${NC}"
        
        # Check indexes
        INDEX_COUNT=$(psql "$SUPABASE_DB_URL" -t -c "SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'analysis_reports';" | tr -d '[:space:]')
        echo -e "${GREEN}✓ Created $INDEX_COUNT indexes${NC}"
        
        # Check RLS
        RLS_ENABLED=$(psql "$SUPABASE_DB_URL" -t -c "SELECT relrowsecurity FROM pg_class WHERE relname = 'analysis_reports';" | tr -d '[:space:]')
        if [ "$RLS_ENABLED" = "t" ]; then
            echo -e "${GREEN}✓ Row Level Security is enabled${NC}"
        fi
        
        # Check policies
        POLICY_COUNT=$(psql "$SUPABASE_DB_URL" -t -c "SELECT COUNT(*) FROM pg_policies WHERE tablename = 'analysis_reports';" | tr -d '[:space:]')
        echo -e "${GREEN}✓ Created $POLICY_COUNT RLS policies${NC}"
        
        # Check functions
        FUNCTION_COUNT=$(psql "$SUPABASE_DB_URL" -t -c "SELECT COUNT(*) FROM pg_proc WHERE proname IN ('get_analysis_report', 'get_latest_analysis_report', 'get_user_report_statistics');" | tr -d '[:space:]')
        echo -e "${GREEN}✓ Created $FUNCTION_COUNT helper functions${NC}"
        
        echo ""
        echo -e "${GREEN}=== Migration completed successfully! ===${NC}"
        echo ""
        echo "Next steps:"
        echo "1. Update your .env files with Supabase connection details"
        echo "2. Test the report storage by running an analysis"
        echo "3. Access reports via the provided functions:"
        echo "   - get_analysis_report(report_id)"
        echo "   - get_latest_analysis_report(repository_url, pr_number)"
        echo "   - get_user_report_statistics()"
        
    else
        echo -e "${RED}✗ Table creation verification failed${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ Migration failed!${NC}"
    echo "Please check the error messages above and try again."
    exit 1
fi

echo ""
echo -e "${GREEN}Done!${NC}"
