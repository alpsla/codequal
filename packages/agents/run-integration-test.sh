#!/bin/bash
set -a
source .env
set +a
ENABLE_SPOTBUGS=true NODE_ENV=test npx ts-node src/two-branch/tests/__tests__/test-v9-complete-integration.ts
