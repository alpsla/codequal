// Debug cross-agent deduplication
const { IntelligentResultMerger } = require('./apps/api/dist/services/intelligence/intelligent-result-merger');

const agentResults = [
  {
    agentId: 'sec-001',
    agentRole: 'security',
    findings: [
      {
        id: 'sec-1',
        file: 'src/auth/login.ts',
        line: 45,
        severity: 'high',
        category: 'security',
        type: 'vulnerability',
        title: 'SQL Injection Vulnerability in Login',
        description: 'SQL injection vulnerability detected in user login function',
        confidence: 0.9
      }
    ]
  },
  {
    agentId: 'cq-001',
    agentRole: 'codeQuality',
    findings: [
      {
        id: 'cq-4',
        file: 'src/auth/login.ts',
        line: 45,
        severity: 'high',
        category: 'code-quality',
        type: 'issue',
        title: 'SQL Query Construction Issue',
        description: 'Unsafe SQL query construction detected',
        confidence: 0.82
      }
    ]
  }
];

async function test() {
  console.log('🔍 Testing Cross-Agent SQL Injection Detection\n');
  
  const merger = new IntelligentResultMerger();
  const result = await merger.mergeResults(agentResults);
  
  console.log('📊 Merge Results:');
  console.log(`- Original findings: ${result.statistics.totalFindings.beforeMerge}`);
  console.log(`- After merge: ${result.statistics.totalFindings.afterMerge}`);
  console.log(`- Cross-agent duplicates: ${result.statistics.totalFindings.crossAgentDuplicates}`);
  
  console.log('\n🔍 Findings:');
  result.findings.forEach(f => {
    console.log(`\n- [${f.severity}] ${f.title}`);
    console.log(`  Category: ${f.category}`);
    console.log(`  Location: ${f.file}:${f.line}`);
    console.log(`  Description: ${f.description}`);
    console.log(`  Confidence: ${f.confidence}`);
    console.log(`  Agent consensus: ${f._agentConsensus || 1}`);
  });
}

test().catch(console.error);