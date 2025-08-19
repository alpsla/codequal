/**
 * Test full location preservation flow
 */

import { AdaptiveDeepWikiAnalyzer } from './src/standard/deepwiki/services/adaptive-deepwiki-analyzer';
import { ComparisonAgent } from './src/standard/comparison/comparison-agent';
import { ReportGeneratorV7EnhancedComplete } from './src/standard/comparison/report-generator-v7-enhanced-complete';

async function testFullLocationFlow() {
  console.log('🔍 Testing Full Location Preservation Flow\n');
  
  const deepwikiUrl = process.env.DEEPWIKI_API_URL || 'http://localhost:8001';
  const deepwikiKey = process.env.DEEPWIKI_API_KEY || 'dw-key-e48329b6c05b4a36a18d65af21ac3c2f';
  
  // Step 1: DeepWiki Analysis
  console.log('1️⃣ DeepWiki Analysis...');
  const analyzer = new AdaptiveDeepWikiAnalyzer(deepwikiUrl, deepwikiKey);
  
  const mainAnalysis = await analyzer.analyzeWithGapFilling(
    'https://github.com/sindresorhus/ky',
    'main'
  );
  
  const prAnalysis = await analyzer.analyzeWithGapFilling(
    'https://github.com/sindresorhus/ky',
    'pull/700/head'
  );
  
  console.log(`   Main branch: ${mainAnalysis.finalResult.issues?.length || 0} issues`);
  console.log(`   PR branch: ${prAnalysis.finalResult.issues?.length || 0} issues`);
  
  // Check location data in DeepWiki results
  const mainWithLocation = mainAnalysis.finalResult.issues?.filter((i: any) => i.file && i.line).length || 0;
  const prWithLocation = prAnalysis.finalResult.issues?.filter((i: any) => i.file && i.line).length || 0;
  
  console.log(`   Main locations: ${mainWithLocation}/${mainAnalysis.finalResult.issues?.length || 0}`);
  console.log(`   PR locations: ${prWithLocation}/${prAnalysis.finalResult.issues?.length || 0}`);
  
  // Step 2: Comparison
  console.log('\n2️⃣ Comparison Agent...');
  const agent = new ComparisonAgent();
  await agent.initialize({ language: 'typescript', complexity: 'medium' });
  
  const comparison = await agent.analyze({
    mainBranchAnalysis: mainAnalysis.finalResult as any,
    featureBranchAnalysis: prAnalysis.finalResult as any,
    generateReport: false
  });
  
  console.log(`   New issues: ${comparison.comparison.newIssues?.length || 0}`);
  console.log(`   Resolved issues: ${comparison.comparison.resolvedIssues?.length || 0}`);
  
  // Check location preservation in comparison
  const newWithLocation = comparison.comparison.newIssues?.filter((i: any) => 
    i.file || i.line || i.location
  ).length || 0;
  
  console.log(`   New issues with location: ${newWithLocation}/${comparison.comparison.newIssues?.length || 0}`);
  
  // Step 3: Report Generation
  console.log('\n3️⃣ Report Generation...');
  const generator = new ReportGeneratorV7EnhancedComplete();
  const report = await generator.generateReport({
    ...comparison.comparison,
    metadata: {
      url: 'https://github.com/sindresorhus/ky/pull/700',
      owner: 'sindresorhus',
      repo: 'ky',
      prNumber: 700
    }
  } as any);
  
  // Check locations in report
  const locationPattern = /location unknown/gi;
  const unknownLocations = (report.match(locationPattern) || []).length;
  const filePattern = /File:\s*[a-zA-Z0-9\/_.-]+\.[tj]sx?/g;
  const filesFound = (report.match(filePattern) || []).length;
  
  console.log(`   Unknown locations in report: ${unknownLocations}`);
  console.log(`   Files found in report: ${filesFound}`);
  
  // Step 4: Sample output
  console.log('\n4️⃣ Sample Issues from Report:');
  
  if (comparison.comparison.newIssues && comparison.comparison.newIssues.length > 0) {
    comparison.comparison.newIssues.slice(0, 3).forEach((issue: any, idx: number) => {
      console.log(`\n   Issue ${idx + 1}: ${issue.title || issue.message}`);
      console.log(`   - File: ${issue.file || 'NOT PRESERVED'}`);
      console.log(`   - Line: ${issue.line || 'NOT PRESERVED'}`);
      console.log(`   - Location: ${issue.location ? JSON.stringify(issue.location) : 'NOT PRESERVED'}`);
    });
  }
  
  // Final verdict
  console.log('\n✅ Final Location Preservation Check:');
  const successRate = Math.round((newWithLocation / (comparison.comparison.newIssues?.length || 1)) * 100);
  console.log(`   Success Rate: ${successRate}%`);
  
  if (successRate >= 80) {
    console.log('   Status: ✅ GOOD - Location preservation working well');
  } else if (successRate >= 50) {
    console.log('   Status: ⚠️ PARTIAL - Some locations preserved');
  } else {
    console.log('   Status: ❌ POOR - Location preservation needs work');
  }
}

testFullLocationFlow().catch(console.error);