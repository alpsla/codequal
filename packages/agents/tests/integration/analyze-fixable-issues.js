// Analyze fixable issues for pattern creation
const fs = require("fs");
const data = JSON.parse(fs.readFileSync(process.argv[2] || "test-outputs/nestjs-pro-tier/nestjs-pro-issues-2025-12-09T00-09-27-529Z.json", "utf8"));
const issues = data.issues || [];

// Filter to only fixable issues (not environment issues)
const envRules = ['TS2307', 'TS2580', 'TS2582', 'TS2305'];
const fixableIssues = issues.filter(i => !envRules.includes(i.rule || i.ruleId));

console.log("=== FIXABLE ISSUES FOR PATTERN CREATION ===");
console.log("Total fixable issues:", fixableIssues.length);
console.log("");

// Group by rule
const byRule = {};
for (const i of fixableIssues) {
  const rule = i.rule || i.ruleId || "unknown";
  if (!byRule[rule]) {
    byRule[rule] = {
      count: 0,
      tool: i.tool,
      severity: i.severity,
      samples: []
    };
  }
  byRule[rule].count++;
  if (byRule[rule].samples.length < 3) {
    byRule[rule].samples.push({
      file: i.file,
      line: i.line,
      message: i.message || ""
    });
  }
}

// Sort by count
const sorted = Object.entries(byRule).sort((a, b) => b[1].count - a[1].count);

console.log("=== RULES TO CREATE PATTERNS FOR ===");
console.log("");

for (const [rule, data] of sorted) {
  console.log("================================================================");
  console.log("Rule:", rule);
  console.log("Tool:", data.tool, "| Count:", data.count, "| Severity:", data.severity);
  console.log("----------------------------------------------------------------");
  console.log("Sample occurrences:");
  for (const s of data.samples) {
    const shortFile = s.file.split('/').slice(-3).join('/').substring(0, 50);
    console.log("  " + shortFile + ":" + s.line);
    if (s.message) {
      console.log("  → " + s.message.substring(0, 70));
    }
  }
  console.log("");
}

// Summary
console.log("=== PATTERN CREATION PRIORITY ===");
console.log("");
const totalFixable = fixableIssues.length;
let cumulative = 0;
for (const [rule, data] of sorted.slice(0, 5)) {
  cumulative += data.count;
  const pct = Math.round((cumulative / totalFixable) * 100);
  console.log(rule + ": " + data.count + " issues (" + pct + "% cumulative coverage)");
}
console.log("");
console.log("Creating patterns for top 5 rules covers " + Math.round((cumulative / totalFixable) * 100) + "% of fixable issues!");
