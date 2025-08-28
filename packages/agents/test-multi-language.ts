/**
 * Test multi-language support for code snippet extraction
 */

import { CodeSnippetExtractor } from './src/standard/services/code-snippet-extractor';

async function testMultiLanguageSupport() {
  console.log('🌍 Testing Multi-Language Support\n');
  console.log('=' .repeat(60) + '\n');
  
  const extractor = new CodeSnippetExtractor();
  const extractorAny = extractor as any;
  
  // Test placeholder detection across languages
  const testCases = [
    // JavaScript/TypeScript placeholders
    { code: 'const url = "http://example.com/api"', expected: true, lang: 'JS' },
    { code: 'function doSomething() { /* TODO */ }', expected: true, lang: 'JS' },
    { code: 'const data = await fetch("/api/users")', expected: false, lang: 'JS' },
    
    // Python placeholders
    { code: 'def example_function():\n    # TODO: implement', expected: true, lang: 'Python' },
    { code: 'password = "password123"', expected: true, lang: 'Python' },
    { code: 'def calculate_hash(data):\n    return hashlib.sha256(data)', expected: false, lang: 'Python' },
    
    // Java placeholders
    { code: 'public class Example { // TODO }', expected: true, lang: 'Java' },
    { code: 'String apiKey = "YOUR_API_KEY";', expected: true, lang: 'Java' },
    { code: 'public void processRequest(Request req) { validator.validate(req); }', expected: false, lang: 'Java' },
    
    // Go placeholders
    { code: 'func handleClick() { // implement }', expected: true, lang: 'Go' },
    { code: 'url := "http://localhost:8080"', expected: true, lang: 'Go' },
    { code: 'func HashPassword(pwd string) (string, error) { return bcrypt.Generate(pwd) }', expected: false, lang: 'Go' },
    
    // Ruby placeholders
    { code: 'def foo\n  # TODO: add implementation\nend', expected: true, lang: 'Ruby' },
    { code: 'user_email = "user@example.com"', expected: true, lang: 'Ruby' },
    { code: 'def validate_input(params)\n  params.require(:user).permit(:name)\nend', expected: false, lang: 'Ruby' },
  ];
  
  console.log('📝 Testing Placeholder Detection:\n');
  let passCount = 0;
  
  testCases.forEach(({ code, expected, lang }) => {
    const isPlaceholder = extractorAny.isGenericPlaceholderCode(code);
    const passed = isPlaceholder === expected;
    passCount += passed ? 1 : 0;
    
    console.log(`[${lang}] ${passed ? '✅' : '❌'} "${code.substring(0, 40)}..."`);
    if (!passed) {
      console.log(`   Expected: ${expected ? 'placeholder' : 'real code'}, Got: ${isPlaceholder ? 'placeholder' : 'real code'}`);
    }
  });
  
  console.log(`\n✅ Passed: ${passCount}/${testCases.length} tests\n`);
  
  // Test file path validation
  const filePaths = [
    // Valid paths across languages
    { path: 'src/main.py', expected: true },
    { path: 'lib/utils.rb', expected: true },
    { path: 'pkg/handler.go', expected: true },
    { path: 'src/Main.java', expected: true },
    { path: 'app/components/Button.tsx', expected: true },
    { path: 'src/lib.rs', expected: true },
    { path: 'tests/test_auth.py', expected: true },
    { path: 'Dockerfile', expected: true },
    { path: 'Makefile', expected: true },
    { path: 'package.json', expected: true },
    
    // Invalid paths
    { path: 'example.txt', expected: false },
    { path: 'unknown', expected: false },
    { path: 'some/random/path', expected: false },
    { path: 'image.png', expected: false },
    { path: 'document.pdf', expected: false },
  ];
  
  console.log('📁 Testing File Path Validation:\n');
  let pathPassCount = 0;
  
  filePaths.forEach(({ path, expected }) => {
    const isValid = extractorAny.isValidFilePath(path);
    const passed = isValid === expected;
    pathPassCount += passed ? 1 : 0;
    
    console.log(`${passed ? '✅' : '❌'} ${path} - ${expected ? 'should be valid' : 'should be invalid'}`);
  });
  
  console.log(`\n✅ Passed: ${pathPassCount}/${filePaths.length} path tests\n`);
  
  // Summary
  console.log('=' .repeat(60));
  console.log('📊 Summary:');
  
  const totalTests = testCases.length + filePaths.length;
  const totalPassed = passCount + pathPassCount;
  const successRate = (totalPassed / totalTests) * 100;
  
  console.log(`  Total Tests: ${totalTests}`);
  console.log(`  Passed: ${totalPassed}`);
  console.log(`  Success Rate: ${successRate.toFixed(1)}%`);
  
  if (successRate >= 90) {
    console.log('\n🎉 Excellent! Multi-language support is working well!');
  } else if (successRate >= 70) {
    console.log('\n⚠️  Good, but some edge cases need attention.');
  } else {
    console.log('\n❌ Needs improvement for better multi-language support.');
  }
}

testMultiLanguageSupport().catch(console.error);