import { ReportGeneratorV8Final } from './src/standard/comparison/report-generator-v8-final';
import { DeepWikiResponseTransformer } from './src/standard/services/deepwiki-response-transformer';
import * as fs from 'fs';

async function testV8CompleteFinal() {
  console.log('🚀 Testing Complete V8 Report with Enhanced Data\n');
  
  // Create transformer
  const transformer = new DeepWikiResponseTransformer();
  
  // Generate enhanced mock data
  const mainResponse = await transformer.transform(null, {
    repositoryUrl: 'https://github.com/sindresorhus/ky',
    branch: 'main'
  });
  
  const prResponse = await transformer.transform(null, {
    repositoryUrl: 'https://github.com/sindresorhus/ky',
    branch: 'pull/700/head',
    prId: '700'
  });
  
  console.log('✅ Generated main branch:', mainResponse.issues.length, 'issues');
  console.log('✅ Generated PR branch:', prResponse.issues.length, 'issues');
  
  // Create realistic comparison data
  const comparisonData = {
    featureBranch: {
      issues: prResponse.issues,
      scores: prResponse.scores,
      testCoverage: prResponse.testCoverage,
      dependencies: prResponse.dependencies,
      architecture: prResponse.architecture
    },
    mainBranch: {
      issues: mainResponse.issues,
      scores: mainResponse.scores,
      testCoverage: mainResponse.testCoverage,
      dependencies: mainResponse.dependencies,
      architecture: mainResponse.architecture
    },
    newIssues: prResponse.issues.slice(0, 6),
    resolvedIssues: mainResponse.issues.slice(0, 2),
    unchangedIssues: [],
    prMetadata: {
      id: 'pr-700',
      number: 700,
      title: 'Add retry mechanism for failed requests',
      author: 'sindresorhus',
      repository_url: 'https://github.com/sindresorhus/ky',
      created_at: new Date().toISOString(),
      linesAdded: 450,
      linesRemoved: 120
    },
    scanDuration: 15234,
    educationalContent: {
      resources: [
        { title: 'Clean Code', url: 'https://example.com/clean-code' }
      ],
      learningPaths: [],
      issueSpecificResources: new Map()
    }
  };
  
  // Generate V8 report
  const generator = new ReportGeneratorV8Final();
  const reportOptions = {
    format: 'html' as const,
    includeEducation: true,
    includeArchitectureDiagram: true,
    includeSkillTracking: true,
    includeBusinessImpact: true,
    includeAIIntegration: true,
    includePRComment: true
  };
  
  const report = generator.generateReport(comparisonData, reportOptions);
  
  // Validate report
  console.log('\n📊 Report Validation:');
  
  // Check for issues
  const hasIssues = report.includes('NEW-') || report.includes('HIGH-') || report.includes('MEDIUM-');
  console.log(hasIssues ? '✅' : '❌', 'Has issues:', hasIssues);
  
  // Check for file paths
  const hasFilePaths = report.includes('.ts:') || report.includes('.js:') || report.includes('src/');
  console.log(hasFilePaths ? '✅' : '❌', 'Has file paths:', hasFilePaths);
  
  // Check for no unknowns
  const noUnknowns = !report.includes('unknown location') && !report.includes('undefined');
  console.log(noUnknowns ? '✅' : '❌', 'No unknowns:', noUnknowns);
  
  // Check for V8
  const isV8 = report.includes('V8 Final') || report.includes('Version:** V8');
  console.log(isV8 ? '✅' : '❌', 'Is V8:', isV8);
  
  // Check for scores
  const hasScores = report.includes('/100');
  console.log(hasScores ? '✅' : '❌', 'Has scores:', hasScores);
  
  // Save report
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = `v8-complete-final-${timestamp}.html`;
  fs.writeFileSync(reportPath, report);
  console.log('\n📁 Report saved:', reportPath);
  
  // Extract sample issue for display
  const issueMatch = report.match(/📁 \*\*Location:\*\* `([^`]+)`/);
  if (issueMatch) {
    console.log('\n📍 Sample issue location:', issueMatch[1]);
  }
  
  console.log('\n✨ Success! V8 report generated with enhanced data.');
}

testV8CompleteFinal();
