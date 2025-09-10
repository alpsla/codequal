const fs = require('fs');
const path = require('path');

// Read the latest report
const reportPath = path.join(__dirname, 'src/standard/reports/2025-08-09/pr-500-report.md');
console.log('Reading report from:', reportPath);

// Also check if there's a JSON output
const jsonPath = reportPath.replace('.md', '.json');
if (fs.existsSync(jsonPath)) {
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  console.log('\n📊 Found JSON data:');
  console.log('Issues structure:', JSON.stringify(data.comparison?.newIssues?.issues?.[0] || data.newIssues?.[0], null, 2));
} else {
  console.log('\n❌ No JSON output found');
  
  // Try to run a quick analysis to capture the data structure
  console.log('\nRunning quick test to capture issue structure...');
}
