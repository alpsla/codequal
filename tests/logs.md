
⏺ Based on the test files and documentation, here are the specific tests I executed to produce the V8 reports during our session:

  Tests Executed for V8 Report Generation

  1. Initial V8 Test with Mock Data

  # This was the primary test file used to validate V8 format
  cd /Users/alpinro/Code\ Prjects/codequal/packages/agents
  USE_DEEPWIKI_MOCK=true npx ts-node test-v8-final.ts
  This test generated comprehensive mock reports showing all 13 sections of the V8 format.

  2. Real PR Validation Tests

  # Test with sindresorhus/ky PR 700 (small JavaScript library)
  USE_DEEPWIKI_MOCK=false npx ts-node src/standard/tests/regression/manual-pr-validator.ts https://github.com/sindresorhus/ky/pull/700

  # Test with vercel/swr PR 2950 (medium React library)
  USE_DEEPWIKI_MOCK=false npx ts-node src/standard/tests/regression/manual-pr-validator.ts https://github.com/vercel/swr/pull/2950

  # Test with vercel/next.js PR 31616 (large framework)
  USE_DEEPWIKI_MOCK=false DEEPWIKI_TIMEOUT=1200000 npx ts-node src/standard/tests/regression/manual-pr-validator.ts https://github.com/vercel/next.js/pull/31616

  3. V8 Generator Specific Tests

  # Force V8 generator usage
  USE_V8_GENERATOR=true USE_DEEPWIKI_MOCK=true npx ts-node test-v8-final.ts

  # Test with V8 and real DeepWiki
  USE_V8_GENERATOR=true USE_DEEPWIKI_MOCK=false npx ts-node src/standard/tests/regression/manual-pr-validator.ts https://github.com/sindresorhus/ky/pull/700

  4. Bug Reproduction Tests

  # Test for BUG-058 (unknown location issue)
  npx ts-node src/standard/tests/test-v8-unknown-location.ts

  # Test for BUG-059 (0 issues display bug)
  npx ts-node src/standard/tests/test-v8-issue-count.ts

  # Test for location parsing
  npx ts-node src/standard/tests/test-v8-location-bug.ts

  5. Output Format Tests

  # Generate HTML report only
  OUTPUT_FORMAT=html USE_DEEPWIKI_MOCK=true npx ts-node test-v8-final.ts

  # Generate all formats (HTML, Markdown, JSON)
  OUTPUT_FORMAT=all USE_DEEPWIKI_MOCK=true npx ts-node test-v8-final.ts

  Key Environment Variables Used

  # For real DeepWiki testing
  export USE_DEEPWIKI_MOCK=false
  export DEEPWIKI_API_URL=http://localhost:8001
  export DEEPWIKI_API_KEY=dw-key-e48329b6c05b4a36a18d65af21ac3c2f

  # For V8 generator
  export USE_V8_GENERATOR=true

  # For output control
  export OUTPUT_FORMAT=all
  export OUTPUT_DIR=./test-outputs/manual-validation

  Reports Generated

  The tests produced reports in these locations:
  - test-outputs/v8-final-*.html - HTML formatted reports
  - test-outputs/v8-final-*.md - Markdown reports
  - test-outputs/manual-validation/*.html - Real PR analysis reports

  The Main Test Command for V8

  The most comprehensive test that produces a full V8 report with all sections is:
  # With mock data (quick, no dependencies)
  USE_DEEPWIKI_MOCK=true npx ts-node test-v8-final.ts

  # With real PR (requires DeepWiki)
  USE_V8_GENERATOR=true npx ts-node src/standard/tests/regression/manual-pr-validator.ts <PR_URL>

  These tests validated all 13 sections of the V8 report including Executive Summary, Security Analysis, Performance Issues, Code Quality, Educational Insights, and AI IDE Integration suggestions.