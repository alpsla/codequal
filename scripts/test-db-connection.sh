#!/bin/bash

# Debug database connection

echo "Testing Supabase database connection..."

# Load environment variables
if [ -f ".env" ]; then
    set -a
    source .env
    set +a
fi

echo "Database settings:"
echo "Host: $SUPABASE_DB_HOST"
echo "Port: $SUPABASE_DB_PORT"
echo "Database: $SUPABASE_DB_NAME"
echo "User: $SUPABASE_DB_USER"
echo "Password: ${SUPABASE_DB_PASSWORD:0:4}..." # Show first 4 chars only

export PGPASSWORD="$SUPABASE_DB_PASSWORD"
export PGSSLMODE="require"
export PGGSSENCMODE="disable"  # This disables GSSAPI

echo ""
echo "Testing connection with SSL and no GSSAPI..."
psql -h "$SUPABASE_DB_HOST" -p "$SUPABASE_DB_PORT" -U "$SUPABASE_DB_USER" -d "$SUPABASE_DB_NAME" -c "SELECT 1;"

echo ""
echo "Alternative: Testing with full connection string:"
psql "postgresql://$SUPABASE_DB_USER:$SUPABASE_DB_PASSWORD@$SUPABASE_DB_HOST:$SUPABASE_DB_PORT/$SUPABASE_DB_NAME?sslmode=require&gssencmode=disable" -c "SELECT 1;"
