#!/usr/bin/env ts-node
import { ReportGeneratorV8Final } from './src/standard/comparison/report-generator-v8-final';
import { promises as fs } from 'fs';

// Define types
interface Issue {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'security' | 'performance' | 'code-quality' | 'architecture' | 'dependencies' | 'testing' | 'maintainability' | 'formatting' | 'style';
  type?: 'vulnerability' | 'bug' | 'code-smell' | 'optimization' | 'design-issue';
  location?: {
    file: string;
    line: number;
  };
  message: string;
  title?: string;
  description?: string;
  codeSnippet?: string;
  suggestedFix?: string;
}

interface ComparisonResult {
  success: boolean;
  prIssues: Issue[];
  mainIssues: Issue[];
  addedIssues?: Issue[];
  fixedIssues?: Issue[];
  unchangedIssues?: Issue[];
}

async function testAIFallbackProvider() {
  console.log('🤖 Testing AI Fix Provider Fallback...\n');
  
  // Create issues that won't match any template to trigger AI fallback
  const nonTemplateIssues: Issue[] = [
    {
      id: 'custom-1',
      title: 'Custom Business Logic Error in Payment Calculation',
      type: 'bug',
      severity: 'high',
      category: 'code-quality',
      location: {
        file: 'src/payment/calculator.ts',
        line: 156
      },
      message: 'Complex business logic error in tax calculation algorithm',
      description: 'The tax calculation doesn\'t account for regional variations in VAT rates',
      codeSnippet: `function calculateTax(amount: number, region: string) {
  // Missing regional tax logic
  return amount * 0.20; // Fixed 20% rate
}`,
      suggestedFix: 'Implement regional tax rate lookup'
    },
    {
      id: 'custom-2',
      title: 'Inefficient Database Query Pattern',
      type: 'optimization',
      severity: 'medium',
      category: 'performance',
      location: {
        file: 'src/database/queries.ts',
        line: 234
      },
      message: 'N+1 query problem in user data fetching',
      description: 'Multiple database queries in a loop causing performance issues',
      codeSnippet: `for (const userId of userIds) {
  const user = await db.getUser(userId);
  const posts = await db.getUserPosts(userId);
  results.push({ user, posts });
}`,
      suggestedFix: 'Use JOIN or batch query'
    },
    {
      id: 'custom-3',
      title: 'Race Condition in Async State Update',
      type: 'bug',
      severity: 'critical',
      category: 'code-quality',
      location: {
        file: 'src/state/manager.ts',
        line: 89
      },
      message: 'Potential race condition when multiple async operations update shared state',
      description: 'Concurrent updates to shared state without proper locking mechanism',
      codeSnippet: `async function updateSharedState(data) {
  const current = await getState();
  const updated = processData(current, data);
  await setState(updated); // Race condition here
}`,
      suggestedFix: 'Implement proper state locking or use atomic operations'
    },
    {
      id: 'custom-4',
      title: 'Memory Leak in Event Listener',
      type: 'bug',
      severity: 'high',
      category: 'performance',
      location: {
        file: 'src/events/handler.ts',
        line: 45
      },
      message: 'Event listener not properly removed causing memory leak',
      description: 'Component adds event listeners but never removes them on unmount',
      codeSnippet: `componentDidMount() {
  window.addEventListener('resize', this.handleResize);
  document.addEventListener('click', this.handleClick);
}
// Missing componentWillUnmount cleanup`,
      suggestedFix: 'Add proper cleanup in componentWillUnmount'
    },
    {
      id: 'custom-5',
      title: 'Circular Dependency Between Modules',
      type: 'design-issue',
      severity: 'medium',
      category: 'architecture',
      location: {
        file: 'src/modules/moduleA.ts',
        line: 12
      },
      message: 'Circular dependency detected between moduleA and moduleB',
      description: 'Module A imports from Module B which imports back from Module A',
      codeSnippet: `// moduleA.ts
import { functionB } from './moduleB';

// moduleB.ts
import { functionA } from './moduleA';`,
      suggestedFix: 'Refactor to break circular dependency'
    }
  ];
  
  // Set as pre-existing issues to ensure they appear in report
  const comparisonResult: ComparisonResult = {
    success: true,
    mainIssues: nonTemplateIssues,
    prIssues: nonTemplateIssues,
    addedIssues: [],
    fixedIssues: [],
    unchangedIssues: nonTemplateIssues
  };
  
  console.log('📋 Testing issues without matching templates:');
  nonTemplateIssues.forEach(issue => {
    console.log(`   • ${issue.title}`);
  });
  console.log('');
  
  // Generate report
  const generator = new ReportGeneratorV8Final();
  console.log('⚙️  Generating report with AI fallback...\n');
  
  const report = await generator.generateReport(comparisonResult);
  
  // Save report
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = `test-reports/ai-fallback-test-${timestamp}.md`;
  await fs.writeFile(reportPath, report);
  
  // Analyze AI-generated fixes
  console.log('📊 AI Fallback Analysis:\n');
  
  let aiFixCount = 0;
  let templateFixCount = 0;
  let noFixCount = 0;
  
  for (const issue of nonTemplateIssues) {
    const issueSection = report.substring(
      report.indexOf(issue.title || ''),
      report.indexOf(issue.title || '') + 3000
    );
    
    const hasFixSuggestion = issueSection.includes('🔧 **Fix Suggestion:**');
    const hasTemplate = issueSection.includes('Template Applied:');
    const hasAIGenerated = issueSection.includes('AI-generated fix') || 
                          issueSection.includes('Suggested approach') ||
                          (hasFixSuggestion && !hasTemplate);
    const hasConfidence = issueSection.includes('Confidence:');
    const hasTimeEstimate = issueSection.includes('Estimated Time:');
    
    console.log(`📌 ${issue.title}`);
    console.log(`   Fix provided: ${hasFixSuggestion ? '✅' : '❌'}`);
    console.log(`   Template used: ${hasTemplate ? '✅ Template' : '❌ No template'}`);
    console.log(`   AI fallback: ${hasAIGenerated ? '✅ AI-generated' : '❌'}`);
    console.log(`   Has confidence: ${hasConfidence ? '✅' : '❌'}`);
    console.log(`   Has time estimate: ${hasTimeEstimate ? '✅' : '❌'}`);
    console.log('');
    
    if (hasTemplate) templateFixCount++;
    else if (hasAIGenerated) aiFixCount++;
    else if (!hasFixSuggestion) noFixCount++;
  }
  
  // Summary
  console.log('📈 Summary:');
  console.log(`   Total issues: ${nonTemplateIssues.length}`);
  console.log(`   Template fixes: ${templateFixCount}`);
  console.log(`   AI-generated fixes: ${aiFixCount}`);
  console.log(`   No fixes: ${noFixCount}`);
  console.log('');
  
  // Check fix quality
  console.log('🔍 Checking AI Fix Quality:\n');
  
  const fixQualityChecks = {
    hasCode: report.includes('```'),
    hasExplanation: report.includes('What to do:') || report.includes('approach'),
    hasComments: report.includes('//') || report.includes('/*'),
    hasErrorHandling: report.includes('try') || report.includes('catch') || report.includes('error'),
    hasValidation: report.includes('if') || report.includes('validate') || report.includes('check')
  };
  
  console.log('   Code blocks: ' + (fixQualityChecks.hasCode ? '✅' : '❌'));
  console.log('   Explanations: ' + (fixQualityChecks.hasExplanation ? '✅' : '❌'));
  console.log('   Code comments: ' + (fixQualityChecks.hasComments ? '✅' : '❌'));
  console.log('   Error handling: ' + (fixQualityChecks.hasErrorHandling ? '✅' : '❌'));
  console.log('   Input validation: ' + (fixQualityChecks.hasValidation ? '✅' : '❌'));
  
  const qualityScore = Object.values(fixQualityChecks).filter(v => v).length;
  console.log(`\n   Quality Score: ${qualityScore}/5`);
  
  if (aiFixCount > 0) {
    console.log('\n✅ AI fallback is working! Non-template issues received AI-generated fixes.');
  } else {
    console.log('\n⚠️  Warning: AI fallback may not be working properly.');
  }
  
  console.log(`\n📄 Full report saved to: ${reportPath}`);
  
  // Extract sample AI-generated fix
  const aiFixStart = report.search(/🔧 \*\*Fix Suggestion:\*\*[\s\S]{0,50}(?!Template Applied:)/);
  if (aiFixStart > -1) {
    const sampleFix = report.substring(aiFixStart, Math.min(aiFixStart + 800, report.length));
    console.log('\n📝 Sample AI-Generated Fix:');
    console.log('─'.repeat(50));
    console.log(sampleFix);
    console.log('─'.repeat(50));
  }
  
  return {
    report,
    stats: {
      total: nonTemplateIssues.length,
      templateFixes: templateFixCount,
      aiFixes: aiFixCount,
      noFixes: noFixCount,
      qualityScore
    }
  };
}

// Run test
testAIFallbackProvider().catch(console.error);