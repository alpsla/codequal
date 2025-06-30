#!/usr/bin/env node
import chalk from 'chalk';
import { EducationalLinkValidator } from '../services/educational-link-validator';

async function testLinkValidation() {
  console.log(chalk.cyan('\n🔗 Testing Educational Link Validation\n'));
  
  const validator = new EducationalLinkValidator();
  
  // Test URLs that we know have issues
  const testUrls = [
    {
      url: 'https://nodejs.org/en/docs/guides/error-handling',
      expected: false,
      description: 'Old Node.js guide (404)'
    },
    {
      url: 'https://www.typescriptlang.org/docs/handbook/2/narrowing.html',
      expected: true,
      description: 'TypeScript Handbook'
    },
    {
      url: 'https://learn.javascript.ru/error-handling',
      expected: true,
      description: 'Russian JavaScript tutorial'
    },
    {
      url: 'https://github.com/goldbergyoni/nodebestpractices#2-error-handling-practices',
      expected: true,
      description: 'Node.js Best Practices (GitHub)'
    }
  ];
  
  console.log('Testing individual URLs:');
  console.log('='.repeat(50));
  
  for (const test of testUrls) {
    process.stdout.write(`Testing: ${test.description}... `);
    const isValid = await validator.validateUrl(test.url);
    
    if (isValid === test.expected) {
      console.log(chalk.green('✓ Passed'));
    } else {
      console.log(chalk.red(`✗ Failed (got ${isValid}, expected ${test.expected})`));
    }
    
    console.log(`  URL: ${test.url}`);
    console.log(`  Status: ${isValid ? 'Accessible' : 'Not accessible'}\n`);
  }
  
  // Test getting validated resources for specific topics
  console.log(chalk.blue('\nTesting topic-based resource selection:'));
  console.log('='.repeat(50));
  
  const topics = ['security', 'error handling', 'typescript'];
  
  console.log('English resources for:', topics.join(', '));
  const englishResources = await validator.getValidatedResources(topics, 'en', 3);
  
  englishResources.forEach((resource, i) => {
    console.log(`\n${i + 1}. ${resource.title}`);
    console.log(`   URL: ${resource.url}`);
    console.log(`   Status: ${resource.isAccessible ? chalk.green('✓ Verified') : chalk.red('✗ Invalid')}`);
  });
  
  console.log(chalk.blue('\n\nRussian resources for:'), topics.join(', '));
  const russianResources = await validator.getValidatedResources(topics, 'ru', 3);
  
  russianResources.forEach((resource, i) => {
    console.log(`\n${i + 1}. ${resource.title}`);
    console.log(`   URL: ${resource.url}`);
    console.log(`   Status: ${resource.isAccessible ? chalk.green('✓ Проверено') : chalk.red('✗ Недоступно')}`);
  });
  
  // Test fallback mechanism
  console.log(chalk.blue('\n\nTesting fallback resources:'));
  console.log('='.repeat(50));
  
  const fallbacksEn = validator.getFallbackResources('en');
  const fallbacksRu = validator.getFallbackResources('ru');
  
  console.log('\nEnglish fallbacks:');
  fallbacksEn.forEach(resource => {
    console.log(`- ${resource.title}`);
    console.log(`  ${resource.url}`);
  });
  
  console.log('\nRussian fallbacks:');
  fallbacksRu.forEach(resource => {
    console.log(`- ${resource.title}`);
    console.log(`  ${resource.url}`);
  });
  
  console.log(chalk.cyan('\n\n✅ Link validation test completed!\n'));
}

// Run the test
if (require.main === module) {
  testLinkValidation().catch(console.error);
}

export { testLinkValidation };