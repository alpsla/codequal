#!/bin/bash

echo "🚀 CodeQual E2E Test Suite"
echo "=========================="
echo ""

# Check if API server is running
API_URL="${API_URL:-http://localhost:3001}"
echo "🔍 Checking API server at $API_URL..."
if ! curl -s "$API_URL/health" > /dev/null; then
  echo "❌ API server is not running at $API_URL"
  echo "Please start the API server first with: npm run dev"
  exit 1
fi
echo "✅ API server is running"
echo ""

# Check environment variables
echo "🔍 Checking environment variables..."
if [ -z "$TEST_USER_PAY_PER_SCAN_PASSWORD" ]; then
  echo "⚠️  WARNING: TEST_USER_PAY_PER_SCAN_PASSWORD is not set"
  echo "   Set it in .env for pay-per-scan user tests"
fi
if [ -z "$TEST_USER_INDIVIDUAL_PASSWORD" ]; then
  echo "⚠️  WARNING: TEST_USER_INDIVIDUAL_PASSWORD is not set"
  echo "   Set it in .env for individual plan user tests"
fi
echo ""

# Run database setup if requested
if [ "$1" == "--setup" ]; then
  echo "📝 Setting up test users in database..."
  echo "Running: scripts/setup-e2e-test-users.sql"
  # You would need to run this SQL script against your Supabase instance
  echo "⚠️  Please run the SQL script manually in Supabase SQL Editor"
  echo ""
fi

# Select which tests to run
if [ "$1" == "--help" ]; then
  echo "Usage: ./run-e2e-tests.sh [options]"
  echo ""
  echo "Options:"
  echo "  --setup        Show database setup instructions"
  echo "  --pay-per-scan Run only pay-per-scan user tests"
  echo "  --individual   Run only individual plan user tests"
  echo "  --all          Run all tests (default)"
  echo "  --help         Show this help message"
  exit 0
fi

# Run tests based on arguments
if [ "$1" == "--pay-per-scan" ] || [ "$1" == "--all" ] || [ -z "$1" ]; then
  echo "🧪 Running Pay-Per-Scan User Tests..."
  echo "====================================="
  npx ts-node src/test-scripts/test-e2e-pay-per-scan.ts
  PAY_PER_SCAN_RESULT=$?
  echo ""
fi

if [ "$1" == "--individual" ] || [ "$1" == "--all" ] || [ -z "$1" ]; then
  echo "🧪 Running Individual Plan User Tests..."
  echo "========================================"
  npx ts-node src/test-scripts/test-e2e-individual.ts
  INDIVIDUAL_RESULT=$?
  echo ""
fi

# Summary
echo "📊 Test Summary"
echo "==============="
if [ "$1" == "--pay-per-scan" ] || [ "$1" == "--all" ] || [ -z "$1" ]; then
  if [ $PAY_PER_SCAN_RESULT -eq 0 ]; then
    echo "✅ Pay-Per-Scan Tests: PASSED"
  else
    echo "❌ Pay-Per-Scan Tests: FAILED"
  fi
fi
if [ "$1" == "--individual" ] || [ "$1" == "--all" ] || [ -z "$1" ]; then
  if [ $INDIVIDUAL_RESULT -eq 0 ]; then
    echo "✅ Individual Plan Tests: PASSED"
  else
    echo "❌ Individual Plan Tests: FAILED"
  fi
fi

# Exit with appropriate code
if [ $PAY_PER_SCAN_RESULT -ne 0 ] || [ $INDIVIDUAL_RESULT -ne 0 ]; then
  exit 1
fi
exit 0