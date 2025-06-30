#!/bin/bash

echo "🚀 Setting up API Key tables in Supabase..."

# Check if we have the required environment variables
if [ -z "$SUPABASE_DB_URL" ]; then
  echo "❌ Please set SUPABASE_DB_URL environment variable"
  echo "   You can find this in your Supabase project settings"
  exit 1
fi

# Run the SQL to create tables
echo "📦 Creating API key management tables..."
psql "$SUPABASE_DB_URL" < packages/database/migrations/20241228_api_key_management.sql

if [ $? -eq 0 ]; then
  echo "✅ Tables created successfully!"
  echo ""
  echo "📋 Created tables:"
  echo "   - api_keys (stores hashed API keys)"
  echo "   - api_usage_logs (tracks every request)"
  echo "   - api_subscriptions (links to Stripe)"
  echo "   - api_usage_summaries (monthly billing)"
  echo "   - api_rate_limits (rate limiting)"
  echo ""
  echo "🔐 Row Level Security is enabled"
  echo "🎉 Ready to generate API keys!"
else
  echo "❌ Failed to create tables. Please check your connection."
fi