#!/bin/bash
#
# V9 Java Tools - 5 Repository Validation on Oracle Cloud
#
# Validates all 5 Java tools (PMD, Semgrep, Checkstyle, SpotBugs, Dependency-Check)
# on 5 different repositories to ensure comprehensive testing
#
# Usage: ./oracle-5-repo-validation.sh
#

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
AGENTS_DIR="$SCRIPT_DIR/../.."
RESULTS_DIR="/tmp/v9-5-repo-validation-$(date '+%Y%m%d-%H%M%S')"

mkdir -p "$RESULTS_DIR"

echo "═══════════════════════════════════════════════════════"
echo "  V9 Java Tools - 5 Repository Validation"
echo "  Oracle Cloud A1.Flex - All 5 Tools Enabled"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Testing Suite:"
echo "  1. Apache Kafka (Production-scale, 3.5K files)"
echo "  2. WebGoat (Deliberately vulnerable, OWASP)"
echo "  3. Spring PetClinic (Well-maintained)"
echo "  4. Apache Commons Lang (Library)"
echo "  5. Mockito (Testing framework)"
echo ""
echo "Tools: PMD, Semgrep, Checkstyle, SpotBugs, Dependency-Check"
echo "Results: $RESULTS_DIR"
echo ""

# Repository 1: Apache Kafka
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Repository 1/5: Apache Kafka PR #17620"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Repository: apache/kafka"
echo "Type: Production-scale distributed system"
echo "Size: 3,472 Java files"
echo "Expected: PMD issues, minimal security issues"
echo ""

START_TIME=$(date +%s)
cd "$AGENTS_DIR"
npx ts-node src/two-branch/tests/__tests__/test-all-5-tools-kafka-pr.ts \
  > "$RESULTS_DIR/1-kafka.log" 2>&1 || KAFKA_EXIT=$?
END_TIME=$(date +%s)
KAFKA_DURATION=$((END_TIME - START_TIME))

if [ "${KAFKA_EXIT:-0}" -eq "0" ]; then
  echo "✅ Kafka test completed in ${KAFKA_DURATION}s"
else
  echo "❌ Kafka test failed (exit code: ${KAFKA_EXIT:-0})"
fi
echo ""
echo "⏸️  PAUSING for review..."
echo "   Review results: $RESULTS_DIR/1-kafka.log"
echo "   Press ENTER when ready to continue to Repository 2..."
read

# Repository 2: WebGoat
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Repository 2/5: WebGoat (OWASP Vulnerable App)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Repository: WebGoat/WebGoat"
echo "Type: Deliberately vulnerable web application"
echo "Expected: Security issues, CVEs, code quality issues"
echo ""

START_TIME=$(date +%s)
npx ts-node src/two-branch/tests/__tests__/test-v9-all-5-tools-webgoat.ts \
  > "$RESULTS_DIR/2-webgoat.log" 2>&1 || WEBGOAT_EXIT=$?
END_TIME=$(date +%s)
WEBGOAT_DURATION=$((END_TIME - START_TIME))

if [ "${WEBGOAT_EXIT:-0}" -eq "0" ]; then
  echo "✅ WebGoat test completed in ${WEBGOAT_DURATION}s"
else
  echo "❌ WebGoat test failed (exit code: ${WEBGOAT_EXIT:-0})"
fi
echo ""
echo "⏸️  PAUSING for review..."
echo "   Review results: $RESULTS_DIR/2-webgoat.log"
echo "   Press ENTER when ready to continue to Repository 3..."
read

# Repository 3: Spring PetClinic
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Repository 3/5: Spring PetClinic"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Repository: spring-projects/spring-petclinic"
echo "Type: Well-maintained sample application"
echo "Expected: Minimal issues, good code quality"
echo ""

# Create test for PetClinic
cat > "$AGENTS_DIR/src/two-branch/tests/__tests__/test-petclinic-5-tools.ts" << 'PETCLINIC_EOF'
import { JavaToolOrchestrator } from '../../tools/java/java-tool-orchestrator';
import { execSync } from 'child_process';

const PETCLINIC_REPO = '/tmp/spring-petclinic';
const PETCLINIC_URL = 'https://github.com/spring-projects/spring-petclinic.git';

async function testPetClinic() {
  console.log('Cloning Spring PetClinic...');
  execSync(`rm -rf ${PETCLINIC_REPO} && git clone ${PETCLINIC_URL} ${PETCLINIC_REPO}`, { stdio: 'inherit' });

  const orchestrator = new JavaToolOrchestrator();
  const results = await orchestrator.orchestrate(PETCLINIC_REPO, 'main');

  console.log('✅ PetClinic analysis complete');
  console.log(`Total issues: ${results.length}`);
}

testPetClinic().catch(console.error);
PETCLINIC_EOF

START_TIME=$(date +%s)
npx ts-node src/two-branch/tests/__tests__/test-petclinic-5-tools.ts \
  > "$RESULTS_DIR/3-petclinic.log" 2>&1 || PETCLINIC_EXIT=$?
END_TIME=$(date +%s)
PETCLINIC_DURATION=$((END_TIME - START_TIME))

if [ "${PETCLINIC_EXIT:-0}" -eq "0" ]; then
  echo "✅ PetClinic test completed in ${PETCLINIC_DURATION}s"
else
  echo "❌ PetClinic test failed (exit code: ${PETCLINIC_EXIT:-0})"
fi
echo ""
echo "⏸️  PAUSING for review..."
echo "   Review results: $RESULTS_DIR/3-petclinic.log"
echo "   Press ENTER when ready to continue to Repository 4..."
read

# Repository 4: Apache Commons Lang
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Repository 4/5: Apache Commons Lang"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Repository: apache/commons-lang"
echo "Type: Well-tested utility library"
echo "Expected: High quality, minimal issues"
echo ""

# Create test for Commons Lang
cat > "$AGENTS_DIR/src/two-branch/tests/__tests__/test-commons-lang-5-tools.ts" << 'COMMONS_EOF'
import { JavaToolOrchestrator } from '../../tools/java/java-tool-orchestrator';
import { execSync } from 'child_process';

const COMMONS_REPO = '/tmp/commons-lang';
const COMMONS_URL = 'https://github.com/apache/commons-lang.git';

async function testCommonsLang() {
  console.log('Cloning Apache Commons Lang...');
  execSync(`rm -rf ${COMMONS_REPO} && git clone ${COMMONS_URL} ${COMMONS_REPO}`, { stdio: 'inherit' });

  const orchestrator = new JavaToolOrchestrator();
  const results = await orchestrator.orchestrate(COMMONS_REPO, 'master');

  console.log('✅ Commons Lang analysis complete');
  console.log(`Total issues: ${results.length}`);
}

testCommonsLang().catch(console.error);
COMMONS_EOF

START_TIME=$(date +%s)
npx ts-node src/two-branch/tests/__tests__/test-commons-lang-5-tools.ts \
  > "$RESULTS_DIR/4-commons-lang.log" 2>&1 || COMMONS_EXIT=$?
END_TIME=$(date +%s)
COMMONS_DURATION=$((END_TIME - START_TIME))

if [ "${COMMONS_EXIT:-0}" -eq "0" ]; then
  echo "✅ Commons Lang test completed in ${COMMONS_DURATION}s"
else
  echo "❌ Commons Lang test failed (exit code: ${COMMONS_EXIT:-0})"
fi
echo ""
echo "⏸️  PAUSING for review..."
echo "   Review results: $RESULTS_DIR/4-commons-lang.log"
echo "   Press ENTER when ready to continue to Repository 5..."
read

# Repository 5: Mockito
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Repository 5/5: Mockito"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Repository: mockito/mockito"
echo "Type: Testing framework"
echo "Expected: Good practices, minimal issues"
echo ""

# Create test for Mockito
cat > "$AGENTS_DIR/src/two-branch/tests/__tests__/test-mockito-5-tools.ts" << 'MOCKITO_EOF'
import { JavaToolOrchestrator } from '../../tools/java/java-tool-orchestrator';
import { execSync } from 'child_process';

const MOCKITO_REPO = '/tmp/mockito';
const MOCKITO_URL = 'https://github.com/mockito/mockito.git';

async function testMockito() {
  console.log('Cloning Mockito...');
  execSync(`rm -rf ${MOCKITO_REPO} && git clone ${MOCKITO_URL} ${MOCKITO_REPO}`, { stdio: 'inherit' });

  const orchestrator = new JavaToolOrchestrator();
  const results = await orchestrator.orchestrate(MOCKITO_REPO, 'main');

  console.log('✅ Mockito analysis complete');
  console.log(`Total issues: ${results.length}`);
}

testMockito().catch(console.error);
MOCKITO_EOF

START_TIME=$(date +%s)
npx ts-node src/two-branch/tests/__tests__/test-mockito-5-tools.ts \
  > "$RESULTS_DIR/5-mockito.log" 2>&1 || MOCKITO_EXIT=$?
END_TIME=$(date +%s)
MOCKITO_DURATION=$((END_TIME - START_TIME))

if [ "${MOCKITO_EXIT:-0}" -eq "0" ]; then
  echo "✅ Mockito test completed in ${MOCKITO_DURATION}s"
else
  echo "❌ Mockito test failed (exit code: ${MOCKITO_EXIT:-0})"
fi

# Final Summary
echo ""
echo "═══════════════════════════════════════════════════════"
echo "  V9 VALIDATION COMPLETE - 5 REPOSITORIES TESTED"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Results Summary:"
echo "  1. Kafka:        ${KAFKA_EXIT:-0} (${KAFKA_DURATION}s)"
echo "  2. WebGoat:      ${WEBGOAT_EXIT:-0} (${WEBGOAT_DURATION}s)"
echo "  3. PetClinic:    ${PETCLINIC_EXIT:-0} (${PETCLINIC_DURATION}s)"
echo "  4. Commons Lang: ${COMMONS_EXIT:-0} (${COMMONS_DURATION}s)"
echo "  5. Mockito:      ${MOCKITO_EXIT:-0} (${MOCKITO_DURATION}s)"
echo ""
echo "All results saved to: $RESULTS_DIR"
echo ""
echo "Next Steps:"
echo "  - Review each repository's results"
echo "  - Approve reports for production use"
echo "  - Proceed to Python tools validation"
echo ""
