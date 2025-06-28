#!/usr/bin/env node

const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

console.log(chalk.bold.cyan(`
╔═══════════════════════════════════════╗
║   CodeQual Test Integration Setup     ║
║   Validation Script                   ║
╚═══════════════════════════════════════╝
`));

const requiredFiles = [
  'src/e2e/orchestrator-flow.test.ts',
  'src/e2e/run-orchestrator-test.ts',
  'src/setup/test-setup.ts',
  'package.json',
  'tsconfig.json',
  'README.md'
];

const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'GITHUB_TOKEN',
  'OPENAI_API_KEY'
];

let allValid = true;

console.log(chalk.bold('1. Checking required files...'));
requiredFiles.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, file));
  console.log(exists ? 
    chalk.green(`  ✓ ${file}`) : 
    chalk.red(`  ✗ ${file} - MISSING`)
  );
  if (!exists) allValid = false;
});

console.log(chalk.bold('\n2. Checking environment variables...'));
const envPath = path.join(__dirname, '../../../.env.test');
const envExists = fs.existsSync(envPath);

if (envExists) {
  console.log(chalk.green('  ✓ .env.test file found'));
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  requiredEnvVars.forEach(envVar => {
    const hasVar = envContent.includes(envVar);
    console.log(hasVar ? 
      chalk.green(`  ✓ ${envVar}`) : 
      chalk.red(`  ✗ ${envVar} - MISSING`)
    );
    if (!hasVar) allValid = false;
  });
} else {
  console.log(chalk.red('  ✗ .env.test file not found'));
  console.log(chalk.yellow('    Create .env.test in project root with required variables'));
  allValid = false;
}

console.log(chalk.bold('\n3. Checking MCP tools coverage...'));
const testFile = fs.readFileSync(path.join(__dirname, 'src/e2e/orchestrator-flow.test.ts'), 'utf8');

const mcpTools = [
  'context7-mcp',
  'working-examples-mcp',
  'mcp-docs-service',
  'chartjs-mcp',
  'mermaid-mcp',
  'markdown-pdf-mcp'
];

mcpTools.forEach(tool => {
  const hasTool = testFile.includes(tool);
  console.log(hasTool ? 
    chalk.green(`  ✓ ${tool}`) : 
    chalk.red(`  ✗ ${tool} - NOT TESTED`)
  );
  if (!hasTool) allValid = false;
});

console.log(chalk.bold('\n4. Package.json scripts validation...'));
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));

const requiredScripts = [
  'test:orchestrator',
  'test:orchestrator:debug',
  'test:tools',
  'test:educational',
  'test:reporting'
];

requiredScripts.forEach(script => {
  const hasScript = packageJson.scripts && packageJson.scripts[script];
  console.log(hasScript ? 
    chalk.green(`  ✓ ${script}`) : 
    chalk.red(`  ✗ ${script} - MISSING`)
  );
  if (!hasScript) allValid = false;
});

console.log(chalk.bold('\n5. Test runner validation...'));
const runnerFile = path.join(__dirname, 'src/e2e/run-orchestrator-test.ts');
const runnerStats = fs.statSync(runnerFile);
const isExecutable = !!(runnerStats.mode & parseInt('111', 8));

console.log(isExecutable ? 
  chalk.green('  ✓ Test runner is executable') : 
  chalk.yellow('  ⚠ Test runner may need execute permissions')
);

console.log(chalk.bold('\n6. Final validation...'));
if (allValid) {
  console.log(chalk.green.bold('✅ All validations passed!'));
  console.log(chalk.gray('\nYou can now run:'));
  console.log(chalk.cyan('  cd /Users/alpinro/Code\\ Prjects/codequal/packages/test-integration'));
  console.log(chalk.cyan('  npm install'));
  console.log(chalk.cyan('  npm run test:orchestrator'));
} else {
  console.log(chalk.red.bold('❌ Some validations failed!'));
  console.log(chalk.yellow('\nPlease fix the issues above before running tests.'));
}

console.log(chalk.gray('\n' + '─'.repeat(50)));
console.log(chalk.bold('Test Integration Package Summary:'));
console.log(chalk.gray('• Complete orchestrator flow testing'));
console.log(chalk.gray('• Educational Agent MCP tools'));
console.log(chalk.gray('• Reporter Agent MCP tools'));
console.log(chalk.gray('• End-to-end data validation'));
console.log(chalk.gray('• Performance benchmarking'));