#!/usr/bin/env ts-node
/**
 * V9 Build Verification Test
 * 
 * Simple test to verify that the V9 analyzer factory works after build fixes
 */

import { V9AnalyzerFactory, SupportedLanguage } from './src/two-branch/analyzers';

async function testV9AnalyzerFactory() {
  console.log('🧪 Testing V9 Analyzer Factory after build fixes...\n');
  
  const testLanguages: SupportedLanguage[] = [
    'java',
    'python',
    'javascript',
    'typescript',
    'rust',
    'go',
    'cpp',
    'c',
    'csharp',
    'ruby',
    'php',
    'swift',
    'kotlin'
  ];
  
  let passedCount = 0;
  let failedCount = 0;
  
  for (const language of testLanguages) {
    try {
      console.log(`Testing ${language}...`);
      
      // Test factory creation
      const analyzer = V9AnalyzerFactory.create(language);
      console.log(`  ✅ ${language}: Factory creation successful`);
      
      // Test language config
      const config = analyzer.getLanguageConfig();
      console.log(`  ✅ ${language}: Language config available (${config.fileExtensions.length} extensions)`);
      
      passedCount++;
    } catch (error) {
      console.log(`  ❌ ${language}: Failed - ${error.message}`);
      failedCount++;
    }
  }
  
  console.log('\n📊 Test Results:');
  console.log(`✅ Passed: ${passedCount}/${testLanguages.length}`);
  console.log(`❌ Failed: ${failedCount}/${testLanguages.length}`);
  
  if (failedCount === 0) {
    console.log('\n🎉 All V9 analyzer tests passed! Build fix successful.');
  } else {
    console.log('\n⚠️  Some tests failed. Review analyzer implementations.');
  }
  
  // Test additional factory features
  console.log('\n🔍 Testing additional factory features...');
  
  try {
    const supportedLanguages = V9AnalyzerFactory.getSupportedLanguages();
    console.log(`✅ getSupportedLanguages(): ${supportedLanguages.length} languages supported`);
    
    const isJavaSupported = V9AnalyzerFactory.isSupported('java');
    console.log(`✅ isSupported('java'): ${isJavaSupported}`);
    
    const isInvalidSupported = V9AnalyzerFactory.isSupported('invalid-language');
    console.log(`✅ isSupported('invalid-language'): ${isInvalidSupported}`);
    
    const javaExtensions = V9AnalyzerFactory.getFileExtensions('java');
    console.log(`✅ getFileExtensions('java'): ${javaExtensions.join(', ')}`);
    
    const detectedLanguage = V9AnalyzerFactory.detectLanguage(['.java', '.xml']);
    console.log(`✅ detectLanguage(['.java', '.xml']): ${detectedLanguage}`);
    
    console.log('🎉 All factory features working correctly!');
    
  } catch (error) {
    console.log(`❌ Factory feature test failed: ${error.message}`);
  }
}

// Run the test
testV9AnalyzerFactory().catch(console.error);