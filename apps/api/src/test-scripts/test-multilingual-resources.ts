#!/usr/bin/env node
import chalk from 'chalk';
import { EducationalLinkValidator } from '../services/educational-link-validator';

async function testMultilingualResources() {
  console.log(chalk.cyan('\n🌍 Testing Multi-Language Educational Resources\n'));
  
  const validator = new EducationalLinkValidator();
  
  // Test topics that would be extracted from findings
  const testTopics = ['security', 'error handling', 'typescript', 'validation'];
  
  // Languages to test
  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'es', name: 'Spanish', flag: '🇪🇸' },
    { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
    { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
    { code: 'de', name: 'German', flag: '🇩🇪' },
    { code: 'fr', name: 'French', flag: '🇫🇷' },
    { code: 'ko', name: 'Korean', flag: '🇰🇷' },
    { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
    { code: 'ru', name: 'Russian', flag: '🇷🇺' },
    { code: 'hi', name: 'Hindi', flag: '🇮🇳' }
  ];
  
  console.log(`Testing educational resources for topics: ${testTopics.join(', ')}\n`);
  
  for (const lang of languages) {
    console.log(chalk.blue(`\n${lang.flag} ${lang.name} Resources:`));
    console.log('='.repeat(60));
    
    try {
      // Get validated resources for this language
      const resources = await validator.getValidatedResources(
        testTopics,
        lang.code as any,
        3
      );
      
      if (resources.length === 0) {
        // Try fallback resources
        const fallbacks = validator.getFallbackResources(lang.code as any);
        console.log(chalk.yellow(`No specific resources found. Using ${fallbacks.length} fallback resources:`));
        
        fallbacks.slice(0, 3).forEach((resource, i) => {
          console.log(`\n${i + 1}. ${resource.title}`);
          console.log(`   ${resource.url}`);
          console.log(`   Duration: ${resource.duration} | Level: ${resource.level}`);
        });
      } else {
        resources.forEach((resource, i) => {
          console.log(`\n${i + 1}. ${resource.title}`);
          console.log(`   ${resource.url}`);
          console.log(`   Duration: ${resource.duration} | Level: ${resource.level}`);
          console.log(`   Topics: ${resource.topics.join(', ')}`);
          console.log(`   Status: ${resource.isAccessible ? chalk.green('✓ Verified') : chalk.red('✗ Invalid')}`);
        });
      }
    } catch (error) {
      console.error(chalk.red(`Error getting resources for ${lang.name}:`), error);
    }
  }
  
  // Show how it would look in an actual report
  console.log(chalk.cyan('\n\n📄 Example: How Resources Appear in Reports'));
  console.log('='.repeat(60));
  
  const exampleLanguages = ['en', 'es', 'zh', 'ru'];
  
  for (const langCode of exampleLanguages) {
    const lang = languages.find(l => l.code === langCode);
    if (!lang) continue;
    
    console.log(chalk.blue(`\n${lang.flag} ${lang.name} Report Section:`));
    
    const resources = await validator.getValidatedResources(['security', 'validation'], langCode as any, 2);
    
    if (langCode === 'en') {
      console.log('\n📚 Educational Resources');
      console.log('Based on the analysis, we recommend these learning resources:');
    } else if (langCode === 'es') {
      console.log('\n📚 Recursos Educativos');
      console.log('Basado en el análisis, recomendamos estos recursos de aprendizaje:');
    } else if (langCode === 'zh') {
      console.log('\n📚 教育资源');
      console.log('根据分析，我们推荐以下学习资源：');
    } else if (langCode === 'ru') {
      console.log('\n📚 Образовательные ресурсы');
      console.log('На основе анализа мы рекомендуем следующие обучающие материалы:');
    }
    
    resources.forEach(resource => {
      console.log(`\n• ${resource.title}`);
      console.log(`  ${resource.url}`);
    });
  }
  
  // Demonstrate Chrome translation note
  console.log(chalk.yellow('\n\n💡 Chrome Translation Support'));
  console.log('='.repeat(60));
  console.log('For resources not available in your language:');
  console.log('1. Chrome automatically detects page language');
  console.log('2. Right-click → "Translate to [Your Language]"');
  console.log('3. Or use Chrome\'s automatic translation popup');
  console.log('\nExample: English MDN docs → Auto-translate to any of our 10 supported languages');
  
  console.log(chalk.cyan('\n\n✅ Multi-language resource test completed!\n'));
}

// Run the test
if (require.main === module) {
  testMultilingualResources().catch(console.error);
}

export { testMultilingualResources };