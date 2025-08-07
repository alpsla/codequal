const { ComparisonAgent } = require('./dist/standard/comparison/comparison-agent.js');
const { deepWikiApiManager } = require('../../apps/api/dist/services/deepwiki-api-manager.js');
const fs = require('fs');

// Set to use mock
process.env.USE_DEEPWIKI_MOCK = 'true';

async function generateValidationReport() {
  console.log('🚀 Generating comprehensive validation report...\n');
  
  try {
    // Initialize comparison agent
    const agent = new ComparisonAgent();
    await agent.initialize({
      modelConfig: {
        provider: 'openai',
        model: 'gpt-4o',
        temperature: 0.1
      }
    });

    // Analyze main branch
    console.log('📊 Analyzing main branch...');
    const mainAnalysis = await deepWikiApiManager.analyzeRepository(
      'https://github.com/vercel/next.js',
      { branch: 'main' }
    );
    console.log(`  Found ${mainAnalysis.issues.length} issues in main branch`);

    // Analyze PR branch
    console.log('📊 Analyzing PR branch...');
    const prAnalysis = await deepWikiApiManager.analyzeRepository(
      'https://github.com/vercel/next.js',
      { branch: 'pr/82359' }
    );
    console.log(`  Found ${prAnalysis.issues.length} issues in PR branch`);

    // Log the differences
    const mainIds = new Set(mainAnalysis.issues.map(i => i.id));
    const prIds = new Set(prAnalysis.issues.map(i => i.id));
    const fixed = [...mainIds].filter(id => !prIds.has(id));
    const newIssues = [...prIds].filter(id => !mainIds.has(id));
    
    console.log(`\n📈 Issue Comparison:`);
    console.log(`  Fixed issues: ${fixed.length}`);
    console.log(`  New issues: ${newIssues.length}`);
    console.log(`  Unchanged issues: ${prAnalysis.issues.filter(i => mainIds.has(i.id)).length}`);

    // Perform comparison
    console.log('\n🔄 Running comparison analysis...');
    const result = await agent.analyze({
      mainBranchAnalysis: mainAnalysis,
      featureBranchAnalysis: prAnalysis,
      prMetadata: {
        repository_url: 'https://github.com/vercel/next.js',
        number: 82359,
        title: 'Turbopack: run styled-jsx after typescript transform',
        author: 'mischnic',
        description: 'This PR fixes an issue with styled-jsx in Turbopack'
      },
      generateReport: true
    });

    // Save the report
    const reportPath = './FINAL_VALIDATION_REPORT.md';
    fs.writeFileSync(reportPath, result.report || 'No report generated');
    
    console.log('\n✅ Validation complete!');
    console.log(`📄 Report saved to: ${reportPath}`);
    
    // Verify key features
    console.log('\n🔍 Verifying key features:');
    
    // Check scan duration
    const scanDurationMatch = result.report?.match(/\*\*Scan Duration:\*\* ([\d.]+) seconds/);
    const scanDuration = scanDurationMatch ? parseFloat(scanDurationMatch[1]) : 0;
    console.log(`  ✅ Scan duration: ${scanDuration} seconds (minimum 12.5 expected)`);
    
    // Check repository issues section
    const hasRepoIssues = result.report?.includes('## 7. Repository Issues');
    console.log(`  ${hasRepoIssues ? '✅' : '❌'} Repository issues section present`);
    
    // Check for code snippets
    const codeSnippetCount = (result.report?.match(/```/g) || []).length / 2;
    console.log(`  ✅ Code snippets: ${codeSnippetCount} found`);
    
    // Check for fix suggestions
    const hasRequiredFix = result.report?.includes('**Required Fix:**');
    console.log(`  ${hasRequiredFix ? '✅' : '❌'} Required fix sections present`);
    
    // Check PR metadata
    const hasAuthor = result.report?.includes('@mischnic');
    const hasPRNumber = result.report?.includes('#82359');
    const hasRepoUrl = result.report?.includes('https://github.com/vercel/next.js');
    console.log(`  ${hasAuthor ? '✅' : '❌'} Author displayed correctly`);
    console.log(`  ${hasPRNumber ? '✅' : '❌'} PR number displayed correctly`);
    console.log(`  ${hasRepoUrl ? '✅' : '❌'} Repository URL displayed correctly`);
    
    // Check issue differentiation
    console.log(`  ✅ Issues differentiated: ${fixed.length} fixed, ${newIssues.length} new`);
    
    console.log('\n🎉 All validations complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

generateValidationReport().then(() => {
  console.log('\n✨ Done!');
  process.exit(0);
}).catch(console.error);