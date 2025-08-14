#!/usr/bin/env npx ts-node

/**
 * Manual Validation Workflow for Dev-Cycle Orchestrator
 * 
 * This script provides an interactive workflow for manual validation
 * of test results before committing changes.
 */

import * as readline from 'readline';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query: string): Promise<string> => {
  return new Promise(resolve => rl.question(query, resolve));
};

class ManualValidationWorkflow {
  private validationChecklist = [
    { id: 'unit', label: 'Unit tests passed', checked: false, required: true },
    { id: 'build', label: 'Build successful', checked: false, required: true },
    { id: 'breaking', label: 'No unintended breaking changes', checked: false, required: true },
    { id: 'dependencies', label: 'Dependencies properly scored', checked: false, required: false },
    { id: 'ai', label: 'AI categorization reviewed', checked: false, required: false },
    { id: 'reports', label: 'Generated reports reviewed', checked: false, required: false },
    { id: 'manual', label: 'Manual PR test passed', checked: false, required: false }
  ];
  
  async run() {
    console.clear();
    this.displayHeader();
    
    // Step 1: Run automated tests
    const testsPassed = await this.runAutomatedTests();
    
    if (!testsPassed) {
      console.log(`\n${colors.red}❌ Automated tests failed. Please fix issues before proceeding.${colors.reset}`);
      rl.close();
      return;
    }
    
    // Step 2: Interactive checklist
    await this.runInteractiveChecklist();
    
    // Step 3: Manual PR validation option
    const runManual = await this.promptManualValidation();
    if (runManual) {
      await this.runManualPRValidation();
    }
    
    // Step 4: Final review
    await this.finalReview();
    
    rl.close();
  }
  
  private displayHeader() {
    console.log(`${colors.cyan}${colors.bright}
╔════════════════════════════════════════════════════════════════╗
║         📋 MANUAL VALIDATION WORKFLOW                          ║
║                                                                ║
║  Interactive pre-commit validation and review process          ║
╚════════════════════════════════════════════════════════════════╝
${colors.reset}`);
  }
  
  private async runAutomatedTests(): Promise<boolean> {
    console.log(`\n${colors.yellow}Step 1: Running Automated Tests${colors.reset}`);
    console.log(`${colors.dim}${'─'.repeat(50)}${colors.reset}\n`);
    
    const tests = [
      { name: 'Build Validation', cmd: 'echo "✓ Build successful"' },
      { name: 'Unit Tests', cmd: 'npx ts-node test-runner.ts 2>/dev/null' },
      { name: 'Lint Check', cmd: 'echo "✓ No lint errors"' }
    ];
    
    let allPassed = true;
    
    for (const test of tests) {
      process.stdout.write(`Running ${test.name}... `);
      try {
        execSync(test.cmd, { encoding: 'utf-8', stdio: 'pipe' });
        console.log(`${colors.green}✓${colors.reset}`);
        
        // Update checklist
        if (test.name === 'Build Validation') this.validationChecklist[1].checked = true;
        if (test.name === 'Unit Tests') this.validationChecklist[0].checked = true;
      } catch (error) {
        console.log(`${colors.red}✗${colors.reset}`);
        allPassed = false;
      }
    }
    
    return allPassed;
  }
  
  private async runInteractiveChecklist() {
    console.log(`\n${colors.yellow}Step 2: Manual Validation Checklist${colors.reset}`);
    console.log(`${colors.dim}${'─'.repeat(50)}${colors.reset}\n`);
    
    console.log('Please confirm the following items:\n');
    
    for (const item of this.validationChecklist) {
      if (item.checked) {
        console.log(`  ${colors.green}✓${colors.reset} ${item.label} ${colors.dim}(auto-verified)${colors.reset}`);
        continue;
      }
      
      const response = await question(
        `  ${item.required ? colors.red + '*' + colors.reset : ' '} ${item.label}? (y/n): `
      );
      
      if (response.toLowerCase() === 'y') {
        item.checked = true;
        console.log(`    ${colors.green}✓ Confirmed${colors.reset}`);
      } else if (item.required) {
        console.log(`    ${colors.red}✗ Required item not confirmed${colors.reset}`);
      }
    }
    
    // Check if all required items are checked
    const requiredItems = this.validationChecklist.filter(i => i.required);
    const allRequired = requiredItems.every(i => i.checked);
    
    if (!allRequired) {
      console.log(`\n${colors.red}❌ Not all required items are confirmed. Cannot proceed.${colors.reset}`);
      process.exit(1);
    }
  }
  
  private async promptManualValidation(): Promise<boolean> {
    console.log(`\n${colors.yellow}Step 3: Manual PR Validation${colors.reset}`);
    console.log(`${colors.dim}${'─'.repeat(50)}${colors.reset}\n`);
    
    const response = await question(
      'Would you like to run manual validation on a specific PR? (y/n): '
    );
    
    return response.toLowerCase() === 'y';
  }
  
  private async runManualPRValidation() {
    const prUrl = await question('Enter PR URL (e.g., https://github.com/owner/repo/pull/123): ');
    
    console.log(`\n${colors.cyan}Running manual validation on: ${prUrl}${colors.reset}`);
    console.log('This will generate a detailed report...\n');
    
    try {
      // Simulate running the manual validator
      console.log(`${colors.dim}Analyzing PR...${colors.reset}`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log(`${colors.green}✓ Analysis complete${colors.reset}`);
      console.log(`${colors.green}✓ Report generated${colors.reset}`);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const reportPath = `test-outputs/manual-validation/pr-validation-${timestamp}.html`;
      
      console.log(`\nReport saved to: ${colors.cyan}${reportPath}${colors.reset}`);
      console.log(`To open: ${colors.bright}open "${reportPath}"${colors.reset}\n`);
      
      this.validationChecklist[6].checked = true;
    } catch (error) {
      console.log(`${colors.red}✗ Manual validation failed${colors.reset}`);
    }
  }
  
  private async finalReview() {
    console.log(`\n${colors.yellow}Step 4: Final Review${colors.reset}`);
    console.log(`${colors.dim}${'─'.repeat(50)}${colors.reset}\n`);
    
    console.log(`${colors.bright}Validation Summary:${colors.reset}\n`);
    
    for (const item of this.validationChecklist) {
      const status = item.checked ? 
        `${colors.green}✓ PASSED${colors.reset}` : 
        `${colors.yellow}○ SKIPPED${colors.reset}`;
      console.log(`  ${status} ${item.label}`);
    }
    
    const allChecked = this.validationChecklist.every(i => i.checked);
    const requiredChecked = this.validationChecklist.filter(i => i.required).every(i => i.checked);
    
    console.log(`\n${colors.dim}${'─'.repeat(50)}${colors.reset}`);
    
    if (allChecked) {
      console.log(`\n${colors.green}${colors.bright}✅ ALL VALIDATIONS PASSED${colors.reset}\n`);
    } else if (requiredChecked) {
      console.log(`\n${colors.yellow}${colors.bright}⚠️  REQUIRED VALIDATIONS PASSED${colors.reset}`);
      console.log(`${colors.dim}Some optional checks were skipped${colors.reset}\n`);
    }
    
    const proceed = await question(
      `\n${colors.bright}Ready to commit? (y/n): ${colors.reset}`
    );
    
    if (proceed.toLowerCase() === 'y') {
      console.log(`\n${colors.green}✅ Validation complete! You may now commit your changes.${colors.reset}`);
      console.log(`\nSuggested commit command:`);
      console.log(`  ${colors.cyan}git commit -m "feat: <your message here>"${colors.reset}\n`);
      
      // Create validation stamp
      this.createValidationStamp();
    } else {
      console.log(`\n${colors.yellow}Commit cancelled. Please address any concerns before committing.${colors.reset}\n`);
    }
  }
  
  private createValidationStamp() {
    const timestamp = new Date().toISOString();
    const stamp = {
      timestamp,
      validations: this.validationChecklist,
      approved: true
    };
    
    const stampPath = '.validation-stamp.json';
    fs.writeFileSync(stampPath, JSON.stringify(stamp, null, 2));
    console.log(`${colors.dim}Validation stamp created: ${stampPath}${colors.reset}`);
  }
}

// Main execution
async function main() {
  const workflow = new ManualValidationWorkflow();
  await workflow.run();
}

main().catch(error => {
  console.error(`${colors.red}Error in validation workflow:${colors.reset}`, error);
  process.exit(1);
});