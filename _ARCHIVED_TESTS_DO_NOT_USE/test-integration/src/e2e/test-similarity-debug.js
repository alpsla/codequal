const { BasicDeduplicator } = require('./packages/agents/dist/services/basic-deduplicator');

// Create test findings that should be detected as similar
const testFindings = [
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
    line: 45,
    severity: 'high',
    category: 'security',
    type: 'vulnerability', 
    title: 'SQL Injection Risk',
    description: 'SQL injection risk in login query',
    confidence: 0.85
  }
];

// Test the deduplicator
const deduplicator = new BasicDeduplicator();
console.log('Testing similarity detection between SQL injection findings...\n');

// Test string similarity directly
const stringSim = (a, b) => {
  const aNorm = a.toLowerCase().trim();
  const bNorm = b.toLowerCase().trim();
  
  if (aNorm === bNorm) return 1;
  
  const aTokens = new Set(aNorm.split(/\s+/));
  const bTokens = new Set(bNorm.split(/\s+/));
  
  const intersection = new Set([...aTokens].filter(x => bTokens.has(x)));
  const union = new Set([...aTokens, ...bTokens]);
  
  return intersection.size / union.size;
};

console.log('Title similarity:', stringSim(testFindings[0].title, testFindings[1].title));
console.log('Description similarity:', stringSim(testFindings[0].description, testFindings[1].description));
console.log('Weighted similarity (0.6 * title + 0.4 * desc):', 
  0.6 * stringSim(testFindings[0].title, testFindings[1].title) + 
  0.4 * stringSim(testFindings[0].description, testFindings[1].description));
console.log('Threshold for similarity: 0.85\n');

// Run actual deduplication
const result = deduplicator.deduplicateFindings(testFindings);
console.log('Deduplication result:');
console.log('- Original findings:', testFindings.length);
console.log('- Deduplicated findings:', result.deduplicated.length);
console.log('- Similarity groups:', result.similarityGroups.length);
console.log('- Similar findings detected:', result.statistics.similar);
