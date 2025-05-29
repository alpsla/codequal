#!/usr/bin/env node

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

console.log('🚀 Unified Search Service Demo\n');
console.log('📝 **Before Refactoring (3 confusing services):**\n');

console.log('```javascript');
console.log('// 😵 CONFUSING: Which service to use?');
console.log('');
console.log('// Option 1: VectorStorageService (low-level)');
console.log('const embedding = await generateEmbedding(query);');
console.log('const results1 = await vectorStorage.searchSimilar(');
console.log('  embedding, repoId, 10, 0.7  // hardcoded threshold');
console.log(');');
console.log('');
console.log('// Option 2: VectorSearchService (high-level)');
console.log('const results2 = await vectorSearch.searchSimilar(query, {');
console.log('  similarityThreshold: "high",  // named threshold');
console.log('  repositoryId: repoId');
console.log('});');
console.log('');
console.log('// Option 3: SmartSearchService (automatic)');
console.log('const result3 = await smartSearch.smartSearch(query, context);');
console.log('const results3 = result3.results;');
console.log('```\n');

console.log('❌ **Problems with 3 services:**');
console.log('   🤔 Which service should I use?');
console.log('   📚 Need to learn 3 different APIs');
console.log('   🔄 Duplicate code and features');
console.log('   🐛 Maintenance nightmare');
console.log('   📖 Confusing documentation\n');

console.log('✅ **After Refactoring (1 unified service):**\n');

console.log('```javascript');
console.log('import { UnifiedSearchService } from "@codequal/database";');
console.log('');
console.log('const search = new UnifiedSearchService();');
console.log('');
console.log('// 🎯 ONE API FOR EVERYTHING:');
console.log('');
console.log('// 1. Automatic threshold (most common)');
console.log('const auto = await search.search("SQL injection vulnerability");');
console.log('// → Automatically selects "strict" threshold for security');
console.log('');
console.log('// 2. Manual threshold when needed');
console.log('const manual = await search.search("express middleware", {');
console.log('  similarityThreshold: "high"');
console.log('});');
console.log('');
console.log('// 3. Direct embedding support (legacy)');
console.log('const direct = await search.search(embeddingVector);');
console.log('');
console.log('// 4. Advanced search with context');
console.log('const contextual = await search.search("fix authentication", {');
console.log('  context: { urgency: "critical", contentType: "security" }');
console.log('});');
console.log('');
console.log('// 5. Adaptive search (tries multiple thresholds)');
console.log('const adaptive = await search.adaptiveSearch("code quality");');
console.log('```\n');

console.log('🎯 **Benefits of Unified Service:**\n');

console.log('✨ **Single API** - Only one service to learn');
console.log('✨ **Automatic by default** - No manual threshold tuning');
console.log('✨ **Flexible** - Can override when needed');
console.log('✨ **Backward compatible** - Supports all old use cases');
console.log('✨ **Feature complete** - All advanced features included');
console.log('✨ **Clean code** - No more confusion about which service to use\n');

console.log('🔧 **Migration Guide:**\n');

console.log('```javascript');
console.log('// OLD: VectorStorageService.searchSimilar()');
console.log('const results = await vectorStorage.searchSimilar(embedding, repoId, 10, 0.7);');
console.log('');
console.log('// NEW: UnifiedSearchService.search()');
console.log('const { results } = await search.search(embedding, {');
console.log('  repositoryId: repoId,');
console.log('  maxResults: 10,');
console.log('  similarityThreshold: 0.7');
console.log('});');
console.log('');
console.log('// OLD: VectorSearchService.searchSimilar()');
console.log('const results = await vectorSearch.searchSimilar(query, options);');
console.log('');
console.log('// NEW: UnifiedSearchService.search() (same options!)');
console.log('const { results } = await search.search(query, options);');
console.log('');
console.log('// OLD: SmartSearchService.smartSearch()');
console.log('const result = await smartSearch.smartSearch(query, context);');
console.log('');
console.log('// NEW: UnifiedSearchService.search() (context in options!)');
console.log('const result = await search.search(query, { context });');
console.log('```\n');

console.log('🎭 **Example Use Cases:**\n');

const examples = [
  {
    scenario: '🔒 Security analyst searching for vulnerabilities',
    code: 'search.search("SQL injection in authentication")',
    result: '→ Auto-selects "strict" threshold (0.6)'
  },
  {
    scenario: '🎓 Developer learning Express.js',
    code: 'search.search("how to create Express middleware")',
    result: '→ Auto-selects "low" threshold (0.2) for broad coverage'
  },
  {
    scenario: '🚨 Emergency debugging',
    code: 'search.search("critical login error", { context: { urgency: "critical" } })',
    result: '→ Auto-selects "high" threshold (0.5) for precision'
  },
  {
    scenario: '📊 Data scientist with exact requirements',
    code: 'search.search("performance metrics", { similarityThreshold: 0.42 })',
    result: '→ Uses exact threshold (0.42)'
  },
  {
    scenario: '🔍 Exploring unfamiliar codebase',
    code: 'search.adaptiveSearch("database connections")',
    result: '→ Tries all thresholds, returns optimal results'
  }
];

examples.forEach(example => {
  console.log(`**${example.scenario}:**`);
  console.log(`   ${example.code}`);
  console.log(`   ${example.result}\n`);
});

console.log('🎯 **Key Design Principles:**\n');
console.log('1️⃣ **Smart by default** - Automatic threshold selection');
console.log('2️⃣ **Override when needed** - Manual control available');
console.log('3️⃣ **Single API** - One service does everything');
console.log('4️⃣ **Backward compatible** - Supports all legacy use cases');
console.log('5️⃣ **Performance optimized** - Built-in caching and filtering');
console.log('6️⃣ **Context aware** - Adapts to query type and urgency\n');

console.log('💡 **The Result:**');
console.log('   🎯 **Developers know exactly which service to use** (there\'s only one!)');
console.log('   🧠 **No manual threshold tuning** (automatic by default)');
console.log('   🔧 **Easy to maintain** (single codebase)');
console.log('   📖 **Simple documentation** (one API to learn)');
console.log('   🚀 **Better developer experience** (less confusion, more productivity)');

console.log('\n✅ **Recommendation: Deprecate the 3 old services and use UnifiedSearchService**');