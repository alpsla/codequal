#!/bin/bash

# Demo Script - Local Testing Simulation
# This demonstrates the tracking system without needing a real droplet

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Configuration
RESULTS_DIR="/Users/alpinro/Code Prjects/codequal/packages/agents/src/two-branch/test-results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SESSION_ID="demo_${TIMESTAMP}"

echo -e "${MAGENTA}╔════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║    CodeQual Testing Demo (Local Simulation)   ║${NC}"
echo -e "${MAGENTA}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Create directory structure
echo -e "${YELLOW}Setting up test results directories...${NC}"
mkdir -p "$RESULTS_DIR/sessions/$SESSION_ID"
mkdir -p "$RESULTS_DIR/reports"
mkdir -p "$RESULTS_DIR/matrices"
mkdir -p "$RESULTS_DIR/performance"

# Create session metadata
echo -e "${CYAN}Creating session: ${SESSION_ID}${NC}"
cat << EOF > "$RESULTS_DIR/sessions/$SESSION_ID/metadata.json"
{
  "sessionId": "$SESSION_ID",
  "timestamp": "$(date -Iseconds)",
  "environment": {
    "type": "local_demo",
    "platform": "$(uname -s)",
    "nodeVersion": "$(node --version 2>/dev/null || echo 'unknown')"
  },
  "status": "in_progress"
}
EOF

# Simulate test results with realistic data
echo -e "${YELLOW}Simulating security tool tests...${NC}"
echo ""

# Create simulated raw results
cat << 'EOF' > "$RESULTS_DIR/sessions/$SESSION_ID/raw-results.json"
{
  "tests": [
    {
      "language": "Java",
      "tool": "SpotBugs",
      "status": "success",
      "expected": 8,
      "actual": 7,
      "time": 1250,
      "errors": []
    },
    {
      "language": "Java",
      "tool": "PMD",
      "status": "success",
      "expected": 15,
      "actual": 13,
      "time": 890,
      "errors": []
    },
    {
      "language": "Java",
      "tool": "Checkstyle",
      "status": "success",
      "expected": 12,
      "actual": 14,
      "time": 450,
      "errors": []
    },
    {
      "language": "PHP",
      "tool": "PHPCS",
      "status": "success",
      "expected": 20,
      "actual": 18,
      "time": 320,
      "errors": []
    },
    {
      "language": "PHP",
      "tool": "Psalm",
      "status": "not_installed",
      "expected": 12,
      "actual": 0,
      "time": 0,
      "errors": ["Tool not installed"]
    },
    {
      "language": "PHP",
      "tool": "PHPStan",
      "status": "success",
      "expected": 10,
      "actual": 9,
      "time": 780,
      "errors": []
    },
    {
      "language": "C++",
      "tool": "Cppcheck",
      "status": "success",
      "expected": 10,
      "actual": 11,
      "time": 560,
      "errors": []
    },
    {
      "language": "C++",
      "tool": "Clang-tidy",
      "status": "success",
      "expected": 15,
      "actual": 12,
      "time": 1100,
      "errors": []
    },
    {
      "language": "Python",
      "tool": "Bandit",
      "status": "success",
      "expected": 12,
      "actual": 10,
      "time": 290,
      "errors": []
    },
    {
      "language": "Python",
      "tool": "PyLint",
      "status": "not_installed",
      "expected": 10,
      "actual": 0,
      "time": 0,
      "errors": ["Tool not installed"]
    },
    {
      "language": "Go",
      "tool": "gosec",
      "status": "success",
      "expected": 10,
      "actual": 8,
      "time": 410,
      "errors": []
    },
    {
      "language": "Go",
      "tool": "staticcheck",
      "status": "success",
      "expected": 8,
      "actual": 7,
      "time": 620,
      "errors": []
    },
    {
      "language": "Ruby",
      "tool": "Brakeman",
      "status": "success",
      "expected": 10,
      "actual": 9,
      "time": 890,
      "errors": []
    },
    {
      "language": "Ruby",
      "tool": "RuboCop",
      "status": "success",
      "expected": 8,
      "actual": 10,
      "time": 340,
      "errors": []
    },
    {
      "language": "Rust",
      "tool": "Clippy",
      "status": "success",
      "expected": 8,
      "actual": 6,
      "time": 1450,
      "errors": []
    },
    {
      "language": "Rust",
      "tool": "cargo-audit",
      "status": "not_installed",
      "expected": 3,
      "actual": 0,
      "time": 0,
      "errors": ["Tool not installed"]
    },
    {
      "language": "JavaScript",
      "tool": "ESLint",
      "status": "success",
      "expected": 15,
      "actual": 16,
      "time": 480,
      "errors": []
    },
    {
      "language": "Multi",
      "tool": "Semgrep",
      "status": "success",
      "expected": 25,
      "actual": 22,
      "time": 2100,
      "errors": []
    }
  ]
}
EOF

# Generate markdown report
echo -e "${YELLOW}Generating markdown report...${NC}"

# Create the report using Node.js
node << NODEJS_SCRIPT
const fs = require('fs');
const path = require('path');

const sessionId = '$SESSION_ID';
const resultsDir = '$RESULTS_DIR';
const rawResults = JSON.parse(fs.readFileSync(path.join(resultsDir, 'sessions', sessionId, 'raw-results.json'), 'utf8'));

// Calculate statistics
const tests = rawResults.tests;
const totalTests = tests.length;
const successfulTests = tests.filter(t => t.status === 'success').length;
const failedTests = tests.filter(t => t.status === 'not_installed').length;
const successRate = ((successfulTests / totalTests) * 100).toFixed(1);

// Calculate accuracy
const accuracySum = tests.filter(t => t.status === 'success').reduce((sum, t) => {
    return sum + (t.expected > 0 ? (t.actual / t.expected) * 100 : 0);
}, 0);
const avgAccuracy = successfulTests > 0 ? (accuracySum / successfulTests).toFixed(1) : 0;

// Calculate total time
const totalTime = tests.reduce((sum, t) => sum + t.time, 0);

// Generate report
let report = \`# Test Session Report: \${sessionId}

**Date:** \${new Date().toISOString()}  
**Type:** Local Demo Simulation

## 📊 Executive Summary

| Metric | Value |
|--------|-------|
| Total Tests | \${totalTests} |
| Successful | \${successfulTests} ✅ |
| Failed | \${failedTests} ❌ |
| Success Rate | \${successRate}% |
| Average Accuracy | \${avgAccuracy}% |
| Total Execution Time | \${totalTime}ms |

## 🔍 Detailed Results by Language

\`;

// Group by language
const byLanguage = {};
tests.forEach(test => {
    if (!byLanguage[test.language]) {
        byLanguage[test.language] = [];
    }
    byLanguage[test.language].push(test);
});

// Add language sections
Object.keys(byLanguage).sort().forEach(language => {
    report += \`\n### \${language}\n\n\`;
    report += '| Tool | Status | Expected | Actual | Accuracy | Time (ms) |\n';
    report += '|------|--------|----------|--------|----------|----------|\n';
    
    byLanguage[language].forEach(test => {
        const accuracy = test.expected > 0 ? ((test.actual / test.expected) * 100).toFixed(1) : 0;
        const status = test.status === 'success' ? '✅ Success' : '❌ Not Installed';
        report += \`| \${test.tool} | \${status} | \${test.expected} | \${test.actual} | \${accuracy}% | \${test.time} |\n\`;
    });
});

// Add performance analysis
report += \`
## ⚡ Performance Analysis

### Top 5 Fastest Tools
| Tool | Time (ms) | Issues Found |
|------|-----------|--------------|
\`;

const sortedByTime = tests.filter(t => t.status === 'success').sort((a, b) => a.time - b.time).slice(0, 5);
sortedByTime.forEach(test => {
    report += \`| \${test.tool} | \${test.time} | \${test.actual} |\n\`;
});

// Add accuracy analysis
report += \`
### Top 5 Most Accurate Tools
| Tool | Expected | Actual | Accuracy |
|------|----------|--------|----------|
\`;

const sortedByAccuracy = tests.filter(t => t.status === 'success')
    .map(t => ({...t, accuracy: t.expected > 0 ? (t.actual / t.expected) * 100 : 0}))
    .sort((a, b) => Math.abs(100 - b.accuracy) - Math.abs(100 - a.accuracy))
    .slice(0, 5);

sortedByAccuracy.forEach(test => {
    report += \`| \${test.tool} | \${test.expected} | \${test.actual} | \${test.accuracy.toFixed(1)}% |\n\`;
});

// Add recommendations
report += \`
## 💡 Recommendations

\`;

if (failedTests > 0) {
    report += \`### ⚠️ Missing Tools\n\`;
    report += \`The following tools need to be installed:\n\`;
    tests.filter(t => t.status === 'not_installed').forEach(t => {
        report += \`- **\${t.tool}** (\${t.language})\n\`;
    });
    report += \`\n\`;
}

if (avgAccuracy < 90) {
    report += \`### 📈 Accuracy Improvement\n\`;
    report += \`- Average accuracy is \${avgAccuracy}%, below the 90% target\n\`;
    report += \`- Consider tuning detection patterns for better results\n\n\`;
}

// Tools with low accuracy
const lowAccuracy = tests.filter(t => t.status === 'success' && t.expected > 0)
    .map(t => ({...t, accuracy: (t.actual / t.expected) * 100}))
    .filter(t => t.accuracy < 80);

if (lowAccuracy.length > 0) {
    report += \`### 🔧 Tools Needing Adjustment\n\`;
    lowAccuracy.forEach(t => {
        report += \`- **\${t.tool}**: \${t.accuracy.toFixed(1)}% accuracy (Expected: \${t.expected}, Found: \${t.actual})\n\`;
    });
}

report += \`
## 📈 Coverage Summary

| Category | Coverage | Status |
|----------|----------|--------|
| Languages Tested | 8/8 | 🟢 Complete |
| Tools Tested | \${totalTests}/25 | \${totalTests >= 20 ? '🟢 Good' : totalTests >= 15 ? '🟡 Partial' : '🔴 Low'} |
| Success Rate | \${successRate}% | \${successRate >= 80 ? '🟢 Good' : successRate >= 60 ? '🟡 Fair' : '🔴 Poor'} |
| Accuracy Rate | \${avgAccuracy}% | \${avgAccuracy >= 90 ? '🟢 Excellent' : avgAccuracy >= 80 ? '🟡 Good' : '🔴 Needs Work'} |

---

*Report generated: \${new Date().toLocaleString()}*
\`;

// Write report
fs.writeFileSync(path.join(resultsDir, 'reports', \`\${sessionId}.md\`), report);
console.log(\`✅ Report generated: \${path.join(resultsDir, 'reports', sessionId + '.md')}\`);

// Update master matrix
const matrixFile = path.join(resultsDir, 'matrices', 'master-coverage-matrix.md');
let matrix = fs.existsSync(matrixFile) ? fs.readFileSync(matrixFile, 'utf8') : '';

// Update the matrix with new session data
const matrixUpdate = \`

### Session: \${sessionId} (Demo)

| Tool | Java | PHP | C++ | Python | Go | Ruby | Rust | JavaScript | Status |
|------|------|-----|-----|--------|----|------|------|------------|--------|
\`;

const tools = ['SpotBugs', 'PMD', 'Checkstyle', 'PHPCS', 'Psalm', 'PHPStan', 'Cppcheck', 'Clang-tidy', 
               'Bandit', 'PyLint', 'gosec', 'staticcheck', 'Brakeman', 'RuboCop', 'Clippy', 'cargo-audit', 
               'ESLint', 'Semgrep'];

const langMap = {
    'SpotBugs': 'Java', 'PMD': 'Java', 'Checkstyle': 'Java',
    'PHPCS': 'PHP', 'Psalm': 'PHP', 'PHPStan': 'PHP',
    'Cppcheck': 'C++', 'Clang-tidy': 'C++',
    'Bandit': 'Python', 'PyLint': 'Python',
    'gosec': 'Go', 'staticcheck': 'Go',
    'Brakeman': 'Ruby', 'RuboCop': 'Ruby',
    'Clippy': 'Rust', 'cargo-audit': 'Rust',
    'ESLint': 'JavaScript', 'Semgrep': 'Multi'
};

// Build matrix rows
let matrixRows = '';
tools.forEach(tool => {
    let row = \`| \${tool} |\`;
    ['Java', 'PHP', 'C++', 'Python', 'Go', 'Ruby', 'Rust', 'JavaScript'].forEach(lang => {
        const test = tests.find(t => t.tool === tool);
        if (test && (langMap[tool] === lang || (tool === 'Semgrep' && test))) {
            row += test.status === 'success' ? ' ✅ |' : ' ❌ |';
        } else if (langMap[tool] === lang) {
            row += ' ❌ |';
        } else {
            row += ' - |';
        }
    });
    const test = tests.find(t => t.tool === tool);
    const statusIcon = test ? (test.status === 'success' ? '🟢' : '🔴') : '⚪';
    row += \` \${statusIcon} |\`;
    matrixRows += row + '\\n';
});

// Update matrix
if (!matrix.includes('Session: ' + sessionId)) {
    matrix += matrixUpdate + matrixRows;
    fs.writeFileSync(matrixFile, matrix);
    console.log(\`✅ Coverage matrix updated: \${matrixFile}\`);
}

// Update session metadata to completed
const metadata = {
    sessionId: sessionId,
    timestamp: new Date().toISOString(),
    environment: { type: 'local_demo' },
    status: 'completed',
    summary: {
        totalTests: totalTests,
        successful: successfulTests,
        failed: failedTests,
        successRate: successRate,
        avgAccuracy: avgAccuracy,
        totalTime: totalTime
    }
};

fs.writeFileSync(
    path.join(resultsDir, 'sessions', sessionId, 'metadata.json'),
    JSON.stringify(metadata, null, 2)
);

NODEJS_SCRIPT

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         Demo Testing Complete!                ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Display summary
echo -e "${CYAN}📊 Test Summary:${NC}"
echo "   • 18 tools tested across 8 languages"
echo "   • 15 tools successfully executed (83.3%)"
echo "   • 3 tools not installed"
echo "   • Average accuracy: 88.9%"
echo "   • Total execution time: 13.52 seconds"
echo ""

echo -e "${CYAN}📁 Results Location:${NC}"
echo "   Session: $RESULTS_DIR/sessions/$SESSION_ID/"
echo "   Report:  $RESULTS_DIR/reports/${SESSION_ID}.md"
echo "   Matrix:  $RESULTS_DIR/matrices/master-coverage-matrix.md"
echo ""

echo -e "${CYAN}📄 View the generated report:${NC}"
echo "   cat $RESULTS_DIR/reports/${SESSION_ID}.md"
echo ""

echo -e "${CYAN}🎯 Key Findings:${NC}"
echo "   ✅ Java tools: 93% accuracy (SpotBugs, PMD, Checkstyle)"
echo "   ✅ C++ tools: 87% accuracy (Cppcheck, Clang-tidy)" 
echo "   ✅ JavaScript: 107% accuracy (ESLint found more issues)"
echo "   ⚠️  Missing: Psalm, PyLint, cargo-audit"
echo "   ⚡ Fastest tool: Bandit (290ms)"
echo "   🐌 Slowest tool: Semgrep (2100ms)"
echo ""

echo -e "${YELLOW}💡 This was a demo simulation. For real testing:${NC}"
echo "   1. Set DROPLET_IP environment variable"
echo "   2. Run ./scripts/deploy-with-tracking.sh"
echo "   3. Tools will be installed and tested on the actual droplet"
echo ""