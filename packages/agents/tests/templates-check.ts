/**
 * This script checks for the presence of all required prompt templates
 * based on the roles and providers defined in the agent registry.
 */

import { AgentProvider, AgentRole } from '@codequal/core';
import * as fs from 'fs';
import * as path from 'path';

// Template directory path
const templatesDir = path.join(__dirname, '../src/prompts/templates');

// Check if templates directory exists
if (!fs.existsSync(templatesDir)) {
  console.error(`Templates directory not found: ${templatesDir}`);
  process.exit(1);
}

console.log('Checking for required prompt templates...\n');

// Define required templates for each provider
const requiredTemplates = {
  claude: Object.values(AgentRole).map(role => `claude_${role}_template.txt`),
  openai: Object.values(AgentRole).map(role => `openai_${role}_template.txt`),
  deepseek: Object.values(AgentRole).map(role => `deepseek_${role}_template.txt`),
};

// Add system prompts
const systemPrompts = {
  claude: Object.values(AgentRole).map(role => `claude_${role}_template_system.txt`),
  openai: Object.values(AgentRole).map(role => `openai_${role}_template_system.txt`),
  deepseek: Object.values(AgentRole).map(role => `deepseek_${role}_template_system.txt`),
};

// Get existing templates
const existingFiles = fs.readdirSync(templatesDir);

console.log('='.repeat(50));
console.log('CLAUDE TEMPLATES');
console.log('='.repeat(50));

checkTemplates('claude', requiredTemplates.claude, existingFiles);
checkTemplates('claude system', systemPrompts.claude, existingFiles);

console.log('\n');
console.log('='.repeat(50));
console.log('OPENAI TEMPLATES');
console.log('='.repeat(50));

checkTemplates('openai', requiredTemplates.openai, existingFiles);
checkTemplates('openai system', systemPrompts.openai, existingFiles);

console.log('\n');
console.log('='.repeat(50));
console.log('DEEPSEEK TEMPLATES');
console.log('='.repeat(50));

checkTemplates('deepseek', requiredTemplates.deepseek, existingFiles);
checkTemplates('deepseek system', systemPrompts.deepseek, existingFiles);

/**
 * Check if templates exist
 * @param provider Provider name
 * @param templates List of template files to check
 * @param existingFiles List of existing files
 */
function checkTemplates(provider: string, templates: string[], existingFiles: string[]) {
  console.log(`Checking ${provider} templates...`);
  
  let missingCount = 0;
  
  for (const template of templates) {
    const exists = existingFiles.includes(template);
    console.log(`  ${exists ? '✅' : '❌'} ${template}`);
    
    if (!exists) {
      missingCount++;
    }
  }
  
  console.log(`\nMissing ${missingCount} of ${templates.length} templates for ${provider}`);
}

// Run the template check
console.log('\nTemplate check complete.');
