/**
 * Extract unique rules from PyGoat analysis to calibrate patterns
 */
import * as fs from 'fs';
import * as path from 'path';

const reportDir = path.join(__dirname, 'tests/integration/test-outputs/pipeline-all-languages/python');
const attachmentsDir = path.join(__dirname, 'tests/integration/test-outputs/attachments');

// Read basic tier report for full issue list
const basicReport = fs.readFileSync(path.join(reportDir, 'basic-tier-report.md'), 'utf8');

// Extract rule patterns from the report
const ruleMatches = basicReport.match(/\*\*Rule:\*\*\s*`([^`]+)`/g) || [];
const rules = ruleMatches.map(m => m.replace('**Rule:** `', '').replace('`', ''));

// Count by tool (from the report format: "Tool: toolname")
const toolMatches = basicReport.match(/\*\*Tool:\*\*\s*`([^`]+)`/g) || [];
const tools = toolMatches.map(m => m.replace('**Tool:** `', '').replace('`', ''));

// Build rule->tool mapping
const rulesByTool: Record<string, Set<string>> = {};
for (let i = 0; i < rules.length && i < tools.length; i++) {
  const tool = tools[i];
  const rule = rules[i];
  if (!rulesByTool[tool]) rulesByTool[tool] = new Set();
  rulesByTool[tool].add(rule);
}

console.log('=== PYGOAT RULES NEEDING PATTERNS ===\n');

for (const [tool, rulesSet] of Object.entries(rulesByTool)) {
  const ruleList = Array.from(rulesSet).sort();
  console.log(`${tool}: ${ruleList.length} unique rules`);
  for (const rule of ruleList) {
    console.log(`  - ${rule}`);
  }
  console.log('');
}

// Print as JSON for pattern creation
console.log('\n=== JSON FORMAT FOR PATTERN CREATION ===\n');
const output: Record<string, string[]> = {};
for (const [tool, rulesSet] of Object.entries(rulesByTool)) {
  output[tool] = Array.from(rulesSet).sort();
}
console.log(JSON.stringify(output, null, 2));
