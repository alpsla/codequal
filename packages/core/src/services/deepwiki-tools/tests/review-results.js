#!/usr/bin/env node

/**
 * Tool Result Review Helper
 * Helps review and analyze tool outputs from the phased testing
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const RESULTS_DIR = path.join(__dirname, 'test-results');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

async function listTestResults() {
  if (!fs.existsSync(RESULTS_DIR)) {
    console.log(colorize('❌ No test results found. Run the tests first!', 'red'));
    return null;
  }
  
  const dates = fs.readdirSync(RESULTS_DIR).filter(d => 
    fs.statSync(path.join(RESULTS_DIR, d)).isDirectory()
  );
  
  if (dates.length === 0) {
    console.log(colorize('❌ No test results found.', 'red'));
    return null;
  }
  
  console.log(colorize('\n📅 Available test runs:', 'cyan'));
  dates.forEach((date, index) => {
    console.log(`  ${index + 1}. ${date}`);
  });
  
  return dates;
}

async function reviewToolResult(filepath) {
  const content = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  
  console.log('\n' + '─'.repeat(80));
  console.log(colorize(`📄 ${path.basename(filepath)}`, 'bright'));
  console.log('─'.repeat(80));
  
  if (content.success) {
    console.log(colorize('✅ Success', 'green'), `(${content.executionTime}ms)`);
    
    if (content.metadata) {
      console.log(colorize('\n📊 Metadata:', 'cyan'));
      console.log(JSON.stringify(content.metadata, null, 2));
    }
    
    if (content.output) {
      console.log(colorize('\n📋 Key Findings:', 'cyan'));
      
      // Tool-specific formatting
      const toolName = path.basename(filepath).split('_').pop().replace('.json', '');
      
      switch (toolName) {
        case 'npm-audit':
          if (content.metadata?.totalVulnerabilities > 0) {
            console.log(colorize(`  ⚠️  ${content.metadata.totalVulnerabilities} vulnerabilities found:`, 'yellow'));
            Object.entries(content.metadata.vulnerabilities).forEach(([level, count]) => {
              if (count > 0) {
                const color = level === 'critical' || level === 'high' ? 'red' : 'yellow';
                console.log(`     ${colorize(level.toUpperCase(), color)}: ${count}`);
              }
            });
          } else {
            console.log(colorize('  ✅ No vulnerabilities found', 'green'));
          }
          break;
          
        case 'license-checker':
          console.log(`  Total packages: ${content.output.totalPackages || 0}`);
          if (content.output.riskyLicenses?.length > 0) {
            console.log(colorize(`  ⚠️  Risky licenses found:`, 'yellow'));
            content.output.riskyLicenses.forEach(pkg => {
              console.log(`     - ${pkg.name}: ${pkg.license}`);
            });
          }
          break;
          
        case 'madge':
          if (content.output.circular?.length > 0) {
            console.log(colorize(`  ⚠️  ${content.output.circular.length} circular dependencies found`, 'yellow'));
          } else {
            console.log(colorize('  ✅ No circular dependencies', 'green'));
          }
          if (content.output.orphans?.length > 0) {
            console.log(`  📦 ${content.output.orphans.length} orphaned modules`);
          }
          break;
          
        case 'dependency-cruiser':
          const violations = content.output.violations?.length || 0;
          if (violations > 0) {
            console.log(colorize(`  ⚠️  ${violations} rule violations`, 'yellow'));
          } else {
            console.log(colorize('  ✅ No violations', 'green'));
          }
          break;
          
        case 'npm-outdated':
          if (content.output.outdatedCount > 0) {
            console.log(colorize(`  ⚠️  ${content.output.outdatedCount} outdated packages`, 'yellow'));
            if (content.metadata?.majorUpdates > 0) {
              console.log(colorize(`     Major updates: ${content.metadata.majorUpdates}`, 'red'));
            }
            if (content.metadata?.minorUpdates > 0) {
              console.log(`     Minor updates: ${content.metadata.minorUpdates}`);
            }
          } else {
            console.log(colorize('  ✅ All packages up to date', 'green'));
          }
          break;
      }
    }
  } else {
    console.log(colorize('❌ Failed', 'red'));
    console.log(`   Error: ${content.error}`);
  }
  
  return new Promise(resolve => {
    rl.question(colorize('\n🔍 View full output? [y/N]: ', 'cyan'), answer => {
      if (answer.toLowerCase() === 'y') {
        console.log(colorize('\nFull Output:', 'bright'));
        console.log(JSON.stringify(content.output, null, 2));
      }
      resolve();
    });
  });
}

async function reviewTestRun(dateDir) {
  const resultsPath = path.join(RESULTS_DIR, dateDir);
  const files = fs.readdirSync(resultsPath).filter(f => f.endsWith('.json'));
  
  // Load summary if exists
  const summaryPath = path.join(resultsPath, 'test-summary.json');
  if (fs.existsSync(summaryPath)) {
    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
    
    console.log(colorize('\n📊 Test Summary', 'bright'));
    console.log('='.repeat(80));
    console.log(`Date: ${summary.timestamp}`);
    console.log(`Repositories tested: ${summary.totalRepos}`);
    
    summary.results.forEach(repo => {
      console.log(colorize(`\n📦 ${repo.repository}`, 'cyan'));
      
      repo.tools.forEach(tool => {
        const status = tool.success ? colorize('✅', 'green') : colorize('❌', 'red');
        const time = tool.executionTime ? `(${tool.executionTime}ms)` : '';
        console.log(`  ${status} ${tool.tool} ${time}`);
        
        if (tool.key_findings) {
          Object.entries(tool.key_findings).forEach(([key, value]) => {
            if (typeof value === 'number' && value > 0) {
              console.log(`     ${key}: ${value}`);
            }
          });
        }
      });
    });
  }
  
  // Review individual results
  const individualFiles = files.filter(f => f !== 'test-summary.json');
  
  if (individualFiles.length > 0) {
    const review = await new Promise(resolve => {
      rl.question(colorize('\n🔍 Review individual tool results? [Y/n]: ', 'cyan'), answer => {
        resolve(answer.toLowerCase() !== 'n');
      });
    });
    
    if (review) {
      for (const file of individualFiles) {
        await reviewToolResult(path.join(resultsPath, file));
        
        const continueReview = await new Promise(resolve => {
          rl.question(colorize('\nContinue? [Y/n]: ', 'cyan'), answer => {
            resolve(answer.toLowerCase() !== 'n');
          });
        });
        
        if (!continueReview) break;
      }
    }
  }
}

async function compareRuns() {
  const dates = await listTestResults();
  if (!dates || dates.length < 2) {
    console.log(colorize('Need at least 2 test runs to compare', 'yellow'));
    return;
  }
  
  console.log(colorize('\nSelect two runs to compare:', 'cyan'));
  
  const run1 = await new Promise(resolve => {
    rl.question('First run (number): ', resolve);
  });
  
  const run2 = await new Promise(resolve => {
    rl.question('Second run (number): ', resolve);
  });
  
  const date1 = dates[parseInt(run1) - 1];
  const date2 = dates[parseInt(run2) - 1];
  
  const summary1Path = path.join(RESULTS_DIR, date1, 'test-summary.json');
  const summary2Path = path.join(RESULTS_DIR, date2, 'test-summary.json');
  
  if (!fs.existsSync(summary1Path) || !fs.existsSync(summary2Path)) {
    console.log(colorize('❌ Summary files not found', 'red'));
    return;
  }
  
  const summary1 = JSON.parse(fs.readFileSync(summary1Path, 'utf-8'));
  const summary2 = JSON.parse(fs.readFileSync(summary2Path, 'utf-8'));
  
  console.log(colorize('\n📊 Comparison Results', 'bright'));
  console.log('='.repeat(80));
  console.log(`Comparing: ${date1} vs ${date2}`);
  
  // Compare each repository
  summary1.results.forEach(repo1 => {
    const repo2 = summary2.results.find(r => r.repository === repo1.repository);
    if (!repo2) return;
    
    console.log(colorize(`\n📦 ${repo1.repository}`, 'cyan'));
    
    repo1.tools.forEach(tool1 => {
      const tool2 = repo2.tools.find(t => t.tool === tool1.tool);
      if (!tool2) return;
      
      const status1 = tool1.success ? '✅' : '❌';
      const status2 = tool2.success ? '✅' : '❌';
      
      console.log(`  ${tool1.tool}:`);
      console.log(`    Status: ${status1} → ${status2}`);
      
      if (tool1.executionTime && tool2.executionTime) {
        const diff = tool2.executionTime - tool1.executionTime;
        const color = diff > 0 ? 'red' : 'green';
        console.log(`    Time: ${tool1.executionTime}ms → ${tool2.executionTime}ms (${colorize(`${diff > 0 ? '+' : ''}${diff}ms`, color)})`);
      }
      
      // Compare key findings
      if (tool1.key_findings && tool2.key_findings) {
        Object.keys(tool1.key_findings).forEach(key => {
          const val1 = tool1.key_findings[key];
          const val2 = tool2.key_findings[key];
          
          if (typeof val1 === 'number' && typeof val2 === 'number' && val1 !== val2) {
            const diff = val2 - val1;
            const color = diff > 0 ? 'yellow' : 'green';
            console.log(`    ${key}: ${val1} → ${val2} (${colorize(`${diff > 0 ? '+' : ''}${diff}`, color)})`);
          }
        });
      }
    });
  });
}

async function main() {
  console.log(colorize('🔍 DeepWiki Tool Test Result Reviewer', 'bright'));
  console.log('=====================================\n');
  
  while (true) {
    console.log(colorize('\nOptions:', 'cyan'));
    console.log('  1. Review test results');
    console.log('  2. Compare test runs');
    console.log('  3. Exit');
    
    const choice = await new Promise(resolve => {
      rl.question(colorize('\nSelect option: ', 'cyan'), resolve);
    });
    
    switch (choice) {
      case '1':
        const dates = await listTestResults();
        if (dates) {
          const selection = await new Promise(resolve => {
            rl.question(colorize('\nSelect test run (number): ', 'cyan'), resolve);
          });
          
          const selectedDate = dates[parseInt(selection) - 1];
          if (selectedDate) {
            await reviewTestRun(selectedDate);
          }
        }
        break;
        
      case '2':
        await compareRuns();
        break;
        
      case '3':
        console.log(colorize('\n👋 Goodbye!', 'green'));
        rl.close();
        return;
        
      default:
        console.log(colorize('Invalid option', 'red'));
    }
  }
}

main().catch(error => {
  console.error(colorize('Error:', 'red'), error);
  rl.close();
  process.exit(1);
});
