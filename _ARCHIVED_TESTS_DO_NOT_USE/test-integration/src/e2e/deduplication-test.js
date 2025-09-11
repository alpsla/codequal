const { BasicDeduplicator } = require('../../../../packages/agents/dist/services/basic-deduplicator');
const { IntelligentResultMerger } = require('../../../../apps/api/src/services/intelligence/intelligent-result-merger');

// Test data: Similar findings from different agents
const AGENT_RESULTS = [
  {
    agentId: 'security-agent-1',
    agentRole: 'security',
    findings: [
      {
        id: 'sec-1',
        file: 'src/auth/login.ts',
        line: 45,
        severity: 'high',
        category: 'security',
        type: 'vulnerability',
        title: 'SQL Injection Vulnerability',
        description: 'SQL injection vulnerability in user login',
        confidence: 0.9
      },
      {
        id: 'sec-2',
        file: 'src/auth/login.ts',
        line: 47,  // Close line number (within 5 lines)
        severity: 'high',
        category: 'security',
        type: 'vulnerability',
        title: 'SQL Injection Vulnerability in Login',
        description: 'SQL injection vulnerability detected in user login function',
        confidence: 0.85
      },
      {
        id: 'sec-3',
        file: 'src/utils/crypto.js',
        line: 12,
        severity: 'medium',
        category: 'security',
        type: 'vulnerability',
        title: 'Weak Encryption',
        description: 'Weak encryption algorithm (MD5)',
        confidence: 0.95
      }
    ]
  },
  {
    agentId: 'code-quality-agent-1',
    agentRole: 'codeQuality',
    findings: [
      {
        id: 'cq-1',
        file: 'src/auth/login.ts',
        line: 45,
        severity: 'medium',
        category: 'code-quality',
        type: 'issue',
        title: 'Unsafe SQL Concatenation',
        description: 'Unsafe string concatenation in SQL query',
        confidence: 0.8
      },
      {
        id: 'cq-2',
        file: 'src/utils/validation.js',
        line: 23,
        severity: 'low',
        category: 'code-quality',
        type: 'issue',
        title: 'High Complexity',
        description: 'Function complexity too high (cyclomatic complexity: 15)',
        confidence: 0.9
      },
      {
        id: 'cq-3',
        file: 'src/utils/crypto.js',
        line: 12,
        severity: 'medium',
        category: 'code-quality',
        type: 'issue',
        title: 'Deprecated Crypto Method',
        description: 'Using deprecated MD5 crypto method',
        confidence: 0.85
      },
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
  },
  {
    agentId: 'performance-agent-1',
    agentRole: 'performance',
    findings: [
      {
        id: 'perf-1',
        file: 'src/api/users.ts',
        line: 78,
        severity: 'medium',
        category: 'performance',
        type: 'issue',
        title: 'N+1 Query Problem',
        description: 'N+1 query problem in user listing',
        confidence: 0.88
      },
      {
        id: 'perf-2',
        file: 'src/api/users.ts',
        line: 82,
        severity: 'medium',
        category: 'performance',
        type: 'issue',
        title: 'Database Query Loop',
        description: 'Multiple database queries in loop causing N+1 issue',
        confidence: 0.85
      },
      {
        id: 'perf-3',
        file: 'src/utils/cache.js',
        line: 45,
        severity: 'low',
        category: 'performance',
        type: 'optimization',
        title: 'Short Cache TTL',
        description: 'Cache TTL too short (60 seconds)',
        confidence: 0.7
      }
    ]
  }
];

async function testDeduplication() {
  console.log('🧪 Testing Deduplication Features\n');
  
  // Test 1: Agent-level deduplication
  console.log('=== Test 1: Agent-Level Deduplication (Basic Deduplicator) ===\n');
  
  const deduplicator = new BasicDeduplicator();
  
  // Test security agent findings (has 2 similar SQL injection findings)
  console.log('📌 Security Agent Findings:');
  const securityResult = deduplicator.deduplicateFindings(AGENT_RESULTS[0].findings);
  console.log(`- Original findings: ${AGENT_RESULTS[0].findings.length}`);
  console.log(`- Deduplicated findings: ${securityResult.deduplicated.length}`);
  console.log(`- Similarity groups found: ${securityResult.similarityGroups.length}`);
  if (securityResult.similarityGroups.length > 0) {
    const group = securityResult.similarityGroups[0];
    console.log('- Similarity group:');
    console.log('  Representative:', group.representative.description);
    if (group.similar.length > 0) {
      console.log('  Similar findings:', group.similar.map(f => f.description));
    }
  }
  console.log('');
  
  // Test 2: Cross-agent deduplication
  console.log('=== Test 2: Cross-Agent Deduplication (Intelligent Result Merger) ===\n');
  
  const merger = new IntelligentResultMerger();
  
  // Merge all agent results
  const mergedResult = await merger.mergeResults(AGENT_RESULTS);
  
  console.log('📊 Merge Statistics:');
  console.log(`- Total findings before merge: ${mergedResult.statistics.totalFindings.beforeMerge}`);
  console.log(`- Total findings after merge: ${mergedResult.statistics.totalFindings.afterMerge}`);
  console.log(`- Cross-agent duplicates removed: ${mergedResult.statistics.totalFindings.crossAgentDuplicates}`);
  console.log(`- Reduction: ${((1 - mergedResult.statistics.totalFindings.afterMerge / mergedResult.statistics.totalFindings.beforeMerge) * 100).toFixed(1)}%`);
  console.log('');
  
  console.log('📈 By Agent Breakdown:');
  Object.entries(mergedResult.statistics.byAgent).forEach(([agent, stats]) => {
    console.log(`- ${agent}: ${stats.original} → ${stats.retained} (merged: ${stats.merged})`);
  });
  console.log('');
  
  console.log('🔍 Cross-Agent Patterns Detected:');
  if (mergedResult.crossAgentPatterns.length > 0) {
    mergedResult.crossAgentPatterns.forEach(pattern => {
      console.log(`- Pattern: "${pattern.pattern}"`);
      console.log(`  Agents: ${pattern.agents.join(', ')}`);
      console.log(`  Findings: ${pattern.findings.length}`);
      console.log(`  Confidence: ${pattern.confidence}`);
    });
  } else {
    console.log('- No cross-agent patterns detected');
  }
  console.log('');
  
  // Test 3: Show specific duplicates that were merged
  console.log('=== Test 3: Specific Duplicate Examples ===\n');
  
  // Find SQL injection findings across agents
  const sqlInjectionFindings = mergedResult.findings.filter(f => 
    f.description.toLowerCase().includes('sql') || 
    f.description.toLowerCase().includes('query')
  );
  
  console.log('🔐 SQL Injection Related Findings (after merge):');
  sqlInjectionFindings.forEach(finding => {
    console.log(`- [${finding.severity}] ${finding.description}`);
    console.log(`  Location: ${finding.file}:${finding.line}`);
    console.log(`  Confidence: ${finding.confidence}`);
    console.log('');
  });
  
  // Find crypto-related findings
  const cryptoFindings = mergedResult.findings.filter(f => 
    f.file.includes('crypto')
  );
  
  console.log('🔑 Crypto-related Findings (after merge):');
  cryptoFindings.forEach(finding => {
    console.log(`- [${finding.severity}] ${finding.description}`);
    console.log(`  Agent consensus: ${finding._agentConsensus || 1}`);
    console.log('');
  });
  
  console.log('✅ Deduplication test complete!');
}

// Run the test
testDeduplication().catch(console.error);